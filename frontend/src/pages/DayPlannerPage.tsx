/**
 * DayPlannerPage.tsx — Planificateur de journée TDAH (ADAH)
 * Catégories · checklist · gamification (XP/niveaux/badges/streaks) · impression · jours futurs
 */
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList, CheckCircle2, Plus, Trash2, Pencil, Printer, Trophy, Lightbulb,
  Sparkles, BrainCircuit, Hourglass, Flame, Clock, Timer, User,
  Landmark, Settings, X, Rocket, Medal, Lock, MapPin, Check, Play, Pause, RotateCcw,
} from 'lucide-react';
import { usePlannerContext, Task, PrayerSettings } from '../context/PlannerContext';
import {
  CATEGORIES, BADGES, getDailyTip, computeTaskXP,
  levelTitle, SUGGESTIONS, PRAYERS, PRAYER_CITIES, TaskSuggestion,
} from '../data/plannerData';
import { usePrayerTimes, PrayerTimings } from '../hooks/usePrayerTimes';
import api from '../lib/api';

const today = () => new Date().toISOString().split('T')[0];
const PRIORITY_ORDER = { high: 0, med: 1, low: 2 } as const;
const PRIORITY_LABEL = { high: 'Haute', med: 'Moyenne', low: 'Faible' };
const fmtFullDate = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

// Suivi des jours où les prières ont déjà été ajoutées (pour ne pas les ré-ajouter)
const PRAYER_ADDED_KEY = 'adah_prayers_added';
const getPrayerAdded = (): Set<string> => { try { return new Set(JSON.parse(localStorage.getItem(PRAYER_ADDED_KEY) || '[]')); } catch { return new Set(); } };
const markPrayerAdded = (k: string) => { const s = getPrayerAdded(); s.add(k); localStorage.setItem(PRAYER_ADDED_KEY, JSON.stringify([...s])); };

