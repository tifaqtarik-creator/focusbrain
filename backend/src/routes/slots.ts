import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { AccessToken } from 'livekit-server-sdk';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { persistUpload } from '../lib/storage';
import { checkAndAwardBadges } from '../services/badges';

const router = Router();

// ── Upload de pièces jointes du chat ─────────────────────────────────────────
const CHAT_DIR = path.join(process.cwd(), 'uploads', 'chat');
if (!fs.existsSync(CHAT_DIR)) fs.mkdirSync(CHAT_DIR, { recursive: true });
const chatUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, CHAT_DIR),
    filename:    (_req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 Mo
  fileFilter: (_req, file, cb) => {
    const ok = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx', '.txt', '.zip'];
    if (ok.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Format non supporté.'));
  },
});

// ── Générer un token LiveKit ──────────────────────────────────────────────────
async function generateLiveKitToken(userId: string, userName: string, roomName: string, metadata?: string) {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) return null;

  const token = new AccessToken(apiKey, apiSecret, {
    identity: userId,
    name: userName,
    metadata,           // { name, avatar } — pour afficher la photo si caméra coupée
    ttl: '2h',
  });

  token.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  return await token.toJwt();
}

// ── GET /api/slots — Tous les créneaux disponibles ───────────────────────────
router.get('/', async (req: any, res) => {
  try {
    const [me, slots] = await Promise.all([
      prisma.user.findUnique({ where: { id: req.userId }, select: { preferredLanguages: true } }),
      prisma.slot.findMany({
        where: {
          startTime: { gte: new Date() },
          status: { in: ['OPEN', 'PENDING', 'CONFIRMED'] },
        },
        include: {
          creator: { select: { id: true, name: true, tdahType: true, avatar: true, sessionsCompleted: true, sessionsNoShow: true, preferredLanguages: true } },
          partner: { select: { id: true, name: true, tdahType: true, avatar: true, sessionsCompleted: true, sessionsNoShow: true } },
          requests: {
            where: { userId: req.userId },
            select: { status: true },
          },
          _count: { select: { requests: true } },
        },
        orderBy: { startTime: 'asc' },
      }),
    ]);

    // Appariement par langue : marquer les créneaux partageant une langue préférée
    const myLangs = new Set(me?.preferredLanguages || []);
    const withMatch = slots.map((s: any) => ({
      ...s,
      languageMatch: myLangs.size > 0 && (s.creator?.preferredLanguages || []).some((l: string) => myLangs.has(l)),
    }));
    res.json(withMatch);
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── GET /api/slots/mine — Mes créneaux ───────────────────────────────────────
router.get('/mine', async (req: any, res) => {
  try {
    const slots = await prisma.slot.findMany({
      where: {
        OR: [
          { creatorId: req.userId },
          { partnerId: req.userId },
        ],
        startTime: { gte: new Date(Date.now() - 2 * 60 * 60 * 1000) }, // inclure 2h passées
      },
      include: {
        creator: { select: { id: true, name: true, tdahType: true, avatar: true, sessionsCompleted: true, sessionsNoShow: true } },
        partner: { select: { id: true, name: true, tdahType: true, avatar: true, sessionsCompleted: true, sessionsNoShow: true } },
        requests: {
          include: {
            user: { select: { id: true, name: true, tdahType: true, avatar: true, sessionsCompleted: true, sessionsNoShow: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { startTime: 'asc' },
    });
    res.json(slots);
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── GET /api/slots/pending — Mes demandes en attente ─────────────────────────
router.get('/pending', async (req: any, res) => {
  try {
    const requests = await prisma.slotRequest.findMany({
      where: { userId: req.userId, status: 'WAITING' },
      include: {
        slot: {
          include: {
            creator: { select: { id: true, name: true, tdahType: true, avatar: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(requests);
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Génère la liste des dates d'occurrences pour une session récurrente (max 12)
function buildRecurrenceDates(start: Date, rule: { freq: string; days?: number[]; count: number }): Date[] {
  const count = Math.min(Math.max(rule.count, 1), 12);
  const dates: Date[] = [];
  if (rule.freq === 'DAILY') {
    for (let i = 0; i < count; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i); dates.push(d);
    }
  } else { // WEEKLY
    const days = (rule.days && rule.days.length) ? rule.days : [start.getDay()];
    const cursor = new Date(start);
    let guard = 0;
    while (dates.length < count && guard < 366) {
      if (days.includes(cursor.getDay())) {
        const d = new Date(cursor);
        d.setHours(start.getHours(), start.getMinutes(), 0, 0);
        if (d.getTime() >= start.getTime()) dates.push(d);
      }
      cursor.setDate(cursor.getDate() + 1);
      guard++;
    }
  }
  return dates;
}

// ── POST /api/slots — Créer un créneau (instantané / planifié / récurrent) ────
router.post('/', async (req: any, res) => {
  const schema = z.object({
    startTime:   z.string().datetime().optional(),
    duration:    z.number().refine(d => [15, 25, 50, 75].includes(d)),
    type:        z.enum(['INSTANT', 'SCHEDULED', 'RECURRING']).optional(),
    description: z.string().max(500).optional(),
    creatorTask: z.string().max(200).optional(),
    tasks:       z.array(z.string().max(200)).max(8).optional(),
    category:    z.string().max(40).optional(),
    ambiance:    z.string().max(40).optional(),
    energy:      z.string().max(20).optional(),
    recurrence:  z.object({
      freq:  z.enum(['DAILY', 'WEEKLY']),
      days:  z.array(z.number().int().min(0).max(6)).max(7).optional(),
      count: z.number().int().min(1).max(12),
    }).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Données invalides' });

  const type = parsed.data.type || 'SCHEDULED';
  const duration = parsed.data.duration;
  // INSTANT : démarrage immédiat ; sinon startTime requis
  const baseStart = type === 'INSTANT'
    ? new Date()
    : (parsed.data.startTime ? new Date(parsed.data.startTime) : null);
  if (!baseStart) return res.status(400).json({ error: 'Date/heure requise' });

  const tasks = (parsed.data.tasks || (parsed.data.creatorTask ? [parsed.data.creatorTask] : []))
    .map(t => t.trim()).filter(Boolean).slice(0, 8);
  const description = parsed.data.description?.trim() || null;
  const common = {
    creatorId: req.userId,
    duration,
    creatorTask: tasks[0] || null,
    creatorTasks: tasks,
    description,
    category: parsed.data.category || null,
    ambiance: parsed.data.ambiance || null,
    energy: parsed.data.energy || null,
  };

  const io = req.app.get('io');

  // ── Session récurrente : créer une série d'occurrences ──
  if (type === 'RECURRING' && parsed.data.recurrence) {
    const seriesId = randomUUID();
    const dates = buildRecurrenceDates(baseStart, parsed.data.recurrence);
    const rule = JSON.stringify(parsed.data.recurrence);
    await prisma.slot.createMany({
      data: dates.map(d => ({
        ...common, startTime: d, status: 'OPEN',
        type: 'RECURRING', recurrenceRule: rule, seriesId,
      })),
    });
    const created = await prisma.slot.findMany({
      where: { seriesId },
      include: { creator: { select: { id: true, name: true, tdahType: true, avatar: true } } },
      orderBy: { startTime: 'asc' },
    });
    if (io) created.forEach(s => io.emit('slot:created', s));
    return res.status(201).json({ series: true, count: created.length, slots: created });
  }

  // ── Session unique (instantanée ou planifiée) ──
  // Vérifier chevauchement
  const existing = await prisma.slot.findFirst({
    where: {
      creatorId: req.userId,
      status: { not: 'CANCELLED' },
      startTime: {
        gte: new Date(baseStart.getTime() - duration * 60000),
        lte: new Date(baseStart.getTime() + duration * 60000),
      },
    },
  });
  if (existing) return res.status(400).json({ error: 'Tu as déjà un créneau à cette heure' });

  const slot = await prisma.slot.create({
    data: { ...common, startTime: baseStart, status: 'OPEN', type },
    include: {
      creator: { select: { id: true, name: true, tdahType: true, avatar: true } },
    },
  });

  if (io) io.emit('slot:created', slot);
  res.status(201).json(slot);
});

// ── POST /api/slots/:id/request — Demander à rejoindre ───────────────────────
// ── PATCH /api/slots/:id — Modifier un créneau ───────────────────────────────
router.patch('/:id', async (req: any, res) => {
  const slot = await prisma.slot.findUnique({ where: { id: req.params.id } });
  if (!slot)                        return res.status(404).json({ error: 'Créneau introuvable' });
  if (slot.creatorId !== req.userId) return res.status(403).json({ error: 'Non autorisé' });
  // NB : on autorise l'édition d'une session CONFIRMÉE → le partenaire est notifié.

  const schema = z.object({
    startTime:   z.string().datetime().optional(),
    duration:    z.number().refine(d => [15, 25, 50, 75].includes(d)).optional(),
    creatorTask: z.string().max(200).nullable().optional(),
    description: z.string().max(500).nullable().optional(),
    tasks:       z.array(z.string().max(200)).max(8).optional(),
    category:    z.string().max(40).nullable().optional(),
    ambiance:    z.string().max(40).nullable().optional(),
    energy:      z.string().max(20).nullable().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Données invalides' });

  const tasks = parsed.data.tasks
    ? parsed.data.tasks.map(t => t.trim()).filter(Boolean).slice(0, 8)
    : undefined;

  const updated = await prisma.slot.update({
    where: { id: req.params.id },
    data: {
      ...(parsed.data.startTime   && { startTime: new Date(parsed.data.startTime) }),
      ...(parsed.data.duration    && { duration: parsed.data.duration }),
      ...(parsed.data.creatorTask !== undefined && { creatorTask: parsed.data.creatorTask }),
      ...(parsed.data.description !== undefined && { description: parsed.data.description }),
      ...(tasks !== undefined && { creatorTasks: tasks, creatorTask: tasks[0] || null }),
      ...(parsed.data.category !== undefined && { category: parsed.data.category }),
      ...(parsed.data.ambiance !== undefined && { ambiance: parsed.data.ambiance }),
      ...(parsed.data.energy   !== undefined && { energy: parsed.data.energy }),
    },
    include: {
      creator: { select: { id: true, name: true, avatar: true } },
      partner: { select: { id: true, name: true, avatar: true } },
    },
  });

  // Rafraîchir tout le monde + notifier le partenaire de la modification
  const io = req.app.get('io');
  if (io) {
    io.emit('slot:updated', updated);
    if (slot.partnerId) {
      io.to(`user:${slot.partnerId}`).emit('slot:modified', {
        slotId: slot.id,
        message: 'Ta session a été modifiée par le créateur.',
      });
    }
  }

  res.json(updated);
});

// ── DELETE /api/slots/:id — Supprimer un créneau ─────────────────────────────
router.delete('/:id', async (req: any, res) => {
  const slot = await prisma.slot.findUnique({
    where: { id: req.params.id },
    include: { requests: { select: { userId: true } } },
  });
  if (!slot)                        return res.status(404).json({ error: 'Créneau introuvable' });
  if (slot.creatorId !== req.userId) return res.status(403).json({ error: 'Non autorisé' });

  // Notifier les candidats que le créneau est annulé
  const io = req.app.get('io');
  if (io) {
    slot.requests.forEach(r => {
      io.to(`user:${r.userId}`).emit('slot:cancelled', {
        slotId: slot.id,
        message: 'Le créneau a été annulé par le créateur.',
      });
    });
  }

  // Supprimer requests puis le slot
  await prisma.slotRequest.deleteMany({ where: { slotId: req.params.id } });
  await prisma.slot.delete({ where: { id: req.params.id } });

  res.json({ success: true });
});

// ── POST /api/slots/:id/request — Demander à rejoindre ───────────────────────
router.post('/:id/request', async (req: any, res) => {
  const slot = await prisma.slot.findUnique({
    where: { id: req.params.id },
    include: { creator: { select: { id: true, name: true } } },
  });

  if (!slot) return res.status(404).json({ error: 'Créneau introuvable' });
  if (slot.status === 'CONFIRMED') return res.status(400).json({ error: 'Créneau déjà complet' });
  if (slot.creatorId === req.userId) return res.status(400).json({ error: 'C\'est ton propre créneau' });

  // Vérifier si déjà demandé
  const existing = await prisma.slotRequest.findUnique({
    where: { slotId_userId: { slotId: slot.id, userId: req.userId } },
  });
  if (existing) return res.status(400).json({ error: 'Tu as déjà demandé ce créneau' });

  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, name: true, tdahType: true, avatar: true },
  });

  // Récupérer la tâche du candidat si fournie
  const { candidateTask } = req.body;

  // Créer la demande avec la tâche
  const request = await prisma.slotRequest.create({
    data: {
      slotId: slot.id,
      userId: req.userId,
      status: 'WAITING',
      candidateTask: candidateTask?.trim() || null,
    },
    include: { user: { select: { id: true, name: true, tdahType: true, avatar: true } } },
  });

  // Passer le slot en PENDING
  await prisma.slot.update({
    where: { id: slot.id },
    data: { status: 'PENDING' },
  });

  // Notifier le créateur en temps réel
  const io = req.app.get('io');
  if (io) {
    io.to(`user:${slot.creatorId}`).emit('slot:request_received', {
      slotId:         slot.id,
      startTime:      slot.startTime,
      duration:       slot.duration,
      creatorTask:    slot.creatorTask,
      candidate:      request.user,
      candidateTask:  request.candidateTask,
      totalCandidates: await prisma.slotRequest.count({ where: { slotId: slot.id } }),
    });
  }

  res.status(201).json({ message: 'Demande envoyée', request });
});

// ── POST /api/slots/:id/confirm — Confirmer un candidat ──────────────────────
router.post('/:id/confirm', async (req: any, res) => {
  const { candidateId } = req.body;
  if (!candidateId) return res.status(400).json({ error: 'candidateId requis' });

  const slot = await prisma.slot.findUnique({
    where: { id: req.params.id },
    include: { creator: { select: { id: true, name: true, tdahType: true } } },
  });

  if (!slot) return res.status(404).json({ error: 'Créneau introuvable' });
  if (slot.creatorId !== req.userId) return res.status(403).json({ error: 'Non autorisé' });
  if (slot.status === 'CONFIRMED') return res.status(400).json({ error: 'Déjà confirmé' });

  // Vérifier que le candidat a bien fait une demande
  const request = await prisma.slotRequest.findUnique({
    where: { slotId_userId: { slotId: slot.id, userId: candidateId } },
  });
  if (!request) return res.status(404).json({ error: 'Demande introuvable' });

  const roomName = `focusbrain-${slot.id}`;

  // Tout en transaction
  await prisma.$transaction([
    // Confirmer ce candidat
    prisma.slotRequest.update({
      where: { slotId_userId: { slotId: slot.id, userId: candidateId } },
      data: { status: 'CONFIRMED' },
    }),
    // Rejeter tous les autres
    prisma.slotRequest.updateMany({
      where: { slotId: slot.id, userId: { not: candidateId }, status: 'WAITING' },
      data: { status: 'REJECTED' },
    }),
    // Mettre à jour le slot avec la tâche du partenaire
    prisma.slot.update({
      where: { id: slot.id },
      data: {
        status: 'CONFIRMED',
        partnerId: candidateId,
        liveRoomName: roomName,
        partnerTask: request.candidateTask || null,
      },
    }),
  ]);

  const partner = await prisma.user.findUnique({
    where: { id: candidateId },
    select: { id: true, name: true, tdahType: true, avatar: true },
  });

  // Notifier en temps réel
  const io = req.app.get('io');
  if (io) {
    // Notifier le partenaire confirmé
    io.to(`user:${candidateId}`).emit('slot:confirmed', {
      slotId:      slot.id,
      startTime:   slot.startTime,
      duration:    slot.duration,
      creator:     slot.creator,
      creatorTask: slot.creatorTask,
      partnerTask: request.candidateTask,
    });

    // Notifier les candidats refusés
    const rejected = await prisma.slotRequest.findMany({
      where: { slotId: slot.id, status: 'REJECTED' },
      select: { userId: true },
    });
    rejected.forEach(r => {
      io.to(`user:${r.userId}`).emit('slot:rejected', {
        slotId: slot.id,
        message: 'Le créneau a été pris',
      });
    });

    // Mettre à jour le calendrier pour tous
    io.emit('slot:updated', { slotId: slot.id, status: 'CONFIRMED' });
  }

  res.json({ message: 'Partenaire confirmé', partner });
});

// ── POST /api/slots/:id/cancel — Annuler son créneau ─────────────────────────
router.post('/:id/cancel', async (req: any, res) => {
  const slot = await prisma.slot.findUnique({ where: { id: req.params.id } });
  if (!slot) return res.status(404).json({ error: 'Créneau introuvable' });
  if (slot.creatorId !== req.userId) return res.status(403).json({ error: 'Non autorisé' });

  await prisma.slot.update({
    where: { id: slot.id },
    data: { status: 'CANCELLED' },
  });

  const io = req.app.get('io');
  if (io) {
    io.emit('slot:cancelled', { slotId: slot.id });
    // Notifier le partenaire (session déjà confirmée)
    if (slot.partnerId) {
      io.to(`user:${slot.partnerId}`).emit('slot:cancelled', {
        slotId: slot.id,
        message: 'La session a été annulée par le créateur.',
      });
    }
  }

  res.json({ message: 'Créneau annulé' });
});

// ── GET /api/slots/:id/token — Token LiveKit pour rejoindre ──────────────────
router.get('/:id/token', async (req: any, res) => {
  const slot = await prisma.slot.findUnique({
    where: { id: req.params.id },
    include: {
      creator: { select: { id: true, name: true, avatar: true, sessionsCompleted: true, sessionsNoShow: true } },
      partner: { select: { id: true, name: true, avatar: true, sessionsCompleted: true, sessionsNoShow: true } },
    },
  });

  if (!slot) return res.status(404).json({ error: 'Créneau introuvable' });
  if (slot.status !== 'CONFIRMED') return res.status(400).json({ error: 'Créneau non confirmé' });

  const isCreator = slot.creatorId === req.userId;
  const isPartner = slot.partnerId === req.userId;
  if (!isCreator && !isPartner) return res.status(403).json({ error: 'Non autorisé' });

  const userName = isCreator ? slot.creator.name : (slot.partner?.name || 'Partenaire');
  const roomName = slot.liveRoomName || `focusbrain-${slot.id}`;
  // « partenaire » = l'autre personne ; tâches normalisées du point de vue du viewer
  const other       = isCreator ? slot.partner : slot.creator;
  const myTask       = isCreator ? slot.creatorTask : slot.partnerTask;
  const partnerTask  = isCreator ? slot.partnerTask : slot.creatorTask;

  // KPI : marquer la session comme lancée + 1ère session de l'utilisateur
  // startedAt est renvoyé au client pour que le timer survive à un rafraîchissement
  let startedAt = slot.startedAt;
  if (!startedAt) {
    startedAt = new Date();
    await prisma.slot.update({ where: { id: slot.id }, data: { startedAt } });
  }
  await prisma.user.updateMany({
    where: { id: req.userId, firstSessionAt: null },
    data: { firstSessionAt: new Date() },
  });

  // Métadonnées du participant courant (nom + photo) pour l'affichage côté partenaire
  const meDetails = isCreator ? slot.creator : slot.partner;
  const meta = JSON.stringify({ name: meDetails?.name || userName, avatar: meDetails?.avatar || null });
  const token = await generateLiveKitToken(req.userId, userName, roomName, meta);

  if (!token) {
    // Mode fallback si pas de clé LiveKit configurée
    return res.json({
      token: null,
      url: null,
      roomName,
      fallback: true,
      type: slot.type,
      duration: slot.duration,
      startTime: slot.startTime,
      startedAt,
      partner: other,
      myTask,
      partnerTask,
      message: 'LiveKit non configuré — configure LIVEKIT_API_KEY dans .env',
    });
  }

  res.json({
    token,
    url: process.env.LIVEKIT_URL,
    roomName,
    type: slot.type,
    duration: slot.duration,
    startTime: slot.startTime,
    startedAt,
    partner: other,
    myTask,
    partnerTask,
  });
});

// ── POST /api/slots/:id/feedback — Satisfaction post-session ─────────────────
router.post('/:id/feedback', async (req: any, res) => {
  const schema = z.object({
    rating:  z.number().int().min(1).max(5),
    comment: z.string().max(500).optional(),
    mood:    z.string().max(10).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Données invalides' });

  const slot = await prisma.slot.findUnique({ where: { id: req.params.id } });
  if (!slot) return res.status(404).json({ error: 'Session introuvable' });

  // Vérifier que l'utilisateur a participé à cette session
  const isParticipant = slot.creatorId === req.userId || slot.partnerId === req.userId;
  if (!isParticipant) return res.status(403).json({ error: 'Non autorisé' });

  // Créer ou mettre à jour le feedback (1 seul par personne)
  const feedback = await prisma.slotFeedback.upsert({
    where: { slotId_userId: { slotId: req.params.id, userId: req.userId } },
    update: parsed.data,
    create: { slotId: req.params.id, userId: req.userId, ...parsed.data },
  });

  res.status(201).json(feedback);
});

// ── GET /api/slots/:id/feedbacks — Avis sur une session ──────────────────────
router.get('/:id/feedbacks', async (req: any, res) => {
  const feedbacks = await prisma.slotFeedback.findMany({
    where: { slotId: req.params.id },
    include: { user: { select: { id: true, name: true, avatar: true } } },
  });
  const avg = feedbacks.length
    ? feedbacks.reduce((a, f) => a + f.rating, 0) / feedbacks.length
    : null;
  res.json({ feedbacks, average: avg, count: feedbacks.length });
});

// ── POST /api/slots/:id/complete — Marquer la session terminée (KPI + fiabilité) ──
router.post('/:id/complete', async (req: any, res) => {
  const slot = await prisma.slot.findUnique({ where: { id: req.params.id } });
  if (!slot) return res.status(404).json({ error: 'Session introuvable' });
  const isParticipant = slot.creatorId === req.userId || slot.partnerId === req.userId;
  if (!isParticipant) return res.status(403).json({ error: 'Non autorisé' });

  // Une seule comptabilisation (le 1er qui termine pose completedAt)
  if (!slot.completedAt) {
    await prisma.slot.update({
      where: { id: slot.id },
      data: { completedAt: new Date(), startedAt: slot.startedAt || new Date() },
    });
    const ids = [slot.creatorId, slot.partnerId].filter(Boolean) as string[];
    if (ids.length) {
      await prisma.user.updateMany({ where: { id: { in: ids } }, data: { sessionsCompleted: { increment: 1 } } });
      // Attribution des badges (récompense dopamine) — sans bloquer la réponse
      Promise.all(ids.map(id => checkAndAwardBadges(id))).catch(err =>
        console.error('[badges]', err?.message || err));
    }
  }
  res.json({ success: true });
});

// ── Chat archivé — accessible aux 2 participants ─────────────────────────────
async function assertParticipant(slotId: string, userId: string) {
  const slot = await prisma.slot.findUnique({ where: { id: slotId }, select: { creatorId: true, partnerId: true } });
  if (!slot) return { ok: false, code: 404, error: 'Session introuvable' as const };
  if (slot.creatorId !== userId && slot.partnerId !== userId) return { ok: false, code: 403, error: 'Non autorisé' as const };
  return { ok: true as const };
}

// GET /api/slots/:id/messages — historique de la conversation
router.get('/:id/messages', async (req: any, res) => {
  const a = await assertParticipant(req.params.id, req.userId);
  if (!a.ok) return res.status(a.code).json({ error: a.error });
  const messages = await prisma.slotMessage.findMany({
    where: { slotId: req.params.id },
    include: { from: { select: { id: true, name: true, avatar: true } } },
    orderBy: { createdAt: 'asc' },
    take: 500,
  });
  res.json(messages);
});

// POST /api/slots/:id/messages — archiver un message envoyé
router.post('/:id/messages', async (req: any, res) => {
  const schema = z.object({
    content:     z.string().max(2000).optional(),
    attachments: z.array(z.object({ url: z.string().max(500), name: z.string().max(200), mime: z.string().max(100) })).max(5).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Message invalide' });
  if (!parsed.data.content?.trim() && !parsed.data.attachments?.length) {
    return res.status(400).json({ error: 'Message vide' });
  }
  const slot = await prisma.slot.findUnique({ where: { id: req.params.id }, select: { creatorId: true, partnerId: true } });
  if (!slot) return res.status(404).json({ error: 'Session introuvable' });
  if (slot.creatorId !== req.userId && slot.partnerId !== req.userId) return res.status(403).json({ error: 'Non autorisé' });

  const msg = await prisma.slotMessage.create({
    data: {
      slotId: req.params.id,
      fromId: req.userId,
      content: parsed.data.content || '',
      attachments: parsed.data.attachments ?? undefined,
    },
    include: { from: { select: { id: true, name: true, avatar: true } } },
  });

  // Notifier le partenaire (hors salle → cloche de notifications)
  const io = req.app.get('io');
  const otherId = slot.creatorId === req.userId ? slot.partnerId : slot.creatorId;
  if (io && otherId) {
    io.to(`user:${otherId}`).emit('chat:message', {
      slotId: req.params.id,
      fromName: msg.from.name,
      preview: parsed.data.attachments?.length ? '📎 pièce jointe' : (parsed.data.content || '').slice(0, 60),
    });
  }
  res.status(201).json(msg);
});

// POST /api/slots/:id/chat-upload — pièce jointe du chat
router.post('/:id/chat-upload', (req: any, res) => {
  chatUpload.single('file')(req, res, async (err: any) => {
    if (err) return res.status(400).json({ error: err.message || 'Erreur upload' });
    const file = req.file as Express.Multer.File | undefined;
    if (!file) return res.status(400).json({ error: 'Aucun fichier' });
    const a = await assertParticipant(req.params.id, req.userId);
    if (!a.ok) return res.status(a.code).json({ error: a.error });
    const BASE = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3001}`;
    const cloud = await persistUpload(file.path, 'chat'); // Cloudinary si configuré
    const url = cloud || `${BASE}/uploads/chat/${file.filename}`;
    res.json({ url, name: file.originalname, mime: file.mimetype });
  });
});

// DELETE /api/slots/:id/messages — effacer l'historique (RGPD)
router.delete('/:id/messages', async (req: any, res) => {
  const a = await assertParticipant(req.params.id, req.userId);
  if (!a.ok) return res.status(a.code).json({ error: a.error });
  await prisma.slotMessage.deleteMany({ where: { slotId: req.params.id } });
  res.json({ success: true });
});

// ── GET /api/slots/kpis — Indicateurs Body Doubling ──────────────────────────
router.get('/kpis', async (req: any, res) => {
  const [confirmed, started, completed, noShow, usersTotal, usersWithSession, myDone, myNoShow] = await Promise.all([
    prisma.slot.count({ where: { status: 'CONFIRMED' } }),
    prisma.slot.count({ where: { startedAt: { not: null } } }),
    prisma.slot.count({ where: { completedAt: { not: null } } }),
    prisma.slot.count({ where: { noShow: true } }),
    prisma.user.count(),
    prisma.user.count({ where: { firstSessionAt: { not: null } } }),
    prisma.user.findUnique({ where: { id: req.userId }, select: { sessionsCompleted: true, sessionsNoShow: true, firstSessionAt: true } }).then(u => u?.sessionsCompleted || 0),
    prisma.user.findUnique({ where: { id: req.userId }, select: { sessionsNoShow: true } }).then(u => u?.sessionsNoShow || 0),
  ]);
  const denom = completed + noShow;
  res.json({
    activation: { rate: usersTotal ? Math.round((usersWithSession / usersTotal) * 100) : 0, usersWithSession, usersTotal },
    completionRate: started ? Math.round((completed / started) * 100) : 0,
    noShowRate: denom ? Math.round((noShow / denom) * 100) : 0,
    totals: { confirmed, started, completed, noShow },
    me: { completed: myDone, noShow: myNoShow },
  });
});

// ── GET /api/slots/stats — Tableau de bord complet (KPI hiérarchisés) ────────
router.get('/stats', async (req: any, res) => {
  const now = new Date();
  const startOfWeek = new Date(now); const dow = (now.getDay() + 6) % 7; // lundi = 0
  startOfWeek.setDate(now.getDate() - dow); startOfWeek.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [
    sessionsDone, sessionsUpcoming, sessionsActive, sessionsCancelled,
    myReviews, matchConfirmed, matchRequested,
    activeUsers, completedThisWeek, completedThisMonth, me,
  ] = await Promise.all([
    // Sessions (plateforme)
    prisma.slot.count({ where: { completedAt: { not: null } } }),
    prisma.slot.count({ where: { status: { in: ['OPEN', 'PENDING', 'CONFIRMED'] }, startTime: { gte: now } } }),
    prisma.slot.count({ where: { startedAt: { not: null }, completedAt: null } }),
    prisma.slot.count({ where: { status: 'CANCELLED' } }),
    // Utilisateur : avis reçus = feedbacks laissés par les partenaires sur les sessions où je suis créateur/partenaire
    prisma.slotFeedback.findMany({
      where: { slot: { OR: [{ creatorId: req.userId }, { partnerId: req.userId }] }, userId: { not: req.userId } },
      select: { rating: true },
    }),
    prisma.slot.count({ where: { creatorId: req.userId, status: 'CONFIRMED' } }),
    prisma.slotRequest.count({ where: { slot: { creatorId: req.userId } } }),
    // Plateforme
    prisma.user.count({ where: { firstSessionAt: { not: null } } }),
    prisma.slot.count({ where: { completedAt: { gte: startOfWeek } } }),
    prisma.slot.count({ where: { completedAt: { gte: startOfMonth } } }),
    prisma.user.findUnique({ where: { id: req.userId }, select: { sessionsCompleted: true, sessionsNoShow: true } }),
  ]);

  const reviewCount = myReviews.length;
  const avgRating = reviewCount ? myReviews.reduce((a, f) => a + f.rating, 0) / reviewCount : null;
  // Points bienveillants : 10 par session terminée, jamais retirés
  const points = (me?.sessionsCompleted || 0) * 10;

  res.json({
    sessions: {
      completed: sessionsDone,
      upcoming:  sessionsUpcoming,
      active:    sessionsActive,
      cancelled: sessionsCancelled,
    },
    user: {
      points,
      averageRating: avgRating !== null ? Math.round(avgRating * 10) / 10 : null,
      reviewCount,
      matchSuccessRate: matchRequested ? Math.round((matchConfirmed / matchRequested) * 100) : null,
      sessionsCompleted: me?.sessionsCompleted || 0,
    },
    platform: {
      activeUsers,
      completedThisWeek,
      completedThisMonth,
    },
  });
});

// ── GET /api/slots/my-feedbacks — Mes stats de satisfaction ──────────────────
router.get('/my-feedbacks', async (req: any, res) => {
  const feedbacks = await prisma.slotFeedback.findMany({
    where: { userId: req.userId },
    include: { slot: { select: { startTime: true, duration: true } } },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  const avg = feedbacks.length
    ? feedbacks.reduce((a, f) => a + f.rating, 0) / feedbacks.length
    : null;
  res.json({ feedbacks, average: avg });
});

export default router;
