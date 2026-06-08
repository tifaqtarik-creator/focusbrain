/**
 * focusRooms.ts — Salles de focus 24/7 + sessions instantanées (Body Doubling)
 * Rituel TCC : intention → focus → check-out. Stats en localStorage.
 */
export interface FocusRoom {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  color: string;
  textColor: string;
  accent: string;
}

export const FOCUS_ROOMS: FocusRoom[] = [
  { id: 'deepwork', name: 'Deep Work',      emoji: '🎯', desc: 'Concentration intense, tâches difficiles', color: '#E6F1FB', textColor: '#0C447C', accent: '#185FA5' },
  { id: 'study',    name: 'Études',          emoji: '📚', desc: 'Révisions, cours, lectures',              color: '#E7F4EE', textColor: '#14573A', accent: '#2E9E68' },
  { id: 'creative', name: 'Créatif',         emoji: '🎨', desc: 'Écriture, design, projets perso',         color: '#FAECE7', textColor: '#712B13', accent: '#993C1D' },
  { id: 'admin',    name: 'Admin',           emoji: '📄', desc: 'Mails, paperasse, tâches ennuyeuses',     color: '#FAEEDA', textColor: '#633806', accent: '#BA7517' },
  { id: 'gentle',   name: 'Démarrage doux',  emoji: '🌱', desc: 'Petites tâches, reprise en douceur',      color: '#EEEDFE', textColor: '#3C3489', accent: '#534AB7' },
];

export const FOCUS_DURATIONS = [15, 25, 50, 75];

// ── Sessions / stats (localStorage) ──────────────────────────────────────────
export interface FocusSession {
  id: string; room: string; goal: string; duration: number;
  accomplished?: string; satisfaction?: number; at: number; completed: boolean;
}
export interface FocusStats { totalSessions: number; totalMinutes: number; streak: number; lastDay: string | null; }

const HISTORY_KEY = 'adah_focus_history';
const STATS_KEY   = 'adah_focus_stats';

function defaultStats(): FocusStats { return { totalSessions: 0, totalMinutes: 0, streak: 0, lastDay: null }; }

export function getFocusStats(): FocusStats {
  try { return { ...defaultStats(), ...JSON.parse(localStorage.getItem(STATS_KEY) || '{}') }; }
  catch { return defaultStats(); }
}
export function getFocusHistory(): FocusSession[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
  catch { return []; }
}
export function recordFocusSession(s: FocusSession): FocusStats {
  const hist = [s, ...getFocusHistory()].slice(0, 50);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(hist));

  const stats = getFocusStats();
  const today     = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  stats.totalSessions += 1;
  stats.totalMinutes  += s.duration;
  if (stats.lastDay === today) { /* déjà actif aujourd'hui */ }
  else if (stats.lastDay === yesterday) stats.streak += 1;
  else stats.streak = 1;
  stats.lastDay = today;
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  return stats;
}
