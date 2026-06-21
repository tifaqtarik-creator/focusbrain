import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useAppStore } from '../stores/useStore';
import { useSlotStore } from '../stores/useSlotStore';
import { useI18n } from '../lib/i18n';
import SlotNotifications from '../components/slots/SlotNotifications';
import FocusNow from '../components/focus/FocusNow';
import { getSocket } from '../lib/socket';
import {
  reliability, getFavoriteIds, addFavorite, removeFavorite,
  getKpis, ensureNotifPermission, notify, googleCalendarUrl,
  submitFeedback, completeSession,
} from '../lib/bodyDoubling';

const DURATIONS = [15, 25, 50, 75];
const TASK_CATEGORIES = [
  { id: 'travail', label: 'Travail', emoji: '💼' },
  { id: 'etudes',  label: 'Études',  emoji: '📚' },
  { id: 'creatif', label: 'Créatif', emoji: '🎨' },
  { id: 'admin',   label: 'Admin',   emoji: '📄' },
  { id: 'perso',   label: 'Perso',   emoji: '🏠' },
  { id: 'sante',   label: 'Santé',   emoji: '❤️' },
];
const AMBIANCES = [
  { id: 'silence',  label: '🤫 Silence total' },
  { id: 'echanges', label: '💬 Petits échanges' },
];
const ENERGIES = [
  { id: 'faible', label: '🪫 Faible' },
  { id: 'moyen',  label: '🔋 Moyen' },
  { id: 'eleve',  label: '⚡ Élevé' },
];

function slotColor(status: string) {
  if (status === 'OPEN')      return '#10b981';
  if (status === 'PENDING')   return '#f59e0b';
  if (status === 'CONFIRMED') return '#ef4444';
  return '#9ca3af';
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    OPEN:      { label: '● Disponible', cls: 'bg-teal-100 text-teal-700' },
    PENDING:   { label: '● En attente', cls: 'bg-amber-100 text-amber-700' },
    CONFIRMED: { label: '● Confirmé',   cls: 'bg-red-100 text-red-600' },
    CANCELLED: { label: '● Annulé',     cls: 'bg-gray-100 text-gray-400' },
  };
  const s = map[status] || map.CANCELLED;
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>;
}

