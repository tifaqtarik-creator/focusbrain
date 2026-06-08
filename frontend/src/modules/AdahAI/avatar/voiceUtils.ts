/**
 * voiceUtils.ts — Sélection de la MEILLEURE voix française disponible
 * Priorité aux voix neuronales/naturelles (pas robotiques)
 */

// Mots-clés des voix de qualité (naturelles) par ordre de préférence
const QUALITY_HINTS = [
  'natural',      // Microsoft Natural (Denise, Henri...) — les meilleures
  'neural',
  'google',       // Google français — très bonne
  'wavenet',
  'premium',
  'enhanced',
  'amélioré',
];

// Voix françaises connues de bonne qualité (noms exacts fréquents)
// Les "Online (Natural)" sont les voix neuronales d'Edge — excellentes
const PREFERRED_NAMES = [
  'Denise',       // Edge — femme naturelle
  'Vivienne',     // Edge — femme naturelle
  'Eloise',       // Edge — femme naturelle
  'Henri',        // Edge — homme naturel
  'Remy',         // Edge — homme naturel
  'Rémy',
  'Google français',
  'Amélie',       // macOS/iOS — voix douce
  'Thomas',       // macOS — voix masculine naturelle
  'Audrey',
];

let cachedVoices: SpeechSynthesisVoice[] = [];

export function loadVoices(): SpeechSynthesisVoice[] {
  if (!window.speechSynthesis) return [];
  cachedVoices = window.speechSynthesis.getVoices();
  return cachedVoices;
}

/**
 * Sélectionne la meilleure voix française.
 * @param gender 'FEMME' | 'HOMME' (préférence, non garantie)
 */
export function pickBestFrenchVoice(gender?: string): SpeechSynthesisVoice | null {
  const voices = cachedVoices.length ? cachedVoices : loadVoices();
  if (!voices.length) return null;

  // Toutes les voix françaises
  const french = voices.filter(v => v.lang?.toLowerCase().startsWith('fr'));
  if (!french.length) return voices[0] || null;

  // Filtre genre approximatif par nom
  const femaleNames = ['denise', 'vivienne', 'eloise', 'amélie', 'amelie', 'audrey', 'julie', 'marie', 'léa', 'lea', 'hortense', 'female', 'femme'];
  const maleNames   = ['henri', 'remy', 'rémy', 'thomas', 'paul', 'nicolas', 'alain', 'male', 'homme'];
  const wantMale = gender === 'HOMME';

  const matchesGender = (v: SpeechSynthesisVoice) => {
    const n = v.name.toLowerCase();
    if (wantMale)  return maleNames.some(m => n.includes(m));
    return femaleNames.some(f => n.includes(f));
  };

  // 1. Nom préféré + bon genre
  for (const pref of PREFERRED_NAMES) {
    const v = french.find(x => x.name.includes(pref) && matchesGender(x));
    if (v) return v;
  }
  // 2. Nom préféré (n'importe quel genre)
  for (const pref of PREFERRED_NAMES) {
    const v = french.find(x => x.name.includes(pref));
    if (v) return v;
  }
  // 3. Voix de qualité (natural/neural/google) + bon genre
  for (const hint of QUALITY_HINTS) {
    const v = french.find(x => x.name.toLowerCase().includes(hint) && matchesGender(x));
    if (v) return v;
  }
  // 4. Voix de qualité (n'importe quel genre)
  for (const hint of QUALITY_HINTS) {
    const v = french.find(x => x.name.toLowerCase().includes(hint));
    if (v) return v;
  }
  // 5. Voix en ligne (souvent meilleures que locales)
  const online = french.find(v => !v.localService);
  if (online) return online;

  // 6. Première voix fr-FR
  return french.find(v => v.lang === 'fr-FR') || french[0];
}

/**
 * Parle un texte avec la meilleure voix + réglages naturels.
 */
export function speakNatural(
  text: string,
  opts: { gender?: string; rate?: number; pitch?: number; onStart?: () => void; onEnd?: () => void } = {}
) {
  if (!window.speechSynthesis || !text) return;
  window.speechSynthesis.cancel();

  // Nettoyer le markdown + raccourcir les pauses
  const clean = text.replace(/\*\*/g, '').replace(/\n+/g, '. ').replace(/\s+/g, ' ').trim();

  const u = new SpeechSynthesisUtterance(clean);
  const voice = pickBestFrenchVoice(opts.gender);
  if (voice) { u.voice = voice; u.lang = voice.lang; }
  else u.lang = 'fr-FR';

  u.rate  = opts.rate  ?? 1.08;   // un peu plus rapide = moins "lent/robot"
  u.pitch = opts.pitch ?? 1.05;   // légèrement plus haut = plus chaleureux

  if (opts.onStart) u.onstart = opts.onStart;
  if (opts.onEnd) { u.onend = opts.onEnd; u.onerror = opts.onEnd; }

  window.speechSynthesis.speak(u);
}

export function stopSpeaking() {
  window.speechSynthesis?.cancel();
}
