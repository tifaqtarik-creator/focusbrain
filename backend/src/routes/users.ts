import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// ── Upload photo de profil (avatar) ──────────────────────────────────────────
const AVATAR_DIR = path.join(process.cwd(), 'uploads', 'avatars');
if (!fs.existsSync(AVATAR_DIR)) fs.mkdirSync(AVATAR_DIR, { recursive: true });

const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, AVATAR_DIR),
    filename:    (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 Mo
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Format non supporté. Utilisez JPG, PNG, GIF ou WEBP.'));
  },
});

const updateProfileSchema = z.object({
  name:            z.string().min(1).max(50).optional(),
  bio:             z.string().max(200).optional(),
  timezone:        z.string().optional(),
  gender:          z.enum(['HOMME','FEMME','NON_BINAIRE','PREFERE_NE_PAS_DIRE']).optional(),
  birthDate:       z.string().optional(),
  phone:           z.string().optional(),
  tdahType:        z.enum(['INATTENTIF','HYPERACTIF','COMBINE','NON_SPECIFIE','PREFERE_NE_PAS_DIRE']).optional(),
  diagnosisStatus: z.enum(['DIAGNOSTIQUE','EN_COURS','AUTO_DIAGNOSTIQUE','NON_DIAGNOSTIQUE']).optional(),
  workStyle:       z.enum(['SILENCIEUX','SOCIAL','FLEXIBLE']).optional(),
  workObjectives:  z.array(z.string()).optional(),
  availabilities:  z.array(z.string()).optional(),
  lowStimMode:     z.boolean().optional(),
  sensitivities:   z.array(z.string()).optional(),
  goals:           z.array(z.string()).optional(),
  preferredLanguages: z.array(z.string().max(5)).max(10).optional(),
  onboardingDone:  z.boolean().optional(),
  // Avatar ADAH AI
  aiAvatarUrl:     z.string().optional(),
  aiAvatarGender:  z.enum(['FEMME', 'HOMME']).optional(),
  aiVoicePref:     z.enum(['douce', 'posee', 'dynamique']).optional(),
  aiAvatarStyle:   z.enum(['chaleureux', 'direct']).optional(),
});

