import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

interface MatchingUser {
  userId: string;
  socketId: string;
  duration: number;
  quietMode: boolean;
  cameraOff: boolean;
  tdahType?: string;
  workStyle?: string;
  timezone?: string;
  circleIds: string[];
}

const waitingQueue: MatchingUser[] = [];
const MATCH_TIMEOUT_MS = 90_000;

export function registerSocketHandlers(io: Server) {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
      (socket as any).userId = payload.userId;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    const userId = (socket as any).userId as string;
    console.log(`🔌 User connected: ${userId}`);

    // Notifier le cercle que l'utilisateur est en ligne
    notifyCircle(io, userId, socket.id);

    // Matching : entrer en file
    socket.on('match:searching', async (data: { duration: number; quietMode: boolean; cameraOff: boolean }) => {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { tdahType: true, workStyle: true, timezone: true },
      });

      const circleMembers = await prisma.circleMember.findMany({
        where: { userId },
        select: { partnerId: true },
      });

      const matchingUser: MatchingUser = {
        userId,
        socketId: socket.id,
        duration: data.duration,
        quietMode: data.quietMode,
        cameraOff: data.cameraOff,
        tdahType: user?.tdahType ?? undefined,
        workStyle: user?.workStyle ?? undefined,
        timezone: user?.timezone,
        circleIds: circleMembers.map(m => m.partnerId),
      };

      const partner = findMatch(matchingUser);

      if (partner) {
        await createMatchedSession(io, matchingUser, partner);
      } else {
        waitingQueue.push(matchingUser);
        socket.emit('match:waiting');

        // Timeout 90s → proposer mode Solo
        setTimeout(async () => {
          const idx = waitingQueue.findIndex(u => u.userId === userId);
          if (idx !== -1) {
            waitingQueue.splice(idx, 1);
            const soloSession = await prisma.session.create({
              data: { duration: data.duration, quietMode: data.quietMode, soloMode: true, status: 'SOLO' },
            });
            socket.emit('match:timeout', { sessionId: soloSession.id });
          }
        }, MATCH_TIMEOUT_MS);
      }
    });

    // Annuler la recherche
    socket.on('match:cancel', () => {
      const idx = waitingQueue.findIndex(u => u.userId === userId);
      if (idx !== -1) waitingQueue.splice(idx, 1);
    });

    // Session events
    socket.on('session:mood_share', (data: { sessionId: string; mood: string }) => {
      socket.to(data.sessionId).emit('session:partner_mood', { mood: data.mood });
    });

    socket.on('session:break_propose', (data: { sessionId: string }) => {
      socket.to(data.sessionId).emit('session:break_proposed');
    });

    socket.on('session:break_accept', (data: { sessionId: string }) => {
      socket.to(data.sessionId).emit('session:break_accepted');
    });

    socket.on('session:extend_request', (data: { sessionId: string }) => {
      socket.to(data.sessionId).emit('session:extend_request');
    });

    socket.on('session:extend_accept', (data: { sessionId: string }) => {
      io.to(data.sessionId).emit('session:extend_accepted');
    });

    socket.on('disconnect', () => {
      const idx = waitingQueue.findIndex(u => u.userId === userId);
      if (idx !== -1) waitingQueue.splice(idx, 1);
      console.log(`🔌 User disconnected: ${userId}`);
    });
  });
}

function findMatch(seeker: MatchingUser): MatchingUser | null {
  // P1 — Cercle de confiance en priorité absolue
  const circleMatch = waitingQueue.find(
    u => u.userId !== seeker.userId &&
      u.duration === seeker.duration &&
      seeker.circleIds.includes(u.userId)
  );
  if (circleMatch) return removeFromQueue(circleMatch);

  // P2+P3 — Type TDAH compatible + style de travail
  const compatibleMatch = waitingQueue.find(u =>
    u.userId !== seeker.userId &&
    u.duration === seeker.duration &&
    isStyleCompatible(seeker.workStyle, u.workStyle) &&
    isTimezoneCompatible(seeker.timezone, u.timezone)
  );
  if (compatibleMatch) return removeFromQueue(compatibleMatch);

  // Fallback — même durée
  const anyMatch = waitingQueue.find(u => u.userId !== seeker.userId && u.duration === seeker.duration);
  if (anyMatch) return removeFromQueue(anyMatch);

  return null;
}

function removeFromQueue(user: MatchingUser): MatchingUser {
  const idx = waitingQueue.findIndex(u => u.userId === user.userId);
  if (idx !== -1) waitingQueue.splice(idx, 1);
  return user;
}

function isStyleCompatible(a?: string, b?: string): boolean {
  if (!a || !b) return true;
  if (a === 'FLEXIBLE' || b === 'FLEXIBLE') return true;
  return a === b;
}

function isTimezoneCompatible(a?: string, b?: string): boolean {
  if (!a || !b) return true;
  try {
    const offsetA = new Date().toLocaleString('en', { timeZone: a, timeZoneName: 'short' });
    const offsetB = new Date().toLocaleString('en', { timeZone: b, timeZoneName: 'short' });
    return offsetA === offsetB;
  } catch {
    return true;
  }
}

async function createMatchedSession(io: Server, user1: MatchingUser, user2: MatchingUser) {
  const session = await prisma.session.create({
    data: {
      duration: user1.duration,
      quietMode: user1.quietMode || user2.quietMode,
      status: 'ACTIVE',
      startTime: new Date(),
    },
  });

  await prisma.participant.createMany({
    data: [
      { sessionId: session.id, userId: user1.userId },
      { sessionId: session.id, userId: user2.userId },
    ],
  });

  const payload = { sessionId: session.id, duration: session.duration, quietMode: session.quietMode };
  io.to(user1.socketId).emit('match:found', payload);
  io.to(user2.socketId).emit('match:found', payload);

  io.sockets.sockets.get(user1.socketId)?.join(session.id);
  io.sockets.sockets.get(user2.socketId)?.join(session.id);
}

async function notifyCircle(io: Server, userId: string, socketId: string) {
  const circleOf = await prisma.circleMember.findMany({
    where: { partnerId: userId },
    select: { userId: true },
  });

  for (const { userId: memberId } of circleOf) {
    const memberSocket = [...io.sockets.sockets.values()].find(
      s => (s as any).userId === memberId
    );
    if (memberSocket) {
      memberSocket.emit('circle:member_online', { userId, socketId });
    }
  }
}
