/**
 * useVoiceSession.ts — Moteur vocal ROBUSTE (anti-blocage définitif)
 *
 * Stratégie radicale contre le micro qui se bloque :
 *  1. Pré-vérification du micro via getUserMedia (API fiable) AVANT la reconnaissance
 *  2. Lifecycle strict : abort + null + délai avant toute nouvelle instance
 *  3. Watchdog : si la reconnaissance ne démarre pas en 2.5s, on relance
 *  4. Auto-récupération sur fin/erreur inattendue
 *  5. Fonction reset() = bouton de secours pour tout débloquer
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { useAdahStore } from '../store/adahStore';
import { useAdahChat } from './useAdahChat';
import { speakNatural, loadVoices } from '../avatar/voiceUtils';
import { useAppStore } from '../../../stores/useStore';

export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking';

export function useVoiceSession() {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [error,      setError]      = useState<string | null>(null);
  const [micReady,   setMicReady]   = useState(false);

  const recognitionRef = useRef<any>(null);
  const transcriptRef  = useRef('');
  const voicesRef      = useRef<SpeechSynthesisVoice[]>([]);
  const watchdogRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wantListening  = useRef(false);   // intention de l'utilisateur
  const startedRef     = useRef(false);   // la reco a-t-elle démarré ?
  const { setVoiceActive } = useAdahStore();
  const { sendMessage } = useAdahChat();

  // ── Charger les voix TTS (asynchrone) ──────────────────────────────────────
  useEffect(() => {
    loadVoices();
    if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => { if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  const clearWatchdog = () => {
    if (watchdogRef.current) { clearTimeout(watchdogRef.current); watchdogRef.current = null; }
  };

  // ── Teardown total : libère TOUT proprement ────────────────────────────────
  const teardown = useCallback(() => {
    clearWatchdog();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.abort();
      } catch { /* ignore */ }
      recognitionRef.current = null;
    }
    startedRef.current = false;
  }, []);

  // ── 1. Pré-vérifier le micro avec getUserMedia (API la plus fiable) ────────
  const ensureMicPermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // On a la permission — on relâche immédiatement (la reco gère son propre micro)
      stream.getTracks().forEach(t => t.stop());
      setMicReady(true);
      return true;
    } catch (e: any) {
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        setError('🎤 Micro refusé. Clique sur 🔒 dans la barre d\'adresse → Microphone → Autoriser, puis recharge.');
      } else if (e.name === 'NotFoundError') {
        setError('🎤 Aucun micro détecté sur ton appareil.');
      } else {
        setError('🎤 Micro indisponible. Réessaie.');
      }
      setMicReady(false);
      return false;
    }
  }, []);

  // ── Créer + démarrer une reconnaissance neuve ──────────────────────────────
  const launchRecognition = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setError('Reconnaissance vocale non supportée. Utilise Chrome ou Edge.'); return; }

    teardown(); // garantit qu'aucune ancienne instance ne traîne

    const rec = new SR();
    rec.lang = 'fr-FR';
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      startedRef.current = true;
      clearWatchdog();
      setVoiceState('listening');
      setTranscript('');
      transcriptRef.current = '';
    };

    rec.onresult = (event: any) => {
      let txt = '';
      for (let i = 0; i < event.results.length; i++) txt += event.results[i][0].transcript;
      transcriptRef.current = txt;
      setTranscript(txt);
    };

    rec.onerror = (event: any) => {
      const e = event.error;
      clearWatchdog();
      if (e === 'not-allowed' || e === 'service-not-allowed') {
        setError('🎤 Micro bloqué. Clique 🔒 dans la barre d\'adresse → autorise le micro.');
        wantListening.current = false;
        setVoiceState('idle');
      } else if (e === 'network') {
        setError('🌐 La reconnaissance a besoin d\'internet.');
        setVoiceState('idle');
      } else if (e === 'no-speech') {
        // pas grave : on laisse onend gérer
      } else if (e !== 'aborted') {
        setError(`Erreur : ${e}`);
      }
    };

    rec.onend = async () => {
      const text = transcriptRef.current.trim();
      startedRef.current = false;

      // L'utilisateur veut toujours écouter mais la reco s'est arrêtée seule → on relance
      if (wantListening.current && !text) {
        try { rec.start(); return; } catch { /* on recrée plus bas */ }
        launchRecognition();
        return;
      }

      // Fin volontaire avec du texte → on envoie
      setVoiceActive(false);
      if (text) {
        wantListening.current = false;
        setVoiceState('processing');
        await sendMessage(text);
        setVoiceState('idle');
      } else {
        setVoiceState('idle');
      }
    };

    recognitionRef.current = rec;
    try {
      rec.start();
    } catch {
      // start a échoué → on retente une fois après nettoyage
      teardown();
      setTimeout(() => { if (wantListening.current) launchRecognition(); }, 300);
      return;
    }

    // Watchdog : si onstart ne se déclenche pas en 2.5s, la reco est bloquée → relance
    clearWatchdog();
    watchdogRef.current = setTimeout(() => {
      if (wantListening.current && !startedRef.current) {
        teardown();
        launchRecognition();
      }
    }, 2500);
  }, [teardown, sendMessage, setVoiceActive]);

  // ── Démarrer l'écoute (point d'entrée utilisateur) ─────────────────────────
  const startListening = useCallback(async () => {
    setError(null);
    if (window.speechSynthesis?.speaking) window.speechSynthesis.cancel();

    // 1. Vérifier le micro AVANT (évite 90% des blocages)
    const ok = await ensureMicPermission();
    if (!ok) { setVoiceState('idle'); return; }

    // 2. Lancer la reconnaissance
    wantListening.current = true;
    setVoiceActive(true);
    launchRecognition();
  }, [ensureMicPermission, launchRecognition, setVoiceActive]);

  // ── Arrêter l'écoute (et envoyer) ──────────────────────────────────────────
  const stopListening = useCallback(() => {
    wantListening.current = false;
    clearWatchdog();
    try { recognitionRef.current?.stop(); } catch { /* ignore */ }
  }, []);

  // ── RESET de secours : débloque tout ───────────────────────────────────────
  const reset = useCallback(() => {
    wantListening.current = false;
    teardown();
    window.speechSynthesis?.cancel();
    setVoiceState('idle');
    setTranscript('');
    transcriptRef.current = '';
    setError(null);
    setVoiceActive(false);
  }, [teardown, setVoiceActive]);

  // ── Synthèse vocale (TTS) — voix naturelle ────────────────────────────────
  const speak = useCallback((text: string) => {
    const gender = useAppStore.getState().user?.aiAvatarGender;
    speakNatural(text, {
      gender,
      onStart: () => setVoiceState('speaking'),
      onEnd:   () => setVoiceState('idle'),
    });
  }, []);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel();
    setVoiceState('idle');
  }, []);

  // Nettoyage au démontage
  useEffect(() => () => { teardown(); window.speechSynthesis?.cancel(); }, [teardown]);

  return { voiceState, transcript, error, micReady, startListening, stopListening, speak, stopSpeaking, reset };
}
