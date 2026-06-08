/**
 * MapMembers.tsx — Page Carte Membres TDAH
 * Workflow expert TDAH complet (6 phases)
 *
 * Phase 1 — Découverte : carte immédiate, info claire, 0 friction
 * Phase 2 — Exploration : popup simple (photo · nom · distance · 2 actions)
 * Phase 3 — Connexion : messages suggérés anti-paralysie
 * Phase 4 — Rencontre : lieu Maptiler au mi-chemin, message pré-rempli
 * Phase 5 — Jour J : rappels, check-in, note post-rencontre + invitation cercle
 * Phase 6 — Fidélisation : membres cercle prioritaires 💜, stats positives
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import Map, { Marker, Popup, NavigationControl, GeolocateControl } from 'react-map-gl/maplibre';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useAppStore } from '../stores/useStore';
import { getSocket } from '../lib/socket';
import 'maplibre-gl/dist/maplibre-gl.css';

const MAPTILER_KEY = 'oer00nopMf2v9886mVRZ';
const MAP_STYLE = `https://api.maptiler.com/maps/pastel/style.json?key=${MAPTILER_KEY}`;

// ── Statuts personnalisés ─────────────────────────────────────────────────────
const STATUSES = [
  { value: 'DISPONIBLE',   emoji: '🟢', label: 'Disponible',          color: 'bg-green-400' },
  { value: 'FOCUS',        emoji: '🎧', label: 'Focus session',       color: 'bg-blue-400' },
  { value: 'CAFE',         emoji: '☕', label: 'Cherche un café',     color: 'bg-amber-400' },
  { value: 'BODY_DOUBLING',emoji: '👥', label: 'Body doubling',       color: 'bg-teal-400' },
  { value: 'SILENCIEUX',   emoji: '🤫', label: 'Mode silencieux',     color: 'bg-purple-400' },
  { value: 'HYPERFOCUS',   emoji: '🌊', label: 'Hyperfocus',          color: 'bg-indigo-400' },
  { value: 'ABSENT',       emoji: '🔕', label: 'Absent / Ne pas déranger', color: 'bg-gray-400' },
];

// Types de lieux TDAH-friendly
const PLACE_TYPES = [
  { value: 'CAFE',      emoji: '☕', label: 'Café calme',     color: '#f59e0b' },
  { value: 'LIBRARY',   emoji: '📚', label: 'Bibliothèque',   color: '#3b82f6' },
  { value: 'COWORKING', emoji: '💻', label: 'Coworking',      color: '#8b5cf6' },
  { value: 'PARK',      emoji: '🌳', label: 'Parc focus',     color: '#10b981' },
];

// ── Constantes ────────────────────────────────────────────────────────────────

const TDAH_TYPES = [
  { value: 'ALL',           label: 'Tous les profils' },
  { value: 'INATTENTIF',   label: '🌊 Inattentif'   },
  { value: 'HYPERACTIF',   label: '⚡ Hyperactif'   },
  { value: 'COMBINE',      label: '🌀 Combiné'      },
  { value: 'NON_SPECIFIE', label: '❓ Non spécifié' },
];

const TDAH_BORDER: Record<string, string> = {
  INATTENTIF:   'border-blue-400',
  HYPERACTIF:   'border-amber-400',
  COMBINE:      'border-purple-400',
  NON_SPECIFIE: 'border-gray-400',
};

const WORK_STYLE_LABEL: Record<string, string> = {
  SOCIAL:     '👥 Social',
  SILENCIEUX: '🤫 Silencieux',
  FLEXIBLE:   '🔀 Flexible',
};

const MEETING_TYPES = [
  { value: 'CAFE',      label: '☕ Café de travail' },
  { value: 'LIBRARY',   label: '📚 Bibliothèque'   },
  { value: 'COWORKING', label: '💻 Coworking'      },
  { value: 'OUTDOOR',   label: '🌳 Extérieur'      },
];

const MEETING_ICONS: Record<string, string> = {
  CAFE: '☕', LIBRARY: '📚', COWORKING: '💻', OUTDOOR: '🌳',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function midpoint(lat1: number, lng1: number, lat2: number, lng2: number) {
  return { lat: (lat1 + lat2) / 2, lng: (lng1 + lng2) / 2 };
}

// Suggestions de messages selon le profil — anti-paralysie TDAH
function getSuggestedMessages(name: string, workStyle?: string, tdahType?: string): string[] {
  const first = name.split(' ')[0];
  const typeLabel = tdahType === 'INATTENTIF' ? 'inattentif'
    : tdahType === 'HYPERACTIF' ? 'hyperactif'
    : tdahType === 'COMBINE' ? 'combiné' : 'TDAH';

  if (workStyle === 'SOCIAL') return [
    `Salut ${first} ! Tu sembles apprécier travailler avec du monde — moi aussi ! On essaie ensemble ? ☕`,
    `Hey ${first} ! Je cherche un partenaire de body doubling. Tu es souvent dispo ?`,
    `Bonjour ${first} ! On a le même profil — je serai ravi(e) de travailler à tes côtés 😊`,
  ];
  if (workStyle === 'SILENCIEUX') return [
    `Salut ${first} ! Session focus silencieuse ensemble ? Chacun sur son truc, mais en présence 🤫`,
    `Hey ${first} ! Tu aimes travailler en silence — pareil pour moi. On teste ça ?`,
    `Bonjour ${first} ! Une session concentrée sans se déranger ? Je suis partant(e) !`,
  ];
  return [
    `Salut ${first} ! On est tous les deux ${typeLabel}. Tu veux qu'on essaie de travailler ensemble ?`,
    `Hey ${first} ! Je cherche un partenaire TDAH pour rester concentré(e). Tu es dispo ?`,
    `Bonjour ${first} ! Body doubling ensemble — simple et sans pression 😊`,
  ];
}

// Recherche POI Maptiler (café/biblio) près d'un point
async function findPoiNear(lat: number, lng: number, type: string): Promise<string> {
  const query = type === 'LIBRARY' ? 'bibliothèque' : type === 'COWORKING' ? 'coworking' : 'café';
  try {
    const res = await fetch(
      `https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json?proximity=${lng},${lat}&limit=1&key=${MAPTILER_KEY}`
    );
    const data = await res.json();
    const feature = data.features?.[0];
    if (feature?.place_name) {
      return feature.place_name.split(',').slice(0, 2).join(',').trim();
    }
  } catch { /* fallback */ }
  return '';
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Member {
  id: string;
  name: string;
  avatar?: string;
  tdahType?: string;
  workStyle?: string;
  bio?: string;
  city?: string;
  lat: number;
  lng: number;
  isAvailable: boolean;
  status: string;
}

