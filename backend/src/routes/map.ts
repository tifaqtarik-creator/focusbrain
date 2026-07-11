import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

const router = Router();

// Flouter la position pour protéger la vie privée (~±3km).
// DÉTERMINISTE : même membre = même décalage → les avatars ne se téléportent
// plus à chaque rechargement, et la distance affichée reste stable.
function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return h;
}
function fuzzCoord(coord: number, seed: string): number {
  const r = (Math.abs(hashCode(seed)) % 1000) / 1000; // 0..1, stable pour un même seed
  return coord + (r - 0.5) * 0.055;
}

// ── GET /api/map/members — Membres visibles sur la carte ─────────────────────
router.get('/members', async (req: any, res) => {
  const { tdahType, available, maxKm } = req.query;

  // Ne montrer que les membres actifs récemment : un profil silencieux depuis
  // plus de 7 jours ne doit plus apparaître « Disponible » (membres fantômes)
  const activeSince = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const locations = await prisma.userLocation.findMany({
    where: { isVisible: true, userId: { not: req.userId }, updatedAt: { gte: activeSince } },
    include: {
      user: {
        select: {
          id: true, name: true, avatar: true,
          tdahType: true, workStyle: true, bio: true,
        },
      },
    },
  });

  // Filtrer par type TDAH
  let filtered = locations;
  if (tdahType && tdahType !== 'ALL') {
    filtered = filtered.filter(l => l.user.tdahType === tdahType);
  }

  // Formater pour le frontend
  const members = filtered.map(l => ({
    id: l.user.id,
    name: l.user.name,
    avatar: l.user.avatar,
    tdahType: l.user.tdahType,
    workStyle: l.user.workStyle,
    bio: l.user.bio,
    city: l.city,
    lat: fuzzCoord(l.lat, l.userId + ':lat'),
    lng: fuzzCoord(l.lng, l.userId + ':lng'),
    status: l.statusExpiry && l.statusExpiry < new Date() ? 'DISPONIBLE' : (l.status || 'DISPONIBLE'),
    isAvailable: l.status !== 'ABSENT',
    updatedAt: l.updatedAt,
  }));

  res.json(members);
});

// ── POST /api/map/location — Mettre à jour ma position ───────────────────────
router.post('/location', async (req: any, res) => {
  const schema = z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    city: z.string().optional(),
    country: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Données invalides' });

  const location = await prisma.userLocation.upsert({
    where: { userId: req.userId },
    update: { ...parsed.data },
    create: { userId: req.userId, ...parsed.data },
  });

  res.json(location);
});

// ── PATCH /api/map/visibility — Se cacher/montrer ────────────────────────────
router.patch('/visibility', async (req: any, res) => {
  const { isVisible } = req.body;

  await prisma.userLocation.upsert({
    where: { userId: req.userId },
    update: { isVisible },
    create: { userId: req.userId, lat: 0, lng: 0, isVisible },
  });

  const io = req.app.get('io');
  if (io) {
    if (isVisible) {
      io.emit('map:member_online', { userId: req.userId });
    } else {
      io.emit('map:member_offline', { userId: req.userId });
    }
  }

  res.json({ isVisible });
});

// ── PATCH /api/map/status — Changer son statut personnalisé ──────────────────
router.patch('/status', async (req: any, res) => {
  const { status } = req.body;
  const VALID = ['DISPONIBLE','FOCUS','CAFE','BODY_DOUBLING','SILENCIEUX','HYPERFOCUS','ABSENT'];
  if (!VALID.includes(status)) return res.status(400).json({ error: 'Statut invalide' });

  // Expiration dans 4h pour éviter les statuts oubliés
  const statusExpiry = new Date(Date.now() + 4 * 3600 * 1000);

  await prisma.userLocation.upsert({
    where: { userId: req.userId },
    update: { status, statusExpiry },
    create: { userId: req.userId, lat: 0, lng: 0, status, statusExpiry },
  });

  // Diffuser en temps réel à tous les membres de la carte
  const io = req.app.get('io');
  if (io) {
    io.emit('map:status_changed', { userId: req.userId, status });
  }

  res.json({ status, statusExpiry });
});

