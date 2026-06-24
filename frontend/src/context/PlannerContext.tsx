/**
 * PlannerContext.tsx — État du planificateur TDAH (localStorage + gamification)
 */
import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import {
  CATEGORIES, SUGGESTIONS, BADGES, computeLevel, computeTaskXP,
  ICON_SET, CATEGORY_COLORS, Category, TaskSuggestion,
} from '../data/plannerData';

export interface Task {
  id: string; title: string; category: string; priority: 'high' | 'med' | 'low';
  duration: number; timeSlot: string; xp: number; done: boolean; doneAt: number | null;
  note: string; date: string; createdAt: number;
}
export interface Profile {
  totalXP: number; todayXP: number; level: number; streak: number;
  lastActiveDay: string | null; earnedBadges: string[]; justLeveledUp: boolean;
  newBadge: string | null;
}
export interface PrayerSettings {
  enabled: boolean; autoAdd: boolean; city: string; country: string;
}

const storageKey = (date: string) => `adah_day_${date}`;
const PROFILE_KEY = 'adah_gamification_profile';
const PRAYER_SETTINGS_KEY = 'adah_prayer_settings';
const CUSTOM_CATS_KEY = 'adah_custom_categories';
const CUSTOM_SUGG_KEY = 'adah_custom_suggestions';
const today = () => new Date().toISOString().split('T')[0];

// ── Personnalisation utilisateur ──────────────────────────────────────────────
export interface CustomCategory { id: string; label: string; iconKey: string; color: string; textColor: string; borderColor: string; }
export interface CustomSuggestion { title: string; iconKey: string; duration?: number; priority?: 'high' | 'med' | 'low'; }
export type MergedSuggestion = TaskSuggestion & { custom?: boolean; idx?: number };
const FALLBACK_ICON = ICON_SET.etoiles;

function defaultProfile(): Profile {
  return { totalXP: 0, todayXP: 0, level: 1, streak: 0, lastActiveDay: null, earnedBadges: [], justLeveledUp: false, newBadge: null };
}
function defaultPrayerSettings(): PrayerSettings {
  return { enabled: true, autoAdd: true, city: 'Marrakech', country: 'Morocco' };
}