// GET /api/users/me
router.get('/me', async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: {
        id: true, email: true, name: true, avatar: true, timezone: true,
        tdahType: true, workStyle: true, sensitivities: true, goals: true,
        preferredLanguages: true,
        role: true, isPremium: true, lowStimMode: true, createdAt: true,
        badges: true,
        aiAvatarUrl: true, aiAvatarGender: true, aiVoicePref: true, aiAvatarStyle: true,
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
    const parsed = updateProfileSchema.parse(req.body);

    // Convertir birthDate string → DateTime
    const updateData: any = { ...parsed };
    if (parsed.birthDate) {
      updateData.birthDate = new Date(parsed.birthDate);
    }

    const user = await prisma.user.update({
      where: { id: req.userId! },
      data: updateData,
      select: {
        id: true, email: true, name: true, avatar: true, timezone: true,
        phone: true, gender: true, birthDate: true,
        tdahType: true, diagnosisStatus: true,
        workStyle: true, workObjectives: true, availabilities: true,
        preferredLanguages: true,
        lowStimMode: true, role: true, isPremium: true,
        onboardingDone: true, bio: true,
        aiAvatarUrl: true, aiAvatarGender: true, aiVoicePref: true, aiAvatarStyle: true,
      },
    });
    res.json(user);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/users/me/avatar — Changer sa photo de profil
router.post('/me/avatar', (req: AuthRequest, res) => {
  avatarUpload.single('avatar')(req as any, res as any, async (err: any) => {
    if (err) return res.status(400).json({ error: err.message || 'Erreur upload' });
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) return res.status(400).json({ error: 'Aucune image reçue' });

    const BASE = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3001}`;
    const avatarUrl = `${BASE}/uploads/avatars/${file.filename}`;

    try {
      // Supprimer l'ancienne photo locale (si hébergée chez nous)
      const prev = await prisma.user.findUnique({ where: { id: req.userId! }, select: { avatar: true } });
      if (prev?.avatar && prev.avatar.includes('/uploads/avatars/')) {
        const oldPath = path.join(AVATAR_DIR, path.basename(prev.avatar));
        fs.promises.unlink(oldPath).catch(() => {});
      }
      const user = await prisma.user.update({
        where: { id: req.userId! },
        data: { avatar: avatarUrl },
        select: { id: true, name: true, avatar: true },
      });
      res.json({ avatar: user.avatar, user });
    } catch {
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });
});

// DELETE /api/users/me/avatar — Retirer sa photo de profil
router.delete('/me/avatar', async (req: AuthRequest, res) => {
  try {
    const prev = await prisma.user.findUnique({ where: { id: req.userId! }, select: { avatar: true } });
    if (prev?.avatar && prev.avatar.includes('/uploads/avatars/')) {
      fs.promises.unlink(path.join(AVATAR_DIR, path.basename(prev.avatar))).catch(() => {});
    }
    await prisma.user.update({ where: { id: req.userId! }, data: { avatar: null } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/users/me/stats — KPIs personnels TDAH
router.get('/me/stats', async (req: AuthRequest, res) => {
  try {
    const uid = req.userId!;
    const weekAgo  = new Date(Date.now() - 7  * 24 * 3600 * 1000);
    const monthAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);

    const [
      totalPosts, postsThisWeek,
      totalReplies, repliesThisWeek,
      reactionsReceived,
      bdSessions, bdSessionsWeek,
      circleSize,
      meetingsConfirmed,
      myPosts,
    ] = await Promise.all([
      // Posts forum
      prisma.forumPost.count({ where: { userId: uid, parentId: null } }),
      prisma.forumPost.count({ where: { userId: uid, parentId: null, createdAt: { gte: weekAgo } } }),
      // Réponses forum
      prisma.forumPost.count({ where: { userId: uid, parentId: { not: null } } }),
      prisma.forumPost.count({ where: { userId: uid, parentId: { not: null }, createdAt: { gte: weekAgo } } }),
      // Réactions reçues sur mes posts (total)
      prisma.forumPost.findMany({ where: { userId: uid }, select: { emojiReactions: true } }),
      // Sessions body doubling
      prisma.slot.count({ where: { OR: [{ creatorId: uid }, { partnerId: uid }], status: 'CONFIRMED' } }),
      prisma.slot.count({ where: { OR: [{ creatorId: uid }, { partnerId: uid }], status: 'CONFIRMED', createdAt: { gte: weekAgo } } }),
      // Cercle
      prisma.circleMember.count({ where: { OR: [{ userId: uid }, { partnerId: uid }] } }),
      // Rencontres physiques confirmées
      prisma.meetingProposal.count({ where: { OR: [{ fromId: uid }, { toId: uid }], status: 'ACCEPTED' } }),
      // Mes posts récents avec leurs réponses
      prisma.forumPost.findMany({
        where: { userId: uid, parentId: null },
        select: {
          id: true, title: true, content: true, spaceId: true,
          emojiReactions: true, createdAt: true,
          _count: { select: { replies: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    // Calcul total réactions reçues
    const totalReactionsReceived = reactionsReceived.reduce((acc, post) => {
      const r = (post.emojiReactions as Record<string, number>) || {};
      return acc + Object.values(r).reduce((a, b) => a + b, 0);
    }, 0);

    // Réponses reçues sur mes posts
    const repliesOnMyPosts = await prisma.forumPost.count({
      where: {
        parentId: { in: myPosts.map(p => p.id) },
        userId: { not: uid },
      },
    });
    const repliesThisWeekOnMyPosts = await prisma.forumPost.count({
      where: {
        parentId: { in: myPosts.map(p => p.id) },
        userId: { not: uid },
        createdAt: { gte: weekAgo },
      },
    });

    // Messages envoyés
    const messagesSent = await prisma.message.count({ where: { fromId: uid } });
    const messagesThisWeek = await prisma.message.count({ where: { fromId: uid, createdAt: { gte: weekAgo } } });

    res.json({
      // Posts & contributions
      totalPosts, postsThisWeek,
      totalReplies, repliesThisWeek,
      totalReactionsReceived,
      repliesOnMyPosts, repliesThisWeekOnMyPosts,
      // Connexions
      circleSize,
      messagesSent, messagesThisWeek,
      // Sessions & rencontres
      bdSessions, bdSessionsWeek,
      meetingsConfirmed,
      // Posts récents
      recentPosts: myPosts,
    });
  } catch (err: any) {
    console.error('stats error:', err);
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
