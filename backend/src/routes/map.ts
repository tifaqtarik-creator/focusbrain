import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

// Flouter la position pour protéger la vie privée (~±3km)
function fuzzCoord(coord: number): number {
  return coord + (Math.random() - 0.5) * 0.055;
}

// ── GET /api/map/members — Membres visibles sur la carte ─────────────────────
router.get('/members', async (req: any, res) => {
  const { tdahType, available, maxKm } = req.query;

  const locations = await prisma.userLocation.findMany({
    where: { isVisible: true, userId: { not: req.userId } },
    include: {
      user: {
        select: {
          id: true, name: true, avatar: true,
          tdahType: true, workStyle: true,
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
    city: l.city,
    lat: fuzzCoord(l.lat),   // position floutée
    lng: fuzzCoord(l.lng),
    isAvailable: true,        // TODO: lier au statut socket
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