interface PlannerCtx {
  activeDate: string; setActiveDate: (d: string) => void;
  tasks: Task[]; tasksByDate: Record<string, Task[]>;
  addTask: (t: Partial<Task>) => string;
  updateTask: (id: string, c: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTask: (id: string) => void;
  copyDayTo: (from: string, to: string) => void;
  profile: Profile; clearLevelUp: () => void;
  activeCategory: string; setActiveCategory: (c: string) => void;
  prayerSettings: PrayerSettings; setPrayerSettings: (s: Partial<PrayerSettings>) => void;
  // Catégories & suggestions personnalisées
  categories: Record<string, Category>;        // intégrées + perso (source unique)
  customCategories: CustomCategory[];
  addCategory: (label: string, iconKey: string, colorIdx: number) => void;
  deleteCategory: (id: string) => void;
  suggestionsFor: (catKey: string) => MergedSuggestion[];
  addSuggestion: (catKey: string, s: CustomSuggestion) => void;
  deleteSuggestion: (catKey: string, idx: number) => void;
}

const Ctx = createContext<PlannerCtx | null>(null);

export function PlannerProvider({ children }: { children: ReactNode }) {
  const [activeDate, setActiveDate] = useState(today());
  const [activeCategory, setActiveCategory] = useState('all');

  const [tasksByDate, setTasksByDate] = useState<Record<string, Task[]>>(() => {
    const all: Record<string, Task[]> = {};
    try {
      Object.keys(localStorage).filter(k => k.startsWith('adah_day_')).forEach(k => {
        all[k.replace('adah_day_', '')] = JSON.parse(localStorage.getItem(k) || '[]');
      });
    } catch { /* ignore */ }
    return all;
  });

  const [profile, setProfile] = useState<Profile>(() => {
    try { return { ...defaultProfile(), ...JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}') }; }
    catch { return defaultProfile(); }
  });

  const [prayerSettings, setPrayerSettingsState] = useState<PrayerSettings>(() => {
    try { return { ...defaultPrayerSettings(), ...JSON.parse(localStorage.getItem(PRAYER_SETTINGS_KEY) || '{}') }; }
    catch { return defaultPrayerSettings(); }
  });
  const setPrayerSettings = useCallback((s: Partial<PrayerSettings>) => {
    setPrayerSettingsState(prev => {
      const next = { ...prev, ...s };
      localStorage.setItem(PRAYER_SETTINGS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  // ── Catégories & suggestions personnalisées (localStorage) ──
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>(() => {
    try { return JSON.parse(localStorage.getItem(CUSTOM_CATS_KEY) || '[]'); } catch { return []; }
  });
  const [customSuggestions, setCustomSuggestions] = useState<Record<string, CustomSuggestion[]>>(() => {
    try { return JSON.parse(localStorage.getItem(CUSTOM_SUGG_KEY) || '{}'); } catch { return {}; }
  });
  useEffect(() => { localStorage.setItem(CUSTOM_CATS_KEY, JSON.stringify(customCategories)); }, [customCategories]);
  useEffect(() => { localStorage.setItem(CUSTOM_SUGG_KEY, JSON.stringify(customSuggestions)); }, [customSuggestions]);

  // Source unique : catégories intégrées + perso (avec icône résolue)
  const categories = useMemo<Record<string, Category>>(() => {
    const merged: Record<string, Category> = { ...CATEGORIES };
    customCategories.forEach(c => {
      merged[c.id] = {
        id: c.id, label: c.label, emoji: '', Icon: ICON_SET[c.iconKey] || FALLBACK_ICON,
        color: c.color, textColor: c.textColor, borderColor: c.borderColor,
        xpMultiplier: 1, tip: '', custom: true,
      };
    });
    return merged;
  }, [customCategories]);

  const addCategory = useCallback((label: string, iconKey: string, colorIdx: number) => {
    const col = CATEGORY_COLORS[colorIdx % CATEGORY_COLORS.length];
    const id = `cat_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
    setCustomCategories(prev => [...prev, { id, label: label.trim().slice(0, 30), iconKey, ...col }]);
  }, []);
  const deleteCategory = useCallback((id: string) => {
    setCustomCategories(prev => prev.filter(c => c.id !== id));
  }, []);

  const suggestionsFor = useCallback((catKey: string): MergedSuggestion[] => {
    const builtin = (SUGGESTIONS[catKey] || []).map(s => ({ ...s })) as MergedSuggestion[];
    const custom = (customSuggestions[catKey] || []).map((s, idx) => ({
      title: s.title, Icon: ICON_SET[s.iconKey] || FALLBACK_ICON,
      duration: s.duration, priority: s.priority, custom: true, idx,
    })) as MergedSuggestion[];
    return [...builtin, ...custom];
  }, [customSuggestions]);
  const addSuggestion = useCallback((catKey: string, s: CustomSuggestion) => {
    setCustomSuggestions(prev => ({ ...prev, [catKey]: [...(prev[catKey] || []), { ...s, title: s.title.trim().slice(0, 60) }] }));
  }, []);
  const deleteSuggestion = useCallback((catKey: string, idx: number) => {
    setCustomSuggestions(prev => ({ ...prev, [catKey]: (prev[catKey] || []).filter((_, i) => i !== idx) }));
  }, []);

  // Persistance
  useEffect(() => {
    Object.entries(tasksByDate).forEach(([date, tasks]) => {
      localStorage.setItem(storageKey(date), JSON.stringify(tasks));
    });
  }, [tasksByDate]);
  useEffect(() => { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); }, [profile]);

  const tasks = tasksByDate[activeDate] || [];
  const setTasks = (nt: Task[]) => setTasksByDate(prev => ({ ...prev, [activeDate]: nt }));

  const addTask = useCallback((t: Partial<Task>): string => {
    const id = `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const priority = t.priority || 'med';
    const duration = t.duration || 30;
    const newTask: Task = {
      id, title: '', category: 'personal', priority, duration, timeSlot: '',
      xp: t.xp ?? computeTaskXP(priority, duration), done: false, doneAt: null,
      note: '', date: activeDate, createdAt: Date.now(), ...t,
    };
    setTasksByDate(prev => ({ ...prev, [activeDate]: [...(prev[activeDate] || []), newTask] }));
    return id;
  }, [activeDate]);

  const updateTask = useCallback((id: string, c: Partial<Task>) => {
    setTasksByDate(prev => ({ ...prev, [activeDate]: (prev[activeDate] || []).map(t => t.id === id ? { ...t, ...c } : t) }));
  }, [activeDate]);

  const deleteTask = useCallback((id: string) => {
    setTasksByDate(prev => ({ ...prev, [activeDate]: (prev[activeDate] || []).filter(t => t.id !== id) }));
  }, [activeDate]);

  const checkBadges = useCallback((prof: Profile, tbd: Record<string, Task[]>): Profile => {
    const earned = new Set(prof.earnedBadges);
    let newBadge: string | null = null;
    let bonus = 0;
    BADGES.forEach(b => {
      if (!earned.has(b.id) && b.condition(prof, tbd)) {
        earned.add(b.id); newBadge = b.label; bonus += b.xpBonus;
      }
    });
    return { ...prof, earnedBadges: [...earned], newBadge, totalXP: prof.totalXP + bonus };
  }, []);

  const toggleTask = useCallback((id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const wasDone = task.done;
    updateTask(id, { done: !wasDone, doneAt: !wasDone ? Date.now() : null });

    setProfile(prev => {
      let next = { ...prev };
      const mult = CATEGORIES[task.category]?.xpMultiplier || 1;
      const earned = Math.round(task.xp * mult);
      if (!wasDone) {
        const newTotal = prev.totalXP + earned;
        const newLevel = computeLevel(newTotal);
        next = { ...next, totalXP: newTotal, todayXP: prev.todayXP + earned, level: newLevel, justLeveledUp: newLevel > prev.level };
        // Streak
        const lastDay = prev.lastActiveDay;
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        let streak = prev.streak;
        if (lastDay === today()) { /* déjà actif aujourd'hui */ }
        else if (lastDay === yesterday) streak += 1;
        else streak = 1;
        next.streak = streak; next.lastActiveDay = today();
        // Badges (avec les tâches à jour)
        const updatedTbd = { ...tasksByDate, [activeDate]: tasks.map(t => t.id === id ? { ...t, done: true } : t) };
        next = checkBadges(next, updatedTbd);
      } else {
        next = { ...next, totalXP: Math.max(0, prev.totalXP - earned), todayXP: Math.max(0, prev.todayXP - earned) };
        next.level = computeLevel(next.totalXP);
      }
      return next;
    });
  }, [tasks, tasksByDate, activeDate, updateTask, checkBadges]);

  const copyDayTo = useCallback((from: string, to: string) => {
    const src = (tasksByDate[from] || []).map(t => ({
      ...t, id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      done: false, doneAt: null, date: to,
    }));
    setTasksByDate(prev => ({ ...prev, [to]: [...(prev[to] || []), ...src] }));
  }, [tasksByDate]);

  const clearLevelUp = useCallback(() => setProfile(p => ({ ...p, justLeveledUp: false, newBadge: null })), []);

  return (
    <Ctx.Provider value={{
      activeDate, setActiveDate, tasks, tasksByDate,
      addTask, updateTask, deleteTask, toggleTask, copyDayTo,
      profile, clearLevelUp, activeCategory, setActiveCategory,
      prayerSettings, setPrayerSettings,
      categories, customCategories, addCategory, deleteCategory,
      suggestionsFor, addSuggestion, deleteSuggestion,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const usePlannerContext = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('usePlannerContext doit être dans PlannerProvider');
  return c;
};
