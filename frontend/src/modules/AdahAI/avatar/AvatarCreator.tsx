/**
 * AvatarCreator.tsx — Personnalisation du thérapeute IA
 * Étape 1 : choix rapide (genre + voix + style) — simple TDAH
 * Étape 2 : Ready Player Me iframe pour l'apparence détaillée (optionnel)
 */
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DEFAULT_AVATARS } from './avatarConstants';
import api from '../../../lib/api';
import { useAppStore } from '../../../stores/useStore';

const GENDERS = [
  { value: 'FEMME', emoji: '👩', label: 'Femme', defaultUrl: DEFAULT_AVATARS.FEMME },
  { value: 'HOMME', emoji: '👨', label: 'Homme', defaultUrl: DEFAULT_AVATARS.HOMME },
];

const VOICES = [
  { value: 'douce',     emoji: '🌸', label: 'Douce',     desc: 'Calme et rassurante' },
  { value: 'posee',     emoji: '🍃', label: 'Posée',     desc: 'Lente et claire' },
  { value: 'dynamique', emoji: '☀️', label: 'Dynamique', desc: 'Énergique et motivante' },
];

const STYLES = [
  { value: 'chaleureux', emoji: '💜', label: 'Chaleureux', desc: 'Bienveillant, validant' },
  { value: 'direct',     emoji: '🎯', label: 'Direct',     desc: 'Concret, orienté action' },
];

interface Props {
  onDone: () => void;
  onCancel?: () => void;
}

export default function AvatarCreator({ onDone, onCancel }: Props) {
  const user = useAppStore(s => s.user);
  const updateUser = useAppStore(s => s.updateUser);

  const [gender, setGender] = useState(user?.aiAvatarGender || 'FEMME');
  const [voice,  setVoice]  = useState(user?.aiVoicePref || 'douce');
  const [style,  setStyle]  = useState(user?.aiAvatarStyle || 'chaleureux');
  const [customUrl, setCustomUrl] = useState(user?.aiAvatarUrl || '');
  const [showRPM, setShowRPM] = useState(false);
  const [saving, setSaving]   = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // ── Écouter le retour de Ready Player Me (avatar créé) ──
  useEffect(() => {
    if (!showRPM) return;
    const handler = (event: MessageEvent) => {
      try {
        const json = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (json?.eventName === 'v1.avatar.exported') {
          setCustomUrl(json.data.url);
          setShowRPM(false);
        }
      } catch { /* ignore */ }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [showRPM]);

  const save = async () => {
    setSaving(true);
    const avatarUrl = customUrl || GENDERS.find(g => g.value === gender)?.defaultUrl || DEFAULT_AVATARS.FEMME;
    try {
      const res = await api.patch('/users/me', {
        aiAvatarUrl: avatarUrl,
        aiAvatarGender: gender,
        aiVoicePref: voice,
        aiAvatarStyle: style,
      });
      updateUser(res.data);
      onDone();
    } catch {
      setSaving(false);
    }
  };

  // ── Iframe Ready Player Me (apparence avancée) ──
  if (showRPM) {
    const rpmUrl = `https://focusbrain.readyplayer.me/avatar?frameApi&bodyType=halfbody&gender=${gender === 'FEMME' ? 'female' : 'male'}`;
    return (
      <div className="fixed inset-0 bg-white z-50 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <p className="font-black text-gray-900">🎨 Personnalise ton avatar</p>
          <button onClick={() => setShowRPM(false)} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
        </div>
        <iframe
          ref={iframeRef}
          src={rpmUrl}
          allow="camera *; microphone *"
          className="flex-1 w-full border-0"
          title="Ready Player Me"
        />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-5 py-8">
      <div className="text-center mb-8">
        <p className="text-4xl mb-2">🧠</p>
        <h1 className="text-2xl font-black text-gray-900">Crée ton thérapeute IA</h1>
        <p className="text-gray-500 text-sm mt-1">Choisis qui t'accompagnera dans tes sessions TCC</p>
      </div>

      {/* Genre */}
      <p className="text-xs font-bold text-gray-400 uppercase mb-2">Genre de l'avatar</p>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {GENDERS.map(g => (
          <button key={g.value} onClick={() => { setGender(g.value); setCustomUrl(''); }}
            className={`flex flex-col items-center gap-2 p-5 rounded-2xl border-2 transition-all ${
              gender === g.value ? 'border-teal-500 bg-teal-50 shadow-md' : 'border-gray-200 hover:border-teal-300'
            }`}>
            <span className="text-4xl">{g.emoji}</span>
            <span className="font-bold text-gray-800">{g.label}</span>
          </button>
        ))}
      </div>

      {/* Voix */}
      <p className="text-xs font-bold text-gray-400 uppercase mb-2">Type de voix</p>
      <div className="grid grid-cols-3 gap-2 mb-6">
        {VOICES.map(v => (
          <button key={v.value} onClick={() => setVoice(v.value)}
            className={`flex flex-col items-center gap-1 p-3 rounded-2xl border-2 transition-all ${
              voice === v.value ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-teal-300'
            }`}>
            <span className="text-2xl">{v.emoji}</span>
            <span className="font-bold text-gray-800 text-xs">{v.label}</span>
            <span className="text-gray-400 text-[10px] text-center leading-tight">{v.desc}</span>
          </button>
        ))}
      </div>

      {/* Style */}
      <p className="text-xs font-bold text-gray-400 uppercase mb-2">Style d'accompagnement</p>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {STYLES.map(s => (
          <button key={s.value} onClick={() => setStyle(s.value)}
            className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left ${
              style === s.value ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-teal-300'
            }`}>
            <span className="text-2xl">{s.emoji}</span>
            <div>
              <p className="font-bold text-gray-800 text-sm">{s.label}</p>
              <p className="text-gray-400 text-xs">{s.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Apparence avancée (optionnel) */}
      <button onClick={() => setShowRPM(true)}
        className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 hover:border-teal-400 text-gray-500 hover:text-teal-600 font-semibold py-3 rounded-2xl mb-6 transition-colors">
        🎨 Personnaliser l'apparence en détail
        <span className="text-xs text-gray-400">(optionnel)</span>
      </button>
      {customUrl && (
        <p className="text-xs text-teal-600 text-center mb-4">✓ Avatar personnalisé créé</p>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {onCancel && (
          <button onClick={onCancel}
            className="flex-1 border-2 border-gray-200 text-gray-600 font-bold py-3.5 rounded-2xl hover:bg-gray-50">
            Annuler
          </button>
        )}
        <button onClick={save} disabled={saving}
          className="flex-1 bg-gradient-to-r from-teal-500 to-teal-600 text-white font-black py-3.5 rounded-2xl hover:shadow-lg transition-all disabled:opacity-50">
          {saving ? '⏳ Création...' : '✅ Créer mon thérapeute'}
        </button>
      </div>
    </div>
  );
}