// ── GET /api/map/places — Lieux TDAH-friendly ─────────────────────────────────
router.get('/places', async (req: any, res) => {
  const { lat, lng, type, radius = 10 } = req.query;

  // Chercher en DB d'abord (lieux validés par la communauté)
  const communityPlaces = await prisma.tdahPlace.findMany({
    where: type ? { type: type as string } : {},
    orderBy: [{ tdahScore: 'desc' }, { validations: 'desc' }],
    take: 20,
    select: {
      id: true, name: true, type: true, lat: true, lng: true,
      address: true, city: true, isQuiet: true, hasWifi: true,
      tdahScore: true, validations: true,
    },
  });

  // Compléter avec Maptiler POI si lat/lng fournis
  let maptilerPlaces: any[] = [];
  if (lat && lng) {
    const MAPTILER_KEY = 'oer00nopMf2v9886mVRZ';
    const queries = type
      ? [{ q: type === 'CAFE' ? 'café' : type === 'LIBRARY' ? 'bibliothèque' : type === 'COWORKING' ? 'coworking' : 'park', t: type }]
      : [
          { q: 'café', t: 'CAFE' },
          { q: 'bibliothèque', t: 'LIBRARY' },
          { q: 'coworking', t: 'COWORKING' },
          { q: 'park', t: 'PARK' },
        ];

    for (const { q, t } of queries.slice(0, type ? 1 : 4)) {
      try {
        const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(q)}.json?proximity=${lng},${lat}&limit=4&key=${MAPTILER_KEY}`;
        const resp = await fetch(url);
        if (resp.ok) {
          const data = await resp.json() as any;
          const features = (data.features || []).map((f: any) => ({
            id: `maptiler-${f.id}`,
            name: f.text || f.place_name?.split(',')[0],
            type: t,
            lat: f.center[1],
            lng: f.center[0],
            address: f.place_name,
            city: f.context?.find((c: any) => c.id?.startsWith('place'))?.text,
            isQuiet: false, hasWifi: false, tdahScore: 3.0, validations: 0,
            source: 'maptiler',
          }));
          maptilerPlaces.push(...features);
        }
      } catch { /* ignore */ }
    }
  }

  res.json({ community: communityPlaces, suggestions: maptilerPlaces });
});

// ── POST /api/map/places — Ajouter un lieu TDAH-friendly ─────────────────────
router.post('/places', async (req: any, res) => {
  const { name, type, lat, lng, address, city, isQuiet, hasWifi } = req.body;
  if (!name || !type || !lat || !lng) return res.status(400).json({ error: 'Données manquantes' });

  const place = await prisma.tdahPlace.create({
    data: { name, type, lat, lng, address, city, isQuiet: !!isQuiet, hasWifi: !!hasWifi, addedBy: req.userId, validations: 1, tdahScore: 4.0 },
  });
  res.status(201).json(place);
});

// ── POST /api/map/places/:id/validate — Valider un lieu ──────────────────────
router.post('/places/:id/validate', async (req: any, res) => {
  const { isQuiet, hasWifi, score } = req.body;
  const place = await prisma.tdahPlace.findUnique({ where: { id: req.params.id } });
  if (!place) return res.status(404).json({ error: 'Lieu introuvable' });

  const newScore = (place.tdahScore * place.validations + (score || 4)) / (place.validations + 1);
  const updated = await prisma.tdahPlace.update({
    where: { id: req.params.id },
    data: { validations: { increment: 1 }, tdahScore: newScore, isQuiet: isQuiet ?? place.isQuiet, hasWifi: hasWifi ?? place.hasWifi },
  });
  res.json(updated);
});

// ── GET /api/map/circle-ids — IDs des membres de mon cercle ──────────────────
router.get('/circle-ids', async (req: any, res) => {
  const circle = await prisma.circleMember.findMany({
    where: { OR: [{ userId: req.userId }, { partnerId: req.userId }] },
    select: { userId: true, partnerId: true },
  });
  const ids = new Set<string>();
  circle.forEach(c => {
    if (c.userId !== req.userId) ids.add(c.userId);
    if (c.partnerId !== req.userId) ids.add(c.partnerId);
  });
  res.json({ ids: Array.from(ids) });
});

// ── GET /api/map/stats — Statistiques positives de ma carte ──────────────────
router.get('/stats', async (req: any, res) => {
  const [msgCount, meetCount, circleCount] = await Promise.all([
    prisma.message.count({ where: { fromId: req.userId } }),
    prisma.meetingProposal.count({ where: { OR: [{ fromId: req.userId }, { toId: req.userId }], status: 'ACCEPTED' } }),
    prisma.circleMember.count({ where: { OR: [{ userId: req.userId }, { partnerId: req.userId }] } }),
  ]);
  res.json({ messagesSent: msgCount, meetingsConfirmed: meetCount, circleSize: circleCount });
});

// ── POST /api/map/meetings/:id/rate — Noter une rencontre ────────────────────
router.post('/meetings/:id/rate', async (req: any, res) => {
  const { rating, addToCircle } = req.body;
  if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Note invalide' });

  // Seuls les DEUX participants de la rencontre peuvent la noter
  const existing = await prisma.meetingProposal.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Rencontre introuvable' });
  if (existing.fromId !== req.userId && existing.toId !== req.userId) {
    return res.status(403).json({ error: 'Non autorisé' });
  }

  const proposal = await prisma.meetingProposal.update({
    where: { id: req.params.id },
    data: { status: 'RATED', rating }, // la note est enfin persistée
    include: { from: true, to: true },
  });

  // Ajouter au cercle si demandé
  if (addToCircle) {
    const partnerId = proposal.fromId === req.userId ? proposal.toId : proposal.fromId;
    await prisma.circleMember.upsert({
      where: { userId_partnerId: { userId: req.userId, partnerId } },
      update: { sessionCount: { increment: 1 } },
      create: { userId: req.userId, partnerId },
    });
  }

  res.json({ ok: true });
});

// ── GET /api/messages — Mes conversations ────────────────────────────────────
router.get('/messages', async (req: any, res) => {
  // Récupérer la dernière conversation avec chaque personne
  const sent = await prisma.message.findMany({
    where: { fromId: req.userId },
    include: { to: { select: { id: true, name: true, avatar: true, tdahType: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const received = await prisma.message.findMany({
    where: { toId: req.userId },
    include: { from: { select: { id: true, name: true, avatar: true, tdahType: true } } },
    orderBy: { createdAt: 'desc' },
  });

  // Construire la liste des conversations uniques
  const convMap = new Map<string, any>();

  sent.forEach(m => {
    if (!convMap.has(m.toId)) {
      convMap.set(m.toId, {
        user: m.to,
        lastMessage: m.content,
        lastAt: m.createdAt,
        unread: 0,
      });
    }
  });

  received.forEach(m => {
    const existing = convMap.get(m.fromId);
    if (!existing || m.createdAt > existing.lastAt) {
      convMap.set(m.fromId, {
        user: m.from,
        lastMessage: m.content,
        lastAt: m.createdAt,
        unread: m.readAt ? 0 : 1,
      });
    } else if (!m.readAt) {
      if (existing) existing.unread = (existing.unread || 0) + 1;
    }
  });

  const conversations = Array.from(convMap.values())
    .sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());

  res.json(conversations);
});

// ── GET /api/messages/:userId — Messages avec une personne ───────────────────
router.get('/messages/:userId', async (req: any, res) => {
  const otherId = req.params.userId;

  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { fromId: req.userId, toId: otherId },
        { fromId: otherId,   toId: req.userId },
      ],
    },
    orderBy: { createdAt: 'asc' },
    take: 100,
  });

  // Marquer les reçus comme lus
  await prisma.message.updateMany({
    where: { fromId: otherId, toId: req.userId, readAt: null },
    data: { readAt: new Date() },
  });

  res.json(messages);
});

// ── POST /api/messages/:userId — Envoyer un message ──────────────────────────
router.post('/messages/:userId', async (req: any, res) => {
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Message vide' });
  if (content.length > 500) return res.status(400).json({ error: 'Message trop long' });

  const message = await prisma.message.create({
    data: {
      fromId: req.userId,
      toId: req.params.userId,
      content: content.trim(),
    },
    include: {
      from: { select: { id: true, name: true, avatar: true } },
    },
  });

  // Notifier le destinataire en temps réel
  const io = req.app.get('io');
  if (io) {
    io.to(`user:${req.params.userId}`).emit('message:new', {
      id: message.id,
      fromId: message.fromId,
      from: message.from,
      content: message.content,
      createdAt: message.createdAt,
    });
  }

  res.status(201).json(message);
});

// ── GET /api/map/meetings — Mes propositions ─────────────────────────────────
router.get('/meetings', async (req: any, res) => {
  const proposals = await prisma.meetingProposal.findMany({
    where: {
      OR: [{ fromId: req.userId }, { toId: req.userId }],
      status: { not: 'DECLINED' },
    },
    include: {
      from: { select: { id: true, name: true, avatar: true } },
      to:   { select: { id: true, name: true, avatar: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(proposals);
});

// ── POST /api/map/meetings/:userId — Proposer une rencontre ──────────────────
router.post('/meetings/:userId', async (req: any, res) => {
  const schema = z.object({
    type: z.enum(['CAFE', 'LIBRARY', 'COWORKING', 'OUTDOOR']),
    proposedAt: z.string().datetime(),
    location: z.string().optional(),
    message: z.string().max(280).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Données invalides' });

  const proposal = await prisma.meetingProposal.create({
    data: {
      fromId: req.userId,
      toId: req.params.userId,
      ...parsed.data,
      proposedAt: new Date(parsed.data.proposedAt),
    },
    include: {
      from: { select: { id: true, name: true, avatar: true } },
    },
  });

  const io = req.app.get('io');
  if (io) {
    io.to(`user:${req.params.userId}`).emit('meeting:proposed', {
      id: proposal.id,
      from: proposal.from,
      type: proposal.type,
      proposedAt: proposal.proposedAt,
      location: proposal.location,
      message: proposal.message,
    });
  }

  res.status(201).json(proposal);
});

// ── POST /api/map/meetings/:id/accept — Accepter ─────────────────────────────
router.post('/meetings/:id/accept', async (req: any, res) => {
  // Seul le DESTINATAIRE de la proposition peut l'accepter
  const existing = await prisma.meetingProposal.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Proposition introuvable' });
  if (existing.toId !== req.userId) return res.status(403).json({ error: 'Non autorisé' });

  const proposal = await prisma.meetingProposal.update({
    where: { id: req.params.id },
    data: { status: 'ACCEPTED' },
    include: {
      from: { select: { id: true, name: true } },
      to:   { select: { id: true, name: true } },
    },
  });

  const io = req.app.get('io');
  if (io) {
    io.to(`user:${proposal.fromId}`).emit('meeting:accepted', {
      id: proposal.id,
      by: proposal.to,
      proposedAt: proposal.proposedAt,
      location: proposal.location,
    });
  }

  res.json(proposal);
});

// ── POST /api/map/meetings/:id/decline — Décliner ────────────────────────────
router.post('/meetings/:id/decline', async (req: any, res) => {
  // Seul le DESTINATAIRE de la proposition peut la décliner
  const existing = await prisma.meetingProposal.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Proposition introuvable' });
  if (existing.toId !== req.userId) return res.status(403).json({ error: 'Non autorisé' });

  const proposal = await prisma.meetingProposal.update({
    where: { id: req.params.id },
    data: { status: 'DECLINED' },
  });

  const io = req.app.get('io');
  if (io) {
    io.to(`user:${proposal.fromId}`).emit('meeting:declined', { id: proposal.id });
  }

  res.json(proposal);
});

export default router;
