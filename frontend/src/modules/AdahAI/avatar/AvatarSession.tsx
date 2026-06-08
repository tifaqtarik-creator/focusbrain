/**
 * AvatarSession.tsx — Session thérapeute IA multimodale
 * Avatar 3D parlant + caméra/émotion locale + voix + texte
 * L'IA adapte ses réponses à l'émotion détectée en temps réel
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TalkingAvatar from './TalkingAvatar';
import { DEFAULT_AVATARS } from './avatarConstants';
import { speakNatural, loadVoices } from './voiceUtils';
import { useEmotionDetection, Emotion } from './useEmotionDetection';
import { useAdahStore } from '../store/adahStore';
import { useAdahChat } from '../hooks/useAdahChat';
import { useAppStore } from '../../../stores/useStore';

// Voix selon préférence utilisateur
const VOICE_CONFIG: Record<string, { rate: number; pitch: number }> = {
  douce:     { rate: 0.92, pitch: 1.05 },
  posee:     { rate: 0.85, pitch: 0.95 },
  dynamique: { rate: 1.05, pitch: 1.1 },
};

const EMOTION_LABEL: Record<Emotion, { emoji: string; label: string }> = {
  calme:    { emoji: '😌', label: 'Calme' },
  anxieux:  { emoji: '😰', label: 'Anxieux' },
  joyeux:   { emoji: '😊', label: 'Joyeux' },
  triste:   { emoji: '😔', label: 'Triste' },
  frustré:  { emoji: '😤', label: 'Frustré' },
  neutre:   { emoji: '😐', label: 'Neutre' },
};

export default function AvatarSession({ onBack }: { onBack: () => void }) {
  const user = useAppStore(s => s.user);
  const { session, isStreaming } = useAdahStore();
  const { sendMessage, initSession } = useAdahChat();
  const emotion = useEmotionDetection();

  const [speaking, setSpeaking]   = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [textInput, setTextInput] = useState('');
  const [cameraOn, setCameraOn]   = useState(false);
  const [consentAsked, setConsentAsked] = useState(false);

  const videoRef    = useRef<HTMLVideoElement>(null);
  const recognitionRef = useRef<any>(null);
  const transcriptRef  = useRef('');
  const lastSpokenId   = useRef<string>('');

  const avatarUrl = user?.aiAvatarUrl
    || DEFAULT_AVATARS[(user?.aiAvatarGender as 'FEMME'|'HOMME') || 'FEMME'];
  const voiceCfg = VOICE_CONFIG[user?.aiVoicePref || 'douce'];

  // Démarrer une session au montage
  useEffect(() => {
    if (!session) initSession();
  }, []);

  // ── Synthèse vocale (TTS) — voix naturelle + lip-sync ──
  const speak = useCallback((text: string) => {
    speakNatural(text, {
      gender: user?.aiAvatarGender,
      rate: voiceCfg.rate + 0.13,   // un peu plus vif
      pitch: voiceCfg.pitch,
      onStart: () => setSpeaking(true),
      onEnd:   () => setSpeaking(false),
    });
  }, [voiceCfg, user?.aiAvatarGender]);

  // Faire parler l'avatar quand une nouvelle réponse arrive
  const msgs = session?.messages || [];
  const lastMsg = msgs[msgs.length - 1];
  useEffect(() => {
    if (lastMsg?.role === 'assistant' && !isStreaming && lastMsg.id !== lastSpokenId.current) {
      lastSpokenId.current = lastMsg.id;
      speak(lastMsg.content);
    }
  }, [lastMsg?.id, isStreaming, speak]);

  // ── Caméra (avec consentement RGPD) ──
  const enableCamera = async () => {
    if (videoRef.current) {
      await emotion.start(videoRef.current);
      setCameraOn(true);
    }
  };
  const disableCamera = () => { emotion.stop(); setCameraOn(false); };

  // ── Entrée vocale (robuste, sans bug de closure) ──
  const startListening = () => {
    if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); }
    // Nettoyer toute ancienne instance qui garderait le micro
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert('Reconnaissance vocale non supportée. Utilise Chrome ou Edge.'); return; }
    const rec = new SR();
    rec.lang = 'fr-FR'; rec.interimResults = true; rec.continuous = true;
    rec.onstart = () => { setListening(true); setTranscript(''); transcriptRef.current = ''; };
    rec.onresult = (e: any) => {
      let txt = '';
      for (let i = 0; i < e.results.length; i++) txt += e.results[i][0].transcript;
      transcriptRef.current = txt;
      setTranscript(txt);
    };
    rec.onend = () => {
      setListening(false);
      recognitionRef.current = null;
      const text = transcriptRef.current.trim();   // ← lit la vraie valeur
      if (text) sendWithEmotion(text);
    };
    rec.onerror = () => { setListening(false); recognitionRef.current = null; };
    recognitionRef.current = rec;
    try { rec.start(); } catch { setListening(false); }
  };

  // Envoyer un message en incluant le contexte émotionnel détecté
  const sendWithEmotion = (text: string) => {
    let enriched = text;
    if (cameraOn && emotion.state.confidence > 0.5) {
      // Contexte invisible pour l'IA (l'utilisateur ne le voit pas)
      enriched = `${text}\n\n[Contexte émotionnel détecté: l'utilisateur semble ${emotion.state.emotion}${emotion.state.attention < 0.5 ? ', et distrait' : ''}]`;
    }
    sendMessage(enriched);
    setTranscript('');
    setTextInput('');
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-teal-50 via-white to-purple-50">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <button onClick={() => { window.speechSynthesis?.cancel(); disableCamera(); onBack(); }}
          className="text-gray-400 hover:text-gray-600 flex items-center gap-1 text-sm font-medium">
          ← Retour
        </button>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-teal-400 rounded-full animate-pulse" />
          <span className="text-sm font-bold text-gray-700">Thérapeute IA vidéo</span>
        </div>
        {/* Émotion détectée (si caméra) */}
        {cameraOn && emotion.state.confidence > 0.4 ? (
          <span className="text-xs bg-white border border-gray-200 rounded-full px-2 py-1 font-medium">
            {EMOTION_LABEL[emotion.state.emotion].emoji} {EMOTION_LABEL[emotion.state.emotion].label}
          </span>
        ) : <div className="w-16" />}
      </div>

      {/* ── Avatar 3D (zone principale) ── */}
      <div className="flex-1 relative min-h-0">
        <TalkingAvatar
          url={avatarUrl}
          speaking={speaking}
          emotion={cameraOn ? emotion.state.emotion : (speaking ? 'calme' : 'neutre')}
        />

        {/* Vidéo caméra (PiP en bas à droite) — local uniquement */}
        <video ref={videoRef} muted playsInline
          className={`absolute bottom-4 right-4 w-24 h-18 rounded-xl object-cover border-2 border-white shadow-lg transition-opacity ${cameraOn ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          style={{ transform: 'scaleX(-1)' }}
        />

        {/* Dernière réponse en sous-titre */}
        {lastMsg?.role === 'assistant' && (
          <div className="absolute bottom-4 left-4 right-32 max-w-md">
            <div className="bg-white/90 backdrop-blur rounded-2xl px-4 py-3 shadow-lg">
              <p className="text-sm text-gray-800 leading-relaxed line-clamp-3">{lastMsg.content}</p>
            </div>
          </div>
        )}

        {/* Indicateur d'écoute */}
        {listening && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-teal-500 text-white text-sm font-bold px-4 py-2 rounded-full flex items-center gap-2">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            {transcript || 'Je t\'écoute...'}
          </div>
        )}
      </div>

      {/* ── Contrôles ── */}
      <div className="px-4 py-4 shrink-0 bg-white/80 backdrop-blur border-t border-gray-100">
        {/* Saisie texte */}
        <div className="flex gap-2 mb-3">
          <input
            value={textInput}
            onChange={e => setTextInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && textInput.trim()) sendWithEmotion(textInput); }}
            placeholder="Écris ou utilise le micro..."
            disabled={isStreaming}
            className="flex-1 bg-gray-50 border-2 border-gray-200 focus:border-teal-400 rounded-2xl px-4 py-3 text-sm outline-none"
          />
          <button onClick={() => textInput.trim() && sendWithEmotion(textInput)}
            disabled={!textInput.trim() || isStreaming}
            className="bg-teal-500 hover:bg-teal-600 disabled:opacity-40 text-white px-4 rounded-2xl">
            ➤
          </button>
        </div>

        {/* Boutons micro + caméra */}
        <div className="flex gap-3">
          <button onClick={listening ? () => recognitionRef.current?.stop() : startListening}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold transition-all ${
              listening ? 'bg-red-500 text-white' : 'bg-teal-500 text-white hover:bg-teal-600'
            }`}>
            {listening ? '⏹️ Stop' : '🎤 Parler'}
          </button>

          {!cameraOn ? (
            <button onClick={() => consentAsked ? enableCamera() : setConsentAsked(true)}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold bg-purple-100 text-purple-700 hover:bg-purple-200 transition-all">
              📹 {consentAsked ? 'Confirmer' : 'Activer caméra'}
            </button>
          ) : (
            <button onClick={disableCamera}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold bg-gray-200 text-gray-700 hover:bg-gray-300">
              📹 Couper caméra
            </button>
          )}
        </div>

        {/* Consentement caméra RGPD */}
        <AnimatePresence>
          {consentAsked && !cameraOn && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="mt-3 bg-purple-50 border border-purple-200 rounded-2xl p-3 text-xs text-purple-800">
              🔒 <strong>Ta vie privée est protégée.</strong> L'analyse de ton visage se fait
              <strong> uniquement dans ton navigateur</strong>. Aucune image n'est enregistrée ni envoyée.
              Tu peux couper la caméra à tout moment.
              <div className="flex gap-2 mt-2">
                <button onClick={enableCamera} className="flex-1 bg-purple-500 text-white font-bold py-2 rounded-xl text-xs">
                  ✓ J'accepte
                </button>
                <button onClick={() => setConsentAsked(false)} className="flex-1 bg-white text-purple-600 font-bold py-2 rounded-xl text-xs border border-purple-200">
                  Non merci
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {emotion.error && (
          <p className="text-xs text-amber-600 mt-2 text-center">{emotion.error}</p>
        )}

        <p className="text-center text-xs text-gray-300 mt-3">
          🔒 ADAH AI · Soutien TCC · Analyse 100% locale · Pas de diagnostic médical
        </p>
      </div>
    </div>
  );
}
