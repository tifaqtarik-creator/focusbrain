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

// ── Matching INSTANTANÉ « hybride » ──────────────────────────────────────────
// File temps réel → quand deux personnes attendent (même durée), on leur propose
// la carte de l'autre (photo + infos). Double accord → Slot CONFIRMED → salle live.
interface InstantSeeker {
  userId: string; socketId: string; duration: number;
  category?: string; ambiance?: string; energy?: string; tasks: string[];
  name: string; avatar: string | null; tdahType?: string; workStyle?: string;
  sessionsCompleted: number; sessionsNoShow: number; preferredLanguages: string[];
  passed: Set<string>; // partenaires déjà refusés/expirés → ne pas re-proposer tout de suite
}
interface InstantProposal {
  creatorId: string; partnerId: string;        // creatorId = celui qui attendait en 1er
  accepts: Set<string>;
  seekers: Record<string, InstantSeeker>;
  timer: ReturnType<typeof setTimeout>;
}
const instantQueue: InstantSeeker[] = [];
const proposalByUser = new Map<string, InstantProposal>();
const PROPOSAL_TTL_MS = 15_000;

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

    // ── Matching INSTANTANÉ « hybride » : recherche → proposition → double accord ──
    socket.on('instant:search', async (data: { duration: number; category?: string; ambiance?: string; energy?: string; tasks?: string[] }) => {
      if (proposalByUser.has(userId)) return;   // déjà en proposition
      removeInstant(userId);                     // un seul intent actif
      const u = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, avatar: true, tdahType: true, workStyle: true, sessionsCompleted: true, sessionsNoShow: true, preferredLanguages: true },
      });
      const seeker: InstantSeeker = {
        userId, socketId: socket.id,
        duration: data.duration,
        category: data.category, ambiance: data.ambiance, energy: data.energy,
        tasks: (data.tasks || []).map(t => t.trim()).filter(Boolean).slice(0, 8),
        name: u?.name || 'Membre', avatar: u?.avatar || null,
        tdahType: u?.tdahType ?? undefined, workStyle: u?.workStyle ?? undefined,
        sessionsCompleted: u?.sessionsCompleted ?? 0, sessionsNoShow: u?.sessionsNoShow ?? 0,
        preferredLanguages: u?.preferredLanguages ?? [],
        passed: new Set<string>(),
      };
      enqueueInstant(io, seeker);
    });
    socket.on('instant:accept',  () => acceptInstant(io, userId));
    socket.on('instant:decline', () => declineInstant(io, userId));
    socket.on('instant:cancel',  () => cancelInstant(io, userId));

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
      // Nettoyer le matching instantané (file + proposition en cours)
      cancelInstant(io, userId);
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

// ── Helpers matching INSTANTANÉ ──────────────────────────────────────────────
function cardOf(s: InstantSeeker) {
  return {
    userId: s.userId, name: s.name, avatar: s.avatar, tdahType: s.tdahType, workStyle: s.workStyle,
    sessionsCompleted: s.sessionsCompleted, sessionsNoShow: s.sessionsNoShow,
    preferredLanguages: s.preferredLanguages, duration: s.duration, tasks: s.tasks,
    category: s.category, ambiance: s.ambiance, energy: s.energy,
  };
}

function removeInstant(userId: string) {
  const i = instantQueue.findIndex(u => u.userId === userId);
  if (i !== -1) instantQueue.splice(i, 1);
}

// Met un chercheur en file, ou crée une proposition s'il y a un partenaire compatible
function enqueueInstant(io: Server, seeker: InstantSeeker) {
  const idx = instantQueue.findIndex(o =>
    o.userId !== seeker.userId &&
    o.duration === seeker.duration &&
    !seeker.passed.has(o.userId) &&
    !o.passed.has(seeker.userId)
  );
  if (idx !== -1) {
    const partner = instantQueue.splice(idx, 1)[0];   // partner attendait déjà → il devient créateur
    createProposal(io, partner, seeker);
  } else {
    instantQueue.push(seeker);
    io.to(`user:${seeker.userId}`).emit('instant:waiting');
  }
}

