/**
 * adah.ts — Routes ADAH AI (Assistant TCC pour TDAH)
 *
 * POST /api/adah/sessions           → Créer une session
 * GET  /api/adah/sessions           → Mes sessions
 * GET  /api/adah/sessions/:id       → Session + messages
 * POST /api/adah/sessions/:id/chat  → Streaming Claude Sonnet
 * POST /api/adah/sessions/:id/end   → Clore + générer résumé
 * GET  /api/adah/memory             → Mémoire long terme
 * POST /api/adah/voice/transcribe   → Token Deepgram (Phase 2)
 */
import { Router } from 'express';
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';

const router = Router();

// Lire la clé Anthropic directement depuis .env (contourne les problèmes dotenv)
function getAnthropicKey(): string {
  // 1. Via process.env (dotenv standard)
  if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.length > 10) {
    return process.env.ANTHROPIC_API_KEY;
  }
  // 2. Fallback : parse le fichier .env directement
  try {
    const envPath = require('path').join(process.cwd(), '.env');
    const lines = require('fs').readFileSync(envPath, 'utf8').split('\n');
    const line = lines.find((l: string) => l.startsWith('ANTHROPIC_API_KEY='));
    if (line) {
      const val = line.split('=').slice(1).join('=').trim().replace(/^"|"$/g, '');
      if (val.length > 10) return val;
    }
  } catch { /* ignore */ }
  return '';
}

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) {
    const apiKey = getAnthropicKey();
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

// ── Détection de langue ───────────────────────────────────────────────────────
function detectLanguage(text: string): 'fr' | 'en' | 'ar' {
  const arabicPattern = /[؀-ۿݐ-ݿ]/;
  if (arabicPattern.test(text)) return 'ar';
  const frWords = /\b(je|tu|il|elle|nous|vous|ils|est|sont|avoir|être|avec|pour|dans|sur|une|les|des|mon|ton|son)\b/i;
  if (frWords.test(text)) return 'fr';
  return 'en';
}

// ── Prompts multilingues TCC TDAH ────────────────────────────────────────────
const SYSTEM_PROMPTS = {
  fr: (user: any) => `Tu es ADAH AI, assistant TCC spécialisé TDAH adulte.

PROFIL : ${user?.name?.split(' ')[0] || 'toi'} · TDAH ${user?.tdahType || ''} · ${user?.diagnosisStatus || ''}
OBJECTIFS : ${user?.workObjectives?.join(', ') || 'focus et organisation'}

RÈGLES STRICTES (cerveau TDAH) :
1. MAX 3 phrases par réponse — jamais plus
2. UNE seule question à la fois
3. UN seul pas concret en fin de réponse
4. INTERDIT : "tu aurais dû", "c'est simple", "il suffit de"
5. Valider l'émotion AVANT de proposer une action
6. Langage chaleureux, direct, sans condescendance

DOMAINES : procrastination, démarrage tâches, RSD, routines, focus, auto-compassion
LIMITE : pas de diagnostic médical. Crise sévère → professionnel de santé.`,

  en: (user: any) => `You are ADAH AI, a CBT assistant specialized for adult ADHD.

PROFILE: ${user?.name?.split(' ')[0] || 'you'} · ADHD ${user?.tdahType || ''} · ${user?.diagnosisStatus || ''}
GOALS: ${user?.workObjectives?.join(', ') || 'focus and organization'}

STRICT RULES (ADHD brain):
1. MAX 3 sentences per response — never more
2. ONE question at a time
3. ONE concrete next step at the end
4. FORBIDDEN: "you should have", "it's easy", "just do"
5. Validate emotion BEFORE suggesting action
6. Warm, direct tone — no condescension

AREAS: procrastination, task initiation, RSD, routines, focus, self-compassion
LIMIT: no medical diagnosis. Severe crisis → mental health professional.`,

  ar: (user: any) => `أنت ADAH AI، مساعد متخصص في العلاج المعرفي السلوكي لاضطراب TDAH لدى البالغين.

الملف الشخصي: ${user?.name?.split(' ')[0] || 'أنت'} · TDAH ${user?.tdahType || ''} · ${user?.diagnosisStatus || ''}
الأهداف: التركيز والتنظيم

القواعد الصارمة (دماغ TDAH):
1. ثلاث جمل فقط كحد أقصى في كل رد
2. سؤال واحد فقط في كل مرة
3. خطوة عملية واحدة في نهاية كل رد
4. ممنوع: "كان يجب عليك"، "الأمر بسيط"
5. التحقق من المشاعر أولاً قبل اقتراح أي حل
6. أسلوب دافئ ومباشر

المجالات: التسويف، بدء المهام، التنظيم، التركيز، الروتين، الرحمة بالنفس
تنبيه: لا تشخيص طبي. الأزمات الحادة → متخصص صحة نفسية.`,
};

function buildSystemPrompt(user: any, lang: 'fr' | 'en' | 'ar' = 'fr'): string {
  const builder = SYSTEM_PROMPTS[lang] || SYSTEM_PROMPTS.fr;
  return builder(user);
}

// ── Prompts par PHASE TCC (session audio guidée) ─────────────────────────────
export const TCC_PHASES = [
  {
    key: 'psychoeducation',
    label: 'Psychoéducation',
    prompt: `Tu es un thérapeute TCC spécialisé TDAH. PHASE : Psychoéducation.
Aide l'utilisateur à comprendre son TDAH (attention, impulsivité, hyperactivité).
Pose UNE seule question ouverte par tour. Valide ses émotions.
Réponds en 2-3 phrases MAX, langage chaleureux et accessible. Français uniquement.`,
  },
  {
    key: 'pensees',
    label: 'Pensées automatiques',
    prompt: `Tu es un thérapeute TCC spécialisé TDAH. PHASE : Identification des pensées automatiques.
Guide l'identification des pensées négatives liées au TDAH (ex: "je suis nul", "je n'y arriverai jamais").
Utilise la technique de la flèche descendante si pertinent. UNE question par tour. 2-3 phrases MAX.`,
  },
  {
    key: 'restructuration',
    label: 'Restructuration cognitive',
    prompt: `Tu es un thérapeute TCC spécialisé TDAH. PHASE : Restructuration cognitive.
Aide à challenger et reformuler les pensées automatiques identifiées.
Utilise le questionnement socratique. Propose des pensées alternatives équilibrées. 2-3 phrases MAX.`,
  },
  {
    key: 'activation',
    label: 'Activation comportementale',
    prompt: `Tu es un thérapeute TCC spécialisé TDAH. PHASE : Activation comportementale.
Propose des micro-objectifs concrets adaptés au TDAH (petites tâches, récompenses immédiates).
Encourage, célèbre les progrès. 2-3 phrases MAX.`,
  },
];

function buildPhasePrompt(user: any, phaseIndex: number): string {
  const phase = TCC_PHASES[phaseIndex] || TCC_PHASES[0];
  const first = user?.name?.split(' ')[0] || '';
  return `${phase.prompt}\n\nPrénom de l'utilisateur : ${first}. TDAH : ${user?.tdahType || 'non précisé'}.\nRÈGLE ABSOLUE : maximum 3 phrases courtes, ton bienveillant, jamais de jugement.`;
}

// ── POST /api/adah/sessions — Créer une session ───────────────────────────────
router.post('/sessions', async (req: AuthRequest, res) => {
  const { mode = 'chat', mood, title } = req.body;

  const user = await prisma.user.findUnique({
    where: { id: req.userId! },
    select: { id: true, name: true, tdahType: true, diagnosisStatus: true, workObjectives: true },
  });

  const session = await prisma.adahSession.create({
    data: {
      userId: req.userId!,
      mode,
      mood: mood || null,
      title: title || `Session TCC — ${new Date().toLocaleDateString('fr')}`,
    },
  });

  res.status(201).json({ session, user });
});

// ── GET /api/adah/sessions — Mes sessions ─────────────────────────────────────
router.get('/sessions', async (req: AuthRequest, res) => {
  const sessions = await prisma.adahSession.findMany({
    where: { userId: req.userId! },
    select: {
      id: true, title: true, mode: true, mood: true,
      summary: true, duration: true, phaseIndex: true, createdAt: true, updatedAt: true,
      _count: { select: { messages: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 50,
  });
  res.json(sessions);
});

// ── GET /api/adah/sessions/:id — Session + messages ───────────────────────────
router.get('/sessions/:id', async (req: AuthRequest, res) => {
  const session = await prisma.adahSession.findFirst({
    where: { id: req.params.id, userId: req.userId! },
    include: {
      messages: { orderBy: { createdAt: 'asc' } },
    },
  });
  if (!session) return res.status(404).json({ error: 'Session introuvable' });
  res.json(session);
});

// ── PATCH /api/adah/sessions/:id — Renommer / changer phase / durée ──────────
router.patch('/sessions/:id', async (req: AuthRequest, res) => {
  const { title, phaseIndex, duration } = req.body;
  const session = await prisma.adahSession.findFirst({
    where: { id: req.params.id, userId: req.userId! },
  });
  if (!session) return res.status(404).json({ error: 'Session introuvable' });

  const data: any = {};
  if (typeof title === 'string' && title.trim()) data.title = title.trim().slice(0, 80);
  if (typeof phaseIndex === 'number' && phaseIndex >= 0 && phaseIndex <= 3) data.phaseIndex = phaseIndex;
  if (typeof duration === 'number') data.duration = duration;

  const updated = await prisma.adahSession.update({ where: { id: req.params.id }, data });
  res.json(updated);
});

// ── DELETE /api/adah/sessions/:id — Supprimer une session ────────────────────
router.delete('/sessions/:id', async (req: AuthRequest, res) => {
  const session = await prisma.adahSession.findFirst({
    where: { id: req.params.id, userId: req.userId! },
  });
  if (!session) return res.status(404).json({ error: 'Session introuvable' });
  await prisma.adahMessage.deleteMany({ where: { sessionId: req.params.id } });
  await prisma.adahSession.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

// ── POST /api/adah/sessions/:id/title — Titre intelligent auto ───────────────
router.post('/sessions/:id/title', async (req: AuthRequest, res) => {
  const session = await prisma.adahSession.findFirst({
    where: { id: req.params.id, userId: req.userId! },
    include: { messages: { orderBy: { createdAt: 'asc' }, take: 6 } },
  });
  if (!session) return res.status(404).json({ error: 'Session introuvable' });

  // Construire un extrait de la conversation
  const convo = session.messages
    .map(m => `${m.role === 'user' ? 'Utilisateur' : 'ADAH'}: ${m.content}`)
    .join('\n')
    .slice(0, 1500);

  if (convo.length < 10) return res.json({ title: session.title });

  try {
    const resp = await getClient().messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 24,
      messages: [{
        role: 'user',
        content: `Résume le SUJET de cette conversation TCC/TDAH en un titre court, clair et bien orthographié (3 à 6 mots, en français, sans guillemets, sans ponctuation finale, première lettre majuscule).

Exemples de bons titres : "Démarrer une tâche difficile", "Gérer l'anxiété au travail", "Routine du matin", "Procrastination et culpabilité".

Conversation :
${convo}

Titre :`,
      }],
    });

    let title = resp.content[0].type === 'text' ? resp.content[0].text.trim() : '';
    title = title.replace(/^["'«»\s]+|["'«».\s]+$/g, '').slice(0, 60);
    if (!title) title = session.title;

    const updated = await prisma.adahSession.update({
      where: { id: session.id },
      data: { title },
    });
    res.json({ title: updated.title });
  } catch (err: any) {
    res.json({ title: session.title }); // fallback : garde l'ancien titre
  }
});

// ── POST /api/adah/sessions/:id/chat — Streaming Claude Sonnet ────────────────
router.post('/sessions/:id/chat', async (req: AuthRequest, res) => {
  const schema = z.object({ message: z.string().min(1).max(2000) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Message invalide' });

  const session = await prisma.adahSession.findFirst({
    where: { id: req.params.id, userId: req.userId! },
    include: { messages: { orderBy: { createdAt: 'asc' }, take: 20 } },
  });
  if (!session) return res.status(404).json({ error: 'Session introuvable' });

  const user = await prisma.user.findUnique({
    where: { id: req.userId! },
    select: { name: true, tdahType: true, diagnosisStatus: true, workObjectives: true },
  });

  // Récupérer la mémoire long terme (3 souvenirs les + récents)
  const memories = await prisma.adahMemory.findMany({
    where: { userId: req.userId! },
    orderBy: [{ relevance: 'desc' }, { createdAt: 'desc' }],
    take: 3,
    select: { content: true, type: true },
  });

  // Construire l'historique de messages pour l'API
  const history: Anthropic.MessageParam[] = session.messages.map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

  // Choix du prompt : phase TCC (session audio guidée) ou prompt général
  const lang = detectLanguage(parsed.data.message);
  const phaseParam = req.body.phase;
  const videoMode = req.body.videoMode === true;
  let systemPrompt: string;
  if ((session.mode === 'audio_tcc' || session.mode === 'video_tcc' || typeof phaseParam === 'number') && lang === 'fr') {
    const phaseIdx = typeof phaseParam === 'number' ? phaseParam : (session as any).phaseIndex || 0;
    systemPrompt = buildPhasePrompt(user, phaseIdx);
  } else {
    systemPrompt = buildSystemPrompt(user, lang);
  }
  // Mode vidéo : Claude génère une expression faciale pour l'avatar
  if (videoMode) {
    systemPrompt += `\n\nAVATAR VIDÉO : À la TOUTE FIN de ta réponse, ajoute sur une nouvelle ligne une balise d'expression faciale parmi :
[EXPRESSION:smile] [EXPRESSION:attentive] [EXPRESSION:encouraging] [EXPRESSION:thinking] [EXPRESSION:empathetic] [EXPRESSION:neutral]
Choisis selon le ton émotionnel de ta réponse (empathetic si l'utilisateur exprime une détresse, encouraging pour féliciter, etc.).`;
  }
  if (memories.length > 0) {
    systemPrompt += `\n\nMÉMOIRE DES SESSIONS PRÉCÉDENTES :\n`;
    memories.forEach(m => {
      systemPrompt += `- [${m.type}] ${m.content}\n`;
    });
  }

  // Sauvegarder le message utilisateur
  await prisma.adahMessage.create({
    data: { sessionId: session.id, role: 'user', content: parsed.data.message },
  });

  // Préparer le streaming
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  let fullResponse = '';

  try {
    const stream = await getClient().messages.stream({
      model: 'claude-sonnet-4-5',
      max_tokens: 600,   // jusqu'à 3 courts paragraphes (TDAH-friendly)
      system: systemPrompt,
      messages: [...history, { role: 'user', content: parsed.data.message }],
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        const text = chunk.delta.text;
        fullResponse += text;
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    const finalMsg = await stream.finalMessage();
    const tokens   = finalMsg.usage?.output_tokens || 0;

    // Sauvegarder la réponse
    await prisma.adahMessage.create({
      data: {
        sessionId: session.id,
        role: 'assistant',
        content: fullResponse,
        tokens,
      },
    });

    res.write(`data: ${JSON.stringify({ done: true, tokens })}\n\n`);
    res.end();

  } catch (err: any) {
    console.error('❌ ADAH AI stream error:', err.message);
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

// ── POST /api/adah/sessions/:id/end — Clore + résumé auto ────────────────────
router.post('/sessions/:id/end', async (req: AuthRequest, res) => {
  const session = await prisma.adahSession.findFirst({
    where: { id: req.params.id, userId: req.userId! },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });
  if (!session) return res.status(404).json({ error: 'Session introuvable' });

  const duration = Math.floor((Date.now() - session.createdAt.getTime()) / 1000);
  const convo = session.messages.map(m => `${m.role}: ${m.content}`).join('\n');

  if (convo.length < 50) {
    await prisma.adahSession.update({
      where: { id: session.id },
      data: { duration },
    });
    return res.json({ summary: null });
  }

  try {
    // Générer résumé + insights avec Claude Haiku (rapide + économique)
    const summaryResp = await getClient().messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `Résume cette session TCC TDAH en 2-3 phrases maximum et extrait 2-3 insights clés sous forme de tableau JSON.
Format: {"summary": "...", "insights": ["...", "..."], "mood_end": "positif|neutre|difficile"}

CONVERSATION:\n${convo.slice(0, 3000)}`,
      }],
    });

    let summary = '';
    let insights: string[] = [];
    let moodEnd = 'neutre';

    try {
      const parsed = JSON.parse(summaryResp.content[0].type === 'text' ? summaryResp.content[0].text : '{}');
      summary  = parsed.summary || '';
      insights = parsed.insights || [];
      moodEnd  = parsed.mood_end || 'neutre';
    } catch { /* JSON parse failed */ }

    await prisma.adahSession.update({
      where: { id: session.id },
      data: { summary, insights, duration },
    });

    // Sauvegarder les insights en mémoire long terme
    for (const insight of insights.slice(0, 2)) {
      await prisma.adahMemory.create({
        data: {
          userId: req.userId!,
          type: 'insight',
          content: insight,
          tags: [session.mode, moodEnd],
          relevance: 1.0,
        },
      });
    }

    res.json({ summary, insights, duration, moodEnd });
  } catch (err: any) {
    await prisma.adahSession.update({ where: { id: session.id }, data: { duration } });
    res.json({ summary: null, duration });
  }
});

// ── GET /api/adah/memory — Mémoire long terme ─────────────────────────────────
router.get('/memory', async (req: AuthRequest, res) => {
  const memories = await prisma.adahMemory.findMany({
    where: { userId: req.userId! },
    orderBy: [{ relevance: 'desc' }, { createdAt: 'desc' }],
    take: 20,
  });
  res.json(memories);
});

// ── GET /api/adah/voice-token — Token Deepgram (Phase 2) ─────────────────────
router.post('/voice-token', async (_req: AuthRequest, res) => {
  // TODO Phase 2 : générer token Deepgram signé
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) return res.status(501).json({ error: 'Deepgram non configuré' });
  res.json({ token: apiKey, model: 'nova-2' });
});

// ── GET /api/adah/stats — Stats pour Mon Espace ───────────────────────────────
router.get('/stats', async (req: AuthRequest, res) => {
  const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);

  const [totalSessions, sessionsThisWeek, totalMessages, avgDuration, memories] = await Promise.all([
    prisma.adahSession.count({ where: { userId: req.userId! } }),
    prisma.adahSession.count({ where: { userId: req.userId!, createdAt: { gte: weekAgo } } }),
    prisma.adahMessage.count({
      where: { session: { userId: req.userId! }, role: 'user' },
    }),
    prisma.adahSession.aggregate({
      where: { userId: req.userId!, duration: { gt: 0 } },
      _avg: { duration: true },
    }),
    prisma.adahMemory.count({ where: { userId: req.userId! } }),
  ]);

  const recentSessions = await prisma.adahSession.findMany({
    where: { userId: req.userId! },
    select: { id: true, title: true, mode: true, mood: true, duration: true, createdAt: true, summary: true },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  res.json({
    totalSessions,
    sessionsThisWeek,
    totalMessages,
    avgDurationMin: Math.floor((avgDuration._avg.duration || 0) / 60),
    totalInsights: memories,
    recentSessions,
  });
});

// ── POST /api/adah/generate-day — Génère un planning de journée TDAH ─────────
router.post('/generate-day', async (req: AuthRequest, res) => {
  const { date, context } = req.body;
  const user = await prisma.user.findUnique({
    where: { id: req.userId! },
    select: { name: true, tdahType: true, workObjectives: true },
  });

  try {
    const resp = await getClient().messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `Tu es un assistant TDAH bienveillant. Génère un planning de journée pour une personne TDAH${date ? ` pour le ${date}` : ''}.
Profil : ${user?.name || ''}, TDAH ${user?.tdahType || 'non précisé'}.
Contexte utilisateur : ${context || 'journée équilibrée classique'}

Génère 6 à 8 tâches réparties sur la journée. Réponds UNIQUEMENT en JSON valide, sans texte avant/après :
{"tasks":[{"title":"...","category":"spiritualite|hygiene|health|meals|home|work|adhd|family|social|admin|personal|hobby","priority":"high|med|low","timeSlot":"09:00","duration":30,"note":"conseil court"}]}

Catégories : spiritualite (prières, lecture spirituelle), hygiene (douche, routine), health (santé, sport, médication), meals (repas, hydratation), home (ménage, courses), work (travail/études), adhd (gestion TDAH), family (famille & amis), social (sorties), admin (paperasse), personal, hobby (loisirs).
Règles : TOUJOURS au moins 1 tâche "health" et 1 "adhd". Inclure les repas (meals) aux bons créneaux. Max 3 "work" consécutives. Durées réalistes TDAH (max 60 min). Créneaux 07:00-22:00. Notes = conseils TDAH courts. NE PAS générer de tâches de prière (elles sont ajoutées automatiquement).`,
      }],
    });

    let text = resp.content[0].type === 'text' ? resp.content[0].text : '{}';
    text = text.replace(/```json|```/g, '').trim();
    // Extraire le bloc JSON
    const start = text.indexOf('{'), end = text.lastIndexOf('}');
    const sliced = start >= 0 && end >= 0 ? text.slice(start, end + 1) : text;
    let parsed: any;
    try {
      parsed = JSON.parse(sliced);
    } catch {
      // Réparation : JSON tronqué → on récupère les objets-tâches complets
      const objs = text.match(/\{[^{}]*\}/g) || [];
      const tasks: any[] = [];
      for (const o of objs) { try { tasks.push(JSON.parse(o)); } catch { /* objet incomplet ignoré */ } }
      parsed = { tasks };
    }
    const validCats = ['spiritualite', 'hygiene', 'health', 'meals', 'home', 'work', 'adhd', 'family', 'social', 'admin', 'personal', 'hobby'];
    const tasks = (parsed.tasks || [])
      .filter((t: any) => t.title && validCats.includes(t.category))
      .slice(0, 8);
    res.json({ tasks });
  } catch (err: any) {
    console.error('generate-day error:', err.message);
    res.status(500).json({ error: 'Génération impossible', tasks: [] });
  }
});

export default router;
