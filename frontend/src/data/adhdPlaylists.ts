/**
 * adhdPlaylists.ts — Playlists Spotify vérifiées pour le TDAH
 * Jouées via embed Spotify (iframe) — aucune clé API ni Premium requis
 */
export interface Playlist {
  id: string;
  name: string;
  category: string;
  emoji: string;
  color: string;
  textColor: string;
  desc: string;
  tips: string;
  source?: 'spotify' | 'youtube';   // défaut: spotify
  spType?: 'playlist' | 'show';     // pour Spotify (défaut: playlist)
  ytType?: 'video' | 'playlist';    // pour YouTube
}

// ✅ Toutes ces playlists ont été VÉRIFIÉES opérationnelles (via Spotify oEmbed)
export const ADHD_PLAYLISTS: Playlist[] = [
  // ── BINAURAL / FRÉQUENCES ──
  { id: '7ftL8LIOYA1b82LO5or4gt', name: 'ADHD Focus 10h — Binaural Beats', category: 'binaural', emoji: '🎧', color: '#EEEDFE', textColor: '#3C3489', desc: '10h · Binaural beats concentration', tips: 'Utilise des écouteurs pour l\'effet binaural maximal' },
  { id: '2yAwq11ErrTShlmsqzPYyT', name: 'ADHD/TDAH Binaural Healing', category: 'binaural', emoji: '🌊', color: '#EEEDFE', textColor: '#3C3489', desc: 'Ondes cérébrales · fréquences', tips: 'Fréquences thérapeutiques pour TDAH' },
  { id: '0bYyp1TIV3R1A8w3zfYTPP', name: 'ADHD Focus Music 📚 Binaural', category: 'binaural', emoji: '🔮', color: '#EEEDFE', textColor: '#3C3489', desc: 'Binaural beats · vaste catalogue', tips: 'Vaste catalogue binaural curated' },
  { id: '764LW7IQ0rKCvy971W7cJI', name: '8D ADHD Music for Calmness', category: 'binaural', emoji: '🎵', color: '#EEEDFE', textColor: '#3C3489', desc: '8D Audio · MAJ régulière', tips: 'Son 8D : casque obligatoire' },

  // ── LO-FI / SANS PAROLES ──
  { id: '5AFvfDRxY3G4W3siZuVFgk', name: 'ADHD Chill Beats — No Lyrics', category: 'lofi', emoji: '🌿', color: '#E6F1FB', textColor: '#0C447C', desc: 'Lo-fi 2026 · très suivie', tips: 'La playlist lo-fi TDAH la plus suivie' },
  { id: '62rUlcPhrLl7emwGg9Ay2O', name: 'ADHD Lofi Focus 🐈‍⬛', category: 'lofi', emoji: '🐈', color: '#E6F1FB', textColor: '#0C447C', desc: 'Lo-fi · transitions douces', tips: 'Transitions douces entre titres' },
  { id: '5vZGF73NyIiJdofAj1HPdR', name: 'ADHD Focus (No Lyrics)', category: 'lofi', emoji: '🎯', color: '#E6F1FB', textColor: '#0C447C', desc: 'Downtempo & électronica', tips: 'Zéro paroles, zéro distraction' },

  // ── BRUITS COLORÉS (Spotify) ──
  { id: '4gx5r3lCzjZ5xwMRTFN4Uo', name: 'Brown Noise — ADHD Focus', category: 'noise', emoji: '🌫️', color: '#F1EFE8', textColor: '#444441', desc: 'Bruit brun · concentration', tips: 'Bruit brun : réduit la voix intérieure' },
  { id: '5RITPTEQSs8h2lw8kHv36G', name: 'White Noise — ADHD Focus', category: 'noise', emoji: '⬜', color: '#F1EFE8', textColor: '#444441', desc: 'Bruit blanc · masque distractions', tips: 'Bruit blanc : masque les sons extérieurs' },

  // ── STIMULANT / FLOW ──
  { id: '2RHfgparZ8PzI4tJnYtVof', name: 'ADHD Techno Focus', category: 'stimulant', emoji: '🔥', color: '#FAECE7', textColor: '#712B13', desc: 'Melodic Techno · House', tips: 'Cerveau TDAH = besoin de dopamine' },
  { id: '1baJnwkLI49ERTQpIq2iaw', name: 'ADHD Relief — Focus + Anti-anxiété', category: 'stimulant', emoji: '💪', color: '#FAECE7', textColor: '#712B13', desc: 'Anti-anxiété + productivité', tips: 'Pour les journées difficiles' },

  // ── NATURE / DEEP FOCUS ──
  { id: '37i9dQZF1DWZeKCadgRdKQ', name: 'Deep Focus', category: 'nature', emoji: '🌿', color: '#E1F5EE', textColor: '#085041', desc: 'Spotify Official · instrumental', tips: 'Playlist officielle concentration' },
  { id: '37i9dQZF1DWUKPeBypcpcP', name: 'Nature Noise', category: 'nature', emoji: '🍃', color: '#E1F5EE', textColor: '#085041', desc: 'Spotify Official · sons naturels', tips: 'Sons de la nature = baisse du cortisol' },

  // ── BAROQUE / CLASSIQUE (vérifiées) ──
  { id: '37i9dQZF1DWWEJlAGA9gs0', name: 'Classical Essentials', category: 'baroque', emoji: '🎻', color: '#FAEEDA', textColor: '#633806', desc: 'Spotify Official · classiques', tips: 'Structure classique = stabilité cognitive' },
  { id: '37i9dQZF1DX4sWSpwq3LiO', name: 'Peaceful Piano', category: 'baroque', emoji: '🎹', color: '#FAEEDA', textColor: '#633806', desc: 'Spotify Official · piano calme', tips: 'Piano doux : idéal tâches longues' },
  { id: '1h0CEZCm6IbFTbxThn6Xcs', name: 'Best Classical Music', category: 'baroque', emoji: '🎼', color: '#FAEEDA', textColor: '#633806', desc: 'Bach, Vivaldi, Mozart...', tips: '60-80 BPM : synchronise les ondes alpha' },

  // ── MÉDITATION (vérifiées) ──
  { id: '37i9dQZF1DWZqd5JICZI0u', name: 'Peaceful Meditation', category: 'meditation', emoji: '🔮', color: '#FBEAF0', textColor: '#72243E', desc: 'Spotify Official · méditation', tips: 'Apaise le mental hyperactif TDAH' },
  { id: '37i9dQZF1DX3Ogo9pFvBkY', name: 'Ambient Relaxation', category: 'meditation', emoji: '🧘', color: '#FBEAF0', textColor: '#72243E', desc: 'Spotify Official · ambient', tips: 'Drone ambient pour relâcher la pression' },

  // ── YOUTUBE FOCUS (streams 24/7 vérifiés) ──
  { id: 'jfKfPfyJRdk', source: 'youtube', ytType: 'video', name: 'Lofi Girl — Relax / Study 📚', category: 'youtube', emoji: '📚', color: '#FCE7E7', textColor: '#A11E1E', desc: '24/7 · le stream lofi culte', tips: 'Streaming continu, zéro paroles' },
  { id: 'DWcJFNfaw9c', source: 'youtube', ytType: 'video', name: 'Lofi — Sleep / Chill 💤', category: 'youtube', emoji: '💤', color: '#FCE7E7', textColor: '#A11E1E', desc: '24/7 · beats doux', tips: 'Pour décompresser ou tâches calmes' },
  { id: '4xDzrJKXOOY', source: 'youtube', ytType: 'video', name: 'Synthwave Radio 🌌', category: 'youtube', emoji: '🌌', color: '#FCE7E7', textColor: '#A11E1E', desc: '24/7 · chill / game', tips: 'Énergie rétro pour rester en mouvement' },
  { id: '1Tl2FtV06qo', source: 'youtube', ytType: 'video', name: 'Asian Lofi Radio ⛩️', category: 'youtube', emoji: '⛩️', color: '#FCE7E7', textColor: '#A11E1E', desc: '24/7 · ambiance zen', tips: 'Ambiance apaisante et focus' },

  // ── LIVRES AUDIO (YouTube + Spotify, vérifiés) ──
  { id: 'PLeQ0nkvBWQGJJDOjktFANLzlJYY93xZ9O', source: 'youtube', ytType: 'playlist', name: 'Dév. perso & mindfulness 📚', category: 'audiobook', emoji: '📚', color: '#F5ECD9', textColor: '#6B4E1E', desc: 'Playlist YouTube · self-help, philosophie', tips: 'Des dizaines de livres audio gratuits' },
  { id: 'PLo5MXA0repUfebw2goP89Gv3hhCkXHVHU', source: 'youtube', ytType: 'playlist', name: 'Livres audio dév. perso 📖', category: 'audiobook', emoji: '📖', color: '#F5ECD9', textColor: '#6B4E1E', desc: 'Playlist YouTube · croissance perso', tips: 'Idéal en marchant ou en tâche manuelle' },
  { id: 'BEJ6nwyIX-Q', source: 'youtube', ytType: 'video', name: 'Le dév. personnel pour débutants 🌱', category: 'audiobook', emoji: '🌱', color: '#F5ECD9', textColor: '#6B4E1E', desc: 'Livre audio complet (FR)', tips: 'Parfait pour démarrer en douceur' },
  { id: 'lC-khsSODNc', source: 'youtube', ytType: 'video', name: "L'Homme est le reflet de ses pensées 🧠", category: 'audiobook', emoji: '🧠', color: '#F5ECD9', textColor: '#6B4E1E', desc: 'James Allen · classique (FR)', tips: 'Court et inspirant' },
  { id: '44aSaxPurEgYrOvMn0e4kK', source: 'spotify', spType: 'show', name: 'Livre Audio Dév. Personnel 🎧', category: 'audiobook', emoji: '🎧', color: '#F5ECD9', textColor: '#6B4E1E', desc: 'Spotify · livres audio FR', tips: 'Écoute en streaming sur Spotify' },

  // ── PODCASTS TDAH (Spotify FR + EN, vérifiés) ──
  { id: '7I3h0zF1cjdEQBUu1FAd4h', source: 'spotify', spType: 'show', name: 'TDAH Café ☕', category: 'podcast', emoji: '☕', color: '#F0E9FB', textColor: '#4A2C82', desc: 'FR · soutien & compréhension', tips: 'Des voix qui comprennent ton quotidien' },
  { id: '19abUnu0hnalhbvxi38tIQ', source: 'spotify', spType: 'show', name: 'Chacun son TDAH 🗣️', category: 'podcast', emoji: '🗣️', color: '#F0E9FB', textColor: '#4A2C82', desc: 'FR · témoignages adultes', tips: "Tu n'es pas seul·e" },
  { id: '4sDHhR0Wh7vHN93ssPhm3n', source: 'spotify', spType: 'show', name: 'Ambitieusement TDAH 🚀', category: 'podcast', emoji: '🚀', color: '#F0E9FB', textColor: '#4A2C82', desc: 'FR · réussir avec le TDAH', tips: 'Transforme le TDAH en force' },
  { id: '0TwTwDE7ogBVVbahnRpQxQ', source: 'spotify', spType: 'show', name: 'Parlons TDAH 💬', category: 'podcast', emoji: '💬', color: '#F0E9FB', textColor: '#4A2C82', desc: 'FR · échanges TDAH', tips: 'Comprendre pour mieux avancer' },
  { id: '2fbdWINqMz3W6hYbWsNEfb', source: 'spotify', spType: 'show', name: 'TDAH et Parentalité 👪', category: 'podcast', emoji: '👪', color: '#F0E9FB', textColor: '#4A2C82', desc: 'FR · TDAH & famille', tips: 'Pour les parents (et enfants) TDAH' },
  { id: '5b3iAtsNp89qXNf7A5Br3s', source: 'spotify', spType: 'show', name: 'TDAH et Argent 💰', category: 'podcast', emoji: '💰', color: '#F0E9FB', textColor: '#4A2C82', desc: 'FR · gérer ses finances', tips: 'Mieux gérer son budget avec un cerveau TDAH' },
  { id: '7ytsXOHuiqvXWLyXWn3dWl', source: 'spotify', spType: 'show', name: 'Fière TDAH ✨', category: 'podcast', emoji: '✨', color: '#F0E9FB', textColor: '#4A2C82', desc: 'FR · vivre fièrement', tips: 'Assumer et célébrer sa neurodiversité' },
  { id: '75pbRLsX9ocLVFPSJZ66qM', source: 'spotify', spType: 'show', name: 'ADHD Experts — ADDitude 🎓', category: 'podcast', emoji: '🎓', color: '#F0E9FB', textColor: '#4A2C82', desc: 'EN · experts TDAH', tips: "Conseils d'experts reconnus" },
  { id: '1u5K8OxijCqoHbYLzlbsY0', source: 'spotify', spType: 'show', name: 'Taking Control: ADHD 🎯', category: 'podcast', emoji: '🎯', color: '#F0E9FB', textColor: '#4A2C82', desc: 'EN · stratégies pratiques', tips: 'Outils concrets au quotidien' },
  { id: '6QiXGYxZ254jeFso1cMABP', source: 'spotify', spType: 'show', name: 'All Things ADHD — CHADD 🧩', category: 'podcast', emoji: '🧩', color: '#F0E9FB', textColor: '#4A2C82', desc: 'EN · ressources TDAH', tips: 'La référence associative US' },
  { id: '2oYZwGakl7shJFG0lJ8JMt', source: 'spotify', spType: 'show', name: 'The ADHD Adults Podcast 😄', category: 'podcast', emoji: '😄', color: '#F0E9FB', textColor: '#4A2C82', desc: 'EN · TDAH adultes (humour)', tips: 'Sérieux mais drôle' },
];

