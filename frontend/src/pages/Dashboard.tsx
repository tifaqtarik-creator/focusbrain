import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAppStore } from '../stores/useStore';
import { connectSocket, getSocket } from '../lib/socket';
import api from '../lib/api';

const DURATIONS = [
  { value: 15, label: '15 min', desc: 'Déblocage rapide', premium: true },
  { value: 25, label: '25 min', desc: 'Standard Pomodoro', premium: false },
  { value: 50, label: '50 min', desc: 'Deep work', premium: true },
  { value: 75, label: '75 min', desc: 'Session avancée', premium: true },
];

type MatchState = 'idle' | 'searching' | 'found' | 'timeout';

export default function Dashboard() {
  const user = useAppStore(s => s.user);
  const navigate = useNavigate();
  const [duration, setDuration] = useState(25);
  const [quietMode, setQuietMode] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [matchState, setMatchState] = useState<MatchState>('idle');
  const [circleOnline, setCircleOnline] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    connectSocket();
    const socket = getSocket();

    socket.on('match:found', ({ sessionId }: { sessionId: string }) => {
      setMatchState('found');
      setTimeout(() => navigate(`/session/${sessionId}`), 500);
    });

    socket.on('match:timeout', ({ sessionId }: { sessionId: string }) => {
      setMatchState('timeout');
    });

    socket.on('circle:member_online', (member: { id: string; name: string }) => {
      setCircleOnline(prev => prev.find(m => m.id === member.id) ? prev : [...prev, member]);
    });

    api.get('/matching/circle-online').then(r => setCircleOnline(r.data)).catch(() => {});

    return () => {
      socket.off('match:found');
      socket.off('match:timeout');
      socket.off('circle:member_online');
    };
  }, [navigate]);

  const startSearch = () => {
    setMatchState('searching');
    getSocket().emit('match:searching', { duration, quietMode, cameraOff });
  };

  const cancelSearch = () => {
    setMatchState('idle');
    getSocket().emit('match:cancel');
  };

  const goSolo = () => navigate(`/solo/${duration}`);

  const availableDurations = DURATIONS.filter(d => user?.isPremium || !d.premium);

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      {/* Cercle en ligne */}
      {circleOnline.length > 0 && (
        <div className="flex items-center gap-2 mb-8 text-sm text-gray-600">
          <span className="w-2 h-2 bg-teal-400 rounded-full animate-pulse" />
          <span>
            {circleOnline.map(m => m.name).join(', ')} {circleOnline.length === 1 ? 'est disponible' : 'sont disponibles'} dans ton cercle
          </span>
        </div>
      )}

      {/* Bouton principal — 1 seul CTA */}
      {matchState === 'idle' && (
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
          <button
            onClick={startSearch}
            className="w-full bg-teal-500 text-white font-black text-2xl py-8 rounded-3xl shadow-xl shadow-teal-200 hover:bg-teal-600 transition-all hover:scale-[1.01] active:scale-[0.99]"
            aria-label="Trouver un partenaire de Body Doubling maintenant"
          >
            Trouver un partenaire maintenant
          </button>

          {/* Config discrète */}
          <div className="flex items-center justify-center gap-6 mt-4">
            <button
              onClick={() => setShowConfig(v => !v)}
              className="text-gray-400 text-sm hover:text-gray-600 transition-colors"
              aria-label="Configurer la session"
            >
              ⚙️ {duration} min · {quietMode ? 'Silencieux' : 'Social'} · {cameraOff ? 'Audio' : 'Vidéo'}
            </button>
          </div>

          {showConfig && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 bg-gray-50 rounded-2xl p-6 space-y-4">
              <div>
                <label className="font-semibold text-sm text-gray-700 block mb-2">Durée de session</label>
                <div className="flex gap-2 flex-wrap">
                  {availableDurations.map(d => (
                    <button
                      key={d.value}
                      onClick={() => setDuration(d.value)}
                      className={`px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${duration === d.value ? 'bg-teal-500 text-white' : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-teal-300'}`}
                    >
                      {d.label}
                    </button>
                  ))}
                  {!user?.isPremium && (
                    <span className="text-xs text-gray-400 self-center">15/50/75 min → Premium</span>
                  )}
                </div>
              </div>

              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={quietMode} onChange={e => setQuietMode(e.target.checked)} className="w-4 h-4 accent-teal-500" />
                  <span className="text-sm font-medium">Mode silencieux (Quiet)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={cameraOff} onChange={e => setCameraOff(e.target.checked)} className="w-4 h-4 accent-teal-500" />
                  <span className="text-sm font-medium">Audio uniquement</span>
                </label>
              </div>
            </motion.div>
          )}

          <button
            onClick={() => {}}
            className="w-full mt-6 text-gray-400 text-sm hover:text-gray-600 transition-colors py-2"
          >
            Planifier une session plus tard →
          </button>
        </motion.div>
      )}

      {/* État recherche */}
      {matchState === 'searching' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
          <div className="w-20 h-20 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <h2 className="text-2xl font-bold mb-2">Recherche d'un partenaire TDAH...</h2>
          <p className="text-gray-500 mb-8">Maximum 90 secondes · Mode solo proposé si aucun match</p>
          <button onClick={cancelSearch} className="text-gray-400 hover:text-gray-600 text-sm">
            Annuler
          </button>
        </motion.div>
      )}

      {/* Match trouvé */}
      {matchState === 'found' && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-teal-600">Partenaire trouvé !</h2>
          <p className="text-gray-500">Connexion à la salle en cours...</p>
        </motion.div>
      )}

      {/* Timeout → Solo */}
      {matchState === 'timeout' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
          <div className="text-5xl mb-4">🧠</div>
          <h2 className="text-2xl font-bold mb-2">Pas de partenaire disponible</h2>
          <p className="text-gray-600 mb-8">
            Tu peux quand même travailler ! Le mode Solo utilise un avatar animé et les mêmes sons d'ambiance.
          </p>
          <div className="flex flex-col gap-3 max-w-xs mx-auto">
            <button
              onClick={goSolo}
              className="bg-teal-500 text-white font-bold py-4 rounded-xl hover:bg-teal-600 transition-colors"
            >
              Démarrer en mode Solo →
            </button>
            <button
              onClick={() => setMatchState('idle')}
              className="text-gray-400 hover:text-gray-600 text-sm"
            >
              Chercher à nouveau
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
