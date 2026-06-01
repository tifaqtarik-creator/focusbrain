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
  const [duration, setDuration]       = useState(25);

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
    mutationFn: (data: { startTime: string; duration: number }) => api.post('/slots', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['slots'] });
      qc.invalidateQueries({ queryKey: ['slots-mine'] });
      setCreateModal(null);
    },
  });

  const requestSlot = useMutation({
    mutationFn: (slotId: string) => api.post(`/slots/${slotId}/request`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['slots'] });
      qc.invalidateQueries({ queryKey: ['slots-pending'] });
      setJoinModal(null);
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
                      <p className="text-sm font-bold text-gray-900">
                        {new Date(s.startTime).toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' })} · {s.duration}min
                      </p>
                      <StatusBadge status={s.status} />
                    </div>

                    {slotCandidates.length > 0 && (
                      <div className="mb-2 space-y-1">
                        <p className="text-xs text-gray-500 mb-1">
                          {slotCandidates.length} candidat{slotCandidates.length > 1 ? 's' : ''} — choisis :
                        </p>
                        {slotCandidates.map((c: any) => (
                          <div key={c.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-2 py-1.5">
                            <div className="flex items-center gap-1.5">
                              <div className="w-6 h-6 bg-teal-100 rounded-full flex items-center justify-center text-teal-600 text-xs font-black">
                                {c.name[0].toUpperCase()}
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-gray-800">{c.name}</p>
                                {c.tdahType && <p className="text-xs text-gray-400">{c.tdahType.replace(/_/g, ' ')}</p>}
                              </div>
                            </div>
                            <button
                              onClick={() => confirmCandidate.mutate({ slotId: s.id, candidateId: c.id })}
                              disabled={s.status === 'CONFIRMED' || confirmCandidate.isPending}
                              className="text-xs bg-teal-500 text-white px-2 py-1 rounded-lg hover:bg-teal-600 disabled:opacity-40 font-bold"
                            >
                              Confirmer
                            </button>
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
              <div className="grid grid-cols-4 gap-2 mb-6">
                {DURATIONS.map(d => (
                  <button key={d} onClick={() => setDuration(d)}
                    className={`py-3 rounded-xl text-sm font-black transition-colors ${
                      duration === d ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>
                    {d}min
                  </button>
                ))}
              </div>

              <button
                onClick={() => createSlot.mutate({ startTime: createModal.start.toISOString(), duration })}
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

              {joinModal.status === 'PENDING' && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-4 text-sm text-amber-700">
                  ⚠️ D'autres personnes ont demandé ce créneau. Le créateur choisit son partenaire.
                </div>
              )}

              <p className="text-xs text-gray-400 mb-4 text-center">
                Ta demande est envoyée à <strong>{joinModal.creator?.name}</strong>.<br />
                Il confirmera ou non.
              </p>

              <button
                onClick={() => requestSlot.mutate(joinModal.id)}
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
