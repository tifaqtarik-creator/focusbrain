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
