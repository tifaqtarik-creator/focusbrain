import { useState, useEffect, useCallback, useRef } from 'react';
import Map, { Marker, Popup, NavigationControl, GeolocateControl } from 'react-map-gl/maplibre';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useAppStore } from '../stores/useStore';
import { getSocket } from '../lib/socket';
import 'maplibre-gl/dist/maplibre-gl.css';

const MAPTILER_KEY = 'oer00nopMf2v9886mVRZ';
const MAP_STYLE = `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${MAPTILER_KEY}`;

const TDAH_TYPES = [
  { value: 'ALL', label: 'Tous les profils' },
  { value: 'INATTENTIF', label: 'Inattentif' },
  { value: 'HYPERACTIF', label: 'Hyperactif' },
  { value: 'COMBINE', label: 'Combiné' },
];

const MEETING_TYPES = [
  { value: 'CAFE', label: '☕ Café de travail' },
  { value: 'LIBRARY', label: '📚 Bibliothèque' },
  { value: 'COWORKING', label: '💻 Coworking' },
  { value: 'OUTDOOR', label: '🌳 Extérieur' },
];

interface Member {
  id: string;
  name: string;
  avatar?: string;
  tdahType?: string;
  city?: string;
  lat: number;
  lng: number;
  isAvailable: boolean;
}

interface ChatMessage {
  id: string;
  fromId: string;
  content: string;
  createdAt: string;
}