export default function DayPlannerPage() {
  const {
    activeDate, setActiveDate, tasks, tasksByDate,
    addTask, updateTask, deleteTask, toggleTask, copyDayTo,
    profile, clearLevelUp, activeCategory, setActiveCategory,
    prayerSettings, setPrayerSettings,
  } = usePlannerContext();

  const [showAdd, setShowAdd]       = useState(false);
  const [editing, setEditing]       = useState<Task | null>(null);
  const [focusTask, setFocusTask]   = useState<Task | null>(null); // tâche en cours de minuteur circulaire
  const [showRewards, setShowRewards] = useState(false);
  const [showPrayerSettings, setShowPrayerSettings] = useState(false);
  const [aiContext, setAiContext]   = useState('');
  const [aiLoading, setAiLoading]   = useState(false);
  const [showAI, setShowAI]         = useState(false);            // modal « Générer avec l'IA »
  const [aiError, setAiError]       = useState<string | null>(null);
  const [aiCount, setAiCount]       = useState<number | null>(null); // toast succès

  const isFuture = activeDate > today();
  const tip = getDailyTip();

  // Ajout automatique des 5 prières (une fois les horaires chargés)
  const handlePrayerTimings = useCallback((timings: PrayerTimings) => {
    if (!prayerSettings.autoAdd || activeDate < today()) return;
    const key = `${activeDate}_${prayerSettings.city}`;
    if (getPrayerAdded().has(key)) return;
    const existing = tasksByDate[activeDate] || [];
    if (existing.some(t => t.category === 'spiritualite' && t.title.includes('Prière'))) { markPrayerAdded(key); return; }
    PRAYERS.forEach(p => addTask({
      title: `Prière ${p.label}`, category: 'spiritualite', priority: 'high',
      duration: 10, timeSlot: timings[p.key as keyof PrayerTimings] || '', xp: computeTaskXP('high', 10),
    }));
    markPrayerAdded(key);
  }, [activeDate, prayerSettings.autoAdd, prayerSettings.city, tasksByDate, addTask]);

  // Prières déjà accomplies aujourd'hui (pour les ✓ du bandeau)
  const prayerDone = useMemo(() => {
    const d: Record<string, boolean> = {};
    PRAYERS.forEach(p => { d[p.key] = tasks.some(t => t.done && t.category === 'spiritualite' && t.title.includes(p.label)); });
    return d;
  }, [tasks]);

  // Tâches filtrées + groupées + triées
  const filtered = activeCategory === 'all' ? tasks : tasks.filter(t => t.category === activeCategory);
  const grouped = useMemo(() => {
    const g: Record<string, Task[]> = {};
    Object.keys(CATEGORIES).forEach(cat => {
      const ct = filtered.filter(t => t.category === cat).sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
      if (ct.length) g[cat] = ct;
    });
    return g;
  }, [filtered]);

  const total = tasks.length;
  const done = tasks.filter(t => t.done).length;
  const progress = total ? Math.round((done / total) * 100) : 0;
  const totalMinutes = tasks.reduce((s, t) => s + t.duration, 0);
  const counts = tasks.reduce((acc, t) => { acc[t.category] = (acc[t.category] || 0) + 1; return acc; }, {} as Record<string, number>);

  const printDay = () => {
    document.title = `ADAH — Ma journée ${fmtFullDate(activeDate)}`;
    window.print();
  };

  const generateAI = async () => {
    setAiLoading(true); setAiError(null);
    try {
      const res = await api.post('/adah/generate-day', { date: activeDate, context: aiContext });
      const tasks: any[] = res.data?.tasks || [];
      // L'IA n'est pas configurée sur le serveur, ou indisponible
      if (res.data?.code === 'NO_AI') {
        setAiError("L'IA n'est pas encore configurée sur le serveur. Réessaie plus tard.");
        setAiLoading(false); return;
      }
      if (tasks.length === 0) {
        setAiError("L'IA est momentanément indisponible. Réessaie dans un instant.");
        setAiLoading(false); return;
      }
      tasks.forEach((t) => addTask({
        title: t.title, category: t.category, priority: t.priority || 'med',
        duration: t.duration || 30, timeSlot: t.timeSlot || '', note: t.note || '',
        xp: computeTaskXP(t.priority || 'med', t.duration || 30),
      }));
      setAiContext(''); setShowAI(false);
      setAiCount(tasks.length);
      setTimeout(() => setAiCount(null), 4000);
    } catch {
      setAiError("L'IA est momentanément indisponible. Réessaie dans un instant.");
    }
    setAiLoading(false);
  };

  return (
    <div className="h-full overflow-y-auto bg-surface-soft">
      {/* Styles impression */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
        }
        .print-only { display: none; }
      `}</style>

      <div className="no-print max-w-3xl mx-auto px-5 py-6 pb-32">

        {/* EN-TÊTE COMPACT — date · niveau · progression du jour */}
        <div className="bg-white border border-line rounded-2xl p-4 mb-3 shadow-card">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h1 className="text-xl font-black text-ink-900 capitalize leading-tight">{fmtFullDate(activeDate)}</h1>
              <p className="text-sm text-ink-400">{isFuture ? 'Planification future' : activeDate === today() ? "Aujourd'hui" : 'Jour passé'}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setAiError(null); setShowAI(true); }} title="Générer ma journée avec l'IA" aria-label="Générer avec l'IA"
                className="bg-violet-100 text-violet-700 px-3 py-2 rounded-xl hover:bg-violet-200">
                <Sparkles size={18} strokeWidth={2} />
              </button>
              <button onClick={() => setShowRewards(true)} title="Récompenses" aria-label="Récompenses"
                className="bg-surface-muted text-ink-600 px-3 py-2 rounded-xl hover:bg-line">
                <Trophy size={18} strokeWidth={2} />
              </button>
              <button onClick={printDay} title="Imprimer" aria-label="Imprimer"
                className="bg-surface-muted text-ink-600 px-3 py-2 rounded-xl hover:bg-line">
                <Printer size={18} strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* Progression du jour + niveau (compact) */}
          <div className="flex items-center gap-3" aria-live="polite">
            <button onClick={() => setShowRewards(true)} title={`Niveau ${profile.level} · ${profile.totalXP} XP`}
              className="w-11 h-11 rounded-xl bg-teal-500 text-white flex flex-col items-center justify-center shrink-0">
              <span className="text-sm font-black leading-none">{profile.level}</span>
              <span className="text-[8px]">niv.</span>
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold text-ink-700">{done}/{total} faites · {progress}%</span>
                <span className="text-ink-400 flex items-center gap-2">
                  {profile.streak >= 1 && (
                    <span className="flex items-center gap-0.5 text-amber-600 font-bold"><Flame size={12} strokeWidth={2} />{profile.streak}j</span>
                  )}
                  <span>{Math.floor(totalMinutes / 60)}h{String(totalMinutes % 60).padStart(2, '0')}</span>
                </span>
              </div>
              <div className="w-full bg-surface-muted rounded-full h-2.5">
                <motion.div className="bg-teal-500 h-2.5 rounded-full"
                  initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }} />
              </div>
            </div>
          </div>
        </div>

        {/* Bande calendaire (sélecteur de jour) */}
        <CalendarStrip activeDate={activeDate} tasksByDate={tasksByDate} onSelect={setActiveDate} />

        <div className="h-3" />

        {/* Filtre catégories */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
          <button onClick={() => setActiveCategory('all')}
            className={`shrink-0 px-3 py-1.5 rounded-xl text-sm font-bold transition-colors ${activeCategory === 'all' ? 'bg-ink-900 text-white' : 'bg-white border border-line text-ink-500'}`}>
            Tout ({total})
          </button>
          {Object.entries(CATEGORIES).map(([key, cat]) => counts[key] ? (
            <button key={key} onClick={() => setActiveCategory(key)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold transition-all border-2 ${activeCategory === key ? 'border-transparent' : 'border-line bg-white text-ink-500'}`}
              style={activeCategory === key ? { background: cat.color, color: cat.textColor } : {}}>
              <cat.Icon size={15} strokeWidth={2} style={{ color: activeCategory === key ? cat.textColor : cat.borderColor }} />
              {cat.label} ({counts[key]})
            </button>
          ) : null)}
        </div>

        {/* Tâches groupées */}
        {Object.entries(grouped).map(([cat, catTasks]) => {
          const c = CATEGORIES[cat];
          return (
            <div key={cat} className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: c.color }}>
                  <c.Icon size={16} strokeWidth={2} style={{ color: c.borderColor }} />
                </span>
                <span className="font-black text-sm" style={{ color: c.textColor }}>{c.label}</span>
                <span className="text-xs text-ink-400">{catTasks.filter(t => t.done).length}/{catTasks.length}</span>
              </div>
              <div className="space-y-2">
                {catTasks.map(t => (
                  <TaskCard key={t.id} task={t} cat={c} isFuture={isFuture}
                    onToggle={() => toggleTask(t.id)}
                    onEdit={() => { setEditing(t); setShowAdd(true); }}
                    onDelete={() => deleteTask(t.id)}
                    onFocus={() => setFocusTask(t)} />
                ))}
              </div>
            </div>
          );
        })}

        {/* Vide → planificateur */}
        {total === 0 && (
          <div className="bg-white border border-line rounded-2xl p-6 text-center">
            <div className="flex justify-center mb-2">
              <ClipboardList size={36} strokeWidth={1.5} className="text-ink-400" />
            </div>
            <p className="font-black text-ink-900 mb-1">{isFuture ? 'Planifie cette journée' : 'Aucune tâche aujourd\'hui'}</p>
            <p className="text-ink-400 text-sm mb-4">Commence ta journée structurée</p>
            <div className="flex flex-col gap-2 max-w-xs mx-auto">
              <button onClick={() => { setEditing(null); setShowAdd(true); }}
                className="bg-teal-500 text-white font-bold py-2.5 rounded-xl hover:bg-teal-600 flex items-center justify-center gap-2">
                <Pencil size={18} strokeWidth={2} /> Partir de zéro
              </button>
              {activeDate !== today() && (tasksByDate[today()]?.length || 0) > 0 && (
                <button onClick={() => copyDayTo(today(), activeDate)}
                  className="bg-surface-muted text-ink-700 font-bold py-2.5 rounded-xl hover:bg-line flex items-center justify-center gap-2">
                  <ClipboardList size={18} strokeWidth={2} /> Copier depuis aujourd'hui
                </button>
              )}
              {/* Génération IA */}
              <div className="bg-violet-50 rounded-xl p-3 mt-1">
                <p className="text-xs text-violet-700 font-bold mb-2 flex items-center justify-center gap-1.5">
                  <BrainCircuit size={16} strokeWidth={2} /> Générer avec l'IA
                </p>
                <input value={aiContext} onChange={e => setAiContext(e.target.value)}
                  placeholder="Ex: journée de travail + sport"
                  className="w-full border border-violet-200 rounded-lg px-3 py-2 text-sm outline-none mb-2" />
                <button onClick={generateAI} disabled={aiLoading}
                  className="w-full bg-violet-500 text-white font-bold py-2 rounded-lg text-sm hover:bg-violet-600 disabled:opacity-50 flex items-center justify-center gap-2">
                  {aiLoading
                    ? <><Hourglass size={16} strokeWidth={2} className="animate-pulse" /> Génération...</>
                    : <><Sparkles size={16} strokeWidth={2} /> Générer ma journée</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Secondaire : prières + conseil du jour (en appui, sous les tâches) ── */}
        <div className="mt-7 space-y-3">
          <PrayerBanner date={activeDate} settings={prayerSettings} doneKeys={prayerDone}
            onTimings={handlePrayerTimings} onOpenSettings={() => setShowPrayerSettings(true)} />
          <div className="bg-teal-50 border border-teal-100 rounded-2xl px-4 py-3">
            <p className="text-sm text-ink-700 flex items-center gap-2">
              <Lightbulb size={16} strokeWidth={2} className="shrink-0 text-teal-600" />
              <span><strong>Conseil du jour :</strong> {tip}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Bouton flottant ajouter */}
      {total > 0 && (
        <button onClick={() => { setEditing(null); setShowAdd(true); }}
          className="no-print fixed bottom-6 left-1/2 -translate-x-1/2 bg-teal-500 hover:bg-teal-600 text-white font-black px-6 py-3.5 rounded-2xl shadow-card flex items-center gap-2 z-40">
          <Plus size={20} strokeWidth={2.5} /> Ajouter une tâche
        </button>
      )}

      {/* Vue impression */}
      <PrintView date={activeDate} grouped={grouped} total={total} totalMinutes={totalMinutes} />

      {/* Modal ajout/édition */}
      <AnimatePresence>
        {showAdd && (
          <AddTaskModal task={editing} onClose={() => { setShowAdd(false); setEditing(null); }}
            onSave={(data) => {
              if (editing) updateTask(editing.id, data);
              else addTask(data);
              setShowAdd(false); setEditing(null);
            }} />
        )}
      </AnimatePresence>

      {/* Minuteur circulaire de focus sur une tâche */}
      <AnimatePresence>
        {focusTask && (
          <TaskFocusTimer
            task={focusTask}
            cat={CATEGORIES[focusTask.category]}
            onClose={() => setFocusTask(null)}
            onComplete={() => {
              if (focusTask && !focusTask.done) toggleTask(focusTask.id);
              setFocusTask(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Modal — Générer ma journée avec l'IA (accessible en permanence) */}
      <AnimatePresence>
        {showAI && (
          <motion.div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAI(false)}>
            <motion.div className="bg-white rounded-3xl w-full max-w-md shadow-card p-5"
              initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              onClick={e => e.stopPropagation()}>
              <h3 className="font-black text-ink-900 text-lg mb-1 flex items-center gap-2">
                <BrainCircuit size={20} strokeWidth={2} className="text-violet-600" /> Générer ma journée avec l'IA
              </h3>
              <p className="text-sm text-ink-500 mb-4">Décris ta journée — l'IA propose 6 à 8 tâches adaptées au TDAH, réparties intelligemment.</p>
              <input value={aiContext} onChange={e => setAiContext(e.target.value)} autoFocus
                onKeyDown={e => { if (e.key === 'Enter' && !aiLoading) generateAI(); }}
                placeholder="Ex : journée de travail + sport + courses"
                className="w-full border-2 border-line focus:border-violet-400 rounded-xl px-4 py-3 text-sm outline-none mb-2" />
              {aiError && (
                <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2 mb-2 flex items-center gap-1.5">
                  <X size={15} strokeWidth={2.5} /> {aiError}
                </p>
              )}
              <div className="flex gap-3 mt-2">
                <button onClick={() => setShowAI(false)}
                  className="flex-1 border-2 border-line text-ink-500 font-bold py-3 rounded-xl hover:bg-surface-soft text-sm">Annuler</button>
                <button onClick={generateAI} disabled={aiLoading}
                  className="flex-[1.6] bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white font-black py-3 rounded-xl text-sm inline-flex items-center justify-center gap-2">
                  {aiLoading
                    ? <><Hourglass size={16} strokeWidth={2} className="animate-pulse" /> L'IA construit ta journée…</>
                    : <><Sparkles size={16} strokeWidth={2} /> Générer ma journée</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast — tâches ajoutées par l'IA */}
      <AnimatePresence>
        {aiCount !== null && (
          <motion.div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-ink-900 text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-card z-50 inline-flex items-center gap-2"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}>
            <Sparkles size={15} strokeWidth={2} className="text-violet-300" /> {aiCount} tâche{aiCount > 1 ? 's' : ''} ajoutée{aiCount > 1 ? 's' : ''}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Panneau récompenses */}
      <AnimatePresence>
        {showRewards && <RewardsPanel profile={profile} onClose={() => setShowRewards(false)} />}
      </AnimatePresence>

      {/* Réglages prières */}
      <AnimatePresence>
        {showPrayerSettings && (
          <PrayerSettingsModal settings={prayerSettings} onSave={setPrayerSettings} onClose={() => setShowPrayerSettings(false)} />
        )}
      </AnimatePresence>

      {/* Level up / badge */}
      <AnimatePresence>
        {(profile.justLeveledUp || profile.newBadge) && (
          <LevelUpModal level={profile.level} badge={profile.newBadge} onClose={clearLevelUp} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Bande calendaire ───────────────────────────────────────────────────────────
// ── Bande calendaire — style « ligne du temps » (frise) ─────────────────────────
function CalendarStrip({ activeDate, tasksByDate, onSelect }: { activeDate: string; tasksByDate: Record<string, Task[]>; onSelect: (d: string) => void }) {
  const t = today();
  const PAGE_BG = '#F5F8F7'; // = surface-soft, pour détacher les nœuds de la ligne
  const days = Array.from({ length: 15 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - 7 + i);
    const ds = d.toISOString().split('T')[0];
    const tasks = tasksByDate[ds] || [];
    const done = tasks.filter(x => x.done).length;
    return {
      date: ds, num: d.getDate(), label: d.toLocaleDateString('fr-FR', { weekday: 'short' }),
      isToday: ds === t, isActive: ds === activeDate, isFuture: ds > t,
      total: tasks.length,
      complete: tasks.length > 0 && done === tasks.length,
      overdue: ds < t && tasks.length > 0 && done < tasks.length,
      futureTasks: ds > t && tasks.length > 0,
    };
  });
  const W = 46;                                   // largeur d'un nœud (px)
  const iToday = days.findIndex(d => d.isToday);
  const fillW = (iToday + 0.5) * W;               // progression jusqu'au centre d'aujourd'hui
  const dotColor = (d: typeof days[number]) =>
    d.complete ? '#2E9D89' : d.overdue ? '#DB9A45' : d.futureTasks ? '#7077B0' : '#D7E0DD';

  return (
    <div className="overflow-x-auto pb-1" style={{ touchAction: 'pan-x' }}>
      <div className="relative" style={{ width: days.length * W, minWidth: '100%' }}>
        {/* ligne de fond + progression jusqu'à aujourd'hui */}
        <div className="absolute h-[3px] rounded-full" style={{ left: 0, width: days.length * W, top: 20, background: '#E4EBE9' }} />
        <div className="absolute h-[3px] rounded-full bg-teal-500" style={{ left: 0, width: fillW, top: 20 }} />
        {/* nœuds */}
        <div className="flex relative">
          {days.map(d => (
            <button key={d.date} onClick={() => onSelect(d.date)} aria-pressed={d.isActive} aria-label={d.label + ' ' + d.num}
              className="shrink-0 flex flex-col items-center" style={{ width: W }}>
              {d.isActive ? (
                <span className="rounded-full bg-teal-500 text-white text-sm font-bold flex items-center justify-center"
                  style={{ width: 34, height: 34, marginTop: 3, border: `3px solid ${PAGE_BG}` }}>{d.num}</span>
              ) : (
                <span className="rounded-full" style={{
                  width: d.isToday ? 15 : 12, height: d.isToday ? 15 : 12,
                  marginTop: d.isToday ? 13 : 14,
                  background: d.isToday ? '#2E9D89' : dotColor(d),
                  border: `3px solid ${PAGE_BG}`,
                }} />
              )}
              <span className={`text-[11px] mt-1.5 ${d.isActive ? 'text-teal-700 font-bold' : d.isToday ? 'text-teal-600 font-semibold' : 'text-ink-400'}`}>
                {d.isActive ? (d.isToday ? 'auj.' : d.label) : (d.isToday ? 'auj.' : d.num)}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Carte tâche ────────────────────────────────────────────────────────────────
function TaskCard({ task, cat, isFuture, onToggle, onEdit, onDelete, onFocus }: any) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
      className={`flex items-start gap-3 bg-white border rounded-xl p-3 transition-all ${task.done ? 'border-teal-200 opacity-70' : 'border-line'}`}
      style={{ borderLeftWidth: 3, borderLeftColor: cat.borderColor }}>
      <button onClick={onToggle} disabled={isFuture} role="checkbox" aria-checked={task.done}
        aria-label={task.done ? 'Décocher' : 'Cocher'}
        className={`mt-0.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all disabled:opacity-30 ${
          task.done ? 'bg-teal-500 border-teal-500 text-white' : 'border-line hover:border-teal-400'
        }`}>
        {task.done && <Check size={14} strokeWidth={3} />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${task.done ? 'line-through text-ink-400' : 'text-ink-700'}`}>{task.title}</p>
        <div className="flex items-center gap-2 flex-wrap mt-1">
          {task.timeSlot && <span className="text-xs text-ink-500 flex items-center gap-1"><Clock size={14} strokeWidth={2} /> {task.timeSlot}</span>}
          <span className="text-xs text-ink-400 flex items-center gap-1"><Timer size={14} strokeWidth={2} /> {task.duration}min</span>
          <span className={`text-xs px-1.5 rounded-full ${task.priority === 'high' ? 'bg-violet-100 text-violet-700' : task.priority === 'med' ? 'bg-teal-100 text-teal-700' : 'bg-surface-muted text-ink-500'}`}>
            {PRIORITY_LABEL[task.priority as keyof typeof PRIORITY_LABEL]}
          </span>
          <span className="text-xs text-violet-500 font-bold">+{task.xp} XP</span>
          {isFuture && <span className="text-xs bg-violet-100 text-violet-600 px-1.5 rounded-full font-bold">FUTUR</span>}
        </div>
        {task.note && <p className="text-xs text-ink-400 italic mt-1">{task.note}</p>}
      </div>
      <div className="flex flex-col items-center gap-1 shrink-0">
        {!task.done && !isFuture && (
          <button onClick={onFocus} aria-label="Démarrer le minuteur de focus" title="Démarrer un minuteur"
            className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 hover:bg-teal-100 flex items-center justify-center mb-0.5">
            <Play size={16} strokeWidth={2.5} className="ml-0.5" />
          </button>
        )}
        <div className="flex gap-1.5">
          <button onClick={onEdit} aria-label="Modifier" className="text-ink-400 hover:text-teal-500"><Pencil size={16} strokeWidth={2} /></button>
          <button onClick={onDelete} aria-label="Supprimer" className="text-ink-400 hover:text-red-500"><Trash2 size={16} strokeWidth={2} /></button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Minuteur circulaire de focus sur une tâche (grand cercle) ───────────────────
function TaskFocusTimer({ task, cat, onClose, onComplete }: {
  task: Task; cat: any; onClose: () => void; onComplete: () => void;
}) {
  const total = Math.max(1, task.duration || 25) * 60;
  const [remaining, setRemaining] = useState(total);
  const [running, setRunning]     = useState(true);
  const [done, setDone]           = useState(false);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running || done) return;
    tick.current = setInterval(() => {
      setRemaining(s => {
        if (s <= 1) { if (tick.current) clearInterval(tick.current); setDone(true); setRunning(false); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => { if (tick.current) clearInterval(tick.current); };
  }, [running, done]);

  const color = cat?.borderColor || '#2E9D89';
  const mm = Math.floor(remaining / 60), ss = remaining % 60;
  const R = 130, C = 2 * Math.PI * R;
  const progress = total ? remaining / total : 0;
  const reset   = () => { setRemaining(total); setDone(false); setRunning(true); };
  const addFive = () => setRemaining(s => s + 300);

  return (
    <motion.div className="fixed inset-0 bg-ink-900/95 z-[60] flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="text-center w-full max-w-sm"
        initial={{ scale: 0.92, y: 14 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, opacity: 0 }}>
        {/* Catégorie + tâche */}
        <div className="flex items-center justify-center gap-1.5 mb-1 text-white/70 text-sm">
          {cat?.Icon && <cat.Icon size={16} strokeWidth={2} />} {cat?.label}
        </div>
        <h3 className="text-white font-black text-xl mb-6 px-4">{task.title}</h3>

        {/* Grand cercle */}
        <div className="relative w-72 h-72 mx-auto mb-7">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 300 300">
            <circle cx="150" cy="150" r={R} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="14" />
            <circle cx="150" cy="150" r={R} fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C * (1 - progress)}
              style={{ transition: 'stroke-dashoffset 1s linear' }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {done ? (
              <>
                <CheckCircle2 size={48} strokeWidth={2} className="text-teal-400 mb-1" />
                <span className="text-white font-black text-xl">Terminé !</span>
              </>
            ) : (
              <>
                <span className="text-white font-black tabular-nums" style={{ fontSize: 56, lineHeight: 1 }}>
                  {String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}
                </span>
                <span className="text-white/50 text-sm mt-2">{running ? 'focus en cours' : 'en pause'}</span>
              </>
            )}
          </div>
        </div>

        {/* Contrôles */}
        {!done ? (
          <div className="flex items-center justify-center gap-3">
            <button onClick={addFive} className="bg-white/10 hover:bg-white/20 text-white font-bold px-4 py-3 rounded-2xl text-sm">+5 min</button>
            <button onClick={() => setRunning(r => !r)} aria-label={running ? 'Pause' : 'Reprendre'}
              className="bg-white text-ink-900 w-16 h-16 rounded-full flex items-center justify-center shadow-card">
              {running ? <Pause size={26} strokeWidth={2.5} /> : <Play size={26} strokeWidth={2.5} className="ml-1" />}
            </button>
            <button onClick={reset} aria-label="Réinitialiser" className="bg-white/10 hover:bg-white/20 text-white px-4 py-3 rounded-2xl"><RotateCcw size={18} strokeWidth={2} /></button>
          </div>
        ) : (
          <button onClick={onComplete} className="bg-teal-500 hover:bg-teal-600 text-white font-black px-6 py-3.5 rounded-2xl inline-flex items-center gap-2">
            <Check size={20} strokeWidth={2.5} /> Marquer la tâche comme faite
          </button>
        )}

        {/* Fermer */}
        <button onClick={onClose} className="block mx-auto mt-5 text-white/60 hover:text-white text-sm font-semibold">
          {done ? 'Fermer' : 'Quitter le minuteur'}
        </button>
      </motion.div>
    </motion.div>
  );
}

// ── Modal ajout/édition ───────────────────────────────────────────────────────
function AddTaskModal({ task, onSave, onClose }: { task: Task | null; onSave: (d: Partial<Task>) => void; onClose: () => void }) {
  const [title, setTitle]       = useState(task?.title || '');
  const [category, setCategory] = useState(task?.category || 'personal');
  const [priority, setPriority] = useState<'high' | 'med' | 'low'>(task?.priority || 'med');
  const [duration, setDuration] = useState(task?.duration || 30);
  const [timeSlot, setTimeSlot] = useState(task?.timeSlot || '');
  const [note, setNote]         = useState(task?.note || '');
  const [personName, setPersonName]         = useState('');
  const [familyTemplate, setFamilyTemplate] = useState<string | null>(null);
  const xp = computeTaskXP(priority, duration);
  const cat = CATEGORIES[category];
  const suggestions = SUGGESTIONS[category] || [];
  const isFamily = category === 'family';

  // Titre « Famille & amis » = action choisie + nom de la personne
  useEffect(() => {
    if (isFamily && familyTemplate) setTitle(familyTemplate.replace('{nom}', personName.trim()));
  }, [familyTemplate, personName, isFamily]);

  const applySuggestion = (s: TaskSuggestion) => {
    if (s.duration) setDuration(s.duration);
    if (s.priority) setPriority(s.priority);
    if (s.needsName) setFamilyTemplate(s.template || `${s.title} {nom}`);
    else { setTitle(s.title); setFamilyTemplate(null); }
  };
  const changeCategory = (key: string) => { setCategory(key); if (key !== 'family') setFamilyTemplate(null); };

  const finalTitle = isFamily && familyTemplate ? familyTemplate.replace('{nom}', personName.trim()) : title.trim();
  const canSave = isFamily && familyTemplate ? personName.trim().length > 0 : title.trim().length > 0;

  return (
    <motion.div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="bg-white rounded-3xl w-full max-w-md shadow-card max-h-[90vh] overflow-y-auto"
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        onClick={e => e.stopPropagation()}>
        <div className="p-5">
          <h3 className="font-black text-ink-900 text-lg mb-4 flex items-center gap-2">
            {task ? <><Pencil size={20} strokeWidth={2} /> Modifier</> : <><Plus size={20} strokeWidth={2.5} /> Nouvelle tâche</>}
          </h3>

          <input value={title} onChange={e => { setTitle(e.target.value); setFamilyTemplate(null); }} autoFocus placeholder="Que dois-tu faire ?"
            className="w-full border-2 border-line focus:border-teal-400 rounded-xl px-4 py-3 text-sm outline-none mb-3" />

          {/* Catégorie — sélecteur icône-d'abord (compact, lisible) */}
          <p className="text-xs font-bold text-ink-400 uppercase mb-2">Catégorie</p>
          <div className="grid grid-cols-4 gap-2 mb-2">
            {Object.entries(CATEGORIES).map(([key, c]) => {
              const active = category === key;
              return (
                <button key={key} onClick={() => changeCategory(key)}
                  className={`flex flex-col items-center gap-1 px-1 py-2 rounded-xl border-2 transition-all ${active ? 'border-transparent' : 'border-line hover:bg-surface-soft'}`}
                  style={active ? { background: c.color } : {}}>
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: active ? '#ffffff' : c.color }}>
                    <c.Icon size={17} strokeWidth={2} style={{ color: c.borderColor }} />
                  </span>
                  <span className="text-[10px] font-semibold leading-tight text-center"
                    style={{ color: active ? c.textColor : '#5C6B66' }}>{c.label}</span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-ink-400 italic mb-3 flex items-center gap-1.5"><Lightbulb size={14} strokeWidth={2} /> {cat.tip}</p>

          {/* Suggestions rapides (1 clic = pré-remplie) */}
          {suggestions.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-bold text-ink-400 uppercase mb-2">{isFamily ? 'Choisis une action' : 'Suggestions rapides'}</p>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((s, i) => {
                  const active = isFamily ? familyTemplate === (s.template || `${s.title} {nom}`) : title === s.title;
                  return (
                    <button key={i} onClick={() => applySuggestion(s)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${active ? 'border-transparent text-white' : 'border-line text-ink-500 hover:bg-surface-soft'}`}
                      style={active ? { background: cat.borderColor } : {}}>
                      <s.Icon size={13} strokeWidth={2} style={active ? {} : { color: cat.borderColor }} />
                      {s.title}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Nom de la personne (Famille & amis) */}
          {isFamily && familyTemplate && (
            <div className="mb-3 rounded-xl p-3" style={{ background: '#FCE8E4' }}>
              <p className="text-xs font-bold mb-1 flex items-center gap-1.5" style={{ color: '#8A2F1D' }}><User size={14} strokeWidth={2} /> Nom de la personne</p>
              <input value={personName} onChange={e => setPersonName(e.target.value)} autoFocus placeholder="Ex: Maman, Ahmed, Sara..."
                className="w-full border-2 rounded-xl px-3 py-2 text-sm outline-none" style={{ borderColor: '#F0BFB3' }} />
              {personName.trim() && <p className="text-xs mt-1.5 font-semibold" style={{ color: '#8A2F1D' }}>→ {finalTitle}</p>}
            </div>
          )}

          {/* Priorité */}
          <p className="text-xs font-bold text-ink-400 uppercase mb-2">Priorité</p>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {(['high', 'med', 'low'] as const).map(p => (
              <button key={p} onClick={() => setPriority(p)}
                className={`py-2 rounded-xl text-sm font-bold transition-all ${priority === p ? 'bg-teal-500 text-white' : 'bg-surface-muted text-ink-500'}`}>
                {PRIORITY_LABEL[p]}
              </button>
            ))}
          </div>

          {/* Heure + durée */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <p className="text-xs font-bold text-ink-400 uppercase mb-2">Heure</p>
              <input type="time" value={timeSlot} onChange={e => setTimeSlot(e.target.value)}
                className="w-full border-2 border-line focus:border-teal-400 rounded-xl px-3 py-2 text-sm outline-none" />
            </div>
            <div>
              <p className="text-xs font-bold text-ink-400 uppercase mb-2">Durée : {duration}min</p>
              <input type="range" min="5" max="180" step="5" value={duration}
                onChange={e => setDuration(Number(e.target.value))} className="w-full accent-teal-500 mt-2.5" />
            </div>
          </div>

          {/* Note */}
          <textarea value={note} onChange={e => setNote(e.target.value.slice(0, 200))} rows={2}
            placeholder="Note (optionnel)..."
            className="w-full border-2 border-line focus:border-teal-400 rounded-xl px-3 py-2 text-sm outline-none resize-none mb-3" />

          {/* XP — discret */}
          <p className="text-xs text-ink-400 text-right mb-4 flex items-center justify-end gap-1">
            <Sparkles size={12} strokeWidth={2} className="text-violet-400" /> +{xp} XP à la complétion
          </p>

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 border-2 border-line text-ink-500 font-bold py-3 rounded-xl hover:bg-surface-soft text-sm">Annuler</button>
            <button onClick={() => canSave && onSave({ title: finalTitle, category, priority, duration, timeSlot, note, xp })}
              disabled={!canSave}
              className="flex-1 bg-teal-500 hover:bg-teal-600 disabled:opacity-40 text-white font-black py-3 rounded-xl text-sm">
              {task ? 'Enregistrer' : 'Ajouter'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Panneau récompenses ────────────────────────────────────────────────────────
function RewardsPanel({ profile, onClose }: { profile: any; onClose: () => void }) {
  return (
    <motion.div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="bg-white rounded-3xl w-full max-w-md shadow-card max-h-[85vh] overflow-y-auto"
        initial={{ scale: 0.94 }} animate={{ scale: 1 }} exit={{ scale: 0.94 }} onClick={e => e.stopPropagation()}>
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-ink-900 text-lg flex items-center gap-2"><Trophy size={20} strokeWidth={2} className="text-amber-500" /> Mes récompenses</h3>
            <button onClick={onClose} aria-label="Fermer" className="text-ink-400 hover:text-ink-700"><X size={20} strokeWidth={2} /></button>
          </div>
          <div className="bg-teal-500 rounded-2xl p-4 text-white text-center mb-4">
            <p className="text-3xl font-black">Niveau {profile.level}</p>
            <p className="text-sm opacity-90">{levelTitle(profile.level)}</p>
            <p className="text-xs opacity-75 mt-1 flex items-center justify-center gap-1">{profile.totalXP} XP · <Flame size={12} strokeWidth={2} /> {profile.streak} jours</p>
          </div>
          <p className="text-xs font-bold text-ink-400 uppercase mb-2">Badges ({profile.earnedBadges.length}/{BADGES.length})</p>
          <div className="grid grid-cols-2 gap-2">
            {BADGES.map(b => {
              const earned = profile.earnedBadges.includes(b.id);
              return (
                <div key={b.id} className={`rounded-xl p-3 border ${earned ? 'bg-amber-400/10 border-amber-400/40' : 'bg-surface-soft border-line opacity-50'}`}>
                  <div className="mb-1.5">{earned
                    ? <b.Icon size={22} strokeWidth={2} className="text-amber-500" />
                    : <Lock size={20} strokeWidth={2} className="text-ink-400" />}</div>
                  <p className="text-xs font-bold text-ink-700">{b.label}</p>
                  <p className="text-xs text-ink-400">{b.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Modal level up / badge ─────────────────────────────────────────────────────
function LevelUpModal({ level, badge, onClose }: { level: number; badge: string | null; onClose: () => void }) {
  return (
    <motion.div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="bg-white rounded-3xl p-8 text-center max-w-xs w-full shadow-card"
        initial={{ scale: 0.7, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.7 }}
        transition={{ type: 'spring', damping: 12 }} onClick={e => e.stopPropagation()}>
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1, rotate: [0, 10, -10, 0] }} transition={{ delay: 0.1 }}
          className="mb-3 flex justify-center">
          {badge ? <Medal size={56} strokeWidth={1.5} className="text-amber-500" /> : <Sparkles size={56} strokeWidth={1.5} className="text-teal-500" />}
        </motion.div>
        <h3 className="text-2xl font-black text-ink-900 mb-1">{badge ? 'Badge débloqué !' : `Niveau ${level} !`}</h3>
        <p className="text-ink-500 mb-1">{badge ? badge : levelTitle(level)}</p>
        <p className="text-ink-400 text-sm mb-6">{badge ? 'Continue comme ça' : 'Ton cerveau TDAH progresse !'}</p>
        <button onClick={onClose} className="w-full bg-teal-500 text-white font-black py-3 rounded-2xl hover:bg-teal-600 flex items-center justify-center gap-2">Super ! <Rocket size={18} strokeWidth={2} /></button>
      </motion.div>
    </motion.div>
  );
}

// ── Vue impression ─────────────────────────────────────────────────────────────
function PrintView({ date, grouped, total, totalMinutes }: { date: string; grouped: Record<string, Task[]>; total: number; totalMinutes: number }) {
  return (
    <div className="print-only" style={{ padding: 24, fontFamily: 'Georgia, serif', color: '#000' }}>
      <h1 style={{ fontSize: 22, fontWeight: 'bold' }}>Ma journée TDAH — {fmtFullDate(date)}</h1>
      <p style={{ fontSize: 11, color: '#555', marginBottom: 16 }}>Généré par ADAH · {total} tâches · {Math.floor(totalMinutes / 60)}h{String(totalMinutes % 60).padStart(2, '0')} planifiées</p>
      {Object.entries(grouped).map(([cat, tasks]) => (
        <div key={cat} style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 13, fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: 3, marginBottom: 6 }}>
            {CATEGORIES[cat].emoji} {CATEGORIES[cat].label}
          </p>
          {tasks.map(t => (
            <div key={t.id} style={{ display: 'flex', gap: 8, marginBottom: 5, fontSize: 12 }}>
              <span style={{ width: 14, height: 14, border: '1px solid #000', display: 'inline-block', flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong>{t.title}</strong>
                <div style={{ fontSize: 10, color: '#555' }}>
                  {t.timeSlot && `${t.timeSlot} · `}{t.duration}min · {PRIORITY_LABEL[t.priority]}
                </div>
                {t.note && <div style={{ fontSize: 10, fontStyle: 'italic' }}>{t.note}</div>}
              </div>
            </div>
          ))}
        </div>
      ))}
      <p style={{ marginTop: 24, fontSize: 10, fontStyle: 'italic', color: '#888', textAlign: 'center' }}>
        Souviens-toi : le progrès, pas la perfection. 💜
      </p>
    </div>
  );
}

// ── Bandeau prières (Salat) ──────────────────────────────────────────────────────
function PrayerBanner({ date, settings, doneKeys, onTimings, onOpenSettings }: {
  date: string; settings: PrayerSettings; doneKeys: Record<string, boolean>;
  onTimings: (t: PrayerTimings) => void; onOpenSettings: () => void;
}) {
  const { timings, loading, error, nextKey, countdown, passed } = usePrayerTimes(date, settings.city, settings.country, settings.enabled);

  useEffect(() => { if (timings) onTimings(timings); }, [timings]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!settings.enabled) {
    return (
      <button onClick={onOpenSettings}
        className="w-full mb-3 flex items-center justify-center gap-1.5 text-xs text-teal-700 font-semibold bg-teal-50 border border-teal-100 rounded-xl py-2 hover:bg-teal-100">
        <Landmark size={14} strokeWidth={2} /> Afficher les horaires de prière
      </button>
    );
  }

  const isToday = date === today();

  return (
    <div className="mb-3 rounded-2xl border p-3" style={{ background: '#E7F4EE', borderColor: '#C5E6D5' }}>
      <div className="flex items-center justify-between mb-2 gap-2">
        <button onClick={onOpenSettings} className="flex items-center gap-1.5 text-sm font-black" style={{ color: '#14573A' }}>
          <Landmark size={16} strokeWidth={2} /> Prières · {settings.city} <Settings size={13} strokeWidth={2} className="opacity-60" />
        </button>
        {loading && <span className="text-xs text-ink-400">Chargement…</span>}
        {isToday && nextKey && !loading && (
          <span className="text-xs font-bold shrink-0 flex items-center gap-1" style={{ color: '#14573A' }}>
            <Hourglass size={13} strokeWidth={2} /> {nextKey} {countdown === 'demain' ? 'demain' : `dans ${countdown}`}
          </span>
        )}
      </div>

      {error ? (
        <p className="text-xs text-ink-500 flex items-center gap-1">Horaires indisponibles — vérifie la ville dans <Settings size={13} strokeWidth={2} /></p>
      ) : (
        <div className="grid grid-cols-5 gap-1.5">
          {PRAYERS.map(p => {
            const t = timings?.[p.key as keyof PrayerTimings];
            const isNext = isToday && p.key === nextKey;
            const isPassed = isToday && passed[p.key];
            const isDone = doneKeys[p.key];
            return (
              <div key={p.key}
                className={`rounded-xl px-1 py-1.5 text-center border ${isNext ? 'border-teal-500 bg-white' : 'border-transparent bg-white/60'}`}>
                <p className={`text-[11px] font-bold leading-tight flex items-center justify-center gap-0.5 ${isPassed && !isDone ? 'text-ink-400' : 'text-teal-800'}`}>
                  {isDone && <Check size={11} strokeWidth={3} />}{p.label}
                </p>
                <p className={`text-[11px] leading-tight ${isNext ? 'font-black text-teal-700' : 'text-ink-500'}`}>{t || '--:--'}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Réglages prières (ville configurable) ─────────────────────────────────────────
function PrayerSettingsModal({ settings, onSave, onClose }: {
  settings: PrayerSettings; onSave: (s: Partial<PrayerSettings>) => void; onClose: () => void;
}) {
  const [city, setCity]       = useState(settings.city);
  const [country, setCountry] = useState(settings.country);
  const [enabled, setEnabled] = useState(settings.enabled);
  const [autoAdd, setAutoAdd] = useState(settings.autoAdd);

  const save = () => { onSave({ city: city.trim() || 'Marrakech', country: country.trim() || 'Morocco', enabled, autoAdd }); onClose(); };

  return (
    <motion.div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="bg-white rounded-3xl w-full max-w-md shadow-card max-h-[90vh] overflow-y-auto"
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        onClick={e => e.stopPropagation()}>
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-ink-900 text-lg flex items-center gap-2"><Landmark size={20} strokeWidth={2} /> Réglages des prières</h3>
            <button onClick={onClose} aria-label="Fermer" className="text-ink-400 hover:text-ink-700"><X size={20} strokeWidth={2} /></button>
          </div>

          <label className="flex items-center justify-between py-2.5 border-b border-line cursor-pointer">
            <span className="text-sm font-semibold text-ink-700">Afficher le bandeau des prières</span>
            <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} className="w-5 h-5 accent-teal-500" />
          </label>
          <label className="flex items-center justify-between py-2.5 border-b border-line cursor-pointer mb-3">
            <span className="text-sm font-semibold text-ink-700">Ajouter les 5 prières automatiquement</span>
            <input type="checkbox" checked={autoAdd} onChange={e => setAutoAdd(e.target.checked)} className="w-5 h-5 accent-teal-500" />
          </label>

          <p className="text-xs font-bold text-ink-400 uppercase mb-2">Ville</p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {PRAYER_CITIES.map(c => (
              <button key={c.city} onClick={() => { setCity(c.city); setCountry(c.country); }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${city === c.city ? 'bg-teal-500 text-white border-transparent' : 'border-line text-ink-500 hover:bg-surface-soft'}`}>
                {c.city}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <p className="text-xs font-bold text-ink-400 uppercase mb-1">Ville</p>
              <input value={city} onChange={e => setCity(e.target.value)} placeholder="Marrakech"
                className="w-full border-2 border-line focus:border-teal-400 rounded-xl px-3 py-2 text-sm outline-none" />
            </div>
            <div>
              <p className="text-xs font-bold text-ink-400 uppercase mb-1">Pays</p>
              <input value={country} onChange={e => setCountry(e.target.value)} placeholder="Morocco"
                className="w-full border-2 border-line focus:border-teal-400 rounded-xl px-3 py-2 text-sm outline-none" />
            </div>
          </div>

          <p className="text-xs text-ink-400 italic mb-4 flex items-start gap-1.5"><MapPin size={14} strokeWidth={2} className="shrink-0 mt-0.5" /> Horaires officiels (méthode Maroc · Ministère des Habous). En anglais : Morocco, France, Belgium, Canada…</p>

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 border-2 border-line text-ink-500 font-bold py-3 rounded-xl hover:bg-surface-soft text-sm">Annuler</button>
            <button onClick={save} className="flex-1 bg-teal-500 hover:bg-teal-600 text-white font-black py-3 rounded-xl text-sm">Enregistrer</button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