export default function Dashboard() {
  const { t } = useI18n();
  const sc = t.sessionCalendar;
  const user = useAppStore(s => s.user);
  const { candidates } = useSlotStore();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const calendarRef = useRef<any>(null);

  const [createModal, setCreateModal] = useState<{ start: Date } | null>(null);
  const [joinModal, setJoinModal]     = useState<any | null>(null);
  const [detailModal, setDetailModal] = useState<any | null>(null);
  const [editModal,   setEditModal]   = useState<any | null>(null); // slot à modifier
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null); // id slot à supprimer
  const [cancelTarget, setCancelTarget] = useState<string | null>(null); // id session confirmée à annuler
  const [detailSlot,  setDetailSlot]  = useState<any | null>(null); // slot dont on voit les détails
  const [duration, setDuration]       = useState(25);
  const [creatorTask,   setCreatorTask]   = useState('');
  const [candidateTask, setCandidateTask] = useState('');
  // Formulaire détaillé de création
  const [taskList,     setTaskList]     = useState<string[]>([]);
  const [slotCategory, setSlotCategory] = useState('travail');
  const [ambiance,     setAmbiance]     = useState('silence');
  const [energy,       setEnergy]       = useState('moyen');
  // Type de session + description + récurrence
  const [slotType,    setSlotType]    = useState<'INSTANT' | 'SCHEDULED' | 'RECURRING'>('SCHEDULED');
  const [description, setDescription] = useState('');
  const [recFreq,     setRecFreq]     = useState<'DAILY' | 'WEEKLY'>('WEEKLY');
  const [recDays,     setRecDays]     = useState<number[]>([]);
  const [recCount,    setRecCount]    = useState(4);
  // Feedback de fin de session
  const [feedbackSlot, setFeedbackSlot] = useState<any | null>(null);
  // États pour l'édition
  const [editDuration, setEditDuration] = useState(25);
  const [editTask,     setEditTask]     = useState('');
  const [editDate,     setEditDate]     = useState('');
  const [editDescription, setEditDescription] = useState('');
  // Favoris + KPI
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [kpis, setKpis]               = useState<any>(null);

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: slots = [] } = useQuery({
    queryKey: ['slots'],
    queryFn: () => api.get('/slots').then(r => r.data),
    refetchInterval: 30000,
  });

  const { data: mySlots = [] } = useQuery({
    queryKey: ['slots-mine'],
    queryFn: () => api.get('/slots/mine').then(r => r.data),
    refetchInterval: 15000,
  });

  const { data: pending = [] } = useQuery({
    queryKey: ['slots-pending'],
    queryFn: () => api.get('/slots/pending').then(r => r.data),
    refetchInterval: 15000,
  });

  // ── Favoris, KPI, permission de notification ──
  useEffect(() => {
    getFavoriteIds().then(setFavoriteIds).catch(() => {});
    getKpis().then(setKpis).catch(() => {});
    ensureNotifPermission();
  }, []);

  // ── Détection des sessions terminées → feedback de fin de session ──
  useEffect(() => {
    const ended = (mySlots as any[]).find((s: any) => {
      if (s.status !== 'CONFIRMED') return false;
      const end = new Date(s.startTime).getTime() + s.duration * 60000;
      if (Date.now() < end) return false;                       // pas encore finie
      if (localStorage.getItem(`fb_done_${s.id}`)) return false; // déjà noté/ignoré
      return true;
    });
    if (ended && !feedbackSlot) {
      completeSession(ended.id);             // KPI : marquer terminée (bienveillant)
      setFeedbackSlot(ended);
    }
  }, [mySlots, feedbackSlot]);

  // ── Rappels de session en temps réel (push navigateur) ──
  useEffect(() => {
    const socket = getSocket();
    const onReminder = (d: any) => {
      notify('⏰ Ta session FocusBrain', `Elle commence dans ${d.minutes} min (${d.duration} min). Prépare-toi 💜`);
      qc.invalidateQueries({ queryKey: ['slots-mine'] });
    };
    socket.on('session:reminder', onReminder);
    return () => { socket.off('session:reminder', onReminder); };
  }, [qc]);

  const isFavorite = (id?: string) => !!id && favoriteIds.includes(id);
  const toggleFavorite = async (id?: string) => {
    if (!id) return;
    if (isFavorite(id)) { setFavoriteIds(p => p.filter(x => x !== id)); await removeFavorite(id).catch(() => {}); }
    else { setFavoriteIds(p => [...p, id]); await addFavorite(id).catch(() => {}); }
  };
  const addSlotTask = () => {
    const t = creatorTask.trim();
    if (t && taskList.length < 8) { setTaskList(p => [...p, t]); setCreatorTask(''); }
  };
  const metaLabel = (s: any) => {
    const c = TASK_CATEGORIES.find(x => x.id === s.category);
    const a = AMBIANCES.find(x => x.id === s.ambiance);
    const e = ENERGIES.find(x => x.id === s.energy);
    return [c && `${c.emoji} ${c.label}`, a && a.label, e && e.label].filter(Boolean).join('  ·  ');
  };
  const slotTasks = (s: any): string[] => (s.creatorTasks?.length ? s.creatorTasks : (s.creatorTask ? [s.creatorTask] : []));

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createSlot = useMutation({
    mutationFn: (data: any) => api.post('/slots', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['slots'] });
      qc.invalidateQueries({ queryKey: ['slots-mine'] });
      setCreateModal(null);
      setCreatorTask(''); setTaskList([]); setSlotCategory('travail'); setAmbiance('silence'); setEnergy('moyen');
      setSlotType('SCHEDULED'); setDescription(''); setRecFreq('WEEKLY'); setRecDays([]); setRecCount(4);
    },
  });

  const requestSlot = useMutation({
    mutationFn: ({ slotId, task }: { slotId: string; task?: string }) =>
      api.post(`/slots/${slotId}/request`, { candidateTask: task }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['slots'] });
      qc.invalidateQueries({ queryKey: ['slots-pending'] });
      setJoinModal(null);
      setCandidateTask('');
    },
  });

  const confirmCandidate = useMutation({
    mutationFn: ({ slotId, candidateId }: { slotId: string; candidateId: string }) =>
      api.post(`/slots/${slotId}/confirm`, { candidateId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['slots-mine'] });
      qc.invalidateQueries({ queryKey: ['slots'] });
      setDetailModal(null);
    },
  });

  const cancelSlot = useMutation({
    mutationFn: (slotId: string) => api.post(`/slots/${slotId}/cancel`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['slots-mine'] });
      qc.invalidateQueries({ queryKey: ['slots'] });
    },
  });

  // Modifier un créneau
  const editSlot = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.patch(`/slots/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['slots-mine'] });
      qc.invalidateQueries({ queryKey: ['slots'] });
      setEditModal(null);
    },
  });

  // Supprimer un créneau
  const deleteSlot = useMutation({
    mutationFn: (id: string) => api.delete(`/slots/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['slots-mine'] });
      qc.invalidateQueries({ queryKey: ['slots'] });
      setDeleteTarget(null);
    },
  });

  // Ouvrir le modal d'édition avec les valeurs pré-remplies
  const openEditModal = (slot: any) => {
    setEditModal(slot);
    setEditDuration(slot.duration);
    setEditTask(slot.creatorTask || '');
    setEditDescription(slot.description || '');
    const d = new Date(slot.startTime);
    // Format datetime-local : YYYY-MM-DDThh:mm
    const pad = (n: number) => String(n).padStart(2, '0');
    setEditDate(`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
  };

  // ── Événements calendrier ──────────────────────────────────────────────────
  const events = slots.map((s: any) => {
    const isMine = s.creator.id === user?.id;
    // Une fois confirmée, on affiche la photo du partenaire (sinon celle du créateur)
    const shown = s.status === 'CONFIRMED'
      ? (isMine ? s.partner : s.creator)
      : s.creator;
    return {
      id: s.id,
      title: isMine ? `Mon créneau · ${s.duration}min` : `${s.creator.name} · ${s.duration}min`,
      start: s.startTime,
      end: new Date(new Date(s.startTime).getTime() + s.duration * 60000).toISOString(),
      backgroundColor: slotColor(s.status),
      borderColor: slotColor(s.status),
      extendedProps: { ...s, _shownAvatar: shown?.avatar || null, _shownName: shown?.name || '', _isMine: isMine },
    };
  });

  const confirmed = mySlots.filter((s: any) => s.status === 'CONFIRMED');
  const created   = mySlots.filter((s: any) => s.status !== 'CONFIRMED' && s.creatorId === user?.id);

  return (
    <div className="flex h-full bg-gray-50 overflow-hidden">
      <SlotNotifications />

      {/* ── COLONNE GAUCHE ──────────────────────────────────────────────────── */}
      <aside className="w-72 bg-white border-r border-gray-100 flex flex-col overflow-y-auto shrink-0">
        {/* Header user */}
        <div className="p-5 border-b border-gray-100">
          <h2 className="font-black text-gray-900">Bonjour {user?.name?.split(' ')[0]} 👋</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {new Date().toLocaleDateString('fr', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        {/* KPI Body Doubling */}
        {kpis && (
          <div className="px-4 pt-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">📊 Indicateurs</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-teal-50 rounded-xl p-2 text-center">
                <p className="text-base font-black text-teal-700">{kpis.activation?.rate ?? 0}%</p>
                <p className="text-[10px] text-gray-500 leading-tight">1ʳᵉ session</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-2 text-center">
                <p className="text-base font-black text-emerald-700">{kpis.completionRate ?? 0}%</p>
                <p className="text-[10px] text-gray-500 leading-tight">complétion</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-2 text-center">
                <p className="text-base font-black text-amber-700">{kpis.noShowRate ?? 0}%</p>
                <p className="text-[10px] text-gray-500 leading-tight">no-show</p>
              </div>
            </div>
            {kpis.me && (
              <p className="text-[11px] text-gray-400 mt-2 text-center">
                Toi : {kpis.me.completed} session(s) ✅ · {reliability({ sessionsCompleted: kpis.me.completed, sessionsNoShow: kpis.me.noShow }).label}
              </p>
            )}
          </div>
        )}

        {/* Sessions confirmées */}
        <div className="p-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">
            ✅ Sessions confirmées ({confirmed.length})
          </p>
          {confirmed.length === 0
            ? <p className="text-xs text-gray-400 italic">Aucune session confirmée</p>
            : confirmed.map((s: any) => {
                const partner = s.creatorId === user?.id ? s.partner : s.creator;
                const start = new Date(s.startTime);
                return (
                  <motion.div key={s.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-teal-50 border border-teal-200 rounded-xl p-3 mb-2">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0 overflow-hidden">
                          {partner?.avatar ? <img src={partner.avatar} className="w-full h-full object-cover" /> : (partner?.name?.[0]?.toUpperCase() || '?')}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-gray-900 truncate">{partner?.name || 'Partenaire'}</p>
                          <p className="text-xs text-gray-500">
                            {start.toLocaleDateString('fr', { weekday: 'short', day: 'numeric' })}
                            {' · '}
                            {start.toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' })}
                            {' · '}{s.duration}min
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button onClick={() => setDetailSlot(s)} title="Détails" className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-100 rounded-lg transition-colors"><Eye size={15} /></button>
                        <button onClick={() => openEditModal(s)} title="Modifier" className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-100 rounded-lg transition-colors"><Pencil size={15} /></button>
                        <button onClick={() => setCancelTarget(s.id)} title="Annuler la session" className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={15} /></button>
                      </div>
                    </div>
                    {/* Fiabilité + favori + agenda */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap text-[11px]">
                      <span className="text-teal-700 font-semibold">{reliability(partner).emoji} {reliability(partner).label}</span>
                      <button onClick={() => toggleFavorite(partner?.id)} title="Partenaire favori" className="text-sm leading-none">
                        {isFavorite(partner?.id) ? '⭐' : '☆'}
                      </button>
                      <a href={googleCalendarUrl({ title: `Focus avec ${partner?.name || 'partenaire'}`, start: new Date(s.startTime), durationMin: s.duration, details: s.creatorTask || '' })}
                        target="_blank" rel="noreferrer" className="text-teal-700 hover:underline">📅 Agenda</a>
                    </div>
                    <button
                      onClick={() => navigate(`/live/${s.id}`)}
                      className="w-full py-2 rounded-xl text-xs font-black transition-colors bg-teal-500 text-white hover:bg-teal-600"
                    >
                      🎥 Rejoindre le Live
                    </button>
                  </motion.div>
                );
              })
          }
        </div>

        {/* Mes créneaux créés */}
        <div className="p-4 border-t border-gray-100">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">
            🧠 Mes créneaux ({created.length})
          </p>
          {created.length === 0
            ? <p className="text-xs text-gray-400 italic">Clique sur le calendrier pour créer un créneau</p>
            : created.map((s: any) => {
                const slotCandidates = [
                  ...(candidates[s.id] || []),
                  ...(s.requests || []).map((r: any) => r.user),
                ].filter((v, i, a) => a.findIndex((x: any) => x.id === v.id) === i);

                return (
                  <motion.div key={s.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-white border border-gray-100 rounded-xl p-3 mb-2">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-bold text-gray-900">
                          {new Date(s.startTime).toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' })} · {s.duration}min
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(s.startTime).toLocaleDateString('fr', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <StatusBadge status={s.status} />
                        <button onClick={() => setDetailSlot(s)} title="Détails"
                          className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"><Eye size={15} /></button>
                        <button onClick={() => openEditModal(s)} title="Modifier"
                          className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"><Pencil size={15} /></button>
                        <button onClick={() => setDeleteTarget(s.id)} title="Supprimer"
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={15} /></button>
                      </div>
                    </div>

                    {/* Tâches + contexte du créateur */}
                    {slotTasks(s).length > 0 && (
                      <div className="mb-1 space-y-1">
                        {slotTasks(s).map((t: string, i: number) => (
                          <p key={i} className="text-xs text-teal-700 bg-teal-50 rounded-lg px-2 py-1">🎯 {t}</p>
                        ))}
                      </div>
                    )}
                    {metaLabel(s) && <p className="text-[11px] text-gray-400 mb-2">{metaLabel(s)}</p>}

                    {slotCandidates.length > 0 && (
                      <div className="mb-2 space-y-1">
                        <p className="text-xs text-gray-500 mb-1">
                          {slotCandidates.length} candidat{slotCandidates.length > 1 ? 's' : ''} — choisis :
                        </p>
                        {(s.requests || []).map((r: any) => (
                          <div key={r.user?.id || r.id} className="bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1.5">
                                <div className="w-7 h-7 bg-teal-100 rounded-full overflow-hidden flex items-center justify-center text-teal-600 text-xs font-black">
                                  {r.user?.avatar
                                    ? <img src={r.user.avatar} className="w-full h-full object-cover" />
                                    : r.user?.name?.[0]?.toUpperCase()
                                  }
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-gray-800 flex items-center gap-1">
                                    {r.user?.name}
                                    <button onClick={() => toggleFavorite(r.user?.id)} title="Favori" className="text-xs leading-none">{isFavorite(r.user?.id) ? '⭐' : '☆'}</button>
                                  </p>
                                  <p className="text-[10px] text-gray-400">
                                    {reliability(r.user).emoji} {reliability(r.user).label}{r.user?.tdahType ? ` · ${r.user.tdahType.replace(/_/g, ' ')}` : ''}
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() => confirmCandidate.mutate({ slotId: s.id, candidateId: r.user?.id || r.userId })}
                                disabled={s.status === 'CONFIRMED' || confirmCandidate.isPending}
                                className="text-xs bg-teal-500 text-white px-2.5 py-1 rounded-lg hover:bg-teal-600 disabled:opacity-40 font-bold"
                              >
                                ✓ Choisir
                              </button>
                            </div>
                            {/* Tâche du candidat */}
                            {r.candidateTask && (
                              <p className="text-[11px] text-gray-500 bg-white rounded-lg px-2 py-1 border border-gray-100 mt-1">
                                🎯 "{r.candidateTask}"
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <button onClick={() => cancelSlot.mutate(s.id)}
                      className="text-xs text-gray-400 hover:text-red-500 transition-colors">
                      Annuler le créneau
                    </button>
                  </motion.div>
                );
              })
          }
        </div>

        {/* En attente de réponse */}
        {pending.length > 0 && (
          <div className="p-4 border-t border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">
              ⏳ J'attends une réponse ({pending.length})
            </p>
            {pending.map((r: any) => (
              <div key={r.id} className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-2">
                <p className="text-xs font-bold text-gray-900">
                  {new Date(r.slot.startTime).toLocaleDateString('fr', { weekday: 'short', day: 'numeric' })}
                  {' · '}
                  {new Date(r.slot.startTime).toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' })}
                  {' · '}{r.slot.duration}min
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Par {r.slot.creator.name}</p>
              </div>
            ))}
          </div>
        )}
      </aside>

      {/* ── CALENDRIER ──────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Onboarding : pousser vers la 1ère session */}
        {kpis && kpis.me && kpis.me.completed === 0 && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 text-center text-sm text-amber-800 font-semibold">
            👋 Bienvenue ! Lance ta 1ʳᵉ session de focus en 1 clic ci-dessous ⬇️
          </div>
        )}

        {/* Focus instantané + salles 24/7 */}
        <FocusNow />

        <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-black text-gray-900 text-lg">{sc.title}</h1>
            <div className="flex gap-4 mt-1">
              {[
                { color: 'bg-teal-500', label: sc.legendAvailable },
                { color: 'bg-amber-400', label: sc.legendPending },
                { color: 'bg-red-500', label: sc.legendComplete },
              ].map(l => (
                <span key={l.label} className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className={`w-2.5 h-2.5 rounded-full ${l.color}`}/>
                  {l.label}
                </span>
              ))}
            </div>
          </div>
          <p className="text-xs text-gray-400 bg-gray-50 rounded-xl px-3 py-2">
            {sc.clickToCreate}
          </p>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <div className="h-full bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ minHeight: 500 }}>
            <FullCalendar
              ref={calendarRef}
              plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
              initialView="timeGridWeek"
              locale="fr"
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'timeGridDay,timeGridWeek,dayGridMonth',
              }}
              slotMinTime="00:00:00"
              slotMaxTime="24:00:00"
              allDaySlot={false}
              selectable={true}
              selectMirror={true}
              nowIndicator={true}
              events={events}
              height="100%"
              select={(info) => {
                setCreateModal({ start: info.start });
                setDuration(25);
              }}
              eventClick={(info) => {
                const slot = info.event.extendedProps;
                if (slot.creatorId === user?.id) {
                  setDetailModal(slot);
                } else if (slot.status === 'OPEN' || slot.status === 'PENDING') {
                  setJoinModal(slot);
                }
              }}
              eventContent={(arg) => {
                const p: any = arg.event.extendedProps;
                return (
                  <div className="px-1 py-0.5 overflow-hidden flex items-center gap-1.5">
                    <span className="w-9 h-9 rounded-full bg-white/30 overflow-hidden flex items-center justify-center text-sm font-black text-white shrink-0 border border-white/40">
                      {p._shownAvatar
                        ? <img src={p._shownAvatar} alt="" className="w-full h-full object-cover" />
                        : (p._shownName?.[0]?.toUpperCase() || '🧠')}
                    </span>
                    <p className="text-xs font-bold text-white truncate">{arg.event.title}</p>
                  </div>
                );
              }}
            />
          </div>
        </div>
      </div>

      {/* ── MODAL — CRÉER UN CRÉNEAU ─────────────────────────────────────────── */}
      <AnimatePresence>
        {createModal && (
          <motion.div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setCreateModal(null)}>
            <motion.div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl max-h-[92vh] overflow-y-auto"
              initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
              onClick={e => e.stopPropagation()}>
              <h3 className="font-black text-gray-900 text-xl mb-3">{sc.createTitle}</h3>

              {/* Type de session */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                {([
                  { id: 'INSTANT',   label: sc.typeInstant,   emoji: '⚡' },
                  { id: 'SCHEDULED', label: sc.typeScheduled, emoji: '📅' },
                  { id: 'RECURRING', label: sc.typeRecurring, emoji: '🔁' },
                ] as const).map(ty => (
                  <button key={ty.id} onClick={() => setSlotType(ty.id)}
                    className={`py-2 rounded-xl text-xs font-bold transition-colors ${slotType === ty.id ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {ty.emoji} {ty.label}
                  </button>
                ))}
              </div>

              {slotType === 'INSTANT' ? (
                <p className="text-sm text-teal-700 bg-teal-50 rounded-xl px-3 py-2 mb-5">{sc.instantHint}</p>
              ) : (
                <p className="text-sm text-gray-500 mb-5">
                  📅 {createModal.start.toLocaleDateString('fr', { weekday: 'long', day: 'numeric', month: 'long' })}
                  {' · '}
                  {createModal.start.toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}

              {/* Options de récurrence */}
              {slotType === 'RECURRING' && (
                <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 mb-5">
                  <p className="text-xs font-bold text-purple-700 mb-2">{sc.repetition}</p>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {([{ id: 'DAILY', label: sc.daily }, { id: 'WEEKLY', label: sc.weekly }] as const).map(f => (
                      <button key={f.id} onClick={() => setRecFreq(f.id)}
                        className={`py-2 rounded-lg text-xs font-bold transition-colors ${recFreq === f.id ? 'bg-purple-500 text-white' : 'bg-white text-gray-600 border border-purple-200'}`}>
                        {f.label}
                      </button>
                    ))}
                  </div>
                  {recFreq === 'WEEKLY' && (
                    <div className="flex gap-1 mb-3">
                      {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d, i) => (
                        <button key={i} onClick={() => setRecDays(p => p.includes(i) ? p.filter(x => x !== i) : [...p, i])}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-bold ${recDays.includes(i) ? 'bg-purple-500 text-white' : 'bg-white text-gray-500 border border-purple-200'}`}>
                          {d}
                        </button>
                      ))}
                    </div>
                  )}
                  <label className="text-xs font-bold text-purple-700">{sc.occurrences} : {recCount}</label>
                  <input type="range" min={2} max={12} value={recCount} onChange={e => setRecCount(Number(e.target.value))}
                    className="w-full accent-purple-500 mt-1" />
                </div>
              )}

              <p className="text-sm font-bold text-gray-700 mb-3">Durée de la session</p>
              <div className="grid grid-cols-4 gap-2 mb-5">
                {DURATIONS.map(d => (
                  <button key={d} onClick={() => setDuration(d)}
                    className={`py-3 rounded-xl text-sm font-black transition-colors ${
                      duration === d ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>
                    {d}min
                  </button>
                ))}
              </div>

              {/* Catégorie de tâche */}
              <p className="text-sm font-bold text-gray-700 mb-2">Catégorie</p>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {TASK_CATEGORIES.map(c => (
                  <button key={c.id} onClick={() => setSlotCategory(c.id)}
                    className={`py-2 rounded-xl text-xs font-bold transition-colors ${slotCategory === c.id ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {c.emoji} {c.label}
                  </button>
                ))}
              </div>

              {/* Plusieurs tâches */}
              <p className="text-sm font-bold text-gray-700 mb-2">
                🎯 Tes tâches <span className="text-gray-400 font-normal ml-1">(plusieurs possibles)</span>
              </p>
              <div className="flex gap-2 mb-2">
                <input
                  value={creatorTask}
                  onChange={e => setCreatorTask(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSlotTask(); } }}
                  placeholder="Ex: Finir mon rapport..."
                  maxLength={200}
                  className="flex-1 border-2 border-gray-200 focus:border-teal-400 rounded-xl px-4 py-2.5 text-sm outline-none transition-colors"
                />
                <button onClick={addSlotTask} disabled={!creatorTask.trim() || taskList.length >= 8}
                  className="bg-teal-100 text-teal-700 font-black px-4 rounded-xl hover:bg-teal-200 disabled:opacity-40">+</button>
              </div>
              {taskList.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {taskList.map((t, i) => (
                    <span key={i} className="inline-flex items-center gap-1 bg-teal-50 text-teal-800 text-xs font-semibold rounded-lg px-2 py-1">
                      {i + 1}. {t}
                      <button onClick={() => setTaskList(p => p.filter((_, j) => j !== i))} className="text-teal-400 hover:text-red-500 ml-0.5">✕</button>
                    </span>
                  ))}
                </div>
              )}

              {/* Description facultative */}
              <p className="text-sm font-bold text-gray-700 mb-2">
                {sc.descriptionLabel} <span className="text-gray-400 font-normal ml-1">{sc.optional}</span>
              </p>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value.slice(0, 500))}
                placeholder={sc.descriptionPlaceholder}
                rows={2}
                className="w-full border-2 border-gray-200 focus:border-teal-400 rounded-xl px-4 py-2.5 text-sm outline-none mb-4 resize-none"
              />

              {/* Ambiance */}
              <p className="text-sm font-bold text-gray-700 mb-2">Ambiance</p>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {AMBIANCES.map(a => (
                  <button key={a.id} onClick={() => setAmbiance(a.id)}
                    className={`py-2 rounded-xl text-xs font-bold transition-colors ${ambiance === a.id ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {a.label}
                  </button>
                ))}
              </div>

              {/* Niveau d'énergie */}
              <p className="text-sm font-bold text-gray-700 mb-2">Niveau d'énergie</p>
              <div className="grid grid-cols-3 gap-2 mb-5">
                {ENERGIES.map(en => (
                  <button key={en.id} onClick={() => setEnergy(en.id)}
                    className={`py-2 rounded-xl text-xs font-bold transition-colors ${energy === en.id ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {en.label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => createSlot.mutate({
                  type: slotType,
                  ...(slotType !== 'INSTANT' && { startTime: createModal.start.toISOString() }),
                  duration,
                  tasks: [...taskList, creatorTask.trim()].filter(Boolean),
                  description: description.trim() || undefined,
                  category: slotCategory,
                  ambiance,
                  energy,
                  ...(slotType === 'RECURRING' && {
                    recurrence: { freq: recFreq, days: recFreq === 'WEEKLY' ? recDays : undefined, count: recCount },
                  }),
                })}
                disabled={createSlot.isPending}
                className="w-full bg-teal-500 text-white font-black py-4 rounded-xl hover:bg-teal-600 transition-colors disabled:opacity-50 text-base"
              >
                {createSlot.isPending ? sc.creating
                  : slotType === 'INSTANT' ? sc.btnStartNow
                  : slotType === 'RECURRING' ? sc.btnCreateRecurring.replace('{n}', String(recCount))
                  : sc.btnCreate}
              </button>
              {createSlot.isError && (
                <p className="text-red-500 text-xs mt-2 text-center">
                  {(createSlot.error as any)?.response?.data?.error}
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL — MODIFIER UN CRÉNEAU ──────────────────────────────────────── */}
      <AnimatePresence>
        {editModal && (
          <motion.div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setEditModal(null)}>
            <motion.div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl"
              initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()}>
              <h3 className="font-black text-gray-900 text-xl mb-1">✏️ Modifier la session</h3>
              <p className="text-xs text-gray-400 mb-5">{editModal?.status === 'CONFIRMED' ? 'Ton partenaire sera notifié du changement.' : 'Les candidats seront notifiés du changement.'}</p>

              {/* Nouvelle date/heure */}
              <p className="text-sm font-bold text-gray-700 mb-2">📅 Date et heure</p>
              <input
                type="datetime-local"
                value={editDate}
                onChange={e => setEditDate(e.target.value)}
                className="w-full border-2 border-gray-200 focus:border-teal-400 rounded-xl px-4 py-2.5 text-sm outline-none mb-4"
              />

              {/* Durée */}
              <p className="text-sm font-bold text-gray-700 mb-2">⏱️ Durée</p>
              <div className="grid grid-cols-4 gap-2 mb-4">
                {[15, 25, 50, 75].map(d => (
                  <button key={d} onClick={() => setEditDuration(d)}
                    className={`py-2.5 rounded-xl text-sm font-black transition-colors ${
                      editDuration === d ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>
                    {d}min
                  </button>
                ))}
              </div>

              {/* Tâche */}
              <p className="text-sm font-bold text-gray-700 mb-2">
                🎯 Ta tâche <span className="font-normal text-gray-400">(optionnel)</span>
              </p>
              <input
                value={editTask}
                onChange={e => setEditTask(e.target.value)}
                placeholder="Sur quoi vas-tu travailler ?"
                maxLength={200}
                className="w-full border-2 border-gray-200 focus:border-teal-400 rounded-xl px-4 py-2.5 text-sm outline-none mb-4"
              />

              {/* Description */}
              <p className="text-sm font-bold text-gray-700 mb-2">
                📝 Description <span className="font-normal text-gray-400">(optionnel)</span>
              </p>
              <textarea
                value={editDescription}
                onChange={e => setEditDescription(e.target.value.slice(0, 500))}
                placeholder="Contexte, objectif, ambiance souhaitée..."
                rows={2}
                className="w-full border-2 border-gray-200 focus:border-teal-400 rounded-xl px-4 py-2.5 text-sm outline-none mb-5 resize-none"
              />

              <div className="flex gap-3">
                <button onClick={() => setEditModal(null)}
                  className="flex-1 border-2 border-gray-200 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-50 text-sm">
                  Annuler
                </button>
                <button
                  onClick={() => editSlot.mutate({
                    id: editModal.id,
                    data: {
                      startTime:   editDate ? new Date(editDate).toISOString() : undefined,
                      duration:    editDuration,
                      creatorTask: editTask.trim() || null,
                      description: editDescription.trim() || null,
                    },
                  })}
                  disabled={editSlot.isPending}
                  className="flex-1 bg-teal-500 hover:bg-teal-600 disabled:opacity-40 text-white font-black py-3 rounded-xl text-sm"
                >
                  {editSlot.isPending ? '⏳...' : '✅ Enregistrer'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL — CONFIRMER SUPPRESSION ─────────────────────────────────────── */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setDeleteTarget(null)}>
            <motion.div className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-xl text-center"
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              onClick={e => e.stopPropagation()}>
              <p className="text-4xl mb-3">🗑️</p>
              <h3 className="font-black text-gray-900 text-lg mb-2">Supprimer ce créneau ?</h3>
              <p className="text-gray-400 text-sm mb-6">
                Les candidats seront notifiés de l'annulation.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteTarget(null)}
                  className="flex-1 border-2 border-gray-200 text-gray-600 font-bold py-3 rounded-xl text-sm hover:bg-gray-50">
                  Annuler
                </button>
                <button
                  onClick={() => deleteSlot.mutate(deleteTarget)}
                  disabled={deleteSlot.isPending}
                  className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white font-black py-3 rounded-xl text-sm"
                >
                  {deleteSlot.isPending ? '⏳...' : 'Supprimer'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL — ANNULER UNE SESSION CONFIRMÉE ─────────────────────────────── */}
      <AnimatePresence>
        {cancelTarget && (
          <motion.div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setCancelTarget(null)}>
            <motion.div className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-xl text-center"
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              onClick={e => e.stopPropagation()}>
              <p className="text-4xl mb-3">🚫</p>
              <h3 className="font-black text-gray-900 text-lg mb-2">Annuler cette session ?</h3>
              <p className="text-gray-400 text-sm mb-6">Ton partenaire sera prévenu de l'annulation.</p>
              <div className="flex gap-3">
                <button onClick={() => setCancelTarget(null)}
                  className="flex-1 border-2 border-gray-200 text-gray-600 font-bold py-3 rounded-xl text-sm hover:bg-gray-50">
                  Retour
                </button>
                <button
                  onClick={() => cancelSlot.mutate(cancelTarget, { onSuccess: () => setCancelTarget(null) })}
                  disabled={cancelSlot.isPending}
                  className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white font-black py-3 rounded-xl text-sm"
                >
                  {cancelSlot.isPending ? '⏳...' : 'Annuler la session'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL — DÉTAILS D'UNE SESSION ─────────────────────────────────────── */}
      <AnimatePresence>
        {detailSlot && (() => {
          const s = detailSlot;
          const start = new Date(s.startTime);
          const partner = s.creatorId === user?.id ? s.partner : s.creator;
          const typeLabel = s.type === 'INSTANT' ? '⚡ Instantanée' : s.type === 'RECURRING' ? '🔁 Récurrente' : '📅 Planifiée';
          return (
            <motion.div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setDetailSlot(null)}>
              <motion.div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto"
                initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
                onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-black text-gray-900 text-xl">Détails de la session</h3>
                  <StatusBadge status={s.status} />
                </div>

                <div className="space-y-2 text-sm text-gray-700 mb-4">
                  <p>📅 <strong>{start.toLocaleDateString('fr', { weekday: 'long', day: 'numeric', month: 'long' })}</strong> à {start.toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' })}</p>
                  <p>⏱️ Durée : <strong>{s.duration} min</strong> · {typeLabel}</p>
                  {metaLabel(s) && <p className="text-gray-500">{metaLabel(s)}</p>}
                </div>

                {slotTasks(s).length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-bold text-gray-400 uppercase mb-1">🎯 Tâches</p>
                    <div className="space-y-1">
                      {slotTasks(s).map((t: string, i: number) => (
                        <p key={i} className="text-sm text-teal-700 bg-teal-50 rounded-lg px-2 py-1">{t}</p>
                      ))}
                    </div>
                  </div>
                )}

                {s.description && (
                  <div className="mb-4">
                    <p className="text-xs font-bold text-gray-400 uppercase mb-1">📝 Description</p>
                    <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2 whitespace-pre-wrap">{s.description}</p>
                  </div>
                )}

                {s.status === 'CONFIRMED' && partner && (
                  <div className="mb-4 flex items-center gap-2 bg-teal-50 rounded-xl px-3 py-2">
                    <div className="w-9 h-9 rounded-full bg-teal-500 overflow-hidden flex items-center justify-center text-white font-black shrink-0">
                      {partner.avatar ? <img src={partner.avatar} className="w-full h-full object-cover" /> : (partner.name?.[0]?.toUpperCase() || '?')}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-gray-900">{partner.name}</p>
                      <p className="text-xs text-gray-500">{reliability(partner).emoji} {reliability(partner).label}</p>
                    </div>
                  </div>
                )}

                {s.status === 'PENDING' && (s.requests?.length || 0) > 0 && (
                  <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mb-4">
                    ⏳ {s.requests.length} candidat{s.requests.length > 1 ? 's' : ''} en attente — choisis ton partenaire sur la carte.
                  </p>
                )}

                <div className="flex gap-2">
                  {s.status === 'CONFIRMED' && (
                    <button onClick={() => { setDetailSlot(null); navigate(`/live/${s.id}`); }}
                      className="flex-1 bg-teal-500 hover:bg-teal-600 text-white font-black py-2.5 rounded-xl text-sm">🎥 Rejoindre</button>
                  )}
                  <button onClick={() => { setDetailSlot(null); openEditModal(s); }}
                    className="flex-1 border-2 border-gray-200 text-gray-600 font-bold py-2.5 rounded-xl text-sm hover:bg-gray-50 flex items-center justify-center gap-1"><Pencil size={14} /> Modifier</button>
                  <button onClick={() => { const id = s.id; const conf = s.status === 'CONFIRMED'; setDetailSlot(null); conf ? setCancelTarget(id) : setDeleteTarget(id); }}
                    className="flex-1 border-2 border-red-100 text-red-500 font-bold py-2.5 rounded-xl text-sm hover:bg-red-50 flex items-center justify-center gap-1"><Trash2 size={14} /> {s.status === 'CONFIRMED' ? 'Annuler' : 'Supprimer'}</button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ── MODAL — REJOINDRE ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {joinModal && (
          <motion.div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setJoinModal(null)}>
            <motion.div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl"
              initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
              onClick={e => e.stopPropagation()}>
              <h3 className="font-black text-gray-900 text-xl mb-4">Rejoindre ce créneau</h3>

              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 bg-teal-100 rounded-full flex items-center justify-center font-black text-teal-600 text-lg">
                    {joinModal.creator?.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-black text-gray-900">{joinModal.creator?.name}</p>
                    <p className="text-xs text-gray-400">{joinModal.creator?.tdahType?.replace(/_/g, ' ') || 'TDAH'}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                  <span>📅 {new Date(joinModal.startTime).toLocaleDateString('fr', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                  <span>⏰ {new Date(joinModal.startTime).toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' })}</span>
                  <span>⏱️ {joinModal.duration}min</span>
                </div>
              </div>

              {/* Tâches + contexte du créateur */}
              {(slotTasks(joinModal).length > 0 || metaLabel(joinModal)) && (
                <div className="bg-teal-50 border border-teal-100 rounded-xl px-4 py-3 mb-4">
                  <p className="text-xs font-bold text-teal-600 mb-1">🎯 {joinModal.creator?.name} va travailler sur :</p>
                  {slotTasks(joinModal).map((t: string, i: number) => (
                    <p key={i} className="text-sm text-teal-800 font-medium">• {t}</p>
                  ))}
                  {metaLabel(joinModal) && <p className="text-xs text-teal-600 mt-2">{metaLabel(joinModal)}</p>}
                </div>
              )}

              {joinModal.status === 'PENDING' && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-4 text-sm text-amber-700">
                  ⚠️ D'autres personnes ont demandé ce créneau. Le créateur choisit son partenaire.
                </div>
              )}

              {/* Champ tâche candidat — 1 ligne, optionnel */}
              <div className="mb-4">
                <p className="text-sm font-bold text-gray-700 mb-2">
                  🎯 Et toi, sur quoi vas-tu travailler ?
                  <span className="text-gray-400 font-normal ml-1">(optionnel)</span>
                </p>
                <input
                  value={candidateTask}
                  onChange={e => setCandidateTask(e.target.value)}
                  placeholder="Ex: Préparer ma présentation, coder mon projet..."
                  maxLength={200}
                  className="w-full border-2 border-gray-200 focus:border-teal-400 rounded-xl px-4 py-3 text-sm outline-none transition-colors"
                />
              </div>

              <button
                onClick={() => requestSlot.mutate({ slotId: joinModal.id, task: candidateTask.trim() || undefined })}
                disabled={requestSlot.isPending}
                className="w-full bg-teal-500 text-white font-black py-4 rounded-xl hover:bg-teal-600 transition-colors disabled:opacity-50 text-base"
              >
                {requestSlot.isPending ? '⏳ Envoi...' : '✋ Envoyer ma demande'}
              </button>
              {requestSlot.isError && (
                <p className="text-red-500 text-xs mt-2 text-center">
                  {(requestSlot.error as any)?.response?.data?.error}
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL — DÉTAIL MON CRÉNEAU + CANDIDATS ──────────────────────────── */}
      <AnimatePresence>
        {detailModal && (
          <motion.div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setDetailModal(null)}>
            <motion.div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl"
              initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-black text-gray-900 text-xl">Mon créneau</h3>
                <StatusBadge status={detailModal.status} />
              </div>
              <p className="text-sm text-gray-500 mb-5">
                📅 {new Date(detailModal.startTime).toLocaleDateString('fr', { weekday: 'long', day: 'numeric', month: 'long' })}
                {' · '}
                {new Date(detailModal.startTime).toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' })}
                {' · '}{detailModal.duration}min
              </p>

              {detailModal.status === 'CONFIRMED' ? (
                <div className="bg-teal-50 rounded-xl p-5 text-center">
                  <div className="text-4xl mb-2">✅</div>
                  <p className="font-bold text-teal-700 mb-1">Session confirmée avec</p>
                  <p className="font-black text-teal-900 text-lg">{detailModal.partner?.name}</p>
                  <button onClick={() => navigate(`/live/${detailModal.id}`)}
                    className="mt-4 bg-teal-500 text-white font-black px-6 py-3 rounded-xl hover:bg-teal-600 transition-colors">
                    🎥 Rejoindre le Live
                  </button>
                </div>
              ) : (detailModal.requests || []).length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <div className="text-5xl mb-3">⏳</div>
                  <p className="text-sm font-medium">En attente de candidats...</p>
                  <p className="text-xs mt-1">Les demandes apparaîtront ici en temps réel</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-bold text-gray-700 mb-3">
                    {detailModal.requests.length} candidat{detailModal.requests.length > 1 ? 's' : ''} — Choisis ton partenaire :
                  </p>
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {detailModal.requests.map((r: any) => (
                      <div key={r.id}
                        className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 hover:bg-teal-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center font-black text-teal-600">
                            {r.user?.name?.[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-gray-900">{r.user?.name}</p>
                            <p className="text-xs text-gray-400">{r.user?.tdahType?.replace(/_/g, ' ') || 'TDAH'}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => confirmCandidate.mutate({ slotId: detailModal.id, candidateId: r.user.id })}
                          disabled={confirmCandidate.isPending}
                          className="bg-teal-500 text-white text-sm font-black px-4 py-2.5 rounded-xl hover:bg-teal-600 transition-colors disabled:opacity-50"
                        >
                          Confirmer ✓
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={() => setDetailModal(null)}
                className="mt-4 w-full text-gray-400 hover:text-gray-600 text-sm py-2 transition-colors">
                Fermer
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL — FEEDBACK DE FIN DE SESSION (bienveillant) ────────────────── */}
      <AnimatePresence>
        {feedbackSlot && (
          <FeedbackModal
            slot={feedbackSlot}
            currentUserId={user?.id}
            onDone={() => {
              localStorage.setItem(`fb_done_${feedbackSlot.id}`, '1');
              setFeedbackSlot(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Modal de retour d'expérience (note l'EXPÉRIENCE, pas la personne · anti-RSD) ──
function FeedbackModal({ slot, currentUserId, onDone }: { slot: any; currentUserId?: string; onDone: () => void }) {
  const sc = useI18n(s => s.t).sessionCalendar;
  const [rating, setRating]   = useState(0);
  const [hover, setHover]     = useState(0);
  const [comment, setComment] = useState('');
  const [mood, setMood]       = useState('');
  const [saving, setSaving]   = useState(false);
  const partner = slot.creatorId === currentUserId ? slot.partner : slot.creator;

  const submit = async () => {
    if (!rating) return;
    setSaving(true);
    try { await submitFeedback(slot.id, { rating, comment: comment.trim() || undefined, mood: mood || undefined }); }
    catch { /* ignore */ }
    setSaving(false);
    onDone();
  };

  return (
    <motion.div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl"
        initial={{ scale: 0.94, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94 }}>
        <div className="text-center mb-4">
          <div className="text-4xl mb-2">🎉</div>
          <h3 className="font-black text-gray-900 text-lg">{sc.fbTitle}</h3>
          <p className="text-sm text-gray-500 mt-1">
            {partner?.name ? sc.fbQuestionWith.replace('{name}', partner.name) : sc.fbQuestion}
          </p>
        </div>

        {/* Étoiles */}
        <div className="flex justify-center gap-1.5 mb-4">
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} onClick={() => setRating(n)} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
              aria-label={`${n} étoile${n > 1 ? 's' : ''}`}
              className={`text-3xl transition-transform hover:scale-110 ${(hover || rating) >= n ? 'text-amber-400' : 'text-gray-200'}`}>
              ★
            </button>
          ))}
        </div>

        {/* Humeur après session */}
        <div className="flex justify-center gap-2 mb-4">
          {['😄', '🙂', '😐', '😕', '😴'].map(m => (
            <button key={m} onClick={() => setMood(m === mood ? '' : m)}
              className={`text-2xl w-10 h-10 rounded-xl transition-colors ${mood === m ? 'bg-teal-100' : 'hover:bg-gray-100'}`}>
              {m}
            </button>
          ))}
        </div>

        {/* Commentaire facultatif (privé) */}
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value.slice(0, 500))}
          placeholder={sc.fbCommentPlaceholder}
          rows={2}
          className="w-full border-2 border-gray-200 focus:border-teal-400 rounded-xl px-4 py-2.5 text-sm outline-none mb-4 resize-none"
        />

        <div className="flex gap-3">
          <button onClick={onDone}
            className="flex-1 border-2 border-gray-200 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-50 text-sm">
            {sc.fbLater}
          </button>
          <button onClick={submit} disabled={!rating || saving}
            className="flex-1 bg-teal-500 hover:bg-teal-600 disabled:opacity-40 text-white font-black py-3 rounded-xl text-sm">
            {saving ? '⏳...' : sc.fbSend}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
