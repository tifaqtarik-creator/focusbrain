/**
 * VoiceInterface.tsx — Interface vocale ADAH AI (Phase 2)
 * Web Speech API (natif) + fallback Deepgram Nova-3
 * Claude 3.5 Haiku → Cartesia / Web Speech TTS
 */
import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVoiceSession, VoiceState } from '../hooks/useVoiceSession';
import { useAdahStore } from '../store/adahStore';

const STATE_CONFIG: Record<VoiceState, { color: string; label: string; emoji: string; pulse: boolean }> = {
  idle:       { color: 'bg-gray-200',    label: 'Appuyer pour parler',    emoji: '🎤', pulse: false },
  listening:  { color: 'bg-teal-400',    label: 'Je t\'écoute... (tap pour envoyer)', emoji: '👂', pulse: true },
  processing: { color: 'bg-amber-400',   label: 'ADAH réfléchit...',      emoji: '🧠', pulse: true },
  speaking:   { color: 'bg-purple-400',  label: 'ADAH parle (tap = stop)',emoji: '🔊', pulse: true },
};

interface Props {
  onBack: () => void;
}

export default function VoiceInterface({ onBack }: Props) {
  const { session, isStreaming } = useAdahStore();
  const { voiceState, transcript, error, startListening, stopListening, speak, stopSpeaking, reset } = useVoiceSession();

  const config = STATE_CONFIG[voiceState];

  // Auto-speak quand une NOUVELLE réponse IA arrive (1 seule fois)
  const msgs    = session?.messages || [];
  const lastMsg = msgs[msgs.length - 1];
  const lastSpokenId = useRef('');
  const threadEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (lastMsg?.role === 'assistant' && !isStreaming && lastMsg.id !== lastSpokenId.current) {
      lastSpokenId.current = lastMsg.id;
      speak(lastMsg.content);
    }
  }, [lastMsg?.id, isStreaming, speak]);

  // Auto-scroll vers le dernier message
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs.length, voiceState]);

  const handleMainButton = () => {
    if (voiceState === 'speaking') {
      // ADAH parle → on l'interrompt ET on réécoute immédiatement (1 clic)
      stopSpeaking();
      startListening();
    } else if (voiceState === 'listening') {
      stopListening();   // envoie le message
    } else if (voiceState === 'idle') {
      startListening();
    }
    // 'processing' → on ignore (attendre la réponse)
  };

  return (
    <div className="flex flex-col items-center justify-between h-full py-8 px-6">

      {/* Header */}
      <div className="flex items-center justify-between w-full">
        <button onClick={onBack}
          className="text-gray-400 hover:text-gray-600 flex items-center gap-1 text-sm font-medium">
          ← Chat
        </button>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-teal-400 rounded-full animate-pulse" />
          <span className="text-sm font-bold text-gray-700">Mode vocal</span>
        </div>
        <div className="w-16" />
      </div>

      {/* Visualiseur vocal */}
      <div className="flex flex-col items-center gap-6">
        <motion.button
          onClick={handleMainButton}
          disabled={voiceState === 'processing'}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative focus:outline-none"
        >
          {/* Halo pulsant */}
          {config.pulse && (
            <>
              <span className={`absolute inset-0 rounded-full ${config.color} opacity-30 animate-ping`} />
              <span className={`absolute inset-0 rounded-full ${config.color} opacity-20 scale-110`} />
            </>
          )}
          {/* Bouton central */}
          <div className={`relative w-28 h-28 rounded-full ${config.color} flex items-center justify-center shadow-2xl transition-colors`}>
            <span className="text-5xl">{config.emoji}</span>
          </div>
        </motion.button>

        <p className="text-gray-600 font-semibold text-base">{config.label}</p>

        {/* Transcription temps réel */}
        <AnimatePresence>
          {transcript && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-teal-50 border border-teal-200 rounded-2xl px-5 py-3 max-w-xs text-center"
            >
              <p className="text-sm text-teal-800 italic">"{transcript}"</p>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <div className="text-center max-w-xs">
            <p className="text-red-500 text-sm mb-2">{error}</p>
            <button onClick={reset}
              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold px-4 py-2 rounded-xl transition-colors">
              🔄 Réinitialiser le micro
            </button>
          </div>
        )}

        {/* Bouton reset toujours accessible (petit, discret) */}
        {!error && voiceState !== 'idle' && (
          <button onClick={reset}
            className="text-xs text-gray-300 hover:text-gray-500 transition-colors">
            🔄 Réinitialiser
          </button>
        )}
      </div>

      {/* Conversation complète (scrollable) */}
      <div className="w-full max-w-md flex-shrink-0">
        <div className="bg-white/70 border border-gray-100 rounded-2xl shadow-sm max-h-48 overflow-y-auto p-3 space-y-2">
          {msgs.length === 0 ? (
            <p className="text-center text-xs text-gray-400 py-4">Ta conversation apparaîtra ici 💬</p>
          ) : (
            msgs.map((m, i) => (
              <div key={m.id || i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-teal-500 text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-700 rounded-bl-sm'
                }`}>
                  {m.role === 'assistant' && <span className="text-xs mr-1">🧠</span>}
                  {m.content}
                </div>
              </div>
            ))
          )}
          {/* Indicateur ADAH parle */}
          {voiceState === 'speaking' && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl px-3 py-2 flex gap-1 items-center">
                {[0,1,2].map(i => (
                  <span key={i} className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: `${i*0.12}s` }} />
                ))}
                <span className="text-xs text-gray-400 ml-1">ADAH parle...</span>
              </div>
            </div>
          )}
          <div ref={threadEndRef} />
        </div>

        <p className="text-center text-xs text-gray-300 mt-3">
          🔒 ADAH AI · Soutien TCC · Pas de diagnostic médical
        </p>
      </div>
    </div>
  );
}
