/**
 * reminders.ts — Planificateur : rappels de session (anti no-show) + détection no-show.
 * Tourne toutes les 60s. Émet 'session:reminder' (push navigateur via socket) + email Resend.
 */
import { prisma } from './prisma';
import { Server } from 'socket.io';
import { sendEmail, reminderEmailHtml } from './email';


export function startReminderScheduler(io: Server) {
  console.log('⏰ Planificateur de rappels démarré (60s)');
  setInterval(() => { runSweep(io).catch(e => console.warn('[reminders]', e.message)); }, 60_000);
}

async function runSweep(io: Server) {
  const now = new Date();

  // ── 1) Rappels : créneaux confirmés démarrant dans 0–12 min, pas encore rappelés ──
  const soon = new Date(now.getTime() + 12 * 60000);
  const toRemind = await prisma.slot.findMany({
    where: { status: 'CONFIRMED', reminderSent: false, startTime: { gte: now, lte: soon } },
    include: {
      creator: { select: { id: true, email: true, name: true } },
      partner: { select: { id: true, email: true, name: true } },
    },
  });

  for (const slot of toRemind) {
    const when = slot.startTime.toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const mins = Math.max(1, Math.round((slot.startTime.getTime() - now.getTime()) / 60000));
    for (const u of [slot.creator, slot.partner]) {
      if (!u) continue;
      io.to(`user:${u.id}`).emit('session:reminder', {
        slotId: slot.id, startTime: slot.startTime, duration: slot.duration, minutes: mins,
      });
      if (u.email) {
        sendEmail(u.email, `⏰ Ta session FocusBrain dans ${mins} min`,
          reminderEmailHtml(u.name, when, slot.duration, slot.creatorTask));
      }
    }
    await prisma.slot.update({ where: { id: slot.id }, data: { reminderSent: true } });
  }

  // ── 2) No-show : créneaux confirmés terminés sans lancement ──
  // Bornes de date : éviter de rescanner toute la table à chaque minute
  const twoDaysAgo = new Date(now.getTime() - 48 * 3600 * 1000);
  const ended = await prisma.slot.findMany({
    where: {
      status: 'CONFIRMED', noShow: false, startedAt: null,
      startTime: { gte: twoDaysAgo, lt: now },
    },
  });
  for (const slot of ended) {
    const endTime = new Date(slot.startTime.getTime() + (slot.duration + 5) * 60000);
    if (endTime < now) {
      await prisma.slot.update({ where: { id: slot.id }, data: { noShow: true } });
      const ids = [slot.creatorId, slot.partnerId].filter(Boolean) as string[];
      if (ids.length) {
        await prisma.user.updateMany({ where: { id: { in: ids } }, data: { sessionsNoShow: { increment: 1 } } });
      }
    }
  }

  // ── 3) Expiration Premium : un abonnement dépassé repasse en gratuit ──
  await prisma.user.updateMany({
    where: { isPremium: true, premiumUntil: { not: null, lt: now } },
    data: { isPremium: false },
  });
}
