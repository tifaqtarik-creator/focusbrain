/**
 * MusicPage.tsx — Module Musique TDAH (ADAH)
 * • Playlists Spotify via embed (aucune clé API / Premium requis)
 * • Bruits colorés WebAudio (blanc/rose/brun) — mixables
 * • Pomodoro · Quiz profil · Surprise me · Historique
 * Adapté Vite + TypeScript + Tailwind (stack réel FocusBrain)
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Music, Dices, BrainCircuit, Clock, Star, Waves, Volume1, Timer, Coffee,
  Target, Play, Pause, RotateCcw, Lightbulb,
} from 'lucide-react';
import { ADHD_PLAYLISTS, CATEGORIES, Playlist } from '../data/adhdPlaylists';
import { useColoredNoise } from '../hooks/useColoredNoise';
import YouTubeSearch from '../components/music/YouTubeSearch';

// ── Quiz profil TDAH (4 questions) ────────────────────────────────────────────
const QUIZ = [
  { id: 'challenge', q: 'Ton principal défi aujourd\'hui ?', opts: [
    { v: 'focus',   label: '🎯 Me concentrer',     cats: ['binaural', 'lofi'] },
    { v: 'anxiety', label: '😰 Gérer l\'anxiété',   cats: ['noise', 'baroque'] },
    { v: 'energy',  label: '⚡ Manque d\'énergie',  cats: ['stimulant'] },
    { v: 'sleep',   label: '😴 Me détendre',        cats: ['meditation', 'noise'] },
  ]},
  { id: 'env', q: 'Ton environnement de travail ?', opts: [
    { v: 'silent', label: '🤫 Bureau silencieux',  cats: ['noise'] },
    { v: 'open',   label: '🔊 Open space bruyant',  cats: ['noise'] },
    { v: 'home',   label: '🏠 Maison',              cats: ['lofi'] },
    { v: 'cafe',   label: '☕ Café / extérieur',    cats: ['stimulant'] },
  ]},
  { id: 'sensitivity', q: 'Sensible aux sons ?', opts: [
    { v: 'yes', label: '🎚️ Oui, plutôt sensible', cats: ['lofi', 'meditation'] },
    { v: 'no',  label: '🔥 Non, j\'aime le son',   cats: ['stimulant', 'binaural'] },
  ]},
  { id: 'pref', q: 'Tu préfères écouter ?', opts: [
    { v: 'music',   label: '🎵 Musique structurée', cats: ['baroque', 'lofi'] },
    { v: 'nature',  label: '🍃 Sons naturels',      cats: ['nature'] },
    { v: 'noise',   label: '🌫️ Bruits colorés',    cats: ['noise'] },
  ]},
];

const NOISE_LAYERS = [
  { id: 'brown', label: 'Bruit brun', emoji: '🟤', color: 'brown' as const, defVol: 50, tip: 'Réduit la voix intérieure' },
  { id: 'white', label: 'Bruit blanc', emoji: '⬜', color: 'white' as const, defVol: 40, tip: 'Masque les sons extérieurs' },
  { id: 'pink',  label: 'Bruit rose',  emoji: '🌸', color: 'pink' as const,  defVol: 45, tip: 'Apaisant, équilibré' },
];

// ── Construction de l'URL d'embed selon la source (Spotify ou YouTube) ──────────
function embedUrl(pl: Playlist): string {
  if (pl.source === 'youtube') {
    return pl.ytType === 'playlist'
      ? `https://www.youtube.com/embed/videoseries?list=${pl.id}`
      : `https://www.youtube.com/embed/${pl.id}`;
  }
  const t = pl.spType || 'playlist';
  return `https://open.spotify.com/embed/${t}/${pl.id}?utm_source=generator`;
}
function embedHeight(pl: Playlist): number {
  if (pl.source === 'youtube') return 220;
  return pl.spType === 'show' ? 232 : 152;
}

export default function MusicPage() {
  const { playNoise, stopNoise, setNoiseVolume, activeColor } = useColoredNoise();

  const [category, setCategory]   = useState<string>('lofi');
  const [playing, setPlaying]     = useState<Playlist | null>(null);
  const [showQuiz, setShowQuiz]   = useState(false);
  const [quizStep, setQuizStep]   = useState(0);
  const [quizAns, setQuizAns]     = useState<Record<string, string>>({});
  const [recommended, setRecommended] = useState<string[]>([]);
  const [noiseVol, setNoiseVol]   = useState(50);
  const [history, setHistory]     = useState<Playlist[]>([]);
  const [showPomodoro, setShowPomodoro] = useState(false);

  // Charger profil + historique
  useEffect(() => {
    const prof = localStorage.getItem('adah_music_profile');
    if (prof) {
      try { const p = JSON.parse(prof); setRecommended(p.cats || []); if (p.cats?.[0]) setCategory(p.cats[0]); }
      catch { /* ignore */ }
    } else {
      setShowQuiz(true); // 1ère visite → quiz
    }
    const hist = localStorage.getItem('adah_music_history');
    if (hist) { try { setHistory(JSON.parse(hist)); } catch { /* ignore */ } }
  }, []);

  // ── Quiz ──
  const answerQuiz = (v: string, cats: string[]) => {
    const updated = { ...quizAns, [QUIZ[quizStep].id]: v };
    setQuizAns(updated);
    if (quizStep < QUIZ.length - 1) {
      setQuizStep(s => s + 1);
    } else {
      // Compter les catégories recommandées
      const allCats: string[] = [];
      Object.values({ ...updated }).forEach(() => {});
      // Recalcule depuis toutes les réponses
      const score: Record<string, number> = {};
      QUIZ.forEach(question => {
        const ans = (updated as any)[question.id] || (question.id === QUIZ[quizStep].id ? v : '');
        const opt = question.opts.find(o => o.v === ans);
        opt?.cats.forEach(c => { score[c] = (score[c] || 0) + 1; });
      });
      // Ajouter la dernière réponse
      cats.forEach(c => { score[c] = (score[c] || 0) + 1; });
      const sorted = Object.entries(score).sort(([,a],[,b]) => b - a).map(([c]) => c);
      const top = sorted.slice(0, 3);
      setRecommended(top);
      if (top[0]) setCategory(top[0]);
      localStorage.setItem('adah_music_profile', JSON.stringify({ answers: updated, cats: top }));
      setShowQuiz(false); setQuizStep(0);
    }
  };

  // ── Jouer une playlist ──
  const play = useCallback((pl: Playlist) => {
    setPlaying(pl);
    setHistory(prev => {
      const next = [pl, ...prev.filter(p => p.id !== pl.id)].slice(0, 5);
      localStorage.setItem('adah_music_history', JSON.stringify(next));
      return next;
    });
  }, []);

  // ── Bruits colorés ──
  const toggleNoise = (color: 'white' | 'pink' | 'brown', vol: number) => {
    if (activeColor === color) stopNoise();
    else playNoise(color, vol / 100);
  };

  const surpriseMe = () => {
    const pool = recommended.length
      ? ADHD_PLAYLISTS.filter(p => recommended.includes(p.category))
      : ADHD_PLAYLISTS;
    const random = pool[Math.floor(Math.random() * pool.length)];
    setCategory(random.category);
    play(random);
  };

  const catMeta = CATEGORIES[category];
  const playlists = ADHD_PLAYLISTS.filter(p => p.category === category);

  return (
    <div className="h-full overflow-y-auto bg-surface-soft">
      <div className="max-w-5xl mx-auto px-5 py-6 pb-28">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-black text-ink-900 flex items-center gap-2"><Music size={24} strokeWidth={2} className="text-teal-600" /> Musique Focus TDAH</h1>
            <p className="text-ink-500 text-sm">Cherche sur YouTube (gratuit, titres complets) ou explore les playlists Spotify</p>
          </div>
          <div className="flex gap-2">
            <button onClick={surpriseMe}
              className="bg-teal-500 text-white font-bold px-4 py-2 rounded-xl text-sm hover:bg-teal-600 transition-colors flex items-center gap-1.5">
              <Dices size={18} strokeWidth={2} /> Surprise-moi
            </button>
            <button onClick={() => { setShowQuiz(true); setQuizStep(0); }}
              className="bg-white border-2 border-line text-ink-500 font-bold px-4 py-2 rounded-xl text-sm hover:border-teal-300 flex items-center gap-1.5">
              <BrainCircuit size={18} strokeWidth={2} /> Mon profil
            </button>
          </div>
        </div>

        {/* Recherche YouTube (gratuit, titres complets) */}
        <YouTubeSearch />

        {/* Historique */}
        {history.length > 0 && (
          <div className="mb-5">
            <p className="text-xs font-bold text-ink-400 uppercase mb-2 flex items-center gap-1.5"><Clock size={14} strokeWidth={2} /> Récemment écouté</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {history.map(h => (
                <button key={h.id} onClick={() => { setCategory(h.category); play(h); }}
                  className="flex items-center gap-2 shrink-0 bg-white border border-line rounded-xl px-3 py-2 hover:border-teal-300 transition-colors">
                  <span className="text-lg">{h.emoji}</span>
                  <span className="text-xs font-semibold text-ink-700 max-w-[140px] truncate">{h.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Catégories */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
          {Object.entries(CATEGORIES).map(([key, meta]) => (
            <button key={key} onClick={() => setCategory(key)}
              className={`flex items-center gap-2 shrink-0 px-4 py-2.5 rounded-xl font-bold text-sm transition-all border-2 ${
                category === key ? 'border-transparent shadow-card' : 'border-line bg-white text-ink-500 hover:border-ink-400'
              }`}
              style={category === key ? { background: meta.color, color: meta.textColor } : {}}>
              <span>{meta.emoji}</span>{meta.label}
              {recommended.includes(key) && <Star size={13} strokeWidth={2} className="fill-current" />}
            </button>
          ))}
        </div>

        {/* Conseil TDAH de la catégorie */}
        <div className="rounded-xl px-4 py-3 mb-5 text-sm flex items-center gap-2" style={{ background: catMeta.color, color: catMeta.textColor }}>
          <Lightbulb size={16} strokeWidth={2} className="shrink-0" />
          <span><strong>{catMeta.label}</strong> — {catMeta.tip}</span>
        </div>

        {/* Outils rapides : bruits colorés + Pomodoro */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {/* Mixer bruits colorés */}
          <div className="bg-white border border-line rounded-2xl p-4">
            <p className="font-black text-ink-900 text-sm mb-1 flex items-center gap-1.5"><Waves size={16} strokeWidth={2} /> Bruits colorés</p>
            <p className="text-xs text-ink-400 mb-3">Généré en direct · combine avec la musique</p>
            <div className="space-y-2">
              {NOISE_LAYERS.map(layer => (
                <div key={layer.id} className="flex items-center gap-2">
                  <button onClick={() => toggleNoise(layer.color, noiseVol)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors flex-1 ${
                      activeColor === layer.color ? 'bg-teal-500 text-white' : 'bg-surface-muted text-ink-500 hover:bg-line'
                    }`}>
                    <span>{layer.emoji}</span>{layer.label}
                    {activeColor === layer.color && <span className="ml-auto">●</span>}
                  </button>
                </div>
              ))}
            </div>
            {activeColor && (
              <div className="flex items-center gap-2 mt-3">
                <Volume1 size={16} strokeWidth={2} className="text-ink-400" />
                <input type="range" min="0" max="100" value={noiseVol}
                  onChange={e => { const v = Number(e.target.value); setNoiseVol(v); setNoiseVolume(v / 100); }}
                  className="flex-1 accent-teal-500" />
                <span className="text-xs text-ink-400 w-8">{noiseVol}%</span>
              </div>
            )}
          </div>

          {/* Pomodoro */}
          <PomodoroCard show={showPomodoro} onToggle={() => setShowPomodoro(v => !v)} />
        </div>

        {/* Grille playlists */}
        <div className="grid sm:grid-cols-2 gap-4">
          {playlists.map(pl => (
            <motion.div key={pl.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-line rounded-2xl overflow-hidden shadow-card">
              <div className="p-4" style={{ background: pl.color }}>
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{pl.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm" style={{ color: pl.textColor }}>{pl.name}</p>
                    <p className="text-xs opacity-70" style={{ color: pl.textColor }}>{pl.desc}</p>
                  </div>
                </div>
                <p className="text-xs mt-2 opacity-80 flex items-center gap-1.5" style={{ color: pl.textColor }}><Lightbulb size={13} strokeWidth={2} className="shrink-0" /> {pl.tips}</p>
              </div>
              {playing?.id === pl.id ? (
                <iframe
                  title={pl.name}
                  src={embedUrl(pl)}
                  width="100%" height={embedHeight(pl)} frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  allowFullScreen
                  loading="lazy"
                  style={{ display: 'block' }}
                />
              ) : (
                <button onClick={() => play(pl)}
                  className={`w-full py-3 text-sm font-bold transition-colors flex items-center justify-center gap-2 ${
                    pl.source === 'youtube' ? 'text-[#FF0000] hover:bg-red-50' : 'text-[#1DB954] hover:bg-green-50'
                  }`}>
                  <Play size={16} strokeWidth={2} className="fill-current" /> Écouter sur {pl.source === 'youtube' ? 'YouTube' : 'Spotify'}
                </button>
              )}
            </motion.div>
          ))}
        </div>

        <p className="text-center text-xs text-ink-400 mt-6 flex items-center justify-center gap-1.5 flex-wrap">
          <Music size={13} strokeWidth={2} /> Lecture via Spotify · <Waves size={13} strokeWidth={2} /> Bruits générés en direct (WebAudio) · Aucune donnée stockée
        </p>
      </div>

      {/* ── MODAL QUIZ ── */}
      <AnimatePresence>
        {showQuiz && (
          <motion.div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-white rounded-3xl w-full max-w-md shadow-card p-6"
              initial={{ scale: 0.94, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94 }}>
              <div className="text-center mb-5">
                <div className="flex justify-center mb-2"><BrainCircuit size={32} strokeWidth={1.5} className="text-teal-600" /></div>
                <h3 className="font-black text-ink-900 text-lg">{QUIZ[quizStep].q}</h3>
                <p className="text-xs text-ink-400 mt-1">Question {quizStep + 1}/{QUIZ.length}</p>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {QUIZ[quizStep].opts.map(opt => (
                  <button key={opt.v} onClick={() => answerQuiz(opt.v, opt.cats)}
                    className="text-left bg-surface-soft hover:bg-teal-50 hover:text-teal-700 border-2 border-line hover:border-teal-300 rounded-xl px-4 py-3 font-semibold text-ink-700 transition-all">
                    {opt.label}
                  </button>
                ))}
              </div>
              {/* Barre progression */}
              <div className="w-full bg-surface-muted rounded-full h-1.5 mt-5">
                <div className="bg-teal-500 h-1.5 rounded-full transition-all" style={{ width: `${((quizStep + 1) / QUIZ.length) * 100}%` }} />
              </div>
              <button onClick={() => { setShowQuiz(false); setQuizStep(0); }}
                className="w-full text-ink-400 text-xs mt-3 hover:text-ink-700">Passer le quiz</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Carte Pomodoro ────────────────────────────────────────────────────────────
function PomodoroCard({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => {
        setSeconds(s => {
          if (s <= 1) {
            // Transition focus ↔ pause
            const nextBreak = !isBreak;
            setIsBreak(nextBreak);
            setRunning(false);
            return nextBreak ? 5 * 60 : 25 * 60;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [running, isBreak]);

  const mm = Math.floor(seconds / 60), ss = seconds % 60;
  const reset = () => { setRunning(false); setIsBreak(false); setSeconds(25 * 60); };

  return (
    <div className="bg-white border border-line rounded-2xl p-4">
      <div className="flex items-center justify-between mb-1">
        <p className="font-black text-ink-900 text-sm flex items-center gap-1.5"><Timer size={16} strokeWidth={2} /> Pomodoro</p>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${isBreak ? 'bg-teal-100 text-teal-700' : 'bg-amber-400/15 text-amber-600'}`}>
          {isBreak ? <><Coffee size={12} strokeWidth={2} /> Pause</> : <><Target size={12} strokeWidth={2} /> Focus</>}
        </span>
      </div>
      <p className="text-xs text-ink-400 mb-3">25 min focus · 5 min pause</p>
      <div className="text-center mb-3">
        <span className="text-4xl font-black text-ink-900 tabular-nums">
          {String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}
        </span>
      </div>
      <div className="flex gap-2">
        <button onClick={() => setRunning(r => !r)}
          className="flex-1 bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 rounded-xl text-sm transition-colors flex items-center justify-center gap-1.5">
          {running ? <><Pause size={16} strokeWidth={2} className="fill-current" /> Pause</> : <><Play size={16} strokeWidth={2} className="fill-current" /> Démarrer</>}
        </button>
        <button onClick={reset} aria-label="Réinitialiser"
          className="bg-surface-muted hover:bg-line text-ink-500 font-bold px-4 rounded-xl text-sm flex items-center justify-center"><RotateCcw size={16} strokeWidth={2} /></button>
      </div>
    </div>
  );
}
