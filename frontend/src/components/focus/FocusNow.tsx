/**
 * FocusNow.tsx — "Démarrer maintenant" + salles de focus 24/7 (Body Doubling)
 * Rituel TCC en 3 phases : intention → focus (minuteur) → check-out + satisfaction.
 * Résout le problème du calendrier vide : on peut démarrer une session seul, tout de suite.
 */
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FOCUS_ROOMS, FOCUS_DURATIONS, FocusRoom, FocusSession,
  getFocusStats, recordFocusSession,
} from '../../data/focusRooms';
import { getSocket, connectSocket } from '../../lib/socket';

type Phase = 'intention' | 'focus' | 'checkout';
interface Presence { userId: string; name: string; avatar: string | null; goal: string; status: string; }

export default function FocusNow() {
  const [open, setOpen]               = useState(false);
  const [room, setRoom]               = useState<FocusRoom | null>(null);
  const [phase, setPhase]             = useState<Phase>('intention');
  const [goal, setGoal]               = useState('');
  const [duration, setDuration]       = useState(25);
  const [remaining, setRemaining]     = useState(25 * 60);
  const [running, setRunning]         = useState(false);
  const [accomplished, setAccomplished] = useState('');
  const [satisfaction, setSatisfaction] = useState(0);
  const [stats, setStats]            = useState(getFocusStats());
  const [counts, setCounts]          = useState<Record<string, number>>({});
  const [participants, setParticipants] = useState<Presence[]>([]);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);
  const joinedRoomRef = useRef<string | null>(null);

  // Présence temps réel (Socket.io)
  useEffect(() => {
    connectSocket();
    const s = getSocket();
    const onCounts = (c: Record<string, number>) => setCounts(c || {});
    const onPresence = (d: { roomId: string; participants: Presence[] }) => {
      if (d.roomId === joinedRoomRef.current) setParticipants(d.participants || []);
    };
    s.on('focus:counts', onCounts);
    s.on('focus:presence', onPresence);
    s.emit('focus:counts:get');
    return () => {
      s.off('focus:counts', onCounts);
      s.off('focus:presence', onPresence);
      if (joinedRoomRef.current) s.emit('focus:leave', { roomId: joinedRoomRef.current });
    };
  }, []);

  const startSession = (r: FocusRoom | null) => {
    setRoom(r); setPhase('intention'); setGoal(''); setDuration(25);
    setAccomplished(''); setSatisfaction(0); setRunning(false); setParticipants([]); setOpen(true);
  };
  const beginFocus = () => {
    const rid = room?.id || 'now';
    setRemaining(duration * 60); setPhase('focus'); setRunning(true);
    joinedRoomRef.current = rid; setParticipants([]);
    getSocket().emit('focus:join', { roomId: rid, goal, duration });
  };
  const leaveDone = () => {
    const r = joinedRoomRef.current;
    if (r) { getSocket().emit('focus:done', { roomId: r }); joinedRoomRef.current = null; }
  };
  const togglePause = () => {
    const nv = !running;
    setRunning(nv);
    if (joinedRoomRef.current) getSocket().emit('focus:update', { roomId: joinedRoomRef.current, status: nv ? 'focus' : 'paused' });
  };
  const finishEarly = () => { leaveDone(); setRunning(false); setPhase('checkout'); };
  const close = () => {
    const r = joinedRoomRef.current;
    if (r) { getSocket().emit('focus:leave', { roomId: r }); joinedRoomRef.current = null; }
    setRunning(false); setParticipants([]); setOpen(false);
  };

  // Minuteur
  useEffect(() => {
    if (running && phase === 'focus') {
      tick.current = setInterval(() => setRemaining(s => (s <= 1 ? 0 : s - 1)), 1000);
    }
    return () => { if (tick.current) clearInterval(tick.current); };
  }, [running, phase]);

  // Fin du minuteur → check-out
  useEffect(() => {
    if (phase === 'focus' && remaining === 0) { leaveDone(); setRunning(false); setPhase('checkout'); }
  }, [remaining, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = () => {
    const elapsedMin = Math.max(1, Math.round((duration * 60 - remaining) / 60));
    const session: FocusSession = {
      id: `fs_${Date.now()}`, room: room?.id || 'now', goal,
      duration: elapsedMin, accomplished, satisfaction, at: Date.now(), completed: true,
    };
    setStats(recordFocusSession(session));
    setOpen(false);
  };

  const mm = Math.floor(remaining / 60), ss = remaining % 60;
  const total = duration * 60;
  const progress = total ? remaining / total : 0;
  const R = 54, C = 2 * Math.PI * R;

  return (
    <>
      {/* ── Bandeau Focus Now ─────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-teal-500 to-purple-500 px-6 py-3 flex items-center gap-3 flex-wrap">
        <button onClick={() => startSession(null)}
          className="bg-white text-teal-600 font-black px-4 py-2.5 rounded-xl text-sm hover:shadow-lg transition-all shrink-0">
          ⚡ Démarrer maintenant
        </button>
        <div className="flex gap-2 overflow-x-auto flex-1 min-w-0">
          {FOCUS_ROOMS.map(r => (
            <button key={r.id} onClick={() => startSession(r)} title={r.desc}
              className="shrink-0 flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white font-bold px-3 py-2 rounded-xl text-xs transition-colors">
              <span>{r.emoji}</span> {r.name}
              {counts[r.id] ? <span className="ml-0.5 bg-white/30 rounded-full px-1.5 text-[10px] flex items-center gap-0.5">🟢 {counts[r.id]}</span> : null}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 text-white text-xs font-bold shrink-0">
          <span title="Jours d'affilée">🔥 {stats.streak}j</span>
          <span title="Temps de focus cumulé">⏱️ {Math.floor(stats.totalMinutes / 60)}h{String(stats.totalMinutes % 60).padStart(2, '0')}</span>
        </div>
      </div>

      {/* ── Modal session ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 bg-gray-900/95 z-[60] flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
              initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}>

              {/* Bandeau salle */}
              <div className="px-6 py-4" style={{ background: room?.color || '#E6F1FB', color: room?.textColor || '#0C447C' }}>
                <p className="font-black text-lg">{room ? `${room.emoji} ${room.name}` : '⚡ Focus libre'}</p>
                <p className="text-xs opacity-70">{room?.desc || 'Une session de concentration, maintenant'}</p>
              </div>

              <div className="p-6">
                {/* PHASE 1 — INTENTION */}
                {phase === 'intention' && (
                  <>
                    <div className="flex items-center gap-2 mb-4 text-xs text-gray-500">
                      <div className="flex -space-x-2">
                        {['#2E9E68', '#185FA5', '#993C1D', '#534AB7'].map((c, i) => (
                          <div key={i} className="w-6 h-6 rounded-full border-2 border-white" style={{ background: c }} />
                        ))}
                      </div>
                      {(counts[room?.id || 'now'] || 0) > 0
                        ? `🟢 ${counts[room?.id || 'now']} membre(s) en focus ici maintenant`
                        : "Espace ouvert 24/7 — sois le premier, d'autres peuvent te rejoindre"}
                    </div>
                    <p className="text-sm font-bold text-gray-700 mb-2">🎯 Sur quoi vas-tu te concentrer ?</p>
                    <input value={goal} onChange={e => setGoal(e.target.value)} autoFocus maxLength={150}
                      placeholder="Ex: rédiger l'intro de mon rapport"
                      className="w-full border-2 border-gray-200 focus:border-teal-400 rounded-xl px-4 py-3 text-sm outline-none mb-4" />
                    <p className="text-sm font-bold text-gray-700 mb-2">⏱️ Durée</p>
                    <div className="grid grid-cols-4 gap-2 mb-5">
                      {FOCUS_DURATIONS.map(d => (
                        <button key={d} onClick={() => setDuration(d)}
                          className={`py-3 rounded-xl text-sm font-black transition-colors ${duration === d ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                          {d}min
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-3">
                      <button onClick={close} className="flex-1 border-2 border-gray-200 text-gray-600 font-bold py-3 rounded-xl text-sm hover:bg-gray-50">Annuler</button>
                      <button onClick={beginFocus} disabled={!goal.trim()}
                        className="flex-[2] bg-teal-500 hover:bg-teal-600 disabled:opacity-40 text-white font-black py-3 rounded-xl text-sm">
                        ▶ Commencer ma session
                      </button>
                    </div>
                  </>
                )}

                {/* PHASE 2 — FOCUS */}
                {phase === 'focus' && (
                  <div className="text-center">
                    <div className="relative w-40 h-40 mx-auto mb-4">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r={R} fill="none" stroke="#E5E7EB" strokeWidth="8" />
                        <circle cx="60" cy="60" r={R} fill="none" stroke="#14B8A6" strokeWidth="8" strokeLinecap="round"
                          strokeDasharray={C} strokeDashoffset={C * (1 - progress)} style={{ transition: 'stroke-dashoffset 1s linear' }} />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-black text-gray-900 tabular-nums">{String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}</span>
                        <span className="text-[10px] text-gray-400">{running ? 'focus en cours' : 'en pause'}</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mb-1">🎯 Tu travailles sur</p>
                    <p className="font-bold text-gray-900 mb-4">"{goal}"</p>

                    {/* Présence réelle des autres membres en focus */}
                    {participants.length > 1 ? (
                      <div className="flex items-center justify-center gap-2 mb-5">
                        <div className="flex -space-x-2">
                          {participants.slice(0, 6).map((p, i) => (
                            <div key={i} title={p.goal ? `${p.name} — ${p.goal}` : p.name}
                              className="w-7 h-7 rounded-full border-2 border-white overflow-hidden bg-teal-100 flex items-center justify-center text-[10px] font-black text-teal-700">
                              {p.avatar ? <img src={p.avatar} className="w-full h-full object-cover" alt="" /> : (p.name?.[0] || '?').toUpperCase()}
                            </div>
                          ))}
                        </div>
                        <span className="text-xs text-teal-600 font-semibold">{participants.length} en focus ensemble 💜</span>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 mb-5">💜 Espace ouvert — d'autres peuvent te rejoindre à tout moment</p>
                    )}

                    <div className="flex gap-2">
                      <button onClick={togglePause} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl text-sm">
                        {running ? '⏸ Pause' : '▶ Reprendre'}
                      </button>
                      <button onClick={() => window.open('/music', '_blank')} title="Musique focus" className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-4 rounded-xl text-sm">🎵</button>
                      <button onClick={finishEarly} className="flex-1 bg-teal-500 hover:bg-teal-600 text-white font-bold py-3 rounded-xl text-sm">✓ Terminer</button>
                    </div>
                  </div>
                )}

                {/* PHASE 3 — CHECK-OUT */}
                {phase === 'checkout' && (
                  <div className="text-center">
                    <div className="text-5xl mb-2">🎉</div>
                    <h3 className="font-black text-gray-900 text-xl mb-1">Bravo, session terminée !</h3>
                    <p className="text-gray-400 text-sm mb-5">Chaque session compte 💜</p>
                    <p className="text-sm font-bold text-gray-700 mb-2 text-left">✅ Qu'as-tu accompli ?</p>
                    <textarea value={accomplished} onChange={e => setAccomplished(e.target.value)} rows={2} maxLength={200}
                      placeholder="Note ta victoire, même petite..."
                      className="w-full border-2 border-gray-200 focus:border-teal-400 rounded-xl px-3 py-2 text-sm outline-none resize-none mb-4" />
                    <p className="text-sm font-bold text-gray-700 mb-2 text-left">😊 Satisfaction</p>
                    <div className="flex justify-center gap-2 mb-5">
                      {[1, 2, 3, 4, 5].map(n => (
                        <button key={n} onClick={() => setSatisfaction(n)}
                          className={`text-2xl transition-transform ${satisfaction >= n ? 'scale-110' : 'opacity-30 hover:opacity-60'}`}>⭐</button>
                      ))}
                    </div>
                    <button onClick={save} className="w-full bg-teal-500 hover:bg-teal-600 text-white font-black py-3 rounded-xl text-sm">
                      Enregistrer ma session 🚀
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
