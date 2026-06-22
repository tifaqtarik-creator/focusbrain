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

// ── Salles de focus (présence temps réel — Body Doubling) ────────────────────
interface FocusParticipant {
  userId: string; name: string; avatar: string | null;
  goal: string; status: 'focus' | 'paused' | 'done'; joinedAt: number; socketId: string;
}
// roomId → (socketId → participant)
const focusRooms = new Map<string, Map<string, FocusParticipant>>();

// Démarrage synchronisé : slotId → set des userId déclarés « prêts »
const readyBySlot = new Map<string, Set<string>>();

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

    // Rejoindre sa room personnelle pour recevoir les notifications
    socket.join(`user:${userId}`);

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

    // ── Pause / +10 min / partage de tâche — routés vers le PARTENAIRE de la session ──
    const partnerOf = async (slotId: string): Promise<string | null> => {
      const s = await prisma.slot.findUnique({ where: { id: slotId }, select: { creatorId: true, partnerId: true } });
      if (!s) return null;
      if (s.creatorId !== userId && s.partnerId !== userId) return null;
      return s.creatorId === userId ? s.partnerId : s.creatorId;
    };
    // Pause : demande → acceptation/refus (la reprise est immédiate des 2 côtés)
    socket.on('session:pause_request', async (d: { slotId: string }) => { const o = await partnerOf(d.slotId); if (o) io.to(`user:${o}`).emit('session:pause_requested'); });
    socket.on('session:pause_accept',  async (d: { slotId: string }) => { const o = await partnerOf(d.slotId); if (o) io.to(`user:${o}`).emit('session:paused'); });
    socket.on('session:pause_decline', async (d: { slotId: string }) => { const o = await partnerOf(d.slotId); if (o) io.to(`user:${o}`).emit('session:pause_declined'); });
    socket.on('session:resume',        async (d: { slotId: string }) => { const o = await partnerOf(d.slotId); if (o) io.to(`user:${o}`).emit('session:resumed'); });
    // +10 min : demande → acceptation/refus
    socket.on('session:extend_request', async (d: { slotId: string }) => { const o = await partnerOf(d.slotId); if (o) io.to(`user:${o}`).emit('session:extend_requested'); });
    socket.on('session:extend_accept',  async (d: { slotId: string }) => { const o = await partnerOf(d.slotId); if (o) io.to(`user:${o}`).emit('session:extended'); });
    socket.on('session:extend_decline', async (d: { slotId: string }) => { const o = await partnerOf(d.slotId); if (o) io.to(`user:${o}`).emit('session:extend_declined'); });
    socket.on('session:share_task', async (d: { slotId: string; task: string }) => { const o = await partnerOf(d.slotId); if (o) io.to(`user:${o}`).emit('session:partner_task', { task: d.task }); });

    // ── Démarrage synchronisé & anticipé d'un créneau confirmé ──
    // L'utilisateur se déclare prêt ; quand les DEUX le sont → top de départ commun.
    socket.on('session:ready', async (data: { slotId: string }) => {
      try {
        const slot = await prisma.slot.findUnique({
          where: { id: data.slotId },
          select: { creatorId: true, partnerId: true, startedAt: true },
        });
        if (!slot) return;
        const isParticipant = slot.creatorId === userId || slot.partnerId === userId;
        if (!isParticipant) return;

        let set = readyBySlot.get(data.slotId);
        if (!set) { set = new Set(); readyBySlot.set(data.slotId, set); }
        set.add(userId);

        const otherId = slot.creatorId === userId ? slot.partnerId : slot.creatorId;
        if (otherId) io.to(`user:${otherId}`).emit('session:partner_ready', { userId, ready: true });

        // Les deux participants sont prêts → lancement synchronisé (3-2-1)
        if (slot.partnerId && set.has(slot.creatorId) && set.has(slot.partnerId)) {
          const at = Date.now() + 3000; // top dans 3 s, horodatage serveur partagé
          io.to(`user:${slot.creatorId}`).emit('session:launch', { slotId: data.slotId, at });
          io.to(`user:${slot.partnerId}`).emit('session:launch', { slotId: data.slotId, at });
          if (!slot.startedAt) {
            await prisma.slot.update({ where: { id: data.slotId }, data: { startedAt: new Date() } });
          }
          readyBySlot.delete(data.slotId);
        }
      } catch { /* ignore */ }
    });

    // L'utilisateur annule son état « prêt »
    socket.on('session:ready_cancel', async (data: { slotId: string }) => {
      readyBySlot.get(data.slotId)?.delete(userId);
      try {
        const slot = await prisma.slot.findUnique({
          where: { id: data.slotId },
          select: { creatorId: true, partnerId: true },
        });
        if (!slot) return;
        const otherId = slot.creatorId === userId ? slot.partnerId : slot.creatorId;
        if (otherId) io.to(`user:${otherId}`).emit('session:partner_ready', { userId, ready: false });
      } catch { /* ignore */ }
    });

    // ── Salles de focus (Body Doubling — présence temps réel) ──
    socket.on('focus:join', async (data: { roomId: string; goal?: string; duration?: number }) => {
      const u = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, avatar: true } });
      const roomId = data.roomId || 'now';
      socket.join(`focus:${roomId}`);
      let room = focusRooms.get(roomId);
      if (!room) { room = new Map(); focusRooms.set(roomId, room); }
      room.set(socket.id, {
        userId, name: u?.name || 'Membre', avatar: u?.avatar || null,
        goal: data.goal || '', status: 'focus', joinedAt: Date.now(), socketId: socket.id,
      });
      broadcastFocusPresence(io, roomId);
      broadcastFocusCounts(io);
    });

    socket.on('focus:update', (data: { roomId: string; goal?: string; status?: 'focus' | 'paused' | 'done' }) => {
      const p = focusRooms.get(data.roomId)?.get(socket.id);
      if (p) {
        if (data.goal !== undefined) p.goal = data.goal;
        if (data.status) p.status = data.status;
        broadcastFocusPresence(io, data.roomId);
      }
    });

    socket.on('focus:done', (data: { roomId: string }) => {
      const p = focusRooms.get(data.roomId)?.get(socket.id);
      if (p) io.to(`focus:${data.roomId}`).emit('focus:celebrate', { name: p.name });
      leaveFocusRoom(io, socket, data.roomId);
    });

    socket.on('focus:leave', (data: { roomId: string }) => {
      leaveFocusRoom(io, socket, data.roomId);
    });

    socket.on('focus:counts:get', () => {
      socket.emit('focus:counts', focusCountsObject());
    });

    socket.on('disconnect', () => {
      const idx = waitingQueue.findIndex(u => u.userId === userId);
      if (idx !== -1) waitingQueue.splice(idx, 1);
      // Nettoyer l'état « prêt » des démarrages synchronisés
      for (const [slotId, set] of readyBySlot) {
        if (set.delete(userId) && set.size === 0) readyBySlot.delete(slotId);
      }
      // Nettoyer les salles de focus
      let changed = false;
      for (const [roomId, room] of focusRooms) {
        if (room.delete(socket.id)) { broadcastFocusPresence(io, roomId); if (room.size === 0) focusRooms.delete(roomId); changed = true; }
      }
      if (changed) broadcastFocusCounts(io);
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

// ── Helpers salles de focus ──────────────────────────────────────────────────
function broadcastFocusPresence(io: Server, roomId: string) {
  const room = focusRooms.get(roomId);
  const participants = room ? [...room.values()].map(p => ({
    userId: p.userId, name: p.name, avatar: p.avatar, goal: p.goal, status: p.status,
  })) : [];
  io.to(`focus:${roomId}`).emit('focus:presence', { roomId, participants });
}
function focusCountsObject(): Record<string, number> {
  const o: Record<string, number> = {};
  for (const [roomId, room] of focusRooms) if (room.size > 0) o[roomId] = room.size;
  return o;
}
function broadcastFocusCounts(io: Server) {
  io.emit('focus:counts', focusCountsObject());
}
function leaveFocusRoom(io: Server, socket: Socket, roomId: string) {
  const room = focusRooms.get(roomId);
  if (room && room.delete(socket.id)) {
    socket.leave(`focus:${roomId}`);
    if (room.size === 0) focusRooms.delete(roomId);
    broadcastFocusPresence(io, roomId);
    broadcastFocusCounts(io);
  }
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
