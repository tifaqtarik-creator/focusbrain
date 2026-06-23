import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, Coffee, PartyPopper } from 'lucide-react';
import { getSocket } from '../lib/socket';
import api from '../lib/api';
import { useI18n } from '../lib/i18n';

type Phase = 'checkin' | 'working' | 'break' | 'celebration';

const MOOD_KEYS = ['energy', 'stress', 'anxiety', 'focus', 'fatigue'] as const;
const MOOD_EMOJIS: Record<string, string[]> = {
  energy: ['😴', '🥱', '😐', '😊', '🚀'],
  stress: ['😌', '🙂', '😐', '😟', '😰'],
  anxiety: ['😌', '🙂', '😐', '😟', '🫨'],
  focus: ['🌫️', '😑', '😐', '🧐', '🎯'],
  fatigue: ['💪', '🙂', '😐', '😪', '🛌'],
};
const SOUND_IDS = ['none', 'whitenoise', 'brownnoise', 'cafe', 'rain'] as const;

export default function Session() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();
  const s = t.session;

  const [phase, setPhase] = useState<Phase>('checkin');
  const [mood, setMood] = useState<Record<string, number>>({});
  const [task, setTask] = useState('');
  const [taskParalysis, setTaskParalysis] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [duration, setDuration] = useState(25);
  const [sound, setSound] = useState<typeof SOUND_IDS[number]>('none');
  const [partnerMood, setPartnerMood] = useState<string | null>(null);
  const [breakProposed, setBreakProposed] = useState(false);
  const [breakActive, setBreakActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const socket = getSocket();
    socket.on('session:partner_mood', ({ mood: m }: { mood: string }) => setPartnerMood(m));
    socket.on('session:break_proposed', () => setBreakProposed(true));
    socket.on('session:break_accepted', () => { setBreakActive(true); setPhase('break'); });
    socket.on('session:extend_accepted', () => setTimeLeft(prev => prev + 600));
    return () => {
      socket.off('session:partner_mood');
      socket.off('session:break_proposed');
      socket.off('session:break_accepted');
      socket.off('session:extend_accepted');
    };
  }, []);

  useEffect(() => {
    if (phase !== 'working') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current!); setPhase('celebration'); return 0; }
        if (prev === Math.floor(duration * 60 / 2) && !breakActive) {
          getSocket().emit('session:break_propose', { sessionId: id });
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [phase, duration, breakActive, id]);

  const submitMood = async () => {
    if (Object.keys(mood).length < 5) return;
    await api.post(`/sessions/${id}/mood`, { ...mood, task }).catch(() => {});
    if (Object.keys(mood).length === 5) {
      const moodLabel = mood.energy >= 4 ? s.moods.energy : mood.fatigue >= 4 ? s.moods.fatigue : s.moods.focus;
      getSocket().emit('session:mood_share', { sessionId: id, mood: moodLabel });
    }
    setPhase('working');
    setTimeLeft(duration * 60);
  };

  const leave = async () => {
    await api.post(`/sessions/${id}/leave`).catch(() => {});
    navigate('/dashboard');
  };

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  /* ── Check-in ── */
  if (phase === 'checkin') return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-black text-ink-900 mb-1">{s.checkinTitle}</h1>
        <p className="text-ink-400 text-sm mb-8">{s.checkinSub}</p>

        <div className="space-y-5 mb-8">
          {MOOD_KEYS.map(key => (
            <div key={key}>
              <label className="font-semibold text-sm text-ink-700 block mb-2">{s.moods[key]}</label>
              <div className="flex gap-3">
                {MOOD_EMOJIS[key].map((e, i) => (
                  <button
                    key={i}
                    onClick={() => setMood(prev => ({ ...prev, [key]: i + 1 }))}
                    className={`text-3xl p-2 rounded-xl transition-all ${mood[key] === i + 1 ? 'bg-teal-100 scale-110 ring-2 ring-teal-400' : 'hover:bg-surface-muted'}`}
                    aria-label={`${s.moods[key]} ${i + 1}`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Task input */}
        <div className="mb-6">
          <button onClick={() => setTaskParalysis(true)} className="text-violet-600 text-sm underline mb-3">
            {s.taskParalysisLink}
          </button>
          <AnimatePresence>
            {taskParalysis && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-violet-50 rounded-2xl p-5 mb-3">
                <p className="font-semibold text-sm text-ink-900 mb-3">{s.taskParalysisTitle}</p>
                <input
                  value={task} onChange={e => setTask(e.target.value)} placeholder={s.taskParalysisPlaceholder}
                  className="w-full border-2 border-violet-200 rounded-xl px-4 py-3 focus:border-violet-400 focus:outline-none text-sm"
                />
                <p className="text-xs text-ink-400 mt-2">{s.taskParalysisHint}</p>
              </motion.div>
            )}
          </AnimatePresence>
          {!taskParalysis && (
            <input
              value={task} onChange={e => setTask(e.target.value)} placeholder={s.taskPlaceholder}
              className="w-full border-2 border-line rounded-xl px-4 py-3 focus:border-teal-500 focus:outline-none text-sm"
            />
          )}
        </div>

        {/* Ambient sound */}
        <div className="mb-8">
          <label className="font-semibold text-sm text-ink-700 block mb-2">{s.ambientSound}</label>
          <div className="flex gap-2 flex-wrap">
            {SOUND_IDS.map(id => (
              <button
                key={id}
                onClick={() => setSound(id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${sound === id ? 'bg-teal-500 text-white' : 'bg-surface-muted text-ink-500 hover:bg-line'}`}
              >
                {s.sounds[id]}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={submitMood}
          disabled={Object.keys(mood).length < 5}
          className="w-full bg-teal-500 text-white font-black py-4 rounded-xl text-lg hover:bg-teal-600 transition-colors disabled:opacity-50"
        >
          {s.startBtn}
        </button>
      </motion.div>
    </div>
  );

  /* ── Working / Break ── */
  if (phase === 'working' || phase === 'break') return (
    <div className="max-w-lg mx-auto px-4 py-8 text-center">
      {partnerMood && (
        <div className="bg-teal-50 rounded-2xl px-4 py-2 text-sm text-teal-700 mb-6 inline-block">
          {s.partnerMood} <strong>{partnerMood}</strong>
        </div>
      )}

      <div className="text-8xl font-black text-ink-900 mb-2 tabular-nums">
        {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </div>
      <p className="text-ink-400 text-sm mb-8">{phase === 'break' ? s.breakTime : s.inSession}</p>

      {/* Video placeholder */}
      <div className="bg-surface-muted rounded-2xl aspect-video mb-6 flex items-center justify-center gap-2 text-ink-400">
        <Video size={18} strokeWidth={2} />
        <p className="text-sm">Daily.co — VITE_DAILY_DOMAIN</p>
      </div>

      <AnimatePresence>
        {breakProposed && !breakActive && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-amber-50 rounded-2xl p-5 mb-4">
            <p className="font-semibold text-ink-900 mb-3 flex items-center justify-center gap-2">
              <Coffee size={18} strokeWidth={2} className="text-amber-600" />
              {s.breakProposed}
            </p>
            <button
              onClick={() => getSocket().emit('session:break_accept', { sessionId: id })}
              className="bg-amber-400 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-amber-500 transition-colors"
            >
              {s.acceptBreak}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-3 justify-center">
        <button
          onClick={() => getSocket().emit('session:extend_request', { sessionId: id })}
          className="bg-teal-100 text-teal-700 font-semibold px-6 py-3 rounded-xl hover:bg-teal-200 transition-colors"
        >
          {s.extend}
        </button>
        <button onClick={leave} className="text-ink-400 hover:text-ink-700 text-sm px-6 py-3">
          {s.leave}
        </button>
      </div>
    </div>
  );

  /* ── Celebration ── */
  if (phase === 'celebration') return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
      className="max-w-lg mx-auto px-4 py-20 text-center"
    >
      <div className="flex justify-center mb-6">
        <span className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-teal-50 text-teal-500">
          <PartyPopper size={40} strokeWidth={2} />
        </span>
      </div>
      <h1 className="text-3xl font-black text-ink-900 mb-4">{s.doneTitle}</h1>
      <p className="text-xl text-teal-600 font-semibold mb-2">{s.doneSub}</p>
      <p className="text-ink-500 mb-10">{s.doneMsg} <strong>{duration}</strong> {s.doneMin}</p>
      <button
        onClick={() => navigate('/dashboard')}
        className="bg-teal-500 text-white font-black py-4 px-12 rounded-2xl text-lg hover:bg-teal-600 transition-colors"
      >
        {s.backDashboard}
      </button>
    </motion.div>
  );

  return null;
}
