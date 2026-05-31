import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';

const router = Router();

const updateProfileSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  timezone: z.string().optional(),
  tdahType: z.enum(['INATTENTIF', 'HYPERACTIF', 'COMBINE', 'NON_SPECIFIE', 'PREFERE_NE_PAS_DIRE']).optional(),
  workStyle: z.enum(['SILENCIEUX', 'SOCIAL', 'FLEXIBLE']).optional(),
  lowStimMode: z.boolean().optional(),
  sensitivities: z.array(z.string()).optional(),
  goals: z.array(z.string()).optional(),
});

// GET /api/users/me
router.get('/me', async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: {
        id: true, email: true, name: true, avatar: true, timezone: true,
        tdahType: true, workStyle: true, sensitivities: true, goals: true,
        role: true, isPremium: true, lowStimMode: true, createdAt: true,
        badges: true,
        circleAs: { include: { partner: { select: { id: true, name: true, avatar: true } } } },
      },
    });
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

    // Stats positives uniquement
    const totalSessions = await prisma.participant.count({ where: { userId: req.userId! } });
    const totalMinutes = await prisma.participant.findMany({
      where: { userId: req.userId!, leftAt: { not: null } },
      include: { session: { select: { duration: true } } },
    });
    const focusHours = totalMinutes.reduce((acc, p) => acc + p.session.duration, 0);
    const uniquePartners = await prisma.participant.groupBy({
      by: ['sessionId'],
      where: { userId: req.userId! },
    });

    res.json({ ...user, stats: { totalSessions, focusMinutes: focusHours, uniquePartners: uniquePartners.length } });
  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PATCH /api/users/me
router.patch('/me', async (req: AuthRequest, res) => {
  try {
    const data = updateProfileSchema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.userId! },
      data,
      select: {
        id: true, email: true, name: true, avatar: true, timezone: true,
        tdahType: true, workStyle: true, lowStimMode: true, role: true, isPremium: true,
      },
    });
    res.json(user);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/users/me — droit à l'oubli RGPD <72h
router.delete('/me', async (req: AuthRequest, res) => {
  try {
    await prisma.user.delete({ where: { id: req.userId! } });
    res.json({ success: true, message: 'Compte supprimé. Toutes tes données seront effacées sous 72h.' });
  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/users/:id — profil public
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, name: true, avatar: true, tdahType: true, workStyle: true, createdAt: true,
        badges: { select: { type: true, earnedAt: true } },
      },
    });
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
