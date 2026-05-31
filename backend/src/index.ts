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
import { registerSocketHandlers } from './socket/handlers';
import { authMiddleware } from './middleware/auth';
import { rateLimiter } from './middleware/rateLimit';

dotenv.config();

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
});

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(rateLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/sessions', authMiddleware, sessionRoutes);
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/matching', authMiddleware, matchingRoutes);
app.use('/api/forum', authMiddleware, forumRoutes);
app.use('/api/subscriptions', authMiddleware, subscriptionRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'focusbrain-api' }));

registerSocketHandlers(io);

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🧠 FocusBrain API running on port ${PORT}`);
});

export { io };
