import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import authRoutes from './routes/auth';
import sessionRoutes from './routes/sessions';
import userRoutes from './routes/users';
import matchingRoutes from './routes/matching';
import forumRoutes from './routes/forum';
import subscriptionRoutes from './routes/subscriptions';
import slotRoutes from './routes/slots';
import paymentRoutes from './routes/payments';
import adahRoutes from './routes/adah';
import mapRoutes from './routes/map';
import socialRoutes from './routes/social';
import { registerSocketHandlers } from './socket/handlers';
import { startReminderScheduler } from './lib/reminders';
import { authMiddleware } from './middleware/auth';
import { rateLimiter, aiLimiter, aiDailyLimiter } from './middleware/rateLimit';

dotenv.config();

const app = express();
// Derrière le proxy Render : nécessaire pour que req.ip soit la vraie IP du visiteur (rate limiting)
app.set('trust proxy', 1);
const httpServer = createServer(app);

const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:5173',  'http://127.0.0.1:5173',
  'http://localhost:5174',  'http://127.0.0.1:5174',
  'http://localhost:5175',  'http://127.0.0.1:5175',
  // Ajouter ici l'URL Vercel en production
  ...(process.env.EXTRA_ORIGINS ? process.env.EXTRA_ORIGINS.split(',') : []),
];

const io = new Server(httpServer, {
  cors: { origin: ALLOWED_ORIGINS, credentials: true },
});

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use('/uploads', express.static(require('path').join(process.cwd(), 'uploads')));
app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(rateLimiter);

// Logger de requêtes pour debug
app.use((req, _res, next) => {
  if (req.path.includes('upload') || req.path.includes('forum')) {
    console.log(`📡 ${req.method} ${req.path} | Content-Type: ${req.headers['content-type']?.slice(0, 60)}`);
  }
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/sessions', authMiddleware, sessionRoutes);
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/matching', authMiddleware, matchingRoutes);
app.use('/api/forum', authMiddleware, forumRoutes);
app.use('/api/subscriptions', authMiddleware, subscriptionRoutes);
app.use('/api/slots', authMiddleware, slotRoutes);
app.use('/api/map', authMiddleware, mapRoutes);
app.use('/api/payments', authMiddleware, paymentRoutes);
app.use('/api/adah',    authMiddleware, aiLimiter, aiDailyLimiter, adahRoutes);
app.use('/api/social',  authMiddleware, socialRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'focusbrain-api' }));

// Exposer io aux routes
app.set('io', io);

registerSocketHandlers(io);
startReminderScheduler(io);

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🧠 FocusBrain API running on port ${PORT}`);
});

export { io };
