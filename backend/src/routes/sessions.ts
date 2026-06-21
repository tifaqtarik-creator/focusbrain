import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';

const router = Router();

const createSessionSchema = z.object({
  duration: z.number().refine(d => [15, 25, 50, 75].includes(d), 'Durée invalide'),
  quietMode: z.boolean().default(false),
  cameraOff: z.boolean().default(false),
});

const moodSchema = z.object({
  energy: z.number().min(1).max(5),
  stress: z.number().min(1).max(5),
  anxiety: z.number().min(1).max(5),
  focus: z.number().min(1).max(5),
  fatigue: z.number().min(1).max(5),
  task: z.string().max(200).optional(),
});

// POST /api/sessions — créer une session (matching lancé via socket)
router.post('/', async (req: AuthRequest, res) => {
  try {
    const data = createSessionSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: req.userId! } });
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

    // Vérification plan gratuit : max 3 sessions/semaine, durée 25min uniquement
    if (!user.isPremium) {
      if (data.duration !== 25) {
        return res.status(403).json({ error: 'Plan gratuit : durée 25 min uniquement. Passe en Premium pour plus.' });
      }
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const weekSessions = await prisma.participant.count({
        where: { userId: req.userId!, joinedAt: { gte: weekAgo } },
      });
      if (weekSessions >= 3) {
        return res.status(403).json({ error: 'Limite de 3 sessions/semaine atteinte. Passe en Premium.' });
      }
    }

    const session = await prisma.session.create({
      data: {
        duration: data.duration,
        quietMode: data.quietMode,
        cameraOff: data.cameraOff,
        status: 'WAITING',
      },
    });

    res.status(201).json(session);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/sessions/:id/mood — check-in humeur
router.post('/:id/mood', async (req: AuthRequest, res) => {
  try {
    const data = moodSchema.parse(req.body);

    const participant = await prisma.participant.findFirst({
      where: { sessionId: req.params.id, userId: req.userId! },
    });
    if (!participant) return res.status(403).json({ error: 'Non participant à cette session' });

    const moodLog = await prisma.moodLog.create({
      data: { ...data, userId: req.userId!, sessionId: req.params.id },
    });

    if (data.task) {
      await prisma.participant.update({
        where: { id: participant.id },
        data: { task: data.task },
      });
    }

    res.json(moodLog);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/sessions/:id/leave — quitter sans friction
router.post('/:id/leave', async (req: AuthRequest, res) => {
  try {
    await prisma.participant.updateMany({
      where: { sessionId: req.params.id, userId: req.userId!, leftAt: null },
      data: { leftAt: new Date() },
    });

    const remaining = await prisma.participant.count({
      where: { sessionId: req.params.id, leftAt: null },
    });

    if (remaining === 0) {
      await prisma.session.update({
        where: { id: req.params.id },
        data: { status: 'DONE', endTime: new Date() },
      });
    }

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/sessions/history — historique positif uniquement
router.get('/history', async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId! } });
    const since = user?.isPremium ? undefined : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const sessions = await prisma.participant.findMany({
      where: {
        userId: req.userId!,
        ...(since ? { joinedAt: { gte: since } } : {}),
      },
      include: { session: true },
      orderBy: { joinedAt: 'desc' },
      take: 50,
    });

    res.json(sessions);
  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
