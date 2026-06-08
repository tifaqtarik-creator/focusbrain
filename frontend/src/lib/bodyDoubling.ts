/**
 * bodyDoubling.ts — Helpers : favoris, fiabilité, KPI, rappels navigateur, calendrier
 */
import api from './api';

export interface ReliabilityUser { sessionsCompleted?: number; sessionsNoShow?: number }

// Score de fiabilité bienveillant (jamais punitif)
export function reliability(u?: ReliabilityUser): { pct: number | null; label: string; emoji: string } {
  const done = u?.sessionsCompleted || 0, no = u?.sessionsNoShow || 0;
  const total = done + no;
  if (total === 0) return { pct: null, label: 'Nouveau ici', emoji: '🌱' };
  const pct = Math.round((done / total) * 100);
  const emoji = pct >= 90 ? '💎' : pct >= 70 ? '✅' : '🌤️';
  return { pct, label: `${pct}% fiable`, emoji };
}

// ── Favoris ──
export const getFavoriteIds = () => api.get('/social/favorites/ids').then(r => r.data as string[]);
export const addFavorite    = (id: string) => api.post(`/social/favorites/${id}`);
export const removeFavorite = (id: string) => api.delete(`/social/favorites/${id}`);

// ── KPIs ──
export const getKpis = () => api.get('/slots/kpis').then(r => r.data);

// ── Notifications navigateur ──
export async function ensureNotifPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied')  return false;
  try { return (await Notification.requestPermission()) === 'granted'; } catch { return false; }
}
export function notify(title: string, body: string) {
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.ico' });
    }
  } catch { /* ignore */ }
}

// ── Marquer une session terminée (KPI + fiabilité) ──
export const completeSession = (slotId: string) => api.post(`/slots/${slotId}/complete`).catch(() => {});

// ── Ajouter à Google Agenda ──
export function googleCalendarUrl(opts: { title: string; start: Date; durationMin: number; details?: string }): string {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const end = new Date(opts.start.getTime() + opts.durationMin * 60000);
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: opts.title,
    dates: `${fmt(opts.start)}/${fmt(end)}`,
    details: opts.details || 'Session de Body Doubling FocusBrain',
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}
