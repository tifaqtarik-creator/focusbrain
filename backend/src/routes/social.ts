/**
 * social.ts — Favoris / re-match (Body Doubling)
 */
import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// ── GET /api/social/favorites — Mes partenaires favoris ──────────────────────
router.get('/favorites', async (req: any, res) => {
  const favs = await prisma.favorite.findMany({
    where: { userId: req.userId },
    include: {
      target: {
        select: {
          id: true, name: true, avatar: true, tdahType: true,
          sessionsCompleted: true, sessionsNoShow: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(favs.map(f => f.target));
});

// ── GET /api/social/favorites/ids — Juste les IDs (pour l'UI étoile) ─────────
router.get('/favorites/ids', async (req: any, res) => {
  const favs = await prisma.favorite.findMany({
    where: { userId: req.userId },
    select: { targetId: true },
  });
  res.json(favs.map(f => f.targetId));
});

// ── POST /api/social/favorites/:targetId — Ajouter un favori ─────────────────
router.post('/favorites/:targetId', async (req: any, res) => {
  const { targetId } = req.params;
  if (targetId === req.userId) return res.status(400).json({ error: 'Impossible de s\'ajouter soi-même' });
  const exists = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true } });
  if (!exists) return res.status(404).json({ error: 'Utilisateur introuvable' });

  const fav = await prisma.favorite.upsert({
    where: { userId_targetId: { userId: req.userId, targetId } },
    update: {},
    create: { userId: req.userId, targetId },
  });
  res.status(201).json(fav);
});

// ── DELETE /api/social/favorites/:targetId — Retirer un favori ───────────────
router.delete('/favorites/:targetId', async (req: any, res) => {
  await prisma.favorite.deleteMany({ where: { userId: req.userId, targetId: req.params.targetId } });
  res.json({ success: true });
});

export default router;
