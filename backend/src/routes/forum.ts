import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';

const router = Router();

const postSchema = z.object({
  spaceId: z.enum(['STRATEGIES_TDAH', 'MEDICATION', 'OUTILS', 'TRAVAIL', 'ETUDES', 'VIE_PERSO']),
  content: z.string().min(1).max(5000),
  parentId: z.string().optional(),
});

// GET /api/forum/:space
router.get('/:space', async (req: AuthRequest, res) => {
  try {
    const posts = await prisma.forumPost.findMany({
      where: {
        spaceId: req.params.space as any,
        parentId: null,
      },
      include: {
        user: { select: { id: true, name: true, avatar: true, tdahType: true } },
        replies: {
          include: { user: { select: { id: true, name: true, avatar: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(posts);
  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/forum — créer un post (participation = Premium)
router.post('/', async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId! } });
    if (!user?.isPremium) {
      return res.status(403).json({ error: 'La participation au forum est réservée aux membres Premium.' });
    }

    const data = postSchema.parse(req.body);
    const post = await prisma.forumPost.create({
      data: { ...data, userId: req.userId! },
      include: { user: { select: { id: true, name: true, avatar: true, tdahType: true } } },
    });
    res.status(201).json(post);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/forum/:id/react — réaction emoji (sans compteur visible)
router.post('/:id/react', async (req: AuthRequest, res) => {
  try {
    const { emoji } = req.body;
    if (!emoji) return res.status(400).json({ error: 'Emoji requis' });

    const post = await prisma.forumPost.findUnique({ where: { id: req.params.id } });
    if (!post) return res.status(404).json({ error: 'Post introuvable' });

    const reactions = (post.emojiReactions as Record<string, number>) || {};
    reactions[emoji] = (reactions[emoji] || 0) + 1;

    await prisma.forumPost.update({ where: { id: req.params.id }, data: { emojiReactions: reactions } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