export default function MapMembers() {
  const user = useAppStore(s => s.user);
  const qc = useQueryClient();

  // État carte
  const [viewport, setViewport] = useState({ latitude: 31.63, longitude: -8.0, zoom: 11 });
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [tdahFilter, setTdahFilter] = useState('ALL');

  // État chat
  const [chatOpen, setChatOpen]       = useState(false);
  const [chatUser, setChatUser]       = useState<Member | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [msgInput, setMsgInput]       = useState('');
  const [typing, setTyping]           = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // État rencontre
  const [meetModal, setMeetModal]     = useState(false);
  const [meetTarget, setMeetTarget]   = useState<Member | null>(null);
  const [meetType, setMeetType]       = useState('CAFE');
  const [meetDate, setMeetDate]       = useState('');
  const [meetLocation, setMeetLocation] = useState('');
  const [meetMessage, setMeetMessage] = useState('');

  // Notifications
  const [notifications, setNotifications] = useState<any[]>([]);

  // ── Géolocalisation ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude: lat, longitude: lng } = pos.coords;
      setViewport(v => ({ ...v, latitude: lat, longitude: lng }));
      api.post('/map/location', { lat, lng }).catch(() => {});
    });
  }, []);

  // ── Socket.io ────────────────────────────────────────────────────────────
  useEffect(() => {
    const socket = getSocket();

    socket.on('message:new', (msg: any) => {
      if (chatUser?.id === msg.fromId) {
        setChatMessages(prev => [...prev, msg]);
      } else {
        addNotification({
          id: Date.now().toString(),
          type: 'message',
          from: msg.from?.name,
          text: msg.content,
          userId: msg.fromId,
          userObj: msg.from,
        });
      }
    });

    socket.on('meeting:proposed', (proposal: any) => {
      addNotification({
        id: Date.now().toString(),
        type: 'meeting_proposed',
        proposalId: proposal.id,
        from: proposal.from?.name,
        text: `Rencontre ${MEETING_TYPES.find(t => t.value === proposal.type)?.label} le ${new Date(proposal.proposedAt).toLocaleDateString('fr')}`,
        fromObj: proposal.from,
      });
    });

    socket.on('meeting:accepted', (data: any) => {
      addNotification({
        id: Date.now().toString(),
        type: 'meeting_accepted',
        from: data.by?.name,
        text: `a accepté ta rencontre !`,
      });
    });

    socket.on('map:member_online', () => qc.invalidateQueries({ queryKey: ['map-members'] }));
    socket.on('map:member_offline', () => qc.invalidateQueries({ queryKey: ['map-members'] }));

    return () => {
      socket.off('message:new');
      socket.off('meeting:proposed');
      socket.off('meeting:accepted');
      socket.off('map:member_online');
      socket.off('map:member_offline');
    };
  }, [chatUser]);

  function addNotification(n: any) {
    setNotifications(prev => [n, ...prev].slice(0, 4));
    setTimeout(() => setNotifications(prev => prev.filter(x => x.id !== n.id)), 8000);
  }

  // ── Membres ───────────────────────────────────────────────────────────────
  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ['map-members', tdahFilter],
    queryFn: () => api.get(`/map/members?tdahType=${tdahFilter}`).then(r => r.data),
    refetchInterval: 30000,
  });

  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.get('/map/messages').then(r => r.data),
    refetchInterval: 15000,
  });

  const { data: pendingMeetings = [] } = useQuery({
    queryKey: ['meetings'],
    queryFn: () => api.get('/map/meetings').then(r => r.data),
    refetchInterval: 30000,
  });

  // ── Chat ──────────────────────────────────────────────────────────────────
  const openChat = async (member: Member) => {
    setChatUser(member);
    setChatOpen(true);
    setSelectedMember(null);
    const res = await api.get(`/map/messages/${member.id}`);
    setChatMessages(res.data);
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const sendMessage = useMutation({
    mutationFn: () => api.post(`/map/messages/${chatUser!.id}`, { content: msgInput }),
    onSuccess: (res) => {
      setChatMessages(prev => [...prev, res.data]);
      setMsgInput('');
      qc.invalidateQueries({ queryKey: ['conversations'] });
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    },
  });

  // ── Rencontre ─────────────────────────────────────────────────────────────
  const proposeMeeting = useMutation({
    mutationFn: () => api.post(`/map/meetings/${meetTarget!.id}`, {
      type: meetType,
      proposedAt: new Date(meetDate).toISOString(),
      location: meetLocation,
      message: meetMessage,
    }),
    onSuccess: () => {
      setMeetModal(false);
      setMeetDate(''); setMeetLocation(''); setMeetMessage('');
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

  // Masquer/montrer
  const toggleVisibility = async () => {
    const next = !isVisible;
    setIsVisible(next);
    await api.patch('/map/visibility', { isVisible: next });
  };

  return (
    <div className="flex h-full bg-gray-900 overflow-hidden">

      {/* ── PANNEAU GAUCHE — Filtres + Conversations ────────────────────────── */}
      <aside className="w-64 bg-gray-800 flex flex-col border-r border-gray-700 shrink-0">
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <h2 className="font-black text-white text-base">🗺️ Membres TDAH</h2>
          <p className="text-xs text-gray-400 mt-0.5">{members.length} visible{members.length > 1 ? 's' : ''} près de toi</p>
        </div>

        {/* Visibilité */}
        <div className="px-4 py-3 border-b border-gray-700">
          <button onClick={toggleVisibility}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
              isVisible ? 'bg-teal-600 text-white' : 'bg-gray-700 text-gray-400'
            }`}>
            <span>{isVisible ? '● Visible sur la carte' : '○ Caché'}</span>
            <span>{isVisible ? 'Cacher' : 'Montrer'}</span>
          </button>
        </div>

        {/* Filtres TDAH */}
        <div className="px-4 py-3 border-b border-gray-700">
          <p className="text-xs text-gray-400 font-bold uppercase mb-2">Profil TDAH</p>
          <div className="space-y-1">
            {TDAH_TYPES.map(t => (
              <button key={t.value} onClick={() => setTdahFilter(t.value)}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  tdahFilter === t.value ? 'bg-teal-600 text-white' : 'text-gray-400 hover:bg-gray-700'
                }`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Rencontres en attente */}
        {pendingMeetings.filter((m: any) => m.toId === user?.id && m.status === 'PENDING').length > 0 && (
          <div className="px-4 py-3 border-b border-gray-700">
            <p className="text-xs text-gray-400 font-bold uppercase mb-2">🤝 Rencontres proposées</p>
            {pendingMeetings
              .filter((m: any) => m.toId === user?.id && m.status === 'PENDING')
              .map((m: any) => (
                <div key={m.id} className="bg-gray-700 rounded-xl p-3 mb-2">
                  <p className="text-xs font-bold text-white mb-0.5">{m.from?.name}</p>
                  <p className="text-xs text-gray-400">
                    {MEETING_TYPES.find(t => t.value === m.type)?.label}<br />
                    {new Date(m.proposedAt).toLocaleDateString('fr', { weekday: 'short', day: 'numeric', month: 'short' })}
                    {m.location && ` · ${m.location}`}
                  </p>
                  <div className="flex gap-1 mt-2">
                    <button onClick={() => acceptMeeting.mutate(m.id)}
                      className="flex-1 bg-teal-600 text-white text-xs font-bold py-1 rounded-lg hover:bg-teal-500">
                      ✓ Accepter
                    </button>
                    <button onClick={() => declineMeeting.mutate(m.id)}
                      className="flex-1 bg-gray-600 text-gray-300 text-xs font-bold py-1 rounded-lg hover:bg-gray-500">
                      ✗ Refuser
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <p className="text-xs text-gray-400 font-bold uppercase mb-2">💬 Messages</p>
          {conversations.length === 0
            ? <p className="text-xs text-gray-500 italic">Aucune conversation</p>
            : conversations.map((c: any) => (
                <button key={c.user.id} onClick={() => openChat(c.user)}
                  className={`w-full flex items-center gap-2 p-2 rounded-xl mb-1 transition-colors text-left ${
                    chatUser?.id === c.user.id ? 'bg-gray-600' : 'hover:bg-gray-700'
                  }`}>
                  <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0">
                    {c.user.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">{c.user.name}</p>
                    <p className="text-xs text-gray-400 truncate">{c.lastMessage}</p>
                  </div>
                  {c.unread > 0 && (
                    <span className="bg-teal-500 text-white text-xs font-black w-5 h-5 rounded-full flex items-center justify-center">
                      {c.unread}
                    </span>
                  )}
                </button>
              ))
          }
        </div>
      </aside>

      {/* ── CARTE ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 relative">
        <Map
          {...viewport}
          onMove={e => setViewport(e.viewState)}
          mapStyle={MAP_STYLE}
          style={{ width: '100%', height: '100%' }}
        >
          <NavigationControl position="top-right" />
          <GeolocateControl position="top-right" trackUserLocation />

          {/* Marqueurs membres */}
          {members.map(member => (
            <Marker
              key={member.id}
              latitude={member.lat}
              longitude={member.lng}
              onClick={e => { e.originalEvent.stopPropagation(); setSelectedMember(member); setChatOpen(false); }}
            >
              <div className="relative cursor-pointer group">
                <div className={`w-11 h-11 rounded-full border-2 overflow-hidden shadow-lg transition-transform group-hover:scale-110 ${
                  member.isAvailable ? 'border-teal-400' : 'border-gray-500'
                }`}>
                  {member.avatar ? (
                    <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-teal-700 flex items-center justify-center text-white font-black">
                      {member.name[0].toUpperCase()}
                    </div>
                  )}
                </div>
                {member.isAvailable && (
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-teal-400 rounded-full border-2 border-gray-900" />
                )}
              </div>
            </Marker>
          ))}

          {/* Popup profil membre */}
          {selectedMember && (
            <Popup
              latitude={selectedMember.lat}
              longitude={selectedMember.lng}
              onClose={() => setSelectedMember(null)}
              closeButton={false}
              anchor="bottom"
              offset={[0, -50] as any}
            >
              <div className="bg-gray-800 rounded-2xl p-4 min-w-[200px] border border-gray-600">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-teal-700 flex items-center justify-center text-white font-black text-lg overflow-hidden">
                    {selectedMember.avatar
                      ? <img src={selectedMember.avatar} className="w-full h-full object-cover" />
                      : selectedMember.name[0].toUpperCase()
                    }
                  </div>
                  <div>
                    <p className="font-black text-white text-sm">{selectedMember.name}</p>
                    <p className="text-xs text-gray-400">{selectedMember.tdahType?.replace(/_/g, ' ') || 'TDAH'}</p>
                    <p className="text-xs text-gray-500">{selectedMember.city || 'Localisation privée'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 mb-3">
                  <span className={`w-2 h-2 rounded-full ${selectedMember.isAvailable ? 'bg-teal-400' : 'bg-gray-500'}`} />
                  <span className="text-xs text-gray-300">
                    {selectedMember.isAvailable ? 'Disponible maintenant' : 'Hors ligne'}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => openChat(selectedMember)}
                    className="flex-1 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold py-2 rounded-xl transition-colors"
                  >
                    ✉️ Message
                  </button>
                  <button
                    onClick={() => { setMeetTarget(selectedMember); setMeetModal(true); setSelectedMember(null); }}
                    className="flex-1 bg-gray-600 hover:bg-gray-500 text-white text-xs font-bold py-2 rounded-xl transition-colors"
                  >
                    🤝 Rencontre
                  </button>
                </div>
              </div>
            </Popup>
          )}
        </Map>

        {/* Légende */}
        <div className="absolute bottom-4 left-4 bg-gray-800/90 backdrop-blur rounded-xl px-3 py-2 flex gap-4">
          <span className="flex items-center gap-1.5 text-xs text-gray-300">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-400"/>Disponible
          </span>
          <span className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-500"/>Hors ligne
          </span>
          <span className="text-xs text-gray-500">Position approximative (~3km)</span>
        </div>
      </div>

      {/* ── PANNEAU CHAT ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {chatOpen && chatUser && (
          <motion.div
            initial={{ x: 360 }} animate={{ x: 0 }} exit={{ x: 360 }}
            className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col"
          >
            {/* Header chat */}
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-teal-600 rounded-full flex items-center justify-center text-white font-black text-sm">
                  {chatUser.name[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-white text-sm">{chatUser.name}</p>
                  <p className="text-xs text-gray-400">{chatUser.tdahType?.replace(/_/g, ' ') || 'TDAH'}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setMeetTarget(chatUser); setMeetModal(true); }}
                  className="text-gray-400 hover:text-teal-400 transition-colors text-lg" title="Proposer une rencontre"
                >🤝</button>
                <button onClick={() => setChatOpen(false)} className="text-gray-400 hover:text-white text-lg">✕</button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {chatMessages.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-2xl mb-2">👋</p>
                  <p className="text-xs">Dis bonjour à {chatUser.name} !</p>
                </div>
              )}
              {chatMessages.map(msg => (
                <div key={msg.id} className={`flex ${msg.fromId === user?.id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                    msg.fromId === user?.id
                      ? 'bg-teal-600 text-white rounded-br-sm'
                      : 'bg-gray-700 text-gray-100 rounded-bl-sm'
                  }`}>
                    <p>{msg.content}</p>
                    <p className="text-xs opacity-50 mt-0.5">
                      {new Date(msg.createdAt).toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              {typing && (
                <div className="flex justify-start">
                  <div className="bg-gray-700 px-3 py-2 rounded-2xl rounded-bl-sm">
                    <div className="flex gap-1">
                      {[0,1,2].map(i => (
                        <span key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input message */}
            <div className="p-3 border-t border-gray-700">
              <div className="flex gap-2">
                <input
                  value={msgInput}
                  onChange={e => setMsgInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (msgInput.trim()) sendMessage.mutate(); } }}
                  placeholder="Écris un message..."
                  maxLength={500}
                  className="flex-1 bg-gray-700 text-white placeholder-gray-400 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <button
                  onClick={() => { if (msgInput.trim()) sendMessage.mutate(); }}
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

      {/* ── MODAL RENCONTRE ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {meetModal && meetTarget && (
          <motion.div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setMeetModal(false)}>
            <motion.div className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm border border-gray-700"
              initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()}>
              <h3 className="font-black text-white text-xl mb-1">Proposer une rencontre</h3>
              <p className="text-gray-400 text-sm mb-5">avec <strong className="text-white">{meetTarget.name}</strong></p>

              {/* Type */}
              <p className="text-xs text-gray-400 font-bold uppercase mb-2">Type</p>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {MEETING_TYPES.map(t => (
                  <button key={t.value} onClick={() => setMeetType(t.value)}
                    className={`py-2.5 rounded-xl text-sm font-bold transition-colors ${
                      meetType === t.value ? 'bg-teal-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Date */}
              <p className="text-xs text-gray-400 font-bold uppercase mb-2">Date et heure</p>
              <input type="datetime-local" value={meetDate} onChange={e => setMeetDate(e.target.value)}
                className="w-full bg-gray-700 text-white rounded-xl px-3 py-2.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-teal-500" />

              {/* Lieu */}
              <p className="text-xs text-gray-400 font-bold uppercase mb-2">Lieu (optionnel)</p>
              <input value={meetLocation} onChange={e => setMeetLocation(e.target.value)}
                placeholder="Ex: Café de la Paix, Medina..."
                className="w-full bg-gray-700 text-white placeholder-gray-500 rounded-xl px-3 py-2.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-teal-500" />

              {/* Message */}
              <p className="text-xs text-gray-400 font-bold uppercase mb-2">Message (optionnel)</p>
              <textarea value={meetMessage} onChange={e => setMeetMessage(e.target.value)}
                placeholder="Ex: Je cherche quelqu'un pour travailler sur un projet..."
                rows={2} maxLength={280}
                className="w-full bg-gray-700 text-white placeholder-gray-500 rounded-xl px-3 py-2.5 text-sm mb-5 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" />

              <button
                onClick={() => proposeMeeting.mutate()}
                disabled={!meetDate || proposeMeeting.isPending}
                className="w-full bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white font-black py-3.5 rounded-xl transition-colors"
              >
                {proposeMeeting.isPending ? '⏳ Envoi...' : '🤝 Envoyer la proposition'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── NOTIFICATIONS TOAST ───────────────────────────────────────────────── */}
      <div className="fixed bottom-6 right-6 z-50 space-y-2 max-w-xs">
        <AnimatePresence>
          {notifications.map(n => (
            <motion.div key={n.id}
              initial={{ opacity: 0, x: 80 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 80 }}
              className="bg-gray-800 border border-gray-600 rounded-2xl p-4 shadow-xl flex items-start gap-3">
              <span className="text-xl">{n.type === 'message' ? '✉️' : n.type === 'meeting_accepted' ? '✅' : '🤝'}</span>
              <div className="flex-1">
                <p className="text-white font-bold text-sm">{n.from}</p>
                <p className="text-gray-400 text-xs mt-0.5">{n.text}</p>
                {n.type === 'message' && n.userObj && (
                  <button onClick={() => { openChat(n.userObj); setNotifications(p => p.filter(x => x.id !== n.id)); }}
                    className="text-teal-400 text-xs font-bold mt-1">
                    Répondre →
                  </button>
                )}
              </div>
              <button onClick={() => setNotifications(p => p.filter(x => x.id !== n.id))}
                className="text-gray-500 hover:text-white text-lg">×</button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