function createProposal(io: Server, creator: InstantSeeker, joiner: InstantSeeker) {
  const prop: InstantProposal = {
    creatorId: creator.userId,
    partnerId: joiner.userId,
    accepts: new Set<string>(),
    seekers: { [creator.userId]: creator, [joiner.userId]: joiner },
    timer: setTimeout(() => {
      // Expiration : aucune réciprocité à temps → on remet les deux en file
      if (proposalByUser.get(creator.userId) === prop) endProposal(io, prop, [creator.userId, joiner.userId]);
    }, PROPOSAL_TTL_MS),
  };
  proposalByUser.set(creator.userId, prop);
  proposalByUser.set(joiner.userId, prop);
  io.to(`user:${creator.userId}`).emit('instant:proposal', { partner: cardOf(joiner), ttl: PROPOSAL_TTL_MS });
  io.to(`user:${joiner.userId}`).emit('instant:proposal',  { partner: cardOf(creator), ttl: PROPOSAL_TTL_MS });
}

// Termine une proposition : marque le « passé » mutuel et remet en file les userId demandés
function endProposal(io: Server, prop: InstantProposal, requeue: string[]) {
  clearTimeout(prop.timer);
  const a = prop.creatorId, b = prop.partnerId;
  proposalByUser.delete(a);
  proposalByUser.delete(b);
  prop.seekers[a]?.passed.add(b);
  prop.seekers[b]?.passed.add(a);
  io.to(`user:${a}`).emit('instant:proposal_ended');
  io.to(`user:${b}`).emit('instant:proposal_ended');
  for (const uid of requeue) {
    const sk = prop.seekers[uid];
    if (sk) enqueueInstant(io, sk);
  }
}

function acceptInstant(io: Server, userId: string) {
  const prop = proposalByUser.get(userId);
  if (!prop) return;
  prop.accepts.add(userId);
  const other = userId === prop.creatorId ? prop.partnerId : prop.creatorId;
  io.to(`user:${other}`).emit('instant:partner_accepted');
  if (prop.accepts.has(prop.creatorId) && prop.accepts.has(prop.partnerId)) {
    clearTimeout(prop.timer);
    proposalByUser.delete(prop.creatorId);
    proposalByUser.delete(prop.partnerId);
    createInstantSlot(io, prop).catch(() => {});
  }
}

// Refuser : les deux retournent en file (en s'étant « passés » mutuellement)
function declineInstant(io: Server, userId: string) {
  const prop = proposalByUser.get(userId);
  if (!prop) return;
  endProposal(io, prop, [prop.creatorId, prop.partnerId]);
}

// Annuler / déconnexion : l'acteur quitte, l'autre est remis en file
function cancelInstant(io: Server, userId: string) {
  const prop = proposalByUser.get(userId);
  if (prop) {
    const other = userId === prop.creatorId ? prop.partnerId : prop.creatorId;
    endProposal(io, prop, [other]);
  }
  removeInstant(userId);
}

async function createInstantSlot(io: Server, prop: InstantProposal) {
  const creator = prop.seekers[prop.creatorId];
  const partner = prop.seekers[prop.partnerId];
  const slot = await prisma.slot.create({
    data: {
      creatorId: prop.creatorId,
      partnerId: prop.partnerId,
      status: 'CONFIRMED',
      type: 'INSTANT',
      startTime: new Date(),
      duration: creator.duration,
      creatorTask: creator.tasks[0] || null,
      creatorTasks: creator.tasks,
      partnerTask: partner.tasks[0] || null,
      category: creator.category || null,
      ambiance: creator.ambiance || null,
      energy: creator.energy || null,
    },
  });
  io.to(`user:${prop.creatorId}`).emit('session:matched', { slotId: slot.id });
  io.to(`user:${prop.partnerId}`).emit('session:matched', { slotId: slot.id });
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
