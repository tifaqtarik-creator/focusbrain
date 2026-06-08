/**
 * VideoAvatarTCC.tsx — Consultation vidéo avec avatar 2D animé (canvas natif)
 * Avatar thérapeute dessiné en canvas · lip-sync · 6 expressions · 4 phases TCC
 * Webcam PiP utilisateur · mode sombre · expressions pilotées par Claude
 * Connecté au backend sécurisé.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../../../stores/useStore';
import api from '../../../lib/api';
import { pickBestFrenchVoice, loadVoices } from '../avatar/voiceUtils';

interface Msg { id: string; role: 'user' | 'assistant'; content: string; expression?: string }

const PHASES = [
  { label: 'Psychoéducation', short: 'Comprendre', defaultExpr: 'attentive' },
  { label: 'Pensées auto.',   short: 'Identifier', defaultExpr: 'empathetic' },
  { label: 'Restructuration', short: 'Reformuler', defaultExpr: 'thinking' },
  { label: 'Activation',      short: 'Agir',       defaultExpr: 'encouraging' },
];

// Valeurs numériques par expression (pour interpolation lerp)
const EXPRESSIONS: Record<string, { browLift: number; browFrown: number; mouthCurve: number; cheekBlush: number }> = {
  neutral:     { browLift: 0, browFrown: 0,   mouthCurve: 0.1,  cheekBlush: 0 },
  smile:       { browLift: 5, browFrown: 0,   mouthCurve: 0.6,  cheekBlush: 0.6 },
  attentive:   { browLift: 0, browFrown: 0.3, mouthCurve: 0,    cheekBlush: 0 },
  encouraging: { browLift: 8, browFrown: 0,   mouthCurve: 0.8,  cheekBlush: 0.8 },
  thinking:    { browLift: 4, browFrown: 0.5, mouthCurve: -0.1, cheekBlush: 0 },
  empathetic:  { browLift: 2, browFrown: 0.6, mouthCurve: -0.2, cheekBlush: 0.3 },
};

const THERAPISTS = {
  FEMME: { name: 'Dr. Amina', skin: '#F5C5A3', hair: '#3A2A1E', coat: '#2D4A7A' },
  HOMME: { name: 'Dr. Karim', skin: '#E8B58C', hair: '#1E1812', coat: '#2D4A7A' },
};

function estimateMouthOpen(word: string): number {
  if (!word) return 0.1;
  const vowels = (word.match(/[aeiouàâéèêëîïôùûü]/gi) || []).length;
  return Math.min(0.8, 0.1 + (vowels / Math.max(1, word.length)) * 0.7);
}

type VState = 'idle' | 'recording' | 'waiting' | 'speaking';

export default function VideoAvatarTCC({ onExit }: { onExit?: () => void }) {
  const user = useAppStore(s => s.user);
  const therapist = THERAPISTS[(user?.aiAvatarGender as 'FEMME'|'HOMME') || 'FEMME'];

  const [started, setStarted]   = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [phase, setPhase]       = useState(0);
  const [vState, setVState]     = useState<VState>('idle');
  const [interim, setInterim]   = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [exprName, setExprName] = useState('neutral');
  const [cameraOn, setCameraOn] = useState(true);
  const [error, setError]       = useState('');
  const [forceText, setForceText] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [elapsed, setElapsed]   = useState(0);
  const [voices, setVoices]     = useState<SpeechSynthesisVoice[]>([]);

  // Canvas + animation refs
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const videoRef     = useRef<HTMLVideoElement>(null);
  const curExpr      = useRef({ ...EXPRESSIONS.neutral });
  const targetExpr   = useRef({ ...EXPRESSIONS.neutral });
  const mouthRef     = useRef(0);
  const mouthTarget  = useRef(0);
  const blinkRef     = useRef(0);
  const nextBlink    = useRef(2000);
  const blinkStart   = useRef(0);
  const rafRef       = useRef<number | null>(null);
  const lastFrame    = useRef(0);

  // Voix / reco
  const recognitionRef = useRef<any>(null);
  const transcriptRef  = useRef('');
  const camStreamRef   = useRef<MediaStream | null>(null);
  const retryRef       = useRef(0);
  const exchangesInPhase = useRef(0);
  const startTimeRef   = useRef(Date.now());

  // ── Charger voix ────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = () => { loadVoices(); setVoices((window.speechSynthesis?.getVoices() || []).filter(v => v.lang.startsWith('fr'))); };
    load();
    if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = load;
    return () => { if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  // ── Timer ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!started) return;
    startTimeRef.current = Date.now();
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, [started]);

  // ── Dessin de l'avatar ──────────────────────────────────────────────────────
  const drawAvatar = useCallback((ctx: CanvasRenderingContext2D, t: number) => {
    const W = 480, H = 360;
    ctx.clearRect(0, 0, W, H);

    // Fond dégradé
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#1a1f2e'); grad.addColorStop(1, '#0F1117');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);

    const e = curExpr.current;
    const headY = 180 + Math.sin(t * 0.0015) * 3; // respiration
    const cx = 240;

    // Blouse
    ctx.fillStyle = therapist.coat;
    ctx.beginPath();
    ctx.moveTo(cx - 95, H); ctx.lineTo(cx - 70, headY + 70);
    ctx.quadraticCurveTo(cx, headY + 110, cx + 70, headY + 70);
    ctx.lineTo(cx + 95, H); ctx.closePath(); ctx.fill();
    // Col + badge TCC
    ctx.fillStyle = '#fff'; ctx.beginPath();
    ctx.moveTo(cx - 22, headY + 78); ctx.lineTo(cx, headY + 95); ctx.lineTo(cx + 22, headY + 78); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#1D9E75'; ctx.fillRect(cx + 28, headY + 80, 26, 14);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 9px sans-serif'; ctx.fillText('TCC', cx + 31, headY + 90);

    // Cou
    ctx.fillStyle = therapist.skin; ctx.fillRect(cx - 18, headY + 50, 36, 35);

    // Visage
    ctx.fillStyle = therapist.skin;
    ctx.beginPath(); ctx.arc(cx, headY, 95, 0, Math.PI * 2); ctx.fill();

    // Cheveux
    ctx.fillStyle = therapist.hair;
    ctx.beginPath(); ctx.arc(cx, headY - 20, 96, Math.PI, 0); ctx.fill();
    ctx.fillRect(cx - 96, headY - 22, 22, 60);
    ctx.fillRect(cx + 74, headY - 22, 22, 60);

    // Joues (blush)
    if (e.cheekBlush > 0.05) {
      ctx.fillStyle = `rgba(255,150,150,${e.cheekBlush * 0.4})`;
      ctx.beginPath(); ctx.arc(cx - 45, headY + 18, 18, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 45, headY + 18, 18, 0, Math.PI*2); ctx.fill();
    }

    // Yeux (clignement = scaleY)
    const eyeH = 18 * (1 - blinkRef.current * 0.9);
    for (const ex of [-32, 32]) {
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(cx + ex, headY - 8, 16, eyeH, 0, 0, Math.PI*2); ctx.fill();
      if (blinkRef.current < 0.5) {
        ctx.fillStyle = therapist.coat;
        ctx.beginPath(); ctx.arc(cx + ex, headY - 8, 7, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath(); ctx.arc(cx + ex, headY - 8, 3.5, 0, Math.PI*2); ctx.fill();
      }
    }

    // Sourcils (lift + frown)
    ctx.strokeStyle = therapist.hair; ctx.lineWidth = 4; ctx.lineCap = 'round';
    for (const side of [-1, 1]) {
      const bx = cx + side * 32;
      const by = headY - 32 - e.browLift + (side === 1 ? 0 : 0);
      const frownY = e.browFrown * 6;
      ctx.beginPath();
      ctx.moveTo(bx - 14, by + frownY);
      ctx.quadraticCurveTo(bx, by - 4, bx + 14, by - (side === -1 ? frownY : frownY));
      ctx.stroke();
    }

    // Nez
    ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx, headY - 2); ctx.quadraticCurveTo(cx + 6, headY + 14, cx, headY + 18); ctx.stroke();

    // Bouche (lip-sync via mouthRef + courbe via mouthCurve)
    const mo = mouthRef.current;
    const my = headY + 40;
    ctx.fillStyle = '#9B4A4A';
    if (mo > 0.15) {
      // Bouche ouverte
      ctx.beginPath();
      ctx.ellipse(cx, my, 22, 8 + mo * 18, 0, 0, Math.PI*2); ctx.fill();
      // Dents
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(cx, my - mo * 6, 18, Math.max(2, mo * 6), 0, 0, Math.PI); ctx.fill();
    } else {
      // Bouche fermée avec courbe (sourire / triste)
      ctx.strokeStyle = '#9B4A4A'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx - 24, my);
      ctx.quadraticCurveTo(cx, my + e.mouthCurve * 20, cx + 24, my);
      ctx.stroke();
    }
  }, [therapist]);

  // ── Boucle d'animation (30 fps) ─────────────────────────────────────────────
  useEffect(() => {
    if (!started) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const loop = (ts: number) => {
      rafRef.current = requestAnimationFrame(loop);
      if (ts - lastFrame.current < 33) return; // throttle 30fps
      lastFrame.current = ts;

      // Lerp expression
      const c = curExpr.current, tg = targetExpr.current;
      (Object.keys(c) as (keyof typeof c)[]).forEach(k => { c[k] += (tg[k] - c[k]) * 0.08; });
      // Lerp bouche
      mouthRef.current += (mouthTarget.current - mouthRef.current) * 0.3;

      // Clignement
      if (ts > nextBlink.current && blinkStart.current === 0) blinkStart.current = ts;
      if (blinkStart.current > 0) {
        const p = (ts - blinkStart.current) / 150;
        blinkRef.current = p < 1 ? Math.sin(p * Math.PI) : 0;
        if (p >= 1) { blinkStart.current = 0; nextBlink.current = ts + 2000 + Math.random() * 3000; }
      }

      drawAvatar(ctx, ts);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [started, drawAvatar]);

  // ── Webcam ──────────────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      camStreamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setCameraOn(true);
    } catch { setCameraOn(false); }
  }, []);
  const stopCamera = useCallback(() => {
    camStreamRef.current?.getTracks().forEach(t => t.stop());
    camStreamRef.current = null;
    setCameraOn(false);
  }, []);

  // ── Démarrer la consultation ────────────────────────────────────────────────
  const startConsultation = useCallback(async () => {
    try {
      const res = await api.post('/adah/sessions', { mode: 'video_tcc' });
      setActiveId(res.data.session.id);
      setPhase(0); exchangesInPhase.current = 0;
      const first = user?.name?.split(' ')[0] || 'toi';
      const greet = `Bonjour ${first}. Je suis ${therapist.name}, ton thérapeute. Installe-toi confortablement. Comment te sens-tu aujourd'hui ?`;
      setMessages([{ id: 'greet', role: 'assistant', content: greet }]);
      setExprName('smile'); targetExpr.current = { ...EXPRESSIONS.smile };
      setStarted(true);
      await startCamera();
      // L'avatar dit bonjour
      setTimeout(() => speak('greet', greet), 600);
    } catch { setError('Impossible de démarrer la consultation'); }
  }, [user, therapist, startCamera]);

  // ── Reconnaissance vocale ───────────────────────────────────────────────────
  const startRecording = useCallback(() => {
    setError('');
    if (window.speechSynthesis?.speaking) window.speechSynthesis.cancel();
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setForceText(true); return; }
    if (recognitionRef.current) { try { recognitionRef.current.abort(); } catch {} }
    const rec = new SR();
    rec.lang = 'fr-FR'; rec.continuous = true; rec.interimResults = true;
    rec.onstart = () => { setVState('recording'); setInterim(''); transcriptRef.current = ''; };
    rec.onresult = (e: any) => {
      let txt = ''; for (let i = 0; i < e.results.length; i++) txt += e.results[i][0].transcript;
      transcriptRef.current = txt; setInterim(txt);
    };
    rec.onerror = (e: any) => {
      if (e.error === 'not-allowed') { setError('🎤 Micro bloqué.'); setVState('idle'); }
      else if (e.error === 'network') {
        if (retryRef.current < 1) { retryRef.current++; setTimeout(() => startRecording(), 600); }
        else { retryRef.current = 0; setForceText(true); setVState('idle');
          setError('🌐 Micro réseau KO (fréquent sur Edge). Écris ton message ci-dessous.'); }
      }
    };
    rec.onend = () => {
      const text = transcriptRef.current.trim();
      setInterim('');
      if (text) { retryRef.current = 0; sendToTherapist(text); } else setVState('idle');
    };
    recognitionRef.current = rec;
    try { rec.start(); } catch { setVState('idle'); }
  }, []);

  const stopRecording = () => { try { recognitionRef.current?.stop(); } catch {} };

  // ── Envoyer au thérapeute ───────────────────────────────────────────────────
  const sendToTherapist = useCallback(async (text: string) => {
    if (!activeId) return;
    setVState('waiting'); setInterim('');
    targetExpr.current = { ...EXPRESSIONS.thinking }; setExprName('thinking');
    setMessages(prev => [...prev, { id: `u-${Date.now()}`, role: 'user', content: text }]);
    const isFirst = messages.filter(m => m.role === 'user').length === 0;

    try {
      const token = useAppStore.getState().accessToken;
      const resp = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/adah/sessions/${activeId}/chat`,
        { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ message: text, phase, videoMode: true }) });
      if (!resp.ok) throw new Error((await resp.json()).error || 'Erreur');
      const reader = resp.body!.getReader(); const dec = new TextDecoder();
      let buf = '', full = '';
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n'); buf = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try { const d = JSON.parse(line.slice(6)); if (d.text) full += d.text; if (d.error) throw new Error(d.error); } catch {}
        }
      }
      // Extraire l'expression [EXPRESSION:xxx]
      const exprMatch = full.match(/\[EXPRESSION:(\w+)\]/);
      const expr = exprMatch && EXPRESSIONS[exprMatch[1]] ? exprMatch[1] : PHASES[phase].defaultExpr;
      const cleanText = full.replace(/\[EXPRESSION:\w+\]/g, '').trim();

      setMessages(prev => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content: cleanText, expression: expr }]);

      // Progression phase
      exchangesInPhase.current++;
      if (exchangesInPhase.current >= 4 && phase < 3) {
        const n = phase + 1; setPhase(n); exchangesInPhase.current = 0;
        api.patch(`/adah/sessions/${activeId}`, { phaseIndex: n }).catch(() => {});
      }
      if (isFirst) api.post(`/adah/sessions/${activeId}/title`).catch(() => {});

      // Parler avec l'expression
      speak(`a-${Date.now()}`, cleanText, expr);
    } catch (e: any) {
      setVState('idle'); setError(e.message || 'Erreur de connexion');
      targetExpr.current = { ...EXPRESSIONS.neutral };
    }
  }, [activeId, messages, phase]);

  // ── Synthèse vocale + lip-sync + sous-titres ────────────────────────────────
  const speak = useCallback((_id: string, text: string, expr?: string) => {
    if (expr && EXPRESSIONS[expr]) { targetExpr.current = { ...EXPRESSIONS[expr] }; setExprName(expr); }
    if (!window.speechSynthesis) { setVState('idle'); return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/\*\*/g, ''));
    u.lang = 'fr-FR'; u.rate = 0.92; u.pitch = 1.0;
    const best = pickBestFrenchVoice(user?.aiAvatarGender);
    if (best) u.voice = best;

    u.onstart = () => { setVState('speaking'); setSubtitle(''); };
    u.onboundary = (ev: any) => {
      const rest = text.slice(ev.charIndex);
      const word = (rest.match(/^\S+/) || [''])[0];
      mouthTarget.current = estimateMouthOpen(word);
      setTimeout(() => { mouthTarget.current = 0.05; }, 180);
      // Sous-titre : phrase autour du mot
      setSubtitle(text.slice(0, ev.charIndex + word.length).split(/(?<=[.!?])\s/).pop() || word);
    };
    u.onend = () => { setVState('idle'); mouthTarget.current = 0; setSubtitle(''); };
    u.onerror = () => { setVState('idle'); mouthTarget.current = 0; };

    // Fallback lip-sync si onboundary absent
    let fallbackTimer: any = null;
    let supported = false;
    const origBoundary = u.onboundary;
    u.onboundary = (ev: any) => { supported = true; (origBoundary as any)(ev); };
    window.speechSynthesis.speak(u);
    setTimeout(() => {
      if (!supported && window.speechSynthesis.speaking) {
        fallbackTimer = setInterval(() => {
          mouthTarget.current = Math.sin(Date.now() * 0.008) * 0.4 + 0.4;
          if (!window.speechSynthesis.speaking) { clearInterval(fallbackTimer); mouthTarget.current = 0; }
        }, 60);
      }
    }, 400);
  }, [user?.aiAvatarGender]);

  const skipSpeech = () => { window.speechSynthesis?.cancel(); setVState('idle'); mouthTarget.current = 0; setSubtitle(''); };

  const handleMic = () => {
    if (vState === 'recording') stopRecording();
    else if (vState === 'speaking') skipSpeech();
    else if (vState === 'idle') startRecording();
  };

  const endSession = () => {
    window.speechSynthesis?.cancel();
    stopCamera();
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (activeId) api.patch(`/adah/sessions/${activeId}`, { duration: elapsed }).catch(() => {});
    onExit?.();
  };

  const fmtTime = (s: number) => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;

  // ── ÉCRAN D'ACCUEIL ─────────────────────────────────────────────────────────
  if (!started) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#0F1117] text-white p-6">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#534AB7] to-[#3B5BDB] flex items-center justify-center text-4xl mb-4">🎭</div>
        <h1 className="text-2xl font-black mb-2">Consultation vidéo TCC</h1>
        <p className="text-[#8892A4] text-sm mb-6 text-center max-w-sm">Une session guidée en 4 phases avec ton thérapeute virtuel. Il te voit, te parle et s'adapte à toi.</p>

        <div className="bg-[#1a1f2e] rounded-2xl p-5 mb-6 w-full max-w-sm">
          <p className="text-xs text-[#8892A4] font-bold uppercase mb-3">Ton thérapeute</p>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl" style={{ background: therapist.coat }}>
              {therapist.name === 'Dr. Amina' ? '👩‍⚕️' : '👨‍⚕️'}
            </div>
            <div>
              <p className="font-bold">{therapist.name}</p>
              <p className="text-xs text-[#8892A4]">Thérapeute TCC · spécialisé TDAH</p>
            </div>
          </div>
          <p className="text-xs text-[#8892A4] mt-3">💡 Pour changer (homme/femme), modifie ton avatar dans les réglages ADAH.</p>
        </div>

        <button onClick={startConsultation}
          className="bg-[#534AB7] hover:bg-[#453d9e] text-white font-black px-8 py-3.5 rounded-2xl transition-colors shadow-lg">
          🎥 Démarrer la consultation
        </button>
        {onExit && <button onClick={onExit} className="text-[#8892A4] text-sm mt-3 hover:text-white">← Retour</button>}
        {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
      </div>
    );
  }

  // ── INTERFACE VIDÉO ───────────────────────────────────────────────────────────
  const stateLabels: Record<VState, string> = {
    idle: '', recording: 'En écoute...', waiting: 'Réfléchit...', speaking: 'Répond...',
  };

  return (
    <div className="h-full flex flex-col bg-[#0F1117]">

      {/* Zone vidéo principale */}
      <div className="flex-1 relative flex items-center justify-center min-h-0">
        {/* Badge phase (haut gauche) */}
        <div className="absolute top-3 left-3 z-10">
          <span className="text-xs text-white font-bold px-3 py-1.5 rounded-full" style={{ background: '#534AB7' }}>
            Phase {phase + 1} · {PHASES[phase].label}
          </span>
        </div>
        {/* Timer (haut centre) */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 text-[#8892A4] text-sm">⏱ {fmtTime(elapsed)}</div>
        {/* État (haut droite) */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
          {vState !== 'idle' && <span className="w-2 h-2 bg-[#1D9E75] rounded-full animate-pulse" />}
          <span className="text-[#8892A4] text-sm">{stateLabels[vState]}</span>
        </div>

        {/* Barre progression phases */}
        <div className="absolute top-12 left-0 right-0 px-6 z-10">
          <div className="flex gap-1 max-w-md mx-auto">
            {PHASES.map((p, i) => (
              <div key={i} className="flex-1 h-1 rounded-full transition-colors"
                style={{ background: i <= phase ? '#534AB7' : 'rgba(255,255,255,0.1)' }} />
            ))}
          </div>
        </div>

        {/* Avatar canvas */}
        <canvas ref={canvasRef} width={480} height={360}
          className="max-w-full max-h-full rounded-2xl" style={{ width: 480, height: 360 }} />

        {/* Nom thérapeute */}
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-white text-sm font-medium">{therapist.name} — Thérapeute TCC</div>

        {/* Sous-titres */}
        {(subtitle || interim) && (
          <div className="absolute bottom-28 left-1/2 -translate-x-1/2 max-w-lg px-4">
            <div className="bg-black/60 text-white text-sm rounded-lg px-3 py-2 text-center">
              {interim ? <span className="italic text-[#8892A4]">{interim}</span> : subtitle}
            </div>
          </div>
        )}

        {/* Encart webcam PiP */}
        <div className="absolute bottom-4 right-4 w-40 h-28 rounded-xl overflow-hidden border-2 border-white/80 bg-[#3B5BDB] flex items-center justify-center">
          <video ref={videoRef} muted playsInline
            className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)', display: cameraOn ? 'block' : 'none' }} />
          {!cameraOn && (
            <div className="text-center">
              <div className="text-white font-black text-2xl">{user?.name?.slice(0,2).toUpperCase()}</div>
              <p className="text-white/70 text-xs mt-1">Caméra off</p>
            </div>
          )}
        </div>
      </div>

      {/* Bandeau émotion */}
      <div className="bg-[#0F1117] text-center py-1">
        <span className="text-xs" style={{
          color: exprName === 'encouraging' ? '#1D9E75' : exprName === 'empathetic' ? '#E879A6' : '#8892A4'
        }}>
          Thérapeute : {exprName === 'smile' ? 'souriant' : exprName === 'attentive' ? 'attentif' : exprName === 'encouraging' ? 'encourageant' : exprName === 'thinking' ? 'réfléchit' : exprName === 'empathetic' ? 'empathique' : 'neutre'}
        </span>
      </div>

      {/* Barre de contrôles */}
      <div className="bg-[#1a1f2e] px-4 py-3">
        {forceText ? (
          <div className="max-w-lg mx-auto">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs text-amber-400">⌨️ Mode texte — la réponse sera dite et jouée par l'avatar</p>
              <button onClick={() => { setForceText(false); setError(''); retryRef.current = 0; }}
                className="text-xs text-[#1D9E75] font-bold">🎙️ Réessayer le micro</button>
            </div>
            <div className="flex gap-2">
              <input value={textInput} onChange={e => setTextInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && textInput.trim()) { sendToTherapist(textInput.trim()); setTextInput(''); } }}
                placeholder="Écris ce que tu ressens..."
                className="flex-1 bg-[#0F1117] border border-[#2d3348] text-white rounded-xl px-3 py-2 text-sm outline-none focus:border-[#534AB7]" />
              <button onClick={() => { if (textInput.trim()) { sendToTherapist(textInput.trim()); setTextInput(''); } }}
                className="bg-[#534AB7] text-white font-bold px-4 rounded-xl">Envoyer</button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-3">
            <button onClick={handleMic} disabled={vState === 'waiting'}
              className={`w-14 h-14 rounded-full flex items-center justify-center text-xl transition-all disabled:opacity-40 ${
                vState === 'recording' ? 'bg-[#E24B4A] text-white animate-pulse-ring' : 'bg-white/10 hover:bg-white/20 text-white'
              }`}>
              {vState === 'recording' ? '⏹' : vState === 'speaking' ? '⏭' : '🎙️'}
            </button>
            <button onClick={() => cameraOn ? stopCamera() : startCamera()}
              className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-lg">
              {cameraOn ? '📷' : '🚫'}
            </button>
            <button onClick={() => setForceText(true)}
              className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-lg" title="Écrire">⌨️</button>
            {phase < 3 && (
              <button onClick={() => { const n = phase+1; setPhase(n); exchangesInPhase.current = 0; if(activeId) api.patch(`/adah/sessions/${activeId}`,{phaseIndex:n}).catch(()=>{}); }}
                className="px-3 h-12 rounded-full bg-white/10 hover:bg-white/20 text-[#8892A4] text-xs font-bold">Phase →</button>
            )}
            <button onClick={endSession}
              className="w-12 h-12 rounded-full bg-[#E24B4A] hover:bg-[#c93f3e] text-white flex items-center justify-center text-lg" title="Terminer">✕</button>
          </div>
        )}
        {error && <p className="text-red-400 text-xs text-center mt-2">{error}</p>}
      </div>

      <style>{`@keyframes pulse-ring { 0%{box-shadow:0 0 0 0 rgba(226,75,74,0.5)} 100%{box-shadow:0 0 0 14px rgba(226,75,74,0)} } .animate-pulse-ring{animation:pulse-ring 1.2s ease-out infinite}`}</style>
    </div>
  );
}
