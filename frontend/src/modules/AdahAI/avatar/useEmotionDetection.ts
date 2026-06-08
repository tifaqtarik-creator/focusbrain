/**
 * useEmotionDetection.ts — Analyse faciale 100% LOCALE (RGPD/CNDP)
 * face-api.js dans le navigateur · AUCUNE image envoyée ou stockée
 * Détecte : émotion dominante + niveau d'attention
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import * as faceapi from 'face-api.js';

// Modèles chargés depuis CDN (légers, ~2Mo)
const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';

export type Emotion = 'calme' | 'anxieux' | 'joyeux' | 'triste' | 'frustré' | 'neutre';

interface EmotionState {
  emotion: Emotion;
  attention: number;   // 0-1 : regarde l'écran ?
  confidence: number;
}

// Mapper les expressions face-api → émotions TDAH
function mapEmotion(expressions: faceapi.FaceExpressions): Emotion {
  const e = expressions as any;
  const sorted = Object.entries(e).sort(([, a]: any, [, b]: any) => b - a);
  const top = sorted[0][0];

  switch (top) {
    case 'happy':     return 'joyeux';
    case 'sad':       return 'triste';
    case 'angry':     return 'frustré';
    case 'fearful':   return 'anxieux';
    case 'disgusted': return 'frustré';
    case 'surprised': return 'anxieux';
    case 'neutral':   return e.neutral > 0.85 ? 'calme' : 'neutre';
    default:          return 'neutre';
  }
}

export function useEmotionDetection() {
  const [active, setActive]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [state, setState]     = useState<EmotionState>({ emotion: 'neutre', attention: 1, confidence: 0 });
  const [error, setError]     = useState<string | null>(null);

  const videoRef    = useRef<HTMLVideoElement | null>(null);
  const streamRef   = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const modelsLoaded = useRef(false);

  // Charger les modèles (une seule fois)
  const loadModels = useCallback(async () => {
    if (modelsLoaded.current) return true;
    setLoading(true);
    try {
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
      modelsLoaded.current = true;
      setLoading(false);
      return true;
    } catch (e) {
      setError('Impossible de charger les modèles d\'analyse');
      setLoading(false);
      return false;
    }
  }, []);

  // Démarrer la caméra + analyse
  const start = useCallback(async (videoEl: HTMLVideoElement) => {
    setError(null);
    const ok = await loadModels();
    if (!ok) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      videoRef.current = videoEl;
      videoEl.srcObject = stream;
      await videoEl.play();
      setActive(true);

      // Analyse toutes les 1.5s (léger pour le CPU)
      intervalRef.current = setInterval(async () => {
        if (!videoRef.current) return;
        const detection = await faceapi
          .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
          .withFaceExpressions();

        if (detection) {
          const emotion = mapEmotion(detection.expressions);
          // Attention : visage détecté + bien cadré = attentif
          const box = detection.detection.box;
          const centered = box.x > 20 && box.x < 220 ? 1 : 0.6;
          setState({
            emotion,
            attention: centered,
            confidence: detection.detection.score,
          });
        } else {
          // Pas de visage = distrait ou parti
          setState(s => ({ ...s, attention: 0, confidence: 0 }));
        }
      }, 1500);
    } catch (e: any) {
      if (e.name === 'NotAllowedError') setError('Caméra refusée. Tu peux continuer en mode texte/voix.');
      else setError('Caméra indisponible.');
    }
  }, [loadModels]);

  // Arrêter la caméra (libère le matériel)
  const stop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setActive(false);
    setState({ emotion: 'neutre', attention: 1, confidence: 0 });
  }, []);

  // Nettoyage au démontage
  useEffect(() => () => stop(), [stop]);

  return { active, loading, state, error, start, stop };
}
