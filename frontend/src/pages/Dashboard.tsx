import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useAppStore } from '../stores/useStore';
import { useSlotStore } from '../stores/useSlotStore';
import { useI18n } from '../lib/i18n';
import SlotNotifications from '../components/slots/SlotNotifications';
import FocusNow from '../components/focus/FocusNow';

const DURATIONS = [15, 25, 50, 75];

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
  useI18n();
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
  const [duration, setDuration]       = useState(25);
  const [creatorTask,   setCreatorTask]   = useState('');
  const [candidateTask, setCandidateTask] = useState('');
  // États pour l'édition
  const [editDuration, setEditDuration] = useState(25);
  const [editTask,     setEditTask]     = useState('');
  const [editDate,     setEditDate]     = useState('');

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

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createSlot = useMutation({
    mutationFn: (data: { startTime: string; duration: number; creatorTask?: string }) => api.post('/slots', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['slots'] });
      qc.invalidateQueries({ queryKey: ['slots-mine'] });
      setCreateModal(null);
      setCreatorTask('');
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
    const d = new Date(slot.startTime);
    // Format datetime-local : YYYY-MM-DDThh:mm
    const pad = (n: number) => String(n).padStart(2, '0');
    setEditDate(`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
  };

  // ── Événements calendrier ──────────────────────────────────────────────────
  const events = slots.map((s: any) => ({
    id: s.id,
    title: s.creator.id === user?.id
      ? `🧠 Mon créneau · ${s.duration}min`
      : `${s.creator.name} · ${s.duration}min`,
    start: s.startTime,
    end: new Date(new Date(s.startTime).getTime() + s.duration * 60000).toISOString(),
    backgroundColor: slotColor(s.status),
    borderColor: slotColor(s.status),
    extendedProps: s,
  }));

  const confirmed = mySlots.filter((s: any) => s.status === 'CONFIRMED');
  const created   = mySlots.filter((s: any) => s.status !== 'CONFIRMED' && s.creatorId === user?.id);

  const canJoin = (s: any) => Math.abs(new Date().getTime() - new Date(s.startTime).getTime()) < 15 * 60000;

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
                const joinable = canJoin(s);
                return (
                  <motion.div key={s.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-teal-50 border border-teal-200 rounded-xl p-3 mb-2">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center text-white text-xs font-black">
                        {partner?.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-gray-900">{partner?.name || 'Partenaire'}</p>
                        <p className="text-xs text-gray-500">
                          {start.toLocaleDateString('fr', { weekday: 'short', day: 'numeric' })}
                          {' · '}
                          {start.toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' })}
                          {' · '}{s.duration}min
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/live/${s.id}`)}
                      disabled={!joinable}
                      className={`w-full py-2 rounded-xl text-xs font-black transition-colors ${
                        joinable ? 'bg-teal-500 text-white hover:bg-teal-600' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {joinable ? '🎥 Rejoindre le Live' : `⏰ ${start.toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' })}`}
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
                      <div className="flex items-center gap-1">
                        <StatusBadge status={s.status} />
                        {/* Boutons modifier/supprimer — seulement si pas encore confirmé */}
                        {s.status !== 'CONFIRMED' && (
                          <>
                            <button
                              onClick={() => openEditModal(s)}
                              title="Modifier"
                              className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => setDeleteTarget(s.id)}
                              title="Supprimer"
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              🗑️
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Tâche du créateur */}
                    {s.creatorTask && (
                      <p className="text-xs text-teal-700 bg-teal-50 rounded-lg px-2 py-1 mb-2">
                        🎯 "{s.creatorTask}"
                      </p>
                    )}

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
                                  <p className="text-xs font-bold text-gray-800">{r.user?.name}</p>
                                  {r.user?.tdahType && <p className="text-[10px] text-gray-400">{r.user.tdahType.replace(/_/g, ' ')}</p>}
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
        {/* Focus instantané + salles 24/7 */}
        <FocusNow />

        <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-black text-gray-900 text-lg">Calendrier des sessions</h1>
            <div className="flex gap-4 mt-1">
              {[
                { color: 'bg-teal-500', label: 'Disponible' },
                { color: 'bg-amber-400', label: 'Demandes en cours' },
                { color: 'bg-red-500', label: 'Complet' },
              ].map(l => (
                <span key={l.label} className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className={`w-2.5 h-2.5 rounded-full ${l.color}`}/>
                  {l.label}
                </span>
              ))}
            </div>
          </div>
          <p className="text-xs text-gray-400 bg-gray-50 rounded-xl px-3 py-2">
            💡 Clique sur le calendrier pour créer un créneau
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
              slotMinTime="07:00:00"
              slotMaxTime="23:00:00"
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
              eventContent={(arg) => (
                <div className="px-1.5 py-0.5 overflow-hidden">
                  <p className="text-xs font-bold text-white truncate">{arg.event.title}</p>
                </div>
              )}
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
            <motion.div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl"
              initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
              onClick={e => e.stopPropagation()}>
              <h3 className="font-black text-gray-900 text-xl mb-1">Créer un créneau</h3>
              <p className="text-sm text-gray-500 mb-5">
                📅 {createModal.start.toLocaleDateString('fr', { weekday: 'long', day: 'numeric', month: 'long' })}
                {' · '}
                {createModal.start.toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' })}
              </p>

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

              {/* Champ tâche — simple, 1 ligne */}
              <div className="mb-5">
                <p className="text-sm font-bold text-gray-700 mb-2">
                  🎯 Sur quoi vas-tu travailler ?
                  <span className="text-gray-400 font-normal ml-1">(optionnel)</span>
                </p>
                <input
                  value={creatorTask}
                  onChange={e => setCreatorTask(e.target.value)}
                  placeholder="Ex: Finir mon rapport, réviser mes fiches..."
                  maxLength={200}
                  className="w-full border-2 border-gray-200 focus:border-teal-400 rounded-xl px-4 py-3 text-sm outline-none transition-colors"
                />
                <p className="text-xs text-gray-400 mt-1 text-right">{creatorTask.length}/200</p>
              </div>

              <button
                onClick={() => createSlot.mutate({
                  startTime: createModal.start.toISOString(),
                  duration,
                  creatorTask: creatorTask.trim() || undefined,
                })}
                disabled={createSlot.isPending}
                className="w-full bg-teal-500 text-white font-black py-4 rounded-xl hover:bg-teal-600 transition-colors disabled:opacity-50 text-base"
              >
                {createSlot.isPending ? '⏳ Création...' : '✅ Créer ce créneau'}
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
              <h3 className="font-black text-gray-900 text-xl mb-1">✏️ Modifier le créneau</h3>
              <p className="text-xs text-gray-400 mb-5">Les candidats seront notifiés du changement</p>

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
                className="w-full border-2 border-gray-200 focus:border-teal-400 rounded-xl px-4 py-2.5 text-sm outline-none mb-5"
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

              {/* Tâche du créateur */}
              {joinModal.creatorTask && (
                <div className="bg-teal-50 border border-teal-100 rounded-xl px-4 py-3 mb-4">
                  <p className="text-xs font-bold text-teal-600 mb-1">
                    🎯 {joinModal.creator?.name} va travailler sur :
                  </p>
                  <p className="text-sm text-teal-800 font-medium">"{joinModal.creatorTask}"</p>
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
                  {canJoin(detailModal) && (
                    <button onClick={() => navigate(`/live/${detailModal.id}`)}
                      className="mt-4 bg-teal-500 text-white font-black px-6 py-3 rounded-xl hover:bg-teal-600 transition-colors">
                      🎥 Rejoindre le Live
                    </button>
                  )}
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
    </div>
  );
}
