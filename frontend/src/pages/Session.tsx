import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getSocket } from '../lib/socket';
import api from '../lib/api';

type Phase = 'checkin' | 'working' | 'break' | 'celebration';

const MOODS = [
  { key: 'energy', label: '⚡ Énergie', emoji: ['😴', '🥱', '😐', '😊', '🚀'] },
  { key: 'stress', label: '😤 Stress', emoji: ['😌', '🙂', '😐', '😟', '😰'] },
  { key: 'anxiety', label: '💭 Anxiété', emoji: ['😌', '🙂', '😐', '😟', '🫨'] },
  { key: 'focus', label: '🎯 Focus', emoji: ['🌫️', '😑', '😐', '🧐', '🎯'] },
  { key: 'fatigue', label: '😪 Fatigue', emoji: ['💪', '🙂', '😐', '😪', '🛌'] },
];

const AMBIENT_SOUNDS = [
  { id: 'none', label: 'Silence' },
  { id: 'whitenoise', label: 'White noise' },
  { id: 'brownnoise', label: 'Brown noise' },
  { id: 'cafe', label: 'Café ambiant' },
  { id: 'rain', label: 'Pluie' },
];

export default function Session() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('checkin');
  const [mood, setMood] = useState<Record<string, number>>({});
  const [task, setTask] = useState('');
  const [taskParalysis, setTaskParalysis] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [duration, setDuration] = useState(25);
  const [sound, setSound] = useState('none');
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
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setPhase('celebration');
          return 0;
        }
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
      const moodLabel = mood.energy >= 4 ? 'Haute énergie' : mood.fatigue >= 4 ? 'Fatigue' : 'Mode focus';
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

  if (phase === 'checkin') return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold mb-2">Comment tu te sens ?</h1>
        <p className="text-gray-500 mb-8">30 secondes max — partage optionnel avec ton partenaire</p>

        <div className="space-y-6">
          {MOODS.map(m => (
            <div key={m.key}>
              <label className="font-medium block mb-2">{m.label}</label>
              <div className="flex gap-3">
                {m.emoji.map((e, i) => (
                  <button
                    key={i}
                    onClick={() => setMood(prev => ({ ...prev, [m.key]: i + 1 }))}
                    className={`text-3xl p-2 rounded-xl transition-all ${mood[m.key] === i + 1 ? 'bg-teal-100 scale-110' : 'hover:bg-gray-100'}`}
                    aria-label={`${m.label} niveau ${i + 1}`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8">
          <button
            onClick={() => setTaskParalysis(true)}
            className="text-violet-600 text-sm underline"
          >
            Je sais pas par où commencer 😶
          </button>

          {taskParalysis && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 bg-violet-50 rounded-2xl p-6">
              <p className="font-semibold mb-3">Quelle est la chose la plus stressante aujourd'hui ?</p>
              <input
                value={task}
                onChange={e => setTask(e.target.value)}
                placeholder="Ex: finir le rapport client, réviser le chapitre 3..."
                className="w-full border-2 border-violet-200 rounded-xl px-4 py-3 focus:border-violet-400 focus:outline-none"
              />
              <p className="text-xs text-gray-500 mt-2">
                💡 On va découper ça en micro-tâche de 5 minutes pour commencer.
              </p>
            </motion.div>
          )}

          {!taskParalysis && (
            <input
              value={task}
              onChange={e => setTask(e.target.value)}
              placeholder="Sur quoi tu te concentres ? (optionnel)"
              className="w-full mt-4 border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-teal-500 focus:outline-none"
            />
          )}
        </div>

        <div className="mt-6">
          <label className="font-medium block mb-2">Son d'ambiance</label>
          <div className="flex gap-2 flex-wrap">
            {AMBIENT_SOUNDS.map(s => (
              <button
                key={s.id}
                onClick={() => setSound(s.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${sound === s.id ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={submitMood}
          disabled={Object.keys(mood).length < 5}
          className="w-full mt-8 bg-teal-500 text-white font-bold py-4 rounded-xl text-lg hover:bg-teal-600 transition-colors disabled:opacity-50"
        >
          C'est parti ! 🚀
        </button>
      </motion.div>
    </div>
  );

  if (phase === 'working' || phase === 'break') return (
    <div className="max-w-lg mx-auto px-4 py-8 text-center">
      {partnerMood && (
        <div className="bg-teal-50 rounded-2xl px-4 py-2 text-sm text-teal-700 mb-6">
          Ton partenaire est en mode : {partnerMood}
        </div>
      )}

      {/* Timer */}
      <div className="text-8xl font-black text-gray-900 mb-2 tabular-nums">
        {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </div>
      <p className="text-gray-400 text-sm mb-8">{phase === 'break' ? 'Pause Brain Break ☕' : 'En session'}</p>

      {/* Video placeholder */}
      <div className="bg-gray-100 rounded-2xl aspect-video mb-6 flex items-center justify-center">
        <p className="text-gray-400">Vidéo Daily.co — intégration via VITE_DAILY_DOMAIN</p>
      </div>

      {breakProposed && !breakActive && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-amber-50 rounded-2xl p-4 mb-4">
          <p className="font-semibold">Ton partenaire propose une pause 🧠</p>
          <button
            onClick={() => getSocket().emit('session:break_accept', { sessionId: id })}
            className="mt-2 bg-amber-400 text-white font-bold px-6 py-2 rounded-xl hover:bg-amber-500 transition-colors"
          >
            Accepter la pause
          </button>
        </motion.div>
      )}

      <div className="flex gap-3 justify-center">
        <button
          onClick={() => getSocket().emit('session:extend_request', { sessionId: id })}
          className="bg-teal-100 text-teal-700 font-semibold px-6 py-3 rounded-xl hover:bg-teal-200 transition-colors text-sm"
        >
          +10 min
        </button>
        <button
          onClick={leave}
          className="text-gray-400 hover:text-gray-600 text-sm px-6 py-3"
          aria-label="Quitter la session sans pénalité"
        >
          Quitter
        </button>
      </div>
    </div>
  );

  if (phase === 'celebration') return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-lg mx-auto px-4 py-20 text-center"
    >
      <div className="text-8xl mb-6">🎉</div>
      <h1 className="text-3xl font-black mb-4">Session terminée !</h1>
      <p className="text-xl text-teal-600 font-semibold mb-2">
        Ton cerveau TDAH vient de faire quelque chose de difficile.
      </p>
      <p className="text-gray-500 mb-10">Chaque minute compte. Tu as créé {duration} minutes de focus.</p>
      <button
        onClick={() => navigate('/dashboard')}
        className="bg-teal-500 text-white font-bold py-4 px-12 rounded-2xl text-lg hover:bg-teal-600 transition-colors"
      >
        Retour au dashboard
      </button>
    </motion.div>
  );

  return null;
}
