/**
 * AudioTCC.tsx — Session TCC audio guidée en 4 phases
 * Enregistrement micro → transcription → IA thérapeute → voix lue (mots surlignés)
 * Thème vert. Connecté au backend sécurisé (clé API jamais exposée).
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/api';
import { useAppStore } from '../../../stores/useStore';
import { pickBestFrenchVoice, loadVoices } from '../avatar/voiceUtils';

interface Msg { id: string; role: 'user' | 'assistant'; content: string; createdAt?: string }
interface Sess { id: string; title: string; duration?: number; phaseIndex?: number; createdAt: string; updatedAt?: string; _count?: { messages: number } }

const PHASES = [
  { label: 'Psychoéducation',        short: 'Comprendre' },
  { label: 'Pensées automatiques',   short: 'Identifier' },
  { label: 'Restructuration',        short: 'Reformuler' },
  { label: 'Activation',             short: 'Agir' },
];

type AudioState = 'idle' | 'recording' | 'transcribing' | 'waiting_ai' | 'speaking_ai';

function dateGroup(d: string): string {
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  if (days === 0) return 'Aujourd\'hui';
  if (days <= 7) return 'Cette semaine';
  return 'Plus ancien';
}
function fmtDuration(s: number): string {
  const m = Math.floor(s / 60), sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export default function AudioTCC({ onExit }: { onExit?: () => void }) {
  const user = useAppStore(s => s.user);
  const qc = useQueryClient();

  const [activeId, setActiveId]   = useState<string | null>(null);
  const [messages, setMessages]   = useState<Msg[]>([]);
  const [phase, setPhase]         = useState(0);
  const [audioState, setAudioState] = useState<AudioState>('idle');
  const [interim, setInterim]     = useState('');
  const [error, setError]         = useState('');
  const [search, setSearch]       = useState('');
  const [voices, setVoices]       = useState<SpeechSynthesisVoice[]>([]);
  const [voiceIdx, setVoiceIdx]   = useState<number>(-1);
  const [volume, setVolume]       = useState(1);
  const [recSeconds, setRecSeconds] = useState(0);
  const [highlightWord, setHighlightWord] = useState<{ msgId: string; charIndex: number } | null>(null);
  const [noSpeechAPI, setNoSpeechAPI] = useState(false);
  const [forceText, setForceText]   = useState(false);  // bascule saisie texte si micro KO
  const [textFallback, setTextFallback] = useState('');
  const [sessionStart] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const retryRef = useRef(0);

  const recognitionRef = useRef<any>(null);
  const transcriptRef  = useRef('');
  const canvasRef      = useRef<HTMLCanvasElement>(null);
  const audioCtxRef    = useRef<AudioContext | null>(null);
  const analyserRef    = useRef<AnalyserNode | null>(null);
  const rafRef         = useRef<number | null>(null);
  const streamRef      = useRef<MediaStream | null>(null);
  const recTimerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const endRef         = useRef<HTMLDivElement>(null);
  const exchangesInPhase = useRef(0);

  // ── Détection support + chargement voix ────────────────────────────────────
  useEffect(() => {
    const hasSR = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
    setNoSpeechAPI(!hasSR);
    const load = () => {
      loadVoices();
      const fr = (window.speechSynthesis?.getVoices() || []).filter(v => v.lang.startsWith('fr'));
      setVoices(fr);
      if (voiceIdx === -1 && fr.length) {
        const best = pickBestFrenchVoice(user?.aiAvatarGender);
        const idx = fr.findIndex(v => v.name === best?.name);
        setVoiceIdx(idx >= 0 ? idx : 0);
      }
    };
    load();
    if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = load;
    return () => { if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  // Timer session
  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - sessionStart) / 1000)), 1000);
    return () => clearInterval(t);
  }, [sessionStart]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, interim, audioState]);

  // Liste sessions
  const { data: sessions = [] } = useQuery<Sess[]>({
    queryKey: ['adah-sessions'],
    queryFn: () => api.get('/adah/sessions').then(r => r.data),
  });

  // ── Nouvelle session TCC ───────────────────────────────────────────────────
  const newSession = useCallback(async () => {
    try {
      const res = await api.post('/adah/sessions', { mode: 'audio_tcc' });
      setActiveId(res.data.session.id);
      setPhase(0);
      exchangesInPhase.current = 0;
      const first = user?.name?.split(' ')[0] || 'toi';
      setMessages([{ id: 'greet', role: 'assistant',
        content: `Bonjour ${first} 💚 Je suis ton thérapeute TCC. On va avancer ensemble, calmement, en 4 étapes. Appuie sur le micro et dis-moi simplement comment tu te sens aujourd'hui.` }]);
      setError('');
      qc.invalidateQueries({ queryKey: ['adah-sessions'] });
    } catch { setError('Impossible de créer la session'); }
  }, [user, qc]);

  const selectSession = useCallback(async (id: string) => {
    try {
      const res = await api.get(`/adah/sessions/${id}`);
      setActiveId(id);
      setPhase(res.data.phaseIndex || 0);
      setMessages(res.data.messages?.length ? res.data.messages : [{ id: 'greet', role: 'assistant', content: 'Reprenons notre session. Appuie sur le micro quand tu es prêt(e).' }]);
      setError('');
    } catch { setError('Impossible de charger'); }
  }, []);

  useEffect(() => {
    if (activeId) return;
    const tccSessions = sessions.filter((s: any) => s.mode === 'audio_tcc');
    if (tccSessions.length) selectSession(tccSessions[0].id);
    else newSession();
  }, [sessions.length]);

  // ── Visualiseur waveform ───────────────────────────────────────────────────
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current, analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext('2d')!;
    const bufferLen = analyser.frequencyBinCount;
    const data = new Uint8Array(bufferLen);

    const render = () => {
      rafRef.current = requestAnimationFrame(render);
      analyser.getByteFrequencyData(data);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const bars = 50;
      const step = Math.floor(bufferLen / bars);
      const bw = canvas.width / bars;
      for (let i = 0; i < bars; i++) {
        const v = data[i * step] / 255;
        const h = Math.max(3, v * canvas.height);
        ctx.fillStyle = '#1D9E75';
        ctx.fillRect(i * bw + 1, (canvas.height - h) / 2, bw - 2, h);
      }
    };
    render();
  }, []);

  // ── Démarrer enregistrement ────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    setError('');
    if (window.speechSynthesis?.speaking) window.speechSynthesis.cancel();

    // Micro pour le waveform + permission
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      ctx.createMediaStreamSource(stream).connect(analyser);
      analyserRef.current = analyser;
    } catch {
      setError('🎤 Micro refusé. Autorise-le dans la barre d\'adresse (🔒).');
      return;
    }

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setNoSpeechAPI(true); cleanupAudio(); return; }

    if (recognitionRef.current) { try { recognitionRef.current.abort(); } catch {} recognitionRef.current = null; }
    const rec = new SR();
    rec.lang = 'fr-FR'; rec.continuous = true; rec.interimResults = true;

    rec.onstart = () => {
      setAudioState('recording');
      setInterim(''); transcriptRef.current = '';
      setRecSeconds(0);
      recTimerRef.current = setInterval(() => setRecSeconds(s => s + 1), 1000);
      drawWaveform();
    };
    rec.onresult = (e: any) => {
      let txt = '';
      for (let i = 0; i < e.results.length; i++) txt += e.results[i][0].transcript;
      transcriptRef.current = txt;
      setInterim(txt);
    };
    rec.onerror = (e: any) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setError('🎤 Micro bloqué. Autorise-le (🔒 barre d\'adresse) puis recharge.');
        cleanupAudio(); setAudioState('idle');
      } else if (e.error === 'network') {
        // Erreur réseau Edge fréquente → réessai 1x puis bascule texte
        if (retryRef.current < 1) {
          retryRef.current++;
          cleanupAudio();
          setTimeout(() => startRecording(), 600);
        } else {
          retryRef.current = 0;
          cleanupAudio(); setAudioState('idle');
          setForceText(true);
          setError('🌐 Le micro a un souci réseau (fréquent sur Edge). Écris ton message ci-dessous — la réponse sera lue à voix haute. 💬 Astuce : la dictée marche mieux sur Chrome.');
        }
      }
    };
    rec.onend = () => {
      cleanupAudio();
      const text = transcriptRef.current.trim();
      if (text) { retryRef.current = 0; sendToTherapist(text); }
      else { setAudioState('idle'); setInterim(''); }
    };
    recognitionRef.current = rec;
    try { rec.start(); } catch { setAudioState('idle'); cleanupAudio(); }
  }, [drawWaveform]);

  const cleanupAudio = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (recTimerRef.current) { clearInterval(recTimerRef.current); recTimerRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (audioCtxRef.current) { audioCtxRef.current.close().catch(() => {}); audioCtxRef.current = null; }
    analyserRef.current = null;
  }, []);

  const stopRecording = useCallback(() => {
    try { recognitionRef.current?.stop(); } catch {}
  }, []);

  // ── Envoyer au thérapeute (streaming) ──────────────────────────────────────
  const sendToTherapist = useCallback(async (text: string) => {
    if (!activeId) return;
    setAudioState('waiting_ai');
    setInterim('');
    setMessages(prev => [...prev, { id: `u-${Date.now()}`, role: 'user', content: text }]);
    const isFirst = messages.filter(m => m.role === 'user').length === 0;

    try {
      const token = useAppStore.getState().accessToken;
      const resp = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/adah/sessions/${activeId}/chat`,
        { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ message: text, phase }) });
      if (!resp.ok) throw new Error((await resp.json()).error || 'Erreur');

      const reader = resp.body!.getReader();
      const dec = new TextDecoder();
      let buf = '', full = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n'); buf = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try { const d = JSON.parse(line.slice(6)); if (d.text) full += d.text; if (d.error) throw new Error(d.error); } catch {}
        }
      }
      const aiMsg: Msg = { id: `a-${Date.now()}`, role: 'assistant', content: full };
      setMessages(prev => [...prev, aiMsg]);

      // Progression de phase auto (après 4 échanges)
      exchangesInPhase.current++;
      if (exchangesInPhase.current >= 4 && phase < 3) {
        const next = phase + 1;
        setPhase(next);
        exchangesInPhase.current = 0;
        api.patch(`/adah/sessions/${activeId}`, { phaseIndex: next }).catch(() => {});
      }

      // Titre auto
      if (isFirst) api.post(`/adah/sessions/${activeId}/title`).then(() => qc.invalidateQueries({ queryKey: ['adah-sessions'] })).catch(() => {});
      else qc.invalidateQueries({ queryKey: ['adah-sessions'] });

      // Lire la réponse à voix haute
      speakWithHighlight(aiMsg.id, full);
    } catch (e: any) {
      setAudioState('idle');
      setError(e.message || 'Erreur de connexion');
    }
  }, [activeId, messages, phase, qc]);

  // ── Synthèse vocale avec surlignage des mots ───────────────────────────────
  const speakWithHighlight = useCallback((msgId: string, text: string) => {
    if (!window.speechSynthesis) { setAudioState('idle'); return; }
    window.speechSynthesis.cancel();
    const clean = text.replace(/\*\*/g, '');
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = 'fr-FR'; u.rate = 0.9; u.pitch = 1.0; u.volume = volume;
    if (voiceIdx >= 0 && voices[voiceIdx]) u.voice = voices[voiceIdx];

    u.onstart = () => setAudioState('speaking_ai');
    u.onboundary = (ev: any) => {
      if (ev.name === 'word' || ev.charIndex !== undefined) {
        setHighlightWord({ msgId, charIndex: ev.charIndex });
      }
    };
    u.onend = () => { setAudioState('idle'); setHighlightWord(null); };
    u.onerror = () => { setAudioState('idle'); setHighlightWord(null); };
    window.speechSynthesis.speak(u);
  }, [voiceIdx, voices, volume]);

  const replayMessage = (msgId: string, text: string) => speakWithHighlight(msgId, text);
  const skipSpeech = () => { window.speechSynthesis?.cancel(); setAudioState('idle'); setHighlightWord(null); };

  const handleMicButton = () => {
    if (audioState === 'recording') stopRecording();
    else if (audioState === 'speaking_ai') skipSpeech();
    else if (audioState === 'idle') startRecording();
  };

  const nextPhase = () => {
    if (phase < 3 && activeId) {
      const n = phase + 1; setPhase(n); exchangesInPhase.current = 0;
      api.patch(`/adah/sessions/${activeId}`, { phaseIndex: n }).catch(() => {});
    }
  };

  // Rendu du texte avec mot surligné
  const renderHighlighted = (msg: Msg) => {
    if (highlightWord?.msgId !== msg.id) return msg.content;
    const idx = highlightWord.charIndex;
    const before = msg.content.slice(0, idx);
    const rest = msg.content.slice(idx);
    const wordMatch = rest.match(/^\S+/);
    const word = wordMatch ? wordMatch[0] : '';
    const after = rest.slice(word.length);
    return <>{before}<span style={{ background: '#FAEEDA', borderRadius: 3, padding: '0 2px' }}>{word}</span>{after}</>;
  };

  // Sessions filtrées (audio_tcc uniquement) + groupées
  const tccSessions = sessions.filter((s: any) => s.mode === 'audio_tcc' && s.title.toLowerCase().includes(search.toLowerCase()));
  const groups: Record<string, Sess[]> = {};
  tccSessions.forEach(s => { (groups[dateGroup(s.updatedAt || s.createdAt)] ||= []).push(s); });

  const stateLabels: Record<AudioState, string> = {
    idle: 'Appuyer pour parler', recording: 'En écoute...', transcribing: 'Transcription...',
    waiting_ai: 'Thérapeute réfléchit...', speaking_ai: 'Lecture (tap = passer)',
  };

  return (
    <div className="flex h-full bg-[#F9F9F8] overflow-hidden">

      {/* ══ SIDEBAR ══ */}
      <aside className="w-[260px] bg-white border-r border-[#E5E5E5] flex flex-col shrink-0">
        <div className="p-3 border-b border-[#E5E5E5]">
          <div className="flex items-center justify-between mb-3">
            <span className="font-black text-gray-900 text-sm">Sessions TCC</span>
            {onExit && <button onClick={onExit} className="text-gray-400 hover:text-gray-700 text-xs">✕</button>}
          </div>
          <button onClick={newSession}
            className="w-full flex items-center justify-center gap-2 bg-[#1D9E75] hover:bg-[#178a64] text-white font-bold text-sm py-2.5 rounded-xl transition-colors">
            + Nouvelle session
          </button>
          <div className="relative mt-3">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
              className="w-full pl-8 pr-3 py-2 bg-[#F9F9F8] border border-[#E5E5E5] rounded-lg text-sm outline-none focus:border-[#5DCAA5]" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {tccSessions.length === 0 && <p className="text-xs text-gray-400 text-center py-6">Aucune session TCC</p>}
          {['Aujourd\'hui', 'Cette semaine', 'Plus ancien'].map(g => groups[g] && (
            <div key={g} className="mb-3">
              <p className="text-xs text-gray-400 font-bold px-2 mb-1">{g}</p>
              {groups[g].map(s => (
                <div key={s.id} onClick={() => selectSession(s.id)}
                  className={`flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer mb-0.5 border-l-[3px] transition-colors ${
                    activeId === s.id ? 'bg-[#E1F5EE] border-[#1D9E75]' : 'border-transparent hover:bg-[#F0F0F0]'
                  }`}>
                  <span className="text-sm shrink-0">🎙️</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${activeId === s.id ? 'text-[#0F6E56] font-semibold' : 'text-gray-800'}`}>{s.title}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{fmtDuration(s.duration || 0)}</span>
                      <span className="text-xs bg-[#E1F5EE] text-[#0F6E56] px-1.5 rounded-full">Ph {(s.phaseIndex ?? 0) + 1}/4</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Paramètres voix */}
        <div className="p-3 border-t border-[#E5E5E5] space-y-2">
          <p className="text-xs text-gray-400 font-bold">🔊 Voix</p>
          <select value={voiceIdx} onChange={e => setVoiceIdx(Number(e.target.value))}
            className="w-full text-xs border border-[#E5E5E5] rounded-lg px-2 py-1.5 outline-none">
            {voices.length === 0 && <option value={-1}>Voix par défaut</option>}
            {voices.map((v, i) => <option key={i} value={i}>{v.name.replace('Microsoft ', '').replace(' Online (Natural)', '')}</option>)}
          </select>
          <div className="flex items-center gap-2">
            <span className="text-xs">🔉</span>
            <input type="range" min="0" max="1" step="0.1" value={volume}
              onChange={e => setVolume(Number(e.target.value))} className="flex-1 accent-[#1D9E75]" />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <div className="w-7 h-7 rounded-full bg-[#E1F5EE] flex items-center justify-center text-[#0F6E56] font-black text-xs">
              {user?.name?.[0]?.toUpperCase() || 'T'}
            </div>
            <span className="text-sm font-semibold text-gray-700 flex-1 truncate">{user?.name}</span>
          </div>
        </div>
      </aside>

      {/* ══ ZONE PRINCIPALE ══ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header + barre de phases */}
        <div className="border-b border-[#E5E5E5] bg-white px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold text-gray-700">🎙️ Session TCC guidée</p>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">⏱ {fmtDuration(elapsed)}</span>
              <span className="text-xs bg-[#E1F5EE] text-[#0F6E56] font-bold px-2 py-1 rounded-full">
                Phase {phase + 1}/4 · {PHASES[phase].label}
              </span>
            </div>
          </div>
          {/* Barre progression phases */}
          <div className="flex gap-1">
            {PHASES.map((p, i) => (
              <div key={i} className="flex-1">
                <div className="h-1.5 rounded-full transition-colors" style={{ background: i <= phase ? '#1D9E75' : '#E5E5E5' }} />
                <p className={`text-xs mt-1 text-center ${i === phase ? 'text-[#0F6E56] font-bold' : 'text-gray-400'}`}>{p.short}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Transcription */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="max-w-[720px] mx-auto">
            {messages.map((m, i) => (
              <div key={m.id || i} className={`mb-4 flex ${m.role === 'user' ? 'justify-end' : 'justify-start gap-3'}`}>
                {m.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-[#1D9E75] flex items-center justify-center text-white font-black text-sm shrink-0 mt-0.5">T</div>
                )}
                <div className={m.role === 'user' ? 'max-w-[70%]' : 'max-w-[80%]'}>
                  <div className={m.role === 'user'
                    ? 'bg-[#E1F5EE] text-[#1a1a1a] rounded-[16px_16px_4px_16px] px-4 py-2.5 text-[15px] leading-relaxed'
                    : 'text-[#1a1a1a] text-[15px] leading-relaxed'}>
                    {m.role === 'assistant' ? renderHighlighted(m) : m.content}
                    {m.role === 'user' && <span className="text-xs ml-2 text-[#0F6E56]">🎙️</span>}
                  </div>
                  {m.role === 'assistant' && m.id !== 'greet' && (
                    <div className="flex items-center gap-1 mt-1.5 opacity-70">
                      <button onClick={() => replayMessage(m.id, m.content)} className="text-xs text-gray-400 hover:text-[#1D9E75] px-2 py-1 rounded hover:bg-gray-100">▶ Réécouter</button>
                      <button onClick={() => navigator.clipboard.writeText(m.content)} className="text-xs text-gray-400 hover:text-gray-700 px-1.5 py-1 rounded hover:bg-gray-100">📋</button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Transcription en temps réel */}
            {interim && (
              <div className="mb-4 flex justify-end">
                <div className="max-w-[70%] bg-[#E1F5EE]/50 rounded-[16px_16px_4px_16px] px-4 py-2.5 text-[15px] text-gray-400 italic">{interim}</div>
              </div>
            )}

            {/* IA réfléchit */}
            {audioState === 'waiting_ai' && (
              <div className="mb-4 flex justify-start gap-3">
                <div className="w-7 h-7 rounded-full bg-[#1D9E75] flex items-center justify-center text-white font-black text-sm shrink-0">T</div>
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <div className="w-4 h-4 border-2 border-[#5DCAA5] border-t-[#1D9E75] rounded-full animate-spin" />
                  Thérapeute en train de réfléchir...
                </div>
              </div>
            )}

            {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">⚠️ {error}</div>}
            <div ref={endRef} />
          </div>
        </div>

        {/* ══ PANNEAU AUDIO BAS ══ */}
        <div className="border-t border-[#E5E5E5] bg-white" style={{ minHeight: 140 }}>
          <div className="max-w-[720px] mx-auto px-6 py-3">
            {(noSpeechAPI || forceText) ? (
              // ── Mode SAISIE TEXTE (fallback fiable) ──
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-amber-600">⌨️ Mode texte — écris, la réponse sera lue à voix haute 🔊</p>
                  {!noSpeechAPI && (
                    <button onClick={() => { setForceText(false); setError(''); retryRef.current = 0; }}
                      className="text-xs text-[#0F6E56] font-bold hover:underline">🎙️ Réessayer le micro</button>
                  )}
                </div>
                <div className="flex gap-2">
                  <textarea value={textFallback} onChange={e => setTextFallback(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (textFallback.trim()) { sendToTherapist(textFallback.trim()); setTextFallback(''); } } }}
                    placeholder="Écris ce que tu ressens..." rows={2}
                    className="flex-1 border-2 border-[#E5E5E5] focus:border-[#5DCAA5] rounded-xl px-3 py-2 text-sm outline-none resize-none" />
                  <button onClick={() => { if (textFallback.trim()) { sendToTherapist(textFallback.trim()); setTextFallback(''); } }}
                    disabled={!textFallback.trim() || audioState === 'waiting_ai'}
                    className="bg-[#1D9E75] hover:bg-[#178a64] disabled:opacity-40 text-white font-bold px-5 rounded-xl">Envoyer</button>
                </div>
                {phase < 3 && (
                  <div className="text-right mt-2">
                    <button onClick={nextPhase} className="text-xs text-[#0F6E56] hover:underline font-semibold">Phase suivante →</button>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Waveform */}
                <canvas ref={canvasRef} width={672} height={60}
                  className="w-full rounded-lg mb-2" style={{ background: '#F9F9F8', display: audioState === 'recording' ? 'block' : 'none' }} />

                <div className="flex items-center justify-between">
                  {/* Gauche : durée + bascule texte */}
                  <div className="w-28 text-left flex flex-col gap-1">
                    {audioState === 'recording' && <span className="text-sm font-mono text-[#1D9E75]">● {fmtDuration(recSeconds)}</span>}
                    <button onClick={() => setForceText(true)}
                      className="text-xs text-gray-400 hover:text-[#0F6E56] text-left">⌨️ Écrire à la place</button>
                  </div>

                  {/* Bouton central */}
                  <div className="flex flex-col items-center gap-1">
                    <button onClick={handleMicButton} disabled={audioState === 'waiting_ai' || audioState === 'transcribing'}
                      className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl shadow-lg transition-all disabled:opacity-50 ${
                        audioState === 'recording' ? 'bg-red-500 text-white animate-pulse-ring'
                        : audioState === 'speaking_ai' ? 'bg-[#5DCAA5] text-white'
                        : 'bg-[#1D9E75] text-white hover:bg-[#178a64]'
                      }`}>
                      {audioState === 'recording' ? '⏹' : audioState === 'speaking_ai' ? '⏭' : '🎙️'}
                    </button>
                    <span className="text-xs text-gray-500 font-medium">{stateLabels[audioState]}</span>
                  </div>

                  {/* Phase suivante */}
                  <div className="w-28 text-right">
                    {phase < 3 && (
                      <button onClick={nextPhase} className="text-xs text-[#0F6E56] hover:underline font-semibold">Phase suivante →</button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`@keyframes pulse-ring { 0%{box-shadow:0 0 0 0 rgba(239,68,68,0.4)} 100%{box-shadow:0 0 0 16px rgba(239,68,68,0)} } .animate-pulse-ring{animation:pulse-ring 1.2s ease-out infinite}`}</style>
    </div>
  );
}