interface TdahPlace {
  id: string;
  name: string;
  type: string;
  lat: number;
  lng: number;
  address?: string;
  city?: string;
  isQuiet: boolean;
  hasWifi: boolean;
  tdahScore: number;
  validations: number;
  source?: string;
}

interface ChatMessage {
  id: string;
  fromId: string;
  content: string;
  createdAt: string;
}

interface Toast {
  id: string;
  type: 'message' | 'meeting_proposed' | 'meeting_accepted' | 'reminder';
  from: string;
  text: string;
  userObj?: any;
  proposalId?: string;
}

interface RatingModal {
  meeting: any;
  partnerName: string;
  partnerAvatar?: string;
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function MapMembers() {
  const user = useAppStore(s => s.user);
  const qc = useQueryClient();

  // Carte
  const [viewport, setViewport] = useState({ latitude: 31.63, longitude: -8.0, zoom: 12 });
  const [myPos, setMyPos] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [tdahFilter, setTdahFilter] = useState('ALL');

  // Chat
  const [chatOpen, setChatOpen]             = useState(false);
  const [chatUser, setChatUser]             = useState<Member | null>(null);
  const [chatMessages, setChatMessages]     = useState<ChatMessage[]>([]);
  const [msgInput, setMsgInput]             = useState('');
  const [showSuggestions, setShowSuggestions] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Rencontre
  const [meetModal, setMeetModal]           = useState(false);
  const [meetTarget, setMeetTarget]         = useState<Member | null>(null);
  const [meetType, setMeetType]             = useState('CAFE');
  const [meetDate, setMeetDate]             = useState('');
  const [meetLocation, setMeetLocation]     = useState('');
  const [meetMessage, setMeetMessage]       = useState('');
  const [suggestedPoi, setSuggestedPoi]     = useState('');
  const [poiLoading, setPoiLoading]         = useState(false);

  // Phase 5 — Note post-rencontre
  const [ratingModal, setRatingModal]       = useState<RatingModal | null>(null);
  const [ratingStars, setRatingStars]       = useState(0);
  const [addToCircle, setAddToCircle]       = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Feature 4 — Statut personnalisé
  const [myStatus,     setMyStatus]     = useState('DISPONIBLE');
  const [showStatusPicker, setShowStatusPicker] = useState(false);

  // Feature 5 — Lieux TDAH-friendly
  const [showPlaces,   setShowPlaces]   = useState(false);
  const [places,       setPlaces]       = useState<TdahPlace[]>([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<TdahPlace | null>(null);
  const [placeTypeFilter, setPlaceTypeFilter] = useState('ALL');

  // ── Phase 1 — Géolocalisation auto + suivi en temps réel ─────────────────
  useEffect(() => {
    if (!navigator.geolocation) {
      setMyPos({ lat: 31.63, lng: -8.0 });
      return;
    }

    const opts: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000,
    };

    const onSuccess = (pos: GeolocationPosition) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      setMyPos(prev => {
        // Centrer la carte seulement au premier chargement
        if (!prev) setViewport(v => ({ ...v, latitude: lat, longitude: lng, zoom: 13 }));
        return { lat, lng };
      });
      api.post('/map/location', { lat, lng }).catch(() => {});
    };

    const onError = () => setMyPos(prev => prev ?? { lat: 31.63, lng: -8.0 });

    // Première position rapide
    navigator.geolocation.getCurrentPosition(onSuccess, onError, opts);

    // Suivi continu (met à jour la position si l'utilisateur se déplace)
    const watchId = navigator.geolocation.watchPosition(onSuccess, onError, opts);

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // ── Phase 5 — Rappels de rencontre ────────────────────────────────────────
  const { data: pendingMeetings = [] } = useQuery({
    queryKey: ['meetings'],
    queryFn: () => api.get('/map/meetings').then(r => r.data),
    refetchInterval: 60000,
  });

  useEffect(() => {
    const now = new Date();
    pendingMeetings.forEach((m: any) => {
      if (m.status !== 'ACCEPTED') return;
      const meetDate = new Date(m.proposedAt);
      const diffMs = meetDate.getTime() - now.getTime();
      const diffH = diffMs / 3600000;

      // Rappel 1h avant
      if (diffH > 0 && diffH <= 1) {
        const partnerName = m.fromId === user?.id ? m.to?.name : m.from?.name;
        addToast({
          id: `remind-${m.id}`,
          type: 'reminder',
          from: '⏰ Rappel de rencontre',
          text: `Dans moins d'1h avec ${partnerName} · ${MEETING_ICONS[m.type] || '🤝'} ${m.location || ''}`,
        });
      }

      // Proposer la note si la rencontre est passée depuis moins de 48h
      if (diffMs < 0 && diffMs > -48 * 3600000 && m.status === 'ACCEPTED') {
        const partnerName = m.fromId === user?.id ? m.to?.name : m.from?.name;
        const partnerAvatar = m.fromId === user?.id ? m.to?.avatar : m.from?.avatar;
        setTimeout(() => {
          setRatingModal({ meeting: m, partnerName, partnerAvatar });
        }, 2000);
      }
    });
  }, [pendingMeetings]);

  // ── Socket.io ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const socket = getSocket();

    socket.on('message:new', (msg: any) => {
      if (chatUser?.id === msg.fromId) {
        setChatMessages(prev => [...prev, msg]);
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      } else {
        addToast({
          id: `msg-${Date.now()}`,
          type: 'message',
          from: msg.from?.name || '?',
          text: msg.content,
          userObj: msg.from,
        });
      }
    });

    socket.on('meeting:proposed', (p: any) => {
      const typeLabel = MEETING_TYPES.find(t => t.value === p.type)?.label || p.type;
      addToast({
        id: `meet-${Date.now()}`,
        type: 'meeting_proposed',
        proposalId: p.id,
        from: p.from?.name || '?',
        text: `${typeLabel} · ${new Date(p.proposedAt).toLocaleDateString('fr', { weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`,
        userObj: p.from,
      });
      qc.invalidateQueries({ queryKey: ['meetings'] });
    });

    socket.on('meeting:accepted', (d: any) => {
      addToast({
        id: `acc-${Date.now()}`,
        type: 'meeting_accepted',
        from: d.by?.name || '?',
        text: `a accepté ta rencontre ! 🎉 C'est confirmé.`,
      });
      qc.invalidateQueries({ queryKey: ['meetings'] });
    });

    socket.on('map:member_online',  () => qc.invalidateQueries({ queryKey: ['map-members'] }));
    socket.on('map:member_offline', () => qc.invalidateQueries({ queryKey: ['map-members'] }));

    return () => {
      socket.off('message:new');
      socket.off('meeting:proposed');
      socket.off('meeting:accepted');
      socket.off('map:member_online');
      socket.off('map:member_offline');
    };
  }, [chatUser]);

  function addToast(t: Toast) {
    setToasts(prev => [t, ...prev].slice(0, 4));
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== t.id)), 9000);
  }

  // ── Données ───────────────────────────────────────────────────────────────

  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ['map-members', tdahFilter],
    queryFn: () => api.get(`/map/members?tdahType=${tdahFilter}`).then(r => r.data),
    refetchInterval: 30000,
  });

  // Phase 6 — IDs du Cercle de Confiance
  const { data: circleData } = useQuery({
    queryKey: ['circle-ids'],
    queryFn: () => api.get('/map/circle-ids').then(r => r.data),
  });
  const circleIds: Set<string> = new Set(circleData?.ids || []);

  // Phase 6 — Stats positives
  const { data: mapStats } = useQuery({
    queryKey: ['map-stats'],
    queryFn: () => api.get('/map/stats').then(r => r.data),
  });

  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.get('/map/messages').then(r => r.data),
    refetchInterval: 15000,
  });

  // Phase 6 — Membres du cercle affichés en premier
  const sortedMembers = [...members].sort((a, b) => {
    const aInCircle = circleIds.has(a.id) ? -1 : 0;
    const bInCircle = circleIds.has(b.id) ? -1 : 0;
    return aInCircle - bInCircle;
  });

  const availableCount = members.filter(m => m.isAvailable).length;

  // ── Phase 3 — Chat ────────────────────────────────────────────────────────

  const openChat = async (member: Member) => {
    setChatUser(member);
    setChatOpen(true);
    setSelectedMember(null);
    setShowSuggestions(true);
    const res = await api.get(`/map/messages/${member.id}`);
    setChatMessages(res.data);
    if (res.data.length > 0) setShowSuggestions(false);
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const sendMessage = useMutation({
    mutationFn: (content: string) => api.post(`/map/messages/${chatUser!.id}`, { content }),
    onSuccess: (res) => {
      setChatMessages(prev => [...prev, res.data]);
      setMsgInput('');
      setShowSuggestions(false);
      qc.invalidateQueries({ queryKey: ['conversations'] });
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    },
  });

  const handleSend = (content?: string) => {
    const text = content ?? msgInput.trim();
    if (!text) return;
    sendMessage.mutate(text);
  };

  // ── Phase 4 — Rencontre ────────────────────────────────────────────────────

  const openMeetModal = useCallback(async (target: Member) => {
    setMeetTarget(target);
    setMeetType('CAFE');
    setMeetModal(true);
    setSelectedMember(null);

    // Message pré-rempli selon workStyle
    if (target.workStyle === 'SOCIAL') {
      setMeetMessage(`Salut ! Je cherche à faire du body doubling en vrai — on teste un café ? 😊`);
    } else if (target.workStyle === 'SILENCIEUX') {
      setMeetMessage(`Bonjour ! Session focus silencieuse en co-présence — chacun sur son projet mais ensemble.`);
    } else {
      setMeetMessage(`Bonjour ! On se retrouve pour travailler ensemble ? TDAH + TDAH = super équipe 💜`);
    }

    // Calcul mi-chemin + POI Maptiler
    if (myPos) {
      const dist = distanceKm(myPos.lat, myPos.lng, target.lat, target.lng).toFixed(1);
      const mp = midpoint(myPos.lat, myPos.lng, target.lat, target.lng);
      setSuggestedPoi(`Point médian (~${dist}km entre vous)`);
      setMeetLocation(`${target.city || 'Marrakech'} — à confirmer`);
      setPoiLoading(true);
      const poi = await findPoiNear(mp.lat, mp.lng, 'CAFE');
      setPoiLoading(false);
      if (poi) {
        setSuggestedPoi(poi);
        setMeetLocation(poi);
      }
    }
  }, [myPos]);

  const proposeMeeting = useMutation({
    mutationFn: () => api.post(`/map/meetings/${meetTarget!.id}`, {
      type: meetType,
      proposedAt: new Date(meetDate).toISOString(),
      location: meetLocation,
      message: meetMessage,
    }),
    onSuccess: () => {
      setMeetModal(false);
      setMeetDate(''); setMeetLocation(''); setMeetMessage(''); setSuggestedPoi('');
    },
  });

  const acceptMeeting = useMutation({
    mutationFn: (id: string) => api.post(`/map/meetings/${id}/accept`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meetings'] }),
  });

  const declineMeeting = useMutation({
    mutationFn: (id: string) => api.post(`/map/meetings/${id}/decline`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meetings'] }),
  });

  // Phase 5 — Note post-rencontre
  const rateMeeting = useMutation({
    mutationFn: () => api.post(`/map/meetings/${ratingModal!.meeting.id}/rate`, {
      rating: ratingStars,
      addToCircle,
    }),
    onSuccess: () => {
      setRatingModal(null);
      setRatingStars(0);
      setAddToCircle(false);
      qc.invalidateQueries({ queryKey: ['meetings', 'circle-ids', 'map-stats'] });
    },
  });

  const toggleVisibility = async () => {
    const next = !isVisible;
    setIsVisible(next);
    await api.patch('/map/visibility', { isVisible: next });
  };

  // ── Feature 4 : Changer mon statut ────────────────────────────────────────
  const changeStatus = async (status: string) => {
    setMyStatus(status);
    setShowStatusPicker(false);
    await api.patch('/map/status', { status });
    qc.invalidateQueries({ queryKey: ['map-members'] });
  };

  // Écouter les changements de statut des autres membres
  useEffect(() => {
    const socket = getSocket();
    socket.on('map:status_changed', () => {
      qc.invalidateQueries({ queryKey: ['map-members'] });
    });
    return () => { socket.off('map:status_changed'); };
  }, []);

  // ── Feature 5 : Charger les lieux TDAH-friendly ───────────────────────────
  const loadPlaces = useCallback(async () => {
    if (!myPos) return;
    setPlacesLoading(true);
    try {
      const res = await api.get(`/map/places?lat=${myPos.lat}&lng=${myPos.lng}`);
      const all = [...(res.data.community || []), ...(res.data.suggestions || [])];
      setPlaces(all);
    } catch { /* ignore */ }
    setPlacesLoading(false);
  }, [myPos]);

  const togglePlaces = async () => {
    if (!showPlaces && places.length === 0) await loadPlaces();
    setShowPlaces(v => !v);
  };

  const filteredPlaces = placeTypeFilter === 'ALL'
    ? places
    : places.filter(p => p.type === placeTypeFilter);

  const currentStatusConfig = STATUSES.find(s => s.value === myStatus) || STATUSES[0];

  // ── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full bg-slate-50 overflow-hidden">

      {/* ══ PANNEAU GAUCHE ══════════════════════════════════════════════════ */}
      <aside className="w-64 bg-white flex flex-col border-r border-slate-200 shrink-0 shadow-sm">

        {/* Phase 1 — En-tête clair, 1 info clé */}
        <div className="p-4 border-b border-slate-200">
          <h2 className="font-black text-slate-800 text-base">🗺️ Membres TDAH</h2>
          <p className="text-sm text-teal-400 font-bold mt-0.5">
            {availableCount > 0
              ? `${availableCount} membre${availableCount > 1 ? 's' : ''} TDAH près de toi aujourd'hui`
              : "Aucun membre visible pour l'instant"}
          </p>
        </div>

        {/* Visibilité */}
        <div className="px-4 py-3 border-b border-slate-200">
          <button onClick={toggleVisibility}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              isVisible
                ? 'bg-teal-600 text-white shadow-lg shadow-teal-900/40'
                : 'bg-slate-100 text-slate-500'
            }`}>
            <span className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isVisible ? 'bg-teal-300 animate-pulse' : 'bg-gray-500'}`} />
              {isVisible ? 'Visible sur la carte' : 'Caché'}
            </span>
            <span className="text-slate-600 text-xs">{isVisible ? 'Cacher' : 'Montrer'}</span>
          </button>
        </div>

        {/* Feature 4 — Mon statut personnalisé */}
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-xs text-slate-400 font-bold uppercase mb-2">Mon statut</p>
          <div className="relative">
            <button
              onClick={() => setShowStatusPicker(v => !v)}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white border-2 border-slate-200 hover:border-teal-400 transition-all text-left"
            >
              <span className="text-base">{currentStatusConfig.emoji}</span>
              <span className="text-sm font-semibold text-slate-700 flex-1">{currentStatusConfig.label}</span>
              <span className="text-slate-400 text-xs">▾</span>
            </button>

            <AnimatePresence>
              {showStatusPicker && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.97 }}
                  className="absolute left-0 right-0 top-12 bg-white border border-slate-200 rounded-2xl shadow-xl z-20 overflow-hidden"
                >
                  {STATUSES.map(s => (
                    <button key={s.value} onClick={() => changeStatus(s.value)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors text-left ${myStatus === s.value ? 'bg-teal-50 text-teal-700 font-bold' : 'text-slate-700'}`}
                    >
                      <span className="text-base">{s.emoji}</span>
                      <span>{s.label}</span>
                      {myStatus === s.value && <span className="ml-auto text-teal-500">✓</span>}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <p className="text-xs text-slate-400 mt-1.5">Expire automatiquement dans 4h</p>
        </div>

        {/* Filtre TDAH */}
        <div className="px-4 py-3 border-b border-slate-200">
          <p className="text-xs text-slate-400 font-bold uppercase mb-2">Profil TDAH</p>
          <div className="space-y-1">
            {TDAH_TYPES.map(t => (
              <button key={t.value} onClick={() => setTdahFilter(t.value)}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  tdahFilter === t.value ? 'bg-teal-700 text-white' : 'text-slate-500 hover:bg-slate-50'
                }`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Phase 5 — Rencontres à valider */}
        {pendingMeetings.filter((m: any) => m.toId === user?.id && m.status === 'PENDING').length > 0 && (
          <div className="px-4 py-3 border-b border-slate-200">
            <p className="text-xs text-slate-400 font-bold uppercase mb-2">🤝 Rencontres proposées</p>
            {pendingMeetings
              .filter((m: any) => m.toId === user?.id && m.status === 'PENDING')
              .map((m: any) => (
                <div key={m.id} className="bg-slate-50 rounded-xl p-3 mb-2 border border-slate-200">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 bg-teal-700 rounded-full overflow-hidden flex items-center justify-center text-white text-xs font-black shrink-0">
                      {m.from?.avatar
                        ? <img src={m.from.avatar} className="w-full h-full object-cover" />
                        : m.from?.name?.[0]}
                    </div>
                    <p className="text-xs font-bold text-slate-800">{m.from?.name}</p>
                  </div>
                  <p className="text-xs text-slate-500 mb-1">
                    {MEETING_TYPES.find(t => t.value === m.type)?.label} ·{' '}
                    {new Date(m.proposedAt).toLocaleDateString('fr', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {m.location && <p className="text-xs text-slate-400 mb-1 truncate">📍 {m.location}</p>}
                  {m.message && <p className="text-xs text-slate-500 italic mb-2 line-clamp-2">"{m.message}"</p>}
                  <div className="flex gap-1">
                    <button onClick={() => acceptMeeting.mutate(m.id)}
                      className="flex-1 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold py-1.5 rounded-lg">
                      ✓ Accepter
                    </button>
                    <button onClick={() => declineMeeting.mutate(m.id)}
                      className="flex-1 bg-slate-200 hover:bg-slate-200 text-slate-600 text-xs font-bold py-1.5 rounded-lg">
                      ✗
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <p className="text-xs text-slate-400 font-bold uppercase mb-2">💬 Messages</p>
          {conversations.length === 0
            ? (
              <div className="text-center py-6">
                <p className="text-2xl mb-2">👆</p>
                <p className="text-xs text-slate-400">Clique sur un avatar pour écrire</p>
              </div>
            )
            : conversations.map((c: any) => (
                <button key={c.user.id} onClick={() => openChat(c.user)}
                  className={`w-full flex items-center gap-2 p-2 rounded-xl mb-1 transition-colors text-left ${
                    chatUser?.id === c.user.id ? 'bg-slate-200' : 'hover:bg-slate-50'
                  }`}>
                  <div className="relative w-8 h-8 shrink-0">
                    <div className="w-8 h-8 bg-teal-700 rounded-full overflow-hidden flex items-center justify-center text-white text-xs font-black">
                      {c.user.avatar
                        ? <img src={c.user.avatar} alt={c.user.name} className="w-full h-full object-cover" />
                        : c.user.name?.[0]?.toUpperCase()}
                    </div>
                    {circleIds.has(c.user.id) && (
                      <span className="absolute -top-1 -right-1 text-xs">💜</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{c.user.name}</p>
                    <p className="text-xs text-slate-500 truncate">{c.lastMessage}</p>
                  </div>
                  {c.unread > 0 && (
                    <span className="bg-teal-500 text-white text-xs font-black w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                      {c.unread}
                    </span>
                  )}
                </button>
              ))
          }
        </div>

        {/* Phase 6 — Statistiques positives */}
        {mapStats && (
          <div className="px-4 py-3 border-t border-slate-200">
            <p className="text-xs text-slate-400 font-bold uppercase mb-2">✨ Tes connexions TDAH</p>
            <div className="grid grid-cols-3 gap-1 text-center">
              <div className="bg-slate-50 rounded-xl py-2">
                <p className="text-teal-400 font-black text-base">{mapStats.messagesSent}</p>
                <p className="text-slate-400 text-xs">messages</p>
              </div>
              <div className="bg-slate-50 rounded-xl py-2">
                <p className="text-teal-400 font-black text-base">{mapStats.meetingsConfirmed}</p>
                <p className="text-slate-400 text-xs">rencontres</p>
              </div>
              <div className="bg-slate-50 rounded-xl py-2">
                <p className="text-purple-400 font-black text-base">{mapStats.circleSize}</p>
                <p className="text-slate-400 text-xs">cercle 💜</p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* ══ CARTE ═══════════════════════════════════════════════════════════ */}
      <div className="flex-1 relative">
        <Map
          {...viewport}
          onMove={e => setViewport(e.viewState)}
          mapStyle={MAP_STYLE}
          style={{ width: '100%', height: '100%' }}
          onClick={() => setSelectedMember(null)}
        >
          <NavigationControl position="top-right" />
          <GeolocateControl position="top-right" trackUserLocation />

          {/* Feature 5 — Marqueurs lieux TDAH-friendly */}
          {showPlaces && filteredPlaces.map((place, i) => {
            const pt = PLACE_TYPES.find(p => p.value === place.type) || PLACE_TYPES[0];
            return (
              <Marker key={place.id || i} latitude={place.lat} longitude={place.lng}
                onClick={e => { e.originalEvent.stopPropagation(); setSelectedPlace(place); }}>
                <motion.div whileHover={{ scale: 1.2 }} className="cursor-pointer">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg border-2 border-white"
                    style={{ backgroundColor: pt.color }}>
                    <span className="text-base">{pt.emoji}</span>
                  </div>
                  {place.validations > 0 && (
                    <div className="absolute -top-1 -right-1 bg-white text-xs font-black text-slate-700 w-4 h-4 rounded-full flex items-center justify-center border border-slate-200 shadow-sm">
                      {place.validations}
                    </div>
                  )}
                </motion.div>
              </Marker>
            );
          })}

          {/* Popup lieu TDAH */}
          {selectedPlace && (
            <Popup
              latitude={selectedPlace.lat}
              longitude={selectedPlace.lng}
              onClose={() => setSelectedPlace(null)}
              closeButton={false}
              anchor="bottom"
              offset={[0, -44] as any}
              maxWidth="240px"
            >
              <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xl">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{PLACE_TYPES.find(p => p.value === selectedPlace.type)?.emoji}</span>
                  <div>
                    <p className="font-black text-slate-900 text-sm">{selectedPlace.name}</p>
                    <p className="text-xs text-slate-400">{selectedPlace.city || 'Lieu TDAH-friendly'}</p>
                  </div>
                </div>

                {/* Badges caractéristiques */}
                <div className="flex gap-1.5 flex-wrap mb-3">
                  {selectedPlace.isQuiet && (
                    <span className="bg-blue-50 text-blue-600 text-xs px-2 py-0.5 rounded-full font-medium">🤫 Calme</span>
                  )}
                  {selectedPlace.hasWifi && (
                    <span className="bg-green-50 text-green-600 text-xs px-2 py-0.5 rounded-full font-medium">📶 WiFi</span>
                  )}
                  {selectedPlace.tdahScore > 0 && (
                    <span className="bg-amber-50 text-amber-600 text-xs px-2 py-0.5 rounded-full font-medium">
                      ⭐ {selectedPlace.tdahScore.toFixed(1)}
                    </span>
                  )}
                  {selectedPlace.validations > 0 && (
                    <span className="bg-slate-50 text-slate-500 text-xs px-2 py-0.5 rounded-full">
                      {selectedPlace.validations} avis
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setMeetTarget(selectedMember || null);
                      setMeetLocation(selectedPlace.name);
                      setMeetType(selectedPlace.type === 'LIBRARY' ? 'LIBRARY' : selectedPlace.type === 'COWORKING' ? 'COWORKING' : selectedPlace.type === 'PARK' ? 'OUTDOOR' : 'CAFE');
                      setMeetModal(true);
                      setSelectedPlace(null);
                    }}
                    className="flex-1 bg-teal-500 hover:bg-teal-600 text-white text-xs font-bold py-2 rounded-xl transition-colors"
                  >
                    🤝 Proposer ici
                  </button>
                  <button
                    onClick={async () => {
                      await api.post(`/map/places/${selectedPlace.id}/validate`, { score: 5 });
                      setSelectedPlace(null);
                      await loadPlaces();
                    }}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2 rounded-xl transition-colors"
                  >
                    ✓ Valider
                  </button>
                </div>
              </div>
            </Popup>
          )}

          {/* Phase 2 + 6 — Marqueurs membres (cercle en premier, 💜 badge) */}
          {sortedMembers.map(member => {
            const inCircle = circleIds.has(member.id);
            const borderColor = inCircle ? 'border-purple-400' : (TDAH_BORDER[member.tdahType || ''] || 'border-gray-500');
            const isSelected = selectedMember?.id === member.id;

            return (
              <Marker
                key={member.id}
                latitude={member.lat}
                longitude={member.lng}
                onClick={e => {
                  e.originalEvent.stopPropagation();
                  setSelectedMember(isSelected ? null : member);
                  setChatOpen(false);
                }}
              >
                <motion.div whileHover={{ scale: 1.12 }} className="relative cursor-pointer">
                  {/* Feature 4 — Bulle de statut personnalisé */}
                  {member.status && member.status !== 'DISPONIBLE' && member.status !== 'ABSENT' && (
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap z-20 pointer-events-none">
                      <div className="bg-white border border-slate-200 shadow-md rounded-full px-2 py-0.5 flex items-center gap-1">
                        <span className="text-xs">{STATUSES.find(s => s.value === member.status)?.emoji}</span>
                        <span className="text-[9px] font-bold text-slate-600 max-w-[70px] truncate">
                          {STATUSES.find(s => s.value === member.status)?.label}
                        </span>
                      </div>
                      {/* Petite flèche */}
                      <div className="w-2 h-2 bg-white border-b border-r border-slate-200 rotate-45 mx-auto -mt-1" />
                    </div>
                  )}
                  {/* Badge cercle */}
                  {inCircle && (
                    <span className="absolute -top-2 -right-1 text-sm z-10">💜</span>
                  )}
                  <div className={`w-12 h-12 rounded-full border-[3px] overflow-hidden shadow-xl ${borderColor} ${
                    isSelected ? 'ring-2 ring-white ring-offset-1 ring-offset-white' : ''
                  }`}>
                    {member.avatar
                      ? <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                      : (
                        <div className="w-full h-full bg-teal-700 flex items-center justify-center text-white font-black text-lg">
                          {member.name[0].toUpperCase()}
                        </div>
                      )
                    }
                  </div>
                  {/* Disponibilité */}
                  <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${
                    member.isAvailable ? 'bg-teal-400' : 'bg-gray-500'
                  }`} />
                  {/* Prénom */}
                  <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none">
                    <span className="bg-white/90 text-slate-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {member.name.split(' ')[0]}
                      {inCircle ? ' 💜' : ''}
                    </span>
                  </div>
                </motion.div>
              </Marker>
            );
          })}

          {/* ── Marqueur "Moi" — position réelle de l'utilisateur connecté ── */}
          {myPos && user && (
            <Marker latitude={myPos.lat} longitude={myPos.lng} anchor="bottom">
              <div className="relative flex flex-col items-center">
                {/* Halo pulsant */}
                <div className="absolute w-16 h-16 rounded-full bg-teal-400/20 animate-ping" />
                <div className="absolute w-12 h-12 rounded-full bg-teal-400/30 animate-pulse" />
                {/* Avatar */}
                <div className="relative w-13 h-13 z-10">
                  <div className="w-13 h-13 w-12 h-12 rounded-full border-[3px] border-teal-400 overflow-hidden shadow-2xl shadow-teal-500/40">
                    {user.avatar
                      ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                      : (
                        <div className="w-full h-full bg-teal-600 flex items-center justify-center text-white font-black text-lg">
                          {user.name?.[0]?.toUpperCase()}
                        </div>
                      )
                    }
                  </div>
                  {/* Point vert disponible */}
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-teal-400 rounded-full border-2 border-white" />
                </div>
                {/* Label */}
                <div className="mt-1 whitespace-nowrap pointer-events-none">
                  <span className="bg-teal-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg">
                    📍 Moi
                  </span>
                </div>
              </div>
            </Marker>
          )}

          {/* Phase 2 — Popup profil (max 3 infos + 2 actions) */}
          {selectedMember && (
            <Popup
              latitude={selectedMember.lat}
              longitude={selectedMember.lng}
              onClose={() => setSelectedMember(null)}
              closeButton={false}
              anchor="bottom"
              offset={[0, -62] as any}
              maxWidth="280px"
            >
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xl">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-teal-500 shrink-0">
                    {selectedMember.avatar
                      ? <img src={selectedMember.avatar} alt={selectedMember.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full bg-teal-700 flex items-center justify-center text-white font-black text-xl">{selectedMember.name[0]}</div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="font-black text-slate-800 text-sm">{selectedMember.name}</p>
                      {circleIds.has(selectedMember.id) && <span className="text-sm">💜</span>}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">
                        {selectedMember.tdahType?.replace('_', ' ') || 'TDAH'}
                      </span>
                      {selectedMember.workStyle && (
                        <span className="bg-teal-900/60 text-teal-300 text-xs px-2 py-0.5 rounded-full">
                          {WORK_STYLE_LABEL[selectedMember.workStyle]}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`w-2 h-2 rounded-full ${selectedMember.isAvailable ? 'bg-teal-400 animate-pulse' : 'bg-gray-500'}`} />
                      <span className="text-xs text-slate-500">
                        {selectedMember.isAvailable ? 'Disponible' : 'Hors ligne'}
                      </span>
                      {myPos && (
                        <span className="ml-auto text-xs text-slate-400">
                          ~{distanceKm(myPos.lat, myPos.lng, selectedMember.lat, selectedMember.lng).toFixed(1)}km
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bio */}
                {selectedMember.bio && (
                  <p className="text-xs text-slate-500 italic mb-3 leading-relaxed bg-slate-100 rounded-xl px-3 py-2">
                    "{selectedMember.bio}"
                  </p>
                )}

                {/* 2 actions max — règle TDAH */}
                <div className="flex gap-2">
                  <button
                    onClick={() => openChat(selectedMember)}
                    className="flex-1 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold py-2.5 rounded-xl transition-colors"
                  >
                    ✉️ Message
                  </button>
                  <button
                    onClick={() => openMeetModal(selectedMember)}
                    className="flex-1 bg-slate-200 hover:bg-slate-200 text-slate-800 text-xs font-bold py-2.5 rounded-xl transition-colors"
                  >
                    🤝 Rencontre
                  </button>
                </div>
              </div>
            </Popup>
          )}
        </Map>

        {/* Feature 5 — Contrôles lieux TDAH */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          {/* Bouton toggle lieux */}
          <button onClick={togglePlaces}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold shadow-lg transition-all ${
              showPlaces ? 'bg-teal-500 text-white' : 'bg-white/95 text-slate-700 hover:bg-white'
            }`}>
            {placesLoading
              ? <div className="w-3 h-3 border-2 border-current/40 border-t-current rounded-full animate-spin" />
              : <span>📍</span>}
            Lieux TDAH-friendly
            {showPlaces && places.length > 0 && (
              <span className="bg-white/20 text-white text-xs px-1.5 rounded-full">{filteredPlaces.length}</span>
            )}
          </button>

          {/* Filtres par type de lieu */}
          <AnimatePresence>
            {showPlaces && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="flex flex-col gap-1"
              >
                <button onClick={() => setPlaceTypeFilter('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shadow transition-all ${placeTypeFilter === 'ALL' ? 'bg-slate-800 text-white' : 'bg-white/90 text-slate-600 hover:bg-white'}`}>
                  Tous les lieux
                </button>
                {PLACE_TYPES.map(pt => (
                  <button key={pt.value} onClick={() => setPlaceTypeFilter(pt.value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shadow transition-all ${
                      placeTypeFilter === pt.value ? 'text-white' : 'bg-white/90 text-slate-600 hover:bg-white'
                    }`}
                    style={placeTypeFilter === pt.value ? { backgroundColor: pt.color } : {}}>
                    {pt.emoji} {pt.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Légende */}
        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur rounded-xl px-3 py-2 flex flex-wrap gap-x-3 gap-y-1">
          <span className="flex items-center gap-1.5 text-xs text-slate-600"><span className="w-3 h-3 rounded-full border-2 border-blue-400 bg-white"/>Inattentif</span>
          <span className="flex items-center gap-1.5 text-xs text-slate-600"><span className="w-3 h-3 rounded-full border-2 border-amber-400 bg-white"/>Hyperactif</span>
          <span className="flex items-center gap-1.5 text-xs text-slate-600"><span className="w-3 h-3 rounded-full border-2 border-purple-400 bg-white"/>Combiné</span>
          <span className="text-xs text-slate-600">💜 Cercle</span>
          <span className="flex items-center gap-1.5 text-xs text-slate-500"><span className="w-2.5 h-2.5 rounded-full bg-teal-400"/>Disponible</span>
          <span className="text-xs text-slate-500">· Position ≈ ±3km</span>
        </div>
      </div>

      {/* ══ PANNEAU CHAT — Phase 3 ═══════════════════════════════════════════ */}
      <AnimatePresence>
        {chatOpen && chatUser && (
          <motion.div
            initial={{ x: 340 }} animate={{ x: 0 }} exit={{ x: 340 }}
            transition={{ type: 'spring', damping: 26 }}
            className="w-80 bg-white border-l border-slate-200 flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="w-10 h-10 bg-teal-700 rounded-full overflow-hidden flex items-center justify-center text-white font-black shrink-0">
                    {chatUser.avatar
                      ? <img src={chatUser.avatar} alt={chatUser.name} className="w-full h-full object-cover" />
                      : chatUser.name[0].toUpperCase()}
                  </div>
                  {circleIds.has(chatUser.id) && (
                    <span className="absolute -top-1 -right-1 text-xs">💜</span>
                  )}
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">{chatUser.name}</p>
                  <p className="text-xs text-slate-500">
                    {chatUser.workStyle ? WORK_STYLE_LABEL[chatUser.workStyle] : (chatUser.tdahType?.replace('_', ' ') || 'TDAH')}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openMeetModal(chatUser)} title="Proposer une rencontre"
                  className="text-slate-500 hover:text-teal-400 transition-colors text-xl">🤝</button>
                <button onClick={() => setChatOpen(false)} className="text-slate-500 hover:text-slate-900 text-xl">✕</button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {chatMessages.length === 0 && showSuggestions && (
                <div className="text-center pt-4 pb-2">
                  <p className="text-2xl mb-1">👋</p>
                  <p className="text-xs text-slate-500 font-semibold">Premier contact ?</p>
                  <p className="text-xs text-slate-400 mt-0.5">Choisis un message ou écris le tien</p>
                </div>
              )}
              {chatMessages.map(msg => (
                <div key={msg.id} className={`flex ${msg.fromId === user?.id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                    msg.fromId === user?.id
                      ? 'bg-teal-600 text-white rounded-br-sm'
                      : 'bg-slate-100 text-slate-700 rounded-bl-sm'
                  }`}>
                    <p>{msg.content}</p>
                    <p className="text-xs opacity-40 mt-0.5">
                      {new Date(msg.createdAt).toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Phase 3 — Messages suggérés anti-paralysie */}
            <AnimatePresence>
              {showSuggestions && chatMessages.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="border-t border-slate-200/50 px-3 pb-2"
                >
                  <p className="text-xs text-slate-400 font-bold uppercase pt-2 pb-1.5">💡 Messages suggérés</p>
                  <div className="space-y-1.5">
                    {getSuggestedMessages(chatUser.name, chatUser.workStyle, chatUser.tdahType).map((s, i) => (
                      <button key={i} onClick={() => handleSend(s)}
                        className="w-full text-left text-xs text-slate-600 bg-slate-50 hover:bg-teal-800/60 border border-slate-200 hover:border-teal-600 rounded-xl px-3 py-2 transition-colors leading-relaxed">
                        {s}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setShowSuggestions(false)}
                    className="text-xs text-slate-500 hover:text-slate-400 mt-2 w-full text-center">
                    Écrire mon propre message
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Zone de saisie */}
            <div className="p-3 border-t border-slate-200">
              <div className="flex gap-2">
                <input
                  value={msgInput}
                  onChange={e => { setMsgInput(e.target.value); if (e.target.value) setShowSuggestions(false); }}
                  onFocus={() => { if (!msgInput) setShowSuggestions(chatMessages.length === 0); }}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Écris un message... (Entrée pour envoyer)"
                  maxLength={280}
                  className="flex-1 bg-slate-100 text-slate-800 placeholder-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!msgInput.trim() || sendMessage.isPending}
                  className="bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white px-3 py-2 rounded-xl transition-colors"
                >
                  ➤
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ MODAL RENCONTRE — Phase 4 ════════════════════════════════════════ */}
      <AnimatePresence>
        {meetModal && meetTarget && (
          <motion.div
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setMeetModal(false)}
          >
            <motion.div
              className="bg-white rounded-2xl p-6 w-full max-w-sm border border-slate-200 shadow-2xl overflow-y-auto max-h-[90vh]"
              initial={{ scale: 0.94, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94 }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-teal-500 shrink-0">
                  {meetTarget.avatar
                    ? <img src={meetTarget.avatar} alt={meetTarget.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full bg-teal-700 flex items-center justify-center text-white font-black text-lg">{meetTarget.name[0]}</div>
                  }
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-lg leading-tight">Proposer une rencontre</h3>
                  <p className="text-slate-500 text-sm">avec <strong className="text-teal-400">{meetTarget.name}</strong></p>
                </div>
              </div>

              {/* Phase 4 — Type en 1 clic, pas de liste déroulante */}
              <p className="text-xs text-slate-500 font-bold uppercase mb-2">Où travailler ensemble ?</p>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {MEETING_TYPES.map(t => (
                  <button key={t.value}
                    onClick={async () => {
                      setMeetType(t.value);
                      if (myPos) {
                        setPoiLoading(true);
                        const mp = midpoint(myPos.lat, myPos.lng, meetTarget.lat, meetTarget.lng);
                        const poi = await findPoiNear(mp.lat, mp.lng, t.value);
                        setPoiLoading(false);
                        if (poi) { setSuggestedPoi(poi); setMeetLocation(poi); }
                      }
                    }}
                    className={`py-2.5 rounded-xl text-sm font-bold transition-colors ${
                      meetType === t.value ? 'bg-teal-600 text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Lieu suggéré Maptiler */}
              {(suggestedPoi || poiLoading) && (
                <div className="bg-teal-900/30 border border-teal-700/40 rounded-xl px-3 py-2 mb-3 flex items-center gap-2">
                  <span className="text-teal-400 shrink-0">📍</span>
                  <p className="text-xs text-teal-300">
                    {poiLoading ? "Recherche d'un lieu proche..." : suggestedPoi}
                  </p>
                </div>
              )}

              {/* Date */}
              <p className="text-xs text-slate-500 font-bold uppercase mb-2">Quand ?</p>
              <input type="datetime-local" value={meetDate} onChange={e => setMeetDate(e.target.value)}
                className="w-full bg-slate-100 text-slate-800 rounded-xl px-3 py-2.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-teal-500" />

              {/* Lieu modifiable */}
              <p className="text-xs text-slate-500 font-bold uppercase mb-2">Lieu</p>
              <input value={meetLocation} onChange={e => setMeetLocation(e.target.value)}
                placeholder="Café, bibliothèque, coworking..."
                className="w-full bg-slate-100 text-slate-800 placeholder-slate-300 rounded-xl px-3 py-2.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-teal-500" />

              {/* Message pré-rempli */}
              <p className="text-xs text-slate-500 font-bold uppercase mb-2">Message</p>
              <textarea value={meetMessage} onChange={e => setMeetMessage(e.target.value)}
                rows={2} maxLength={280}
                className="w-full bg-slate-100 text-slate-800 placeholder-slate-300 rounded-xl px-3 py-2.5 text-sm mb-5 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" />

              <button
                onClick={() => proposeMeeting.mutate()}
                disabled={!meetDate || proposeMeeting.isPending}
                className="w-full bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white font-black py-3.5 rounded-xl transition-colors text-base"
              >
                {proposeMeeting.isPending ? '⏳ Envoi...' : '🤝 Envoyer la proposition'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ MODAL NOTE POST-RENCONTRE — Phase 5 ════════════════════════════ */}
      <AnimatePresence>
        {ratingModal && (
          <motion.div
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-2xl p-6 w-full max-w-sm border border-slate-200 shadow-2xl"
              initial={{ scale: 0.94, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94 }}
            >
              <p className="text-2xl text-center mb-1">🎉</p>
              <h3 className="font-black text-slate-800 text-xl text-center mb-1">Comment s'est passée la rencontre ?</h3>
              <p className="text-slate-500 text-sm text-center mb-5">
                avec <strong className="text-teal-400">{ratingModal.partnerName}</strong>
              </p>

              {/* Étoiles */}
              <div className="flex justify-center gap-3 mb-5">
                {[1, 2, 3, 4, 5].map(star => (
                  <button key={star} onClick={() => setRatingStars(star)}
                    className={`text-4xl transition-transform hover:scale-110 ${
                      star <= ratingStars ? 'opacity-100' : 'opacity-30'
                    }`}>
                    ⭐
                  </button>
                ))}
              </div>

              {/* Phase 6 — Invitation Cercle */}
              {ratingStars >= 4 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-purple-900/30 border border-purple-700/40 rounded-xl p-4 mb-5"
                >
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={addToCircle} onChange={e => setAddToCircle(e.target.checked)}
                      className="mt-0.5 accent-purple-500 w-4 h-4" />
                    <div>
                      <p className="text-sm font-bold text-slate-800">💜 Ajouter à mon Cercle de Confiance</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {ratingModal.partnerName} apparaîtra en priorité sur ta carte pour les prochaines sessions
                      </p>
                    </div>
                  </label>
                </motion.div>
              )}

              <button
                onClick={() => rateMeeting.mutate()}
                disabled={ratingStars === 0 || rateMeeting.isPending}
                className="w-full bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white font-black py-3 rounded-xl transition-colors mb-2"
              >
                {rateMeeting.isPending ? '...' : addToCircle ? '💜 Valider & ajouter au Cercle' : '✓ Valider'}
              </button>
              <button onClick={() => setRatingModal(null)}
                className="w-full text-slate-400 text-sm py-2">
                Plus tard
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ TOASTS ══════════════════════════════════════════════════════════ */}
      <div className="fixed bottom-6 right-6 z-50 space-y-2 max-w-xs pointer-events-none">
        <AnimatePresence>
          {toasts.map(n => (
            <motion.div key={n.id}
              initial={{ opacity: 0, x: 80, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80, scale: 0.9 }}
              className={`border rounded-2xl p-4 shadow-2xl flex items-start gap-3 pointer-events-auto ${
                n.type === 'reminder'
                  ? 'bg-amber-900/90 border-amber-600'
                  : 'bg-white border-slate-200'
              }`}
            >
              <span className="text-2xl shrink-0">
                {n.type === 'message' ? '✉️' : n.type === 'meeting_accepted' ? '✅' : n.type === 'reminder' ? '⏰' : '🤝'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-slate-800 font-bold text-sm truncate">{n.from}</p>
                <p className="text-slate-600 text-xs mt-0.5 line-clamp-2">{n.text}</p>
                {n.type === 'message' && n.userObj && (
                  <button
                    onClick={() => { openChat(n.userObj); setToasts(p => p.filter(x => x.id !== n.id)); }}
                    className="text-teal-400 text-xs font-bold mt-1 hover:text-teal-300">
                    Répondre →
                  </button>
                )}
              </div>
              <button onClick={() => setToasts(p => p.filter(x => x.id !== n.id))}
                className="text-slate-400 hover:text-slate-900 text-xl leading-none shrink-0">×</button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
