import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// ── Setup multer upload ───────────────────────────────────────────────────────
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'forum');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename:    (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Format non supporté. Utilisez JPG, PNG, GIF ou WEBP.'));
  },
});

const router = Router();

const SPACES = ['STRATEGIES_TDAH', 'MEDICATION', 'OUTILS', 'TRAVAIL', 'ETUDES', 'VIE_PERSO'] as const;

// Schema création de post — images en string simple (pas .url() trop strict)
const postSchema = z.object({
  spaceId:  z.enum(SPACES),
  title:    z.string().max(120).default(''),
  content:  z.string().min(1).max(5000),
  tags:     z.array(z.string().max(30)).max(3).default([]),
  images:   z.array(z.string()).max(4).default([]),
  parentId: z.string().optional(),
});

// ── IMPORTANT : les routes spécifiques AVANT les routes paramétrées ──────────

// POST /api/forum/upload — Upload images avec gestion erreur multer
router.post('/upload', (req: any, res: any, next: any) => {
  // Envelopper multer pour capturer ses erreurs
  upload.array('images', 4)(req, res, (err: any) => {
    if (err) {
      console.error('❌ Multer upload error:', err.message);
      return res.status(400).json({ error: err.message || 'Erreur upload image' });
    }

    const files = req.files as Express.Multer.File[];
    console.log(`📸 Upload reçu: ${files?.length || 0} fichier(s)`);

    if (!files?.length) {
      return res.status(400).json({ error: 'Aucune image reçue' });
    }

    const BASE = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3001}`;
    const urls = files.map(f => {
      const url = `${BASE}/uploads/forum/${f.filename}`;
      console.log(`  → ${url}`);
      return url;
    });

    res.json({ urls });
  });
});

// GET /api/forum/stats/global — Stats communauté (AVANT /:space)
router.get('/stats/global', async (_req: AuthRequest, res) => {
  try {
    const [totalPosts, totalMembers, postsThisWeek] = await Promise.all([
      prisma.forumPost.count({ where: { parentId: null } }),
      prisma.user.count(),
      prisma.forumPost.count({
        where: {
          parentId: null,
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) },
        },
      }),
    ]);

    const trending = await prisma.forumPost.findMany({
      where: {
        parentId: null,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) },
      },
      include: {
        user: { select: { name: true, avatar: true } },
        _count: { select: { replies: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const activeMembers = await prisma.user.findMany({
      where: {
        forumPosts: {
          some: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) } },
        },
      },
      select: { id: true, name: true, avatar: true, tdahType: true },
      take: 8,
    });

    res.json({ totalPosts, totalMembers, postsThisWeek, trending, activeMembers });
  } catch (e) {
    console.error('forum/stats error:', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/forum/:space — Posts d'un espace
router.get('/:space', async (req: AuthRequest, res) => {
  try {
    const { sort = 'recent', search = '' } = req.query as Record<string, string>;
    const spaceId = req.params.space as any;

    // Vérifier que c'est un espace valide
    if (!SPACES.includes(spaceId)) {
      return res.status(400).json({ error: 'Espace invalide' });
    }

    const where: any = { spaceId, parentId: null };
    if (search.trim()) {
      where.OR = [
        { title:   { contains: search.trim(), mode: 'insensitive' } },
        { content: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    const posts = await prisma.forumPost.findMany({
      where,
      include: {
        user:    { select: { id: true, name: true, avatar: true, tdahType: true } },
        replies: {
          include: { user: { select: { id: true, name: true, avatar: true } } },
          orderBy: { createdAt: 'asc' },
          take: 15,
        },
        _count: { select: { replies: true } },
      },
      orderBy: sort === 'popular' ? { createdAt: 'desc' } : { createdAt: 'desc' },
      take: 60,
    });

    const result = sort === 'unanswered'
      ? posts.filter(p => p._count.replies === 0)
      : posts;

    res.json(result);
  } catch (e) {
    console.error('forum GET error:', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/forum — Créer un post ou une réponse
router.post('/', async (req: AuthRequest, res) => {
  try {
    const parsed = postSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Données invalides', details: parsed.error.errors });
    }

    const { spaceId, title, content, tags, images, parentId } = parsed.data;

    const post = await prisma.forumPost.create({
      data: {
        spaceId, title: title || '', content,
        tags: tags || [], images: images || [],
        parentId: parentId || null,
        userId: req.userId!, emojiReactions: {},
      },
      include: {
        user:   { select: { id: true, name: true, avatar: true, tdahType: true } },
        _count: { select: { replies: true } },
      },
    });

    // 🔔 Notifier l'auteur du post parent si c'est une réponse
    if (parentId) {
      const parent = await prisma.forumPost.findUnique({
        where: { id: parentId },
        select: { userId: true, title: true, content: true },
      });
      if (parent && parent.userId !== req.userId) {
        const io = req.app.get('io');
        if (io) {
          io.to(`user:${parent.userId}`).emit('forum:reply', {
            type: 'reply',
            postId: parentId,
            postTitle: parent.title || parent.content.slice(0, 60),
            replyId: post.id,
            fromUser: post.user,
            preview: content.slice(0, 100),
          });
        }
      }
    }

    res.status(201).json(post);
  } catch (err: any) {
    console.error('❌ POST /forum error:', err?.message);
    res.status(500).json({ error: 'Erreur serveur', message: err?.message });
  }
});

// POST /api/forum/:id/react — Réaction emoji
router.post('/:id/react', async (req: AuthRequest, res) => {
  try {
    const { emoji } = req.body;
    if (!emoji) return res.status(400).json({ error: 'Emoji requis' });

    const post = await prisma.forumPost.findUnique({ where: { id: req.params.id } });
    if (!post) return res.status(404).json({ error: 'Post introuvable' });

    const reactions = (post.emojiReactions as Record<string, number>) || {};
    reactions[emoji] = (reactions[emoji] || 0) + 1;

    // Notifier l'auteur de la réaction
    if (post.userId !== req.userId) {
      const reactor = await prisma.user.findUnique({
        where: { id: req.userId! },
        select: { name: true, avatar: true },
      });
      const io = req.app.get('io');
      if (io) {
        io.to(`user:${post.userId}`).emit('forum:reaction', {
          type: 'reaction',
          postId: post.id,
          postTitle: (post as any).title || post.content.slice(0, 60),
          emoji,
          fromUser: reactor,
        });
      }
    }

    const updated = await prisma.forumPost.update({
      where: { id: req.params.id },
      data:  { emojiReactions: reactions },
    });
    res.json({ reactions: updated.emojiReactions });
  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/forum/:id — Supprimer son post
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const post = await prisma.forumPost.findUnique({ where: { id: req.params.id } });
    if (!post)                      return res.status(404).json({ error: 'Post introuvable' });
    if (post.userId !== req.userId) return res.status(403).json({ error: 'Non autorisé' });

    // Supprimer les réponses puis le post
    await prisma.forumPost.deleteMany({ where: { parentId: req.params.id } });
    await prisma.forumPost.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
