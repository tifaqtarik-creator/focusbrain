import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AccessToken } from 'livekit-server-sdk';

const router = Router();
const prisma = new PrismaClient();

// ── Générer un token LiveKit ──────────────────────────────────────────────────
async function generateLiveKitToken(userId: string, userName: string, roomName: string) {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) return null;

  const token = new AccessToken(apiKey, apiSecret, {
    identity: userId,
    name: userName,
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
    const slots = await prisma.slot.findMany({
      where: {
        startTime: { gte: new Date() },
        status: { in: ['OPEN', 'PENDING', 'CONFIRMED'] },
      },
      include: {
        creator: { select: { id: true, name: true, tdahType: true, avatar: true } },
        partner: { select: { id: true, name: true, tdahType: true, avatar: true } },
        requests: {
          where: { userId: req.userId },
          select: { status: true },
        },
        _count: { select: { requests: true } },
      },
      orderBy: { startTime: 'asc' },
    });
    res.json(slots);
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
        creator: { select: { id: true, name: true, tdahType: true, avatar: true } },
        partner: { select: { id: true, name: true, tdahType: true, avatar: true } },
        requests: {
          include: {
            user: { select: { id: true, name: true, tdahType: true, avatar: true } },
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

// ── POST /api/slots — Créer un créneau ───────────────────────────────────────
router.post('/', async (req: any, res) => {
  const schema = z.object({
    startTime: z.string().datetime(),
    duration: z.number().refine(d => [15, 25, 50, 75].includes(d)),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Données invalides' });

  const { startTime, duration } = parsed.data;

  // Vérifier chevauchement
  const existing = await prisma.slot.findFirst({
    where: {
      creatorId: req.userId,
      status: { not: 'CANCELLED' },
      startTime: {
        gte: new Date(new Date(startTime).getTime() - duration * 60000),
        lte: new Date(new Date(startTime).getTime() + duration * 60000),
      },
    },
  });

  if (existing) return res.status(400).json({ error: 'Tu as déjà un créneau à cette heure' });

  const slot = await prisma.slot.create({
    data: {
      creatorId: req.userId,
      startTime: new Date(startTime),
      duration,
      status: 'OPEN',
    },
    include: {
      creator: { select: { id: true, name: true, tdahType: true, avatar: true } },
    },
  });

  // Notifier tous les utilisateurs connectés via socket
  const io = req.app.get('io');
  if (io) io.emit('slot:created', slot);

  res.status(201).json(slot);
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

  // Créer la demande
  const request = await prisma.slotRequest.create({
    data: { slotId: slot.id, userId: req.userId, status: 'WAITING' },
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
      slotId: slot.id,
      startTime: slot.startTime,
      duration: slot.duration,
      candidate: request.user,
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
    // Mettre à jour le slot
    prisma.slot.update({
      where: { id: slot.id },
      data: { status: 'CONFIRMED', partnerId: candidateId, liveRoomName: roomName },
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
      slotId: slot.id,
      startTime: slot.startTime,
      duration: slot.duration,
      creator: slot.creator,
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
  if (io) io.emit('slot:cancelled', { slotId: slot.id });

  res.json({ message: 'Créneau annulé' });
});

// ── GET /api/slots/:id/token — Token LiveKit pour rejoindre ──────────────────
router.get('/:id/token', async (req: any, res) => {
  const slot = await prisma.slot.findUnique({
    where: { id: req.params.id },
    include: {
      creator: { select: { id: true, name: true } },
      partner: { select: { id: true, name: true } },
    },
  });

  if (!slot) return res.status(404).json({ error: 'Créneau introuvable' });
  if (slot.status !== 'CONFIRMED') return res.status(400).json({ error: 'Créneau non confirmé' });

  const isCreator = slot.creatorId === req.userId;
  const isPartner = slot.partnerId === req.userId;
  if (!isCreator && !isPartner) return res.status(403).json({ error: 'Non autorisé' });

  const userName = isCreator ? slot.creator.name : (slot.partner?.name || 'Partenaire');
  const roomName = slot.liveRoomName || `focusbrain-${slot.id}`;

  const token = await generateLiveKitToken(req.userId, userName, roomName);

  if (!token) {
    // Mode fallback si pas de clé LiveKit configurée
    return res.json({
      token: null,
      url: null,
      roomName,
      fallback: true,
      message: 'LiveKit non configuré — configure LIVEKIT_API_KEY dans .env',
    });
  }

  res.json({
    token,
    url: process.env.LIVEKIT_URL,
    roomName,
    partner: isCreator ? slot.partner : slot.creator,
  });
});

export default router;
