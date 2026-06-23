import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Brain, NotebookPen, PenLine, Laptop, BookOpen, PartyPopper, Sparkles } from 'lucide-react';
import { useI18n } from '../lib/i18n';

const AVATAR_FRAMES = [Brain, NotebookPen, PenLine, Laptop, BookOpen];

export default function SoloSession() {
  const { duration } = useParams<{ duration: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();
  const s = t.solo;

  const durationMin = parseInt(duration || '25', 10);
  const [timeLeft, setTimeLeft] = useState(durationMin * 60);
  const [avatarIdx, setAvatarIdx] = useState(0);
  const [phase, setPhase] = useState<'working' | 'celebration'>('working');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const avatarTimer = setInterval(() => {
      setAvatarIdx(i => (i + 1) % AVATAR_FRAMES.length);
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
      <div className="flex justify-center mb-6">
        <span className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-teal-50 text-teal-500">
          <PartyPopper size={40} strokeWidth={2} />
        </span>
      </div>
      <h1 className="text-3xl font-black text-ink-900 mb-4">{s.doneTitle}</h1>
      <p className="text-teal-600 font-semibold text-xl mb-8">
        {s.doneSub} <strong>{durationMin}</strong> {s.doneMin}
      </p>
      <button
        onClick={() => navigate('/dashboard')}
        className="bg-teal-500 text-white font-black py-4 px-12 rounded-2xl text-lg hover:bg-teal-600 transition-colors"
      >
        {s.back}
      </button>
    </motion.div>
  );

  return (
    <div className="max-w-lg mx-auto px-4 py-12 text-center">
      <div className="bg-teal-50 rounded-2xl px-4 py-2 text-sm text-teal-700 mb-8 inline-flex items-center gap-2">
        <Sparkles size={16} strokeWidth={2} />
        {s.badge}
      </div>

      <motion.div
        key={avatarIdx}
        initial={{ scale: 0.9, opacity: 0.7 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex justify-center mb-4"
      >
        {(() => {
          const Avatar = AVATAR_FRAMES[avatarIdx];
          return (
            <span className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-surface-muted text-teal-600">
              <Avatar size={56} strokeWidth={1.75} />
            </span>
          );
        })()}
      </motion.div>
      <p className="text-ink-400 text-sm mb-8">{s.avatarSub}</p>

      <div className="text-8xl font-black text-ink-900 mb-10 tabular-nums">
        {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </div>

      <button
        onClick={() => navigate('/dashboard')}
        className="text-ink-400 hover:text-ink-700 text-sm transition-colors"
      >
        {s.leave}
      </button>
    </div>
  );
}
