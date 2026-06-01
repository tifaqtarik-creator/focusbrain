import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';
import { getSocket } from '../lib/socket';

// LiveKit imports
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
} from '@livekit/components-react';
import '@livekit/components-styles';

type Phase = 'loading' | 'checkin' | 'live' | 'done' | 'fallback';

export default function LiveSession() {
  const { slotId } = useParams<{ slotId: string }>();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>('loading');
  const [slot, setSlot] = useState<any>(null);
  const [livekitToken, setLivekitToken] = useState('');
  const [livekitUrl, setLivekitUrl] = useState('');
  const [fallback, setFallback] = useState(false);
  const [task, setTask] = useState('');
  const [_taskSet, setTaskSet] = useState(false);

  const [timeLeft, setTimeLeft] = useState(0);
  const [breakProposed, setBreakProposed] = useState(false);
  const [breakActive, setBreakActive] = useState(false);
  const [partnerTask, setPartnerTask] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Chargement token LiveKit ──────────────────────────────────────────────
  useEffect(() => {
    if (!slotId) return;
    api.get(`/slots/${slotId}/token`)
      .then(res => {
        setSlot(res.data);
        if (res.data.fallback || !res.data.token) {
          setFallback(true);
          setPhase('fallback');
        } else {
          setLivekitToken(res.data.token);
          setLivekitUrl(res.data.url);
          setPhase('checkin');
        }
      })
      .catch(() => navigate('/dashboard'));

    const socket = getSocket();
    socket.on('session:break_proposed', () => setBreakProposed(true));
    socket.on('session:break_accepted', () => { setBreakActive(true); });
    socket.on('session:extend_accepted', () => setTimeLeft(t => t + 600));
    socket.on('session:partner_task', ({ task: t }: any) => setPartnerTask(t));

    return () => {
      socket.off('session:break_proposed');
      socket.off('session:break_accepted');
      socket.off('session:extend_accepted');
      socket.off('session:partner_task');
    };
  }, [slotId]);

  // ── Timer ─────────────────────────────────────────────────────────────────
  const startTimer = (durationMin: number) => {
    setTimeLeft(durationMin * 60);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current!); setPhase('done'); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const startLive = () => {
    if (task) {
      getSocket().emit('session:share_task', { slotId, task });
    }
    setTaskSet(true);
    setPhase('live');
    if (slot?.duration) startTimer(slot.duration);
  };

  const leave = () => {
    clearInterval(timerRef.current!);
    navigate('/dashboard');
  };

  const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const secs = String(timeLeft % 60).padStart(2, '0');
  const progress = slot?.duration ? ((slot.duration * 60 - timeLeft) / (slot.duration * 60)) * 100 : 0;

  // ── Fallback : LiveKit non configuré ──────────────────────────────────────
  if (fallback || phase === 'fallback') return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-sm border border-gray-100">
        <div className="text-5xl mb-4">⚙️</div>
        <h2 className="text-xl font-black text-gray-900 mb-2">LiveKit non configuré</h2>
        <p className="text-gray-500 text-sm mb-6">
          Pour activer la vidéo en direct, ajoute tes clés LiveKit dans le fichier <code className="bg-gray-100 px-1 rounded">backend/.env</code>
        </p>
        <div className="bg-gray-50 rounded-xl p-4 text-left text-xs font-mono mb-6 text-gray-700">
          <p>LIVEKIT_API_KEY=APIxxxxxxxxxx</p>
          <p>LIVEKIT_API_SECRET=xxxxxxxxxxxxx</p>
          <p>LIVEKIT_URL=wss://xxx.livekit.cloud</p>
        </div>
        <a href="https://cloud.livekit.io" target="_blank" rel="noreferrer"
          className="block w-full bg-teal-500 text-white font-black py-3 rounded-xl hover:bg-teal-600 mb-3">
          Créer un compte LiveKit gratuit →
        </a>
        <button onClick={() => navigate('/dashboard')} className="text-gray-400 text-sm hover:text-gray-600">
          Retour au dashboard
        </button>
      </div>
    </div>
  );

  // ── Chargement ────────────────────────────────────────────────────────────
  if (phase === 'loading') return (
    <div className="min-h-screen flex items-center justify-center bg-teal-50">
      <div className="text-center">
        <div className="text-5xl mb-4 animate-pulse">🧠</div>
        <p className="text-gray-500 font-medium">Préparation de ta session...</p>
      </div>
    </div>
  );

  // ── Check-in ──────────────────────────────────────────────────────────────
  if (phase === 'checkin') return (
    <div className="min-h-screen bg-teal-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-8 max-w-md w-full shadow-sm">
        <h2 className="text-2xl font-black text-gray-900 mb-1">Prêt(e) à commencer ?</h2>
        <p className="text-gray-400 text-sm mb-6">
          Session de {slot?.duration}min avec{' '}
          <strong>{slot?.partner?.name || 'ton partenaire'}</strong>
        </p>

        <div className="mb-6">
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Sur quoi tu te concentres ? <span className="text-gray-400 font-normal">(optionnel)</span>
          </label>
          <input
            value={task}
            onChange={e => setTask(e.target.value)}
            placeholder="Ex : Finir le chapitre 3, répondre aux emails..."
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-teal-500 focus:outline-none text-sm"
          />
          {task && <p className="text-xs text-teal-600 mt-1.5">✓ Partagé avec ton partenaire</p>}
        </div>

        <div className="bg-teal-50 rounded-xl p-4 mb-6 text-sm text-teal-700">
          <p className="font-bold mb-1">🎥 Session vidéo LiveKit</p>
          <p className="text-xs opacity-80">Micro et caméra activés au démarrage. Tu peux les couper à tout moment.</p>
        </div>

        <button onClick={startLive}
          className="w-full bg-teal-500 text-white font-black py-4 rounded-xl hover:bg-teal-600 transition-colors text-lg">
          🚀 Démarrer la session
        </button>
      </motion.div>
    </div>
  );

  // ── Session LIVE ───────────────────────────────────────────────────────────
  if (phase === 'live') {
    return (
      <div className="h-screen flex flex-col bg-gray-900">
        {/* Header timer */}
        <div className="bg-gray-800 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-2xl font-black text-white tabular-nums">{mins}:{secs}</div>
            {/* Barre progression */}
            <div className="w-40 h-2 bg-gray-600 rounded-full overflow-hidden">
              <motion.div className="h-full bg-teal-400 rounded-full" style={{ width: `${progress}%` }} />
            </div>
          </div>
          {partnerTask && (
            <div className="bg-gray-700 rounded-xl px-3 py-1.5 text-xs text-gray-300">
              🎯 {slot?.partner?.name} : {partnerTask}
            </div>
          )}
          {task && (
            <div className="bg-teal-900/50 rounded-xl px-3 py-1.5 text-xs text-teal-300">
              🎯 Toi : {task}
            </div>
          )}
        </div>

        {/* Vidéo LiveKit */}
        <div className="flex-1 overflow-hidden">
          <LiveKitRoom
            token={livekitToken}
            serverUrl={livekitUrl}
            connect={true}
            onDisconnected={() => setPhase('done')}
            options={{
              adaptiveStream: true,
              dynacast: true,
              audioCaptureDefaults: {
                noiseSuppression: true,
                echoCancellation: true,
                autoGainControl: true,
              },
            }}
          >
            <VideoConference />
            <RoomAudioRenderer />
          </LiveKitRoom>
        </div>

        {/* Contrôles TDAH */}
        <div className="bg-gray-800 px-6 py-3 flex items-center justify-between">
          <div className="flex gap-2">
            <AnimatePresence>
              {breakProposed && !breakActive && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  className="bg-amber-500 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-2">
                  ☕ Pause proposée
                  <button onClick={() => {
                    getSocket().emit('session:break_accept', { slotId });
                    setBreakActive(true);
                  }} className="bg-white text-amber-500 px-2 py-0.5 rounded-lg">Accepter</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => getSocket().emit('session:break_propose', { slotId })}
              className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-xl transition-colors"
            >
              ☕ Pause
            </button>
            <button
              onClick={() => getSocket().emit('session:extend_request', { slotId })}
              className="text-xs bg-teal-700 hover:bg-teal-600 text-white px-4 py-2 rounded-xl transition-colors"
            >
              +10 min
            </button>
            <button onClick={leave}
              className="text-xs text-gray-400 hover:text-white px-4 py-2 transition-colors">
              🚪 Quitter
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Fin de session ────────────────────────────────────────────────────────
  if (phase === 'done') return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
      className="min-h-screen bg-teal-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-10 max-w-md w-full text-center shadow-sm">
        <div className="text-7xl mb-5">🎉</div>
        <h1 className="text-3xl font-black text-gray-900 mb-2">Session terminée !</h1>
        <p className="text-xl text-teal-600 font-bold mb-1">Ton cerveau TDAH vient de faire quelque chose de difficile.</p>
        <p className="text-gray-400 text-sm mb-8">
          Tu as créé <strong>{slot?.duration}</strong> minutes de focus avec{' '}
          <strong>{slot?.partner?.name || 'ton partenaire'}</strong>.
        </p>

        <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
          <p className="text-sm font-bold text-gray-700 mb-2">💜 Ajouter au Cercle de Confiance ?</p>
          <p className="text-xs text-gray-400 mb-3">
            Ajouter {slot?.partner?.name} pour le matcher en priorité lors de tes prochaines sessions.
          </p>
          <button
            onClick={() => api.post(`/matching/circle/${slot?.partner?.id}`).then(() => navigate('/dashboard'))}
            className="w-full bg-teal-500 text-white font-bold py-2.5 rounded-xl hover:bg-teal-600 text-sm transition-colors"
          >
            ✓ Ajouter au cercle
          </button>
        </div>

        <button onClick={() => navigate('/dashboard')}
          className="text-gray-400 hover:text-gray-600 text-sm transition-colors">
          Retour au dashboard →
        </button>
      </div>
    </motion.div>
  );

  return null;
}
