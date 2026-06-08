/**
 * useColoredNoise.ts — Génère bruit blanc / rose / brun en temps réel
 * 100% WebAudio API natif — aucun fichier audio externe
 * Idéal TDAH : masque les distractions, réduit la voix intérieure
 */
import { useRef, useCallback, useEffect, useState } from 'react';

type NoiseColor = 'white' | 'pink' | 'brown';

export function useColoredNoise() {
  const ctxRef    = useRef<AudioContext | null>(null);
  const sourceRef = useRef<ScriptProcessorNode | null>(null);
  const gainRef   = useRef<GainNode | null>(null);
  const [activeColor, setActiveColor] = useState<NoiseColor | null>(null);

  const BUFFER_SIZE = 4096;

  const stopNoise = useCallback(() => {
    if (sourceRef.current) {
      try { sourceRef.current.disconnect(); } catch { /* ignore */ }
      sourceRef.current.onaudioprocess = null;
      sourceRef.current = null;
    }
    setActiveColor(null);
  }, []);

  const playNoise = useCallback((color: NoiseColor = 'white', volume = 0.5) => {
    stopNoise();
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!ctxRef.current) ctxRef.current = new AudioCtx();
    const ctx = ctxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    let lastBrown = 0;

    const processor = ctx.createScriptProcessor(BUFFER_SIZE, 1, 1);
    processor.onaudioprocess = (e) => {
      const out = e.outputBuffer.getChannelData(0);
      for (let i = 0; i < BUFFER_SIZE; i++) {
        const white = Math.random() * 2 - 1;
        if (color === 'white') {
          out[i] = white;
        } else if (color === 'pink') {
          // Voss-McCartney
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
          b6 = white * 0.115926;
        } else {
          // brown
          lastBrown = (lastBrown + (0.02 * white)) / 1.02;
          out[i] = lastBrown * 3.5;
        }
      }
    };

    const gain = ctx.createGain();
    gain.gain.value = volume;
    gainRef.current = gain;
    processor.connect(gain);
    gain.connect(ctx.destination);
    sourceRef.current = processor;
    setActiveColor(color);
  }, [stopNoise]);

  const setNoiseVolume = useCallback((val: number) => {
    if (gainRef.current) gainRef.current.gain.value = val;
  }, []);

  useEffect(() => () => {
    stopNoise();
    ctxRef.current?.close().catch(() => {});
  }, [stopNoise]);

  return { playNoise, stopNoise, setNoiseVolume, activeColor };
}
