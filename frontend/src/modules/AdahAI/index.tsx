/**
 * AdahAI/index.tsx — Point d'entrée du module ADAH AI
 * Gère le routing interne : Accueil / Chat / Voix / Historique
 */
import { useState, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { useAdahStore } from './store/adahStore';
import ChatInterface from './components/ChatInterface';
import ClaudeChat from './components/ClaudeChat';
import AudioTCC from './components/AudioTCC';
import VideoAvatarTCC from './components/VideoAvatarTCC';
import VoiceInterface from './components/VoiceInterface';
import FocusWrapper from './components/FocusWrapper';
import AvatarCreator from './avatar/AvatarCreator';
import { useAppStore } from '../../stores/useStore';
import { Link } from 'react-router-dom';

// Lazy load le 3D (lourd) — chargé seulement si l'utilisateur ouvre la session vidéo
const AvatarSession = lazy(() => import('./avatar/AvatarSession'));

type View = 'home' | 'chat' | 'voice' | 'video' | 'video3d' | 'audio-tcc' | 'avatar-setup' | 'history';

// ── Carte de session dans l'historique ────────────────────────────────────────
function SessionCard({ session }: { session: any }) {
  const moodEmoji: Record<string, string> = {
    bien: '😊', neutre: '😐', anxieux: '😰', bloqué: '🧱', fatigué: '😴', submergé: '🌊',
  };
  const mins = Math.floor((session.duration || 0) / 60);

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{moodEmoji[session.mood] || '🧠'}</span>
          <div>
            <p className="font-bold text-gray-900 text-sm">{session.title}</p>
            <p className="text-xs text-gray-400">
              {new Date(session.createdAt).toLocaleDateString('fr', { weekday: 'short', day: 'numeric', month: 'short' })}
              {mins > 0 && ` · ${mins} min`}
            </p>
          </div>
        </div>
        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
          {session._count?.messages || 0} msg
        </span>
      </div>
      {session.summary && (
        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mt-2 bg-gray-50 rounded-xl px-3 py-2">
          {session.summary}
        </p>
      )}
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────────────────────
export default function AdahAI() {
  const [view, setView] = useState<View>('home');
  const { session, focusMode, endSession } = useAdahStore();
  const user  = useAppStore(s => s.user);
  const isPremium = user?.isPremium;

  const { data: stats } = useQuery({
    queryKey: ['adah-stats'],
    queryFn: () => api.get('/adah/stats').then(r => r.data),
    enabled: view === 'home',
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['adah-sessions'],
    queryFn: () => api.get('/adah/sessions').then(r => r.data),
    enabled: view === 'history',
  });

  return (
    <FocusWrapper active={focusMode}>
      <div className={`h-full flex flex-col bg-gradient-to-b from-teal-50 to-white ${focusMode ? 'adah-focus-active' : ''}`}>

        <AnimatePresence mode="wait">

          {/* ══ VUE ACCUEIL ══════════════════════════════════════════════════ */}
          {view === 'home' && (
            <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex-1 overflow-y-auto">
              <div className="max-w-2xl mx-auto px-5 py-8">

                {/* Hero */}
                <div className="text-center mb-8">
                  <div className="w-20 h-20 bg-gradient-to-br from-teal-400 to-teal-600 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-4 shadow-xl">
                    🧠
                  </div>
                  <h1 className="text-3xl font-black text-gray-900 mb-2">ADAH AI</h1>
                  <p className="text-gray-500">
                    Ton assistant TCC personnel · Spécialisé TDAH
                  </p>
                  {!isPremium && (
                    <div className="mt-3 inline-flex items-center gap-2 bg-amber-50 text-amber-700 text-xs font-bold px-3 py-1.5 rounded-full border border-amber-200">
                      ⭐ 3 sessions gratuites restantes ·
                      <Link to="/pricing" className="underline">Passer Premium</Link>
                    </div>
                  )}
                </div>

                {/* Stats rapides */}
                {stats && (
                  <div className="grid grid-cols-3 gap-3 mb-8">
                    {[
                      { value: stats.totalSessions, label: 'Sessions', emoji: '💬' },
                      { value: `${stats.avgDurationMin}min`, label: 'Durée moy.', emoji: '⏱️' },
                      { value: stats.totalInsights, label: 'Insights', emoji: '💡' },
                    ].map((s, i) => (
                      <div key={i} className="bg-white rounded-2xl p-4 text-center border border-gray-100 shadow-sm">
                        <p className="text-xl mb-1">{s.emoji}</p>
                        <p className="text-xl font-black text-gray-900">{s.value}</p>
                        <p className="text-xs text-gray-400">{s.label}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions principales */}
                <div className="space-y-3 mb-8">
                  <button
                    onClick={() => setView('chat')}
                    className="w-full flex items-center gap-4 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white p-5 rounded-2xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                  >
                    <span className="text-3xl">💬</span>
                    <div className="text-left">
                      <p className="font-black text-lg">Session Chat TCC</p>
                      <p className="text-teal-100 text-sm">Claude Sonnet 4.5 · Guidé · Anti-paralysie</p>
                    </div>
                    <span className="ml-auto text-2xl">→</span>
                  </button>

                  {/* Consultation Vidéo Avatar — le module phare */}
                  <button
                    onClick={() => setView('video')}
                    className="w-full flex items-center gap-4 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white p-5 rounded-2xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                  >
                    <span className="text-3xl">🎭</span>
                    <div className="text-left">
                      <p className="font-black text-lg">Consultation Vidéo TCC</p>
                      <p className="text-purple-100 text-sm">Avatar animé qui te parle · 4 phases · Caméra · Lip-sync</p>
                    </div>
                    <span className="ml-auto text-xs bg-white/20 px-2 py-1 rounded-full font-bold">LIVE</span>
                  </button>

                  {/* Session TCC audio guidée (4 phases) */}
                  <button
                    onClick={() => setView('audio-tcc')}
                    className="w-full flex items-center gap-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white p-5 rounded-2xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                  >
                    <span className="text-3xl">🎙️</span>
                    <div className="text-left">
                      <p className="font-black text-lg">Session TCC Audio guidée</p>
                      <p className="text-emerald-100 text-sm">Parle à voix haute · 4 phases · Voix qui te répond</p>
                    </div>
                    <span className="ml-auto text-xs bg-white/20 px-2 py-1 rounded-full font-bold">TCC</span>
                  </button>

                  <button
                    onClick={() => { setView('chat'); setTimeout(() => setView('voice'), 100); }}
                    className="w-full flex items-center gap-4 bg-white hover:bg-teal-50 border-2 border-teal-200 hover:border-teal-400 p-4 rounded-2xl transition-all"
                  >
                    <span className="text-2xl">🎤</span>
                    <div className="text-left">
                      <p className="font-bold text-gray-900">Session Vocale simple</p>
                      <p className="text-gray-500 text-sm">Parle librement, sans structure</p>
                    </div>
                  </button>

                  {/* Lien personnaliser l'avatar */}
                  {user?.aiAvatarUrl && (
                    <button onClick={() => setView('avatar-setup')}
                      className="w-full text-center text-sm text-purple-600 font-bold py-2 hover:text-purple-700">
                      🎨 Personnaliser mon thérapeute
                    </button>
                  )}
                </div>

                {/* Sessions récentes */}
                {stats?.recentSessions?.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="font-black text-gray-900">Sessions récentes</h2>
                      <button onClick={() => setView('history')}
                        className="text-sm text-teal-600 font-bold hover:text-teal-700">
                        Voir tout →
                      </button>
                    </div>
                    <div className="space-y-3">
                      {stats.recentSessions.slice(0, 3).map((s: any) => (
                        <SessionCard key={s.id} session={s} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Conformité EU AI Act */}
                <div className="mt-8 bg-gray-50 rounded-2xl p-4 text-center border border-gray-200">
                  <p className="text-xs text-gray-400 leading-relaxed">
                    🔒 <strong>ADAH AI</strong> est un outil de soutien en Thérapie Cognitive et Comportementale (TCC).
                    Il ne fournit pas de diagnostics médicaux ou psychiatriques.
                    En cas de détresse sévère, consultez un professionnel de santé.
                    Conforme <strong>EU AI Act 2026</strong> · <strong>RGPD</strong> · <strong>CNDP Maroc</strong>
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* ══ VUE CHAT (style Claude.ai) ════════════════════════════════════ */}
          {view === 'chat' && (
            <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex-1 min-h-0">
              <ClaudeChat onExit={() => setView('home')} />
            </motion.div>
          )}

          {/* ══ VUE AUDIO TCC (4 phases) ══════════════════════════════════════ */}
          {view === 'audio-tcc' && (
            <motion.div key="audio-tcc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex-1 min-h-0">
              <AudioTCC onExit={() => setView('home')} />
            </motion.div>
          )}

          {/* ══ VUE VOICE ═════════════════════════════════════════════════════ */}
          {view === 'voice' && (
            <motion.div key="voice" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex-1">
              <VoiceInterface onBack={() => setView('chat')} />
            </motion.div>
          )}

          {/* ══ VUE SETUP AVATAR ══════════════════════════════════════════════ */}
          {view === 'avatar-setup' && (
            <motion.div key="avatar-setup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex-1 overflow-y-auto">
              <AvatarCreator
                onDone={() => setView('video')}
                onCancel={() => setView('home')}
              />
            </motion.div>
          )}

          {/* ══ VUE VIDÉO AVATAR (canvas 2D — fiable) ════════════════════════ */}
          {view === 'video' && (
            <motion.div key="video" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex-1 min-h-0">
              <VideoAvatarTCC onExit={() => setView('home')} />
            </motion.div>
          )}

          {/* ══ VUE AVATAR 3D (Ready Player Me — optionnel) ══════════════════ */}
          {view === 'video3d' && (
            <motion.div key="video3d" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex-1 min-h-0">
              <Suspense fallback={
                <div className="h-full flex items-center justify-center">
                  <div className="text-center"><div className="text-4xl mb-3 animate-pulse">🎭</div>
                  <p className="text-gray-500">Préparation de l'avatar 3D...</p></div>
                </div>
              }>
                <AvatarSession onBack={() => setView('home')} />
              </Suspense>
            </motion.div>
          )}

          {/* ══ VUE HISTORIQUE ════════════════════════════════════════════════ */}
          {view === 'history' && (
            <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex-1 overflow-y-auto">
              <div className="max-w-2xl mx-auto px-5 py-8">
                <div className="flex items-center gap-3 mb-6">
                  <button onClick={() => setView('home')} className="text-gray-400 hover:text-gray-600">←</button>
                  <h1 className="text-xl font-black text-gray-900">Mes sessions TCC</h1>
                </div>
                {sessions.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-4xl mb-3">🧠</p>
                    <p className="text-gray-500">Aucune session pour l'instant</p>
                    <button onClick={() => setView('chat')}
                      className="mt-4 bg-teal-500 text-white font-bold px-6 py-3 rounded-xl hover:bg-teal-600 transition-colors">
                      Commencer ma première session
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sessions.map((s: any) => <SessionCard key={s.id} session={s} />)}
                  </div>
                )}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </FocusWrapper>
  );
}