export interface CategoryMeta { label: string; emoji: string; tip: string; color: string; textColor: string }

export const CATEGORIES: Record<string, CategoryMeta> = {
  binaural:   { label: 'Binaural & 8D',     emoji: '🎧', tip: 'Fréquences 4-40Hz — ondes cérébrales',         color: '#EEEDFE', textColor: '#3C3489' },
  lofi:       { label: 'Lo-Fi & No Lyrics', emoji: '🌿', tip: '0 paroles = 0 distraction linguistique',        color: '#E6F1FB', textColor: '#0C447C' },
  noise:      { label: 'Bruits colorés',    emoji: '🌫️', tip: 'Blanc, Rose, Brun — masque les distractions',  color: '#F1EFE8', textColor: '#444441' },
  stimulant:  { label: 'Stimulant / Flow',  emoji: '🔥', tip: 'Le cerveau TDAH a besoin de dopamine',          color: '#FAECE7', textColor: '#712B13' },
  nature:     { label: 'Sons naturels',     emoji: '🍃', tip: 'Sons de la nature = réduction du cortisol',     color: '#E1F5EE', textColor: '#085041' },
  baroque:    { label: 'Classique baroque', emoji: '🎻', tip: 'Bach/Vivaldi — structure cognitive',            color: '#FAEEDA', textColor: '#633806' },
  meditation: { label: 'Méditation',        emoji: '🔮', tip: 'Bols tibétains, fréquences solfège',            color: '#FBEAF0', textColor: '#72243E' },
  youtube:    { label: 'YouTube Focus',     emoji: '🎬', tip: 'Streams focus 24/7 (lofi, synthwave…)',         color: '#FCE7E7', textColor: '#A11E1E' },
  audiobook:  { label: 'Livres audio',      emoji: '📚', tip: 'Dév. perso & focus — YouTube + Spotify',        color: '#F5ECD9', textColor: '#6B4E1E' },
  podcast:    { label: 'Podcasts TDAH',     emoji: '🎙️', tip: 'Des voix qui comprennent le TDAH (FR/EN)',      color: '#F0E9FB', textColor: '#4A2C82' },
};
