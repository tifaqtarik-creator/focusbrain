import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const avatarFrames = ['🧑‍💻', '📝', '🖊️', '💻', '📚'];

export default function SoloSession() {
  const { duration } = useParams<{ duration: string }>();
  const navigate = useNavigate();
  const durationMin = parseInt(duration || '25', 10);
  const [timeLeft, setTimeLeft] = useState(durationMin * 60);
  const [avatarIdx, setAvatarIdx] = useState(0);
  const [phase, setPhase] = useState<'working' | 'celebration'>('working');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Avatar animé qui "travaille"
    const avatarTimer = setInterval(() => {
      setAvatarIdx(i => (i + 1) % avatarFrames.length);
    }, 2000);

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          clearInterval(avatarTimer);
          setPhase('celebration');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timerRef.current!);
      clearInterval(avatarTimer);
    };
  }, []);

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  if (phase === 'celebration') return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-lg mx-auto px-4 py-20 text-center">
      <div className="text-8xl mb-6">🎉</div>
      <h1 className="text-3xl font-black mb-4">Session solo terminée !</h1>
      <p className="text-teal-600 font-semibold text-xl mb-8">
        Tu as travaillé {durationMin} minutes seul(e). C'est énorme.
      </p>
      <button onClick={() => navigate('/dashboard')} className="bg-teal-500 text-white font-bold py-4 px-12 rounded-2xl text-lg hover:bg-teal-600 transition-colors">
        Retour
      </button>
    </motion.div>
  );

  return (
    <div className="max-w-lg mx-auto px-4 py-12 text-center">
      <div className="bg-teal-50 rounded-2xl px-4 py-2 text-sm text-teal-700 mb-8 inline-block">
        Mode Solo · Ton avatar travaille avec toi
      </div>

      {/* Avatar animé */}
      <motion.div
        key={avatarIdx}
        initial={{ scale: 0.9, opacity: 0.7 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-8xl mb-6"
      >
        {avatarFrames[avatarIdx]}
      </motion.div>
      <p className="text-gray-500 text-sm mb-8">Ton compagnon de travail virtuel est concentré</p>

      {/* Timer */}
      <div className="text-8xl font-black text-gray-900 mb-8 tabular-nums">
        {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </div>

      <button onClick={() => navigate('/dashboard')} className="text-gray-400 hover:text-gray-600 text-sm">
        Quitter
      </button>
    </div>
  );
}
