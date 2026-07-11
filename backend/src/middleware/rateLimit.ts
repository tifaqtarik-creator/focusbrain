import rateLimit from 'express-rate-limit';

export const rateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 500,
  message: { error: 'Trop de requêtes, réessaie dans 1 minute.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.ip === '127.0.0.1' || req.ip === '::1', // Pas de limite en local
});

export const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 50,
  message: { error: 'Trop de tentatives de connexion, réessaie dans 1 minute.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.ip === '127.0.0.1' || req.ip === '::1', // Pas de limite en local
});

// ── Limiteurs dédiés aux routes IA (chaque requête coûte de l'argent Anthropic) ──
// Comptés PAR UTILISATEUR connecté (req.userId), pas par IP.
export const aiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 15,
  message: { error: 'Doucement 🙂 Limite de messages IA atteinte — réessaie dans une minute.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: any) => req.userId || req.ip,
});

export const aiDailyLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 h
  max: 150,
  message: { error: "Tu as atteint la limite quotidienne de l'assistant IA. Il sera de nouveau disponible demain 💜" },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: any) => req.userId || req.ip,
});
