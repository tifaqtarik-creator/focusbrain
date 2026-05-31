import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/matching/circle-online — membres du cercle en ligne
router.get('/circle-online', async (req: AuthRequest, res) => {
  try {
    const circle = await prisma.circleMember.findMany({
      where: { userId: req.userId! },
      include: { partner: { select: { id: true, name: true, avatar: true } } },
    });
    res.json(circle.map(c => c.partner));
  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/matching/circle/:partnerId — ajouter au cercle
router.post('/circle/:partnerId', async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId! } });
    const isPremium = user?.isPremium;

    const circleCount = await prisma.circleMember.count({ where: { userId: req.userId! } });
    const maxCircle = isPremium ? 5 : 1;

    if (circleCount >= maxCircle) {
      return res.status(403).json({
        error: isPremium
          ? 'Cercle de confiance complet (5 partenaires max)'
          : 'Plan gratuit : 1 partenaire max. Passe en Premium pour 5 partenaires.',
      });
    }

    const member = await prisma.circleMember.create({
      data: { userId: req.userId!, partnerId: req.params.partnerId },
    });
    res.status(201).json(member);
  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/matching/circle/:partnerId
router.delete('/circle/:partnerId', async (req: AuthRequest, res) => {
  try {
    await prisma.circleMember.deleteMany({
      where: { userId: req.userId!, partnerId: req.params.partnerId },
    });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
