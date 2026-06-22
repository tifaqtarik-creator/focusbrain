import { useEffect, useState, useRef, FormEvent, ChangeEvent, MouseEvent as ReactMouseEvent, ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, MicOff, Video, VideoOff, MonitorUp, MessageSquare,
  Coffee, Clock, PhoneOff, Maximize, Minimize, Send, Paperclip,
  LayoutGrid, Maximize2, Minimize2, Play,
} from 'lucide-react';
import api from '../lib/api';
import { useAppStore } from '../stores/useStore';
import { getSocket, connectSocket } from '../lib/socket';
import { completeSession, reliability, getFavoriteIds, addFavorite, removeFavorite } from '../lib/bodyDoubling';

// LiveKit imports
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoTrack,
  useChat,
  useTracks,
  useRemoteParticipants,
  useTrackToggle,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import '@livekit/components-styles';

// Bulle de message (photo + nom + heure + pièces jointes)
function Bubble({ mine, name, avatar, content, time, attachments }: {
  mine: boolean; name: string; avatar?: string | null; content?: string; time?: string;
  attachments?: { url: string; name: string; mime: string }[];
}) {
  return (
    <div className={`flex gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
      {!mine && (
        <div className="w-7 h-7 rounded-full overflow-hidden bg-gray-600 flex items-center justify-center text-white text-[10px] font-black shrink-0 self-end">
          {avatar ? <img src={avatar} className="w-full h-full object-cover" alt="" /> : (name?.[0]?.toUpperCase() || '?')}
        </div>
      )}
      <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm break-words ${mine ? 'bg-teal-500 text-white rounded-br-sm' : 'bg-gray-700 text-gray-100 rounded-bl-sm'}`}>
        {!mine && <p className="text-[10px] font-bold opacity-70 mb-0.5">{name}</p>}
        {content ? <p className="whitespace-pre-wrap">{content}</p> : null}
        {attachments?.map((f, i) => (
          f.mime?.startsWith('image/')
            ? <a key={i} href={f.url} target="_blank" rel="noreferrer" className="block mt-1"><img src={f.url} alt={f.name} className="rounded-lg max-h-44 w-auto" /></a>
            : <a key={i} href={f.url} target="_blank" rel="noreferrer" download
                className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 mt-1 text-xs ${mine ? 'bg-white/20 hover:bg-white/30' : 'bg-black/25 hover:bg-black/40'}`}>
                <Paperclip size={13} className="shrink-0" /> <span className="truncate">{f.name}</span>
              </a>
        ))}
        {time && <p className={`text-[9px] mt-0.5 text-right ${mine ? 'text-white/60' : 'text-gray-400'}`}>{time}</p>}
      </div>
    </div>
  );
}

// Chat maison (design FocusBrain) — historique archivé + temps réel
function FbChat({ onClose, slotId }: { onClose: () => void; slotId?: string }) {
  const { chatMessages, send } = useChat();
  const myId = useAppStore(s => s.user?.id);
  const [text, setText] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!slotId) return;
    api.get(`/slots/${slotId}/messages`).then(r => setHistory(r.data || [])).catch(() => {});
  }, [slotId]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages.length, history.length]);

  const fmtTime = (t: any) => { try { return new Date(t).toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };
  const nameOf = (p: any) => { try { const m = p?.metadata ? JSON.parse(p.metadata) : {}; return m.name || p?.name || p?.identity || 'Participant'; } catch { return p?.name || p?.identity || 'Participant'; } };
  const avatarOf = (p: any) => { try { return p?.metadata ? (JSON.parse(p.metadata).avatar || null) : null; } catch { return null; } };

  const fileRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [uploading, setUploading] = useState(false);
  const autoGrow = () => { const el = taRef.current; if (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 120) + 'px'; } };
  const resetTa = () => { if (taRef.current) taRef.current.style.height = 'auto'; };

  // Les messages temps réel transportent { t: texte, a: pièces jointes } (JSON)
  const parseLive = (raw: string): { text: string; attachments: any[] } => {
    try { const o = JSON.parse(raw); if (o && typeof o === 'object' && ('t' in o || 'a' in o)) return { text: o.t || '', attachments: o.a || [] }; } catch { /* texte brut */ }
    return { text: raw, attachments: [] };
  };
  const sendMessage = (content: string, attachments: any[]) => {
    send(JSON.stringify({ t: content, a: attachments }));                       // temps réel LiveKit
    if (slotId) api.post(`/slots/${slotId}/messages`, { content, attachments }).catch(() => {}); // archive
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    sendMessage(t, []);
    setText(''); resetTa();
  };
  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !slotId) return;
    if (file.size > 10 * 1024 * 1024) { alert('Fichier trop lourd (10 Mo max)'); return; }
    setUploading(true);
    try {
      const fd = new FormData(); fd.append('file', file);
      const { data } = await api.post(`/slots/${slotId}/chat-upload`, fd);
      sendMessage('', [data]); // { url, name, mime }
    } catch { /* ignore */ }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const empty = history.length === 0 && chatMessages.length === 0;

  return (
    <div className="flex flex-col h-full" style={{ background: '#1f2430' }}>
      <div className="px-3 py-2.5 flex items-center justify-between text-white text-sm font-black border-b border-white/10 shrink-0">
        💬 Discussion
        <button onClick={onClose} className="text-gray-400 hover:text-white text-lg leading-none">✕</button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
        {empty && <p className="text-center text-xs text-gray-500 mt-6">Aucun message pour l'instant.<br />Dis bonjour 👋</p>}
        {history.map((m: any) => (
          <Bubble key={'h' + m.id} mine={m.from?.id === myId} name={m.from?.name || 'Participant'} avatar={m.from?.avatar} content={m.content} time={fmtTime(m.createdAt)} attachments={m.attachments || undefined} />
        ))}
        {chatMessages.map((m: any, i: number) => {
          const p = parseLive(m.message);
          return <Bubble key={'l' + (m.id || i)} mine={(m.from as any)?.isLocal} name={nameOf(m.from)} avatar={avatarOf(m.from)} content={p.text} time={fmtTime(m.timestamp)} attachments={p.attachments} />;
        })}
        <div ref={endRef} />
      </div>
      <form onSubmit={submit} className="p-2 border-t border-white/10 flex gap-2 shrink-0 items-end">
        <input ref={fileRef} type="file" onChange={onFile} className="hidden"
          accept="image/*,.pdf,.doc,.docx,.txt,.zip" />
        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} aria-label="Joindre un fichier"
          className="text-gray-300 hover:text-white p-2 rounded-xl hover:bg-white/10 shrink-0 disabled:opacity-50 self-end">
          {uploading ? <span className="text-xs">⏳</span> : <Paperclip size={18} />}
        </button>
        <textarea ref={taRef} value={text} rows={1}
          onChange={e => { setText(e.target.value); autoGrow(); }}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(e as any); } }}
          placeholder="Écris un message… (Maj+Entrée = nouvelle ligne)"
          className="flex-1 min-w-0 rounded-xl px-3 py-2 text-sm text-white outline-none border border-white/15 focus:border-teal-400 resize-none leading-snug overflow-y-auto"
          style={{ background: '#2a3142', maxHeight: 120 }} />
        <button type="submit" aria-label="Envoyer" className="bg-teal-500 hover:bg-teal-600 text-white px-3.5 py-2 rounded-xl shrink-0 flex items-center justify-center self-end"><Send size={18} /></button>
      </form>
    </div>
  );
}

// Vignette personnalisée : vidéo si caméra active, sinon photo + nom du participant
function FbTile({ trackRef, onClick, compact, focused }: { trackRef: any; onClick?: () => void; compact?: boolean; focused?: boolean }) {
  const p = trackRef.participant;
  let meta: any = {};
  try { meta = p?.metadata ? JSON.parse(p.metadata) : {}; } catch { /* ignore */ }
  const name   = meta.name || p?.name || p?.identity || 'Participant';
  const avatar = meta.avatar || null;
  const isScreen = trackRef.source === Track.Source.ScreenShare;
  const isVideoSource = trackRef.source === Track.Source.Camera || isScreen;
  const pub = trackRef.publication;
  const showVideo = isVideoSource && pub && !pub.isMuted && pub.track;
  const isLocal = !!(p as any)?.isLocal;
  // Miroir UNIQUEMENT sur ma propre caméra (self-view naturelle). Partenaire + écran : sens réel (texte lisible).
  const mirror = isLocal && !isScreen;
  const avatarSize = compact ? 'w-10 h-10 text-base' : 'w-24 h-24 text-4xl';
  return (
    <div onClick={onClick}
      className={`relative bg-gray-800 rounded-2xl overflow-hidden flex items-center justify-center min-h-0 h-full w-full ${onClick ? 'cursor-pointer hover:ring-2 hover:ring-teal-400/60' : ''} ${focused ? 'ring-2 ring-teal-500' : ''}`}>
      {showVideo
        ? <VideoTrack trackRef={trackRef} className={`w-full h-full ${isScreen ? 'object-contain bg-black' : 'object-cover'} ${mirror ? '-scale-x-100' : ''}`} />
        : (
          <div className="flex flex-col items-center gap-2 p-2">
            <div className={`${avatarSize} rounded-full overflow-hidden bg-teal-600 flex items-center justify-center text-white font-black`}>
              {avatar ? <img src={avatar} alt="" className="w-full h-full object-cover" /> : (name[0]?.toUpperCase() || '?')}
            </div>
            {!compact && <span className="text-base font-bold text-white">{name}</span>}
            {!compact && <span className="text-xs text-gray-400">📷 caméra coupée</span>}
          </div>
        )}
      <span className="absolute bottom-1.5 left-1.5 bg-black/55 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-lg flex items-center gap-1 max-w-[90%] truncate">
        {avatar && <img src={avatar} className="w-3.5 h-3.5 rounded-full object-cover shrink-0" alt="" />}
        {isScreen ? `🖥️ ${name}` : name}
      </span>
    </div>
  );
}

// Overlay « en attente du partenaire » — visible tant que personne d'autre n'a rejoint
function WaitingForPartner({ name }: { name?: string }) {
  const remotes = useRemoteParticipants();
  if (remotes.length > 0) return null;
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
      <div className="bg-black/55 text-white rounded-2xl px-6 py-4 text-center backdrop-blur-sm">
        <div className="text-3xl mb-2 animate-pulse">⏳</div>
        <p className="font-bold">En attente de {name || 'ton partenaire'}…</p>
        <p className="text-xs text-white/70 mt-1">La session démarre dès qu'il/elle rejoint.</p>
      </div>
    </div>
  );
}

// Bouton de contrôle réutilisable (icône + libellé FR, état actif/inactif)
function CtrlBtn({ icon, label, active = true, danger = false, onClick, badge }: {
  icon: ReactNode; label: string; active?: boolean; danger?: boolean; onClick: () => void; badge?: string | number;
}) {
  const base = 'flex flex-col items-center justify-center gap-1 rounded-2xl px-3 py-2 min-w-[64px] text-[11px] font-bold transition-colors';
  const cls = danger
    ? 'bg-red-500/90 hover:bg-red-500 text-white'
    : active
      ? 'bg-teal-500/90 hover:bg-teal-500 text-white'
      : 'bg-gray-700 hover:bg-gray-600 text-gray-300';
  return (
    <button onClick={onClick} className={`${base} ${cls}`}>
      <span className="relative flex items-center justify-center h-5">
        {icon}
        {badge ? <span className="absolute -top-2 -right-3 bg-red-500 text-white text-[9px] font-black min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center">{badge}</span> : null}
      </span>
      <span className="leading-none">{label}</span>
    </button>
  );
}

// Corps de la salle (dans le contexte LiveKit) : grille vidéo + chat + barre de contrôle unique FR
function RoomBody(props: {
  partnerName?: string; slotId?: string; chatOpen: boolean; setChatOpen: (v: boolean) => void;
  paused?: boolean; onPause: () => void; onExtend: () => void; onLeave: () => void;
}) {
  const { partnerName, slotId, chatOpen, setChatOpen, paused, onPause, onExtend, onLeave } = props;
  const mic    = useTrackToggle({ source: Track.Source.Microphone });
  const cam    = useTrackToggle({ source: Track.Source.Camera });
  const screen = useTrackToggle({ source: Track.Source.ScreenShare });
  const tracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }, { source: Track.Source.ScreenShare, withPlaceholder: false }],
    { onlySubscribed: false },
  );

  // Notifications de messages (badge non-lus + toast) quand le chat est fermé
  const { chatMessages } = useChat();
  const [unread, setUnread] = useState(0);
  const [toast, setToast]   = useState<string | null>(null);
  const prevLen = useRef(0);
  useEffect(() => {
    if (chatOpen) { setUnread(0); prevLen.current = chatMessages.length; return; }
    if (chatMessages.length > prevLen.current) {
      const fresh = chatMessages.slice(prevLen.current).filter((m: any) => !(m.from as any)?.isLocal);
      if (fresh.length) {
        setUnread(u => u + fresh.length);
        const last: any = fresh[fresh.length - 1];
        let preview = ''; try { const o = JSON.parse(last.message); preview = o.a?.length ? '📎 pièce jointe' : (o.t || ''); } catch { preview = last.message; }
        let nm = 'Partenaire'; try { nm = JSON.parse(last.from?.metadata || '{}').name || last.from?.name || nm; } catch { /* ignore */ }
        setToast(`💬 ${nm} : ${String(preview).slice(0, 40)}`);
        setTimeout(() => setToast(null), 4000);
      }
    }
    prevLen.current = chatMessages.length;
  }, [chatMessages.length, chatOpen]);

  // ── Vue Focus / Mosaïque + plein écran d'un flux ──
  const keyOf = (tr: any) => (tr.participant?.identity || '') + ':' + (tr.source || '');
  const [focusedKey, setFocusedKey] = useState<string | null>(null);
  const focusRef = useRef<HTMLDivElement>(null);
  const [tileFs, setTileFs] = useState(false);

  const screenTrack = tracks.find((t: any) => t.source === Track.Source.ScreenShare && t.publication?.track);
  const screenKey = screenTrack ? keyOf(screenTrack) : null;
  useEffect(() => { if (screenKey) setFocusedKey(screenKey); }, [screenKey]); // auto-focus partage d'écran

  const focusedTrack = focusedKey ? tracks.find((t: any) => keyOf(t) === focusedKey) : null;
  useEffect(() => { if (focusedKey && !focusedTrack) setFocusedKey(null); }, [focusedKey, focusedTrack]); // flux disparu → mosaïque
  const others = tracks.filter((t: any) => keyOf(t) !== focusedKey);

  useEffect(() => {
    const onFs = () => setTileFs(!!document.fullscreenElement && document.fullscreenElement === focusRef.current);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);
  const toggleTileFs = () => {
    if (!document.fullscreenElement) focusRef.current?.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.().catch(() => {});
  };
  const toggleView = () => {
    if (focusedKey) { setFocusedKey(null); return; }
    const remoteCam = tracks.find((t: any) => t.source === Track.Source.Camera && !(t.participant as any)?.isLocal);
    const target = screenTrack || remoteCam || tracks[0];
    if (target) setFocusedKey(keyOf(target));
  };

  // ── Panneau de discussion redimensionnable (glissement horizontal) ──
  const [chatWidth, setChatWidth] = useState<number>(() => {
    const v = parseInt(localStorage.getItem('fb_chat_w') || '288', 10);
    return isNaN(v) ? 288 : Math.min(520, Math.max(260, v));
  });
  useEffect(() => { localStorage.setItem('fb_chat_w', String(chatWidth)); }, [chatWidth]);
  const startResize = (e: ReactMouseEvent) => {
    e.preventDefault();
    const startX = e.clientX, startW = chatWidth;
    const onMove = (ev: globalThis.MouseEvent) => setChatWidth(Math.min(520, Math.max(260, startW + (startX - ev.clientX))));
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  return (
    <>
      {/* Toast nouveau message (clic → ouvrir le chat) */}
      {toast && (
        <div onClick={() => setChatOpen(true)}
          className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-gray-900/95 text-white text-sm font-bold px-4 py-2 rounded-xl shadow-lg cursor-pointer border border-white/10 max-w-[80%] truncate">
          {toast}
        </div>
      )}
      {/* Zone vidéo + chat latéral */}
      <div className="flex-1 min-h-0 flex">
        <div className="flex-1 relative min-w-0">
          {focusedTrack ? (
            // ── Vue FOCUS : grand flux + vignettes ──
            <div className="h-full w-full flex flex-col gap-2 p-2">
              <div ref={focusRef} className="flex-1 min-h-0 relative bg-black rounded-2xl overflow-hidden">
                <FbTile trackRef={focusedTrack} focused />
                <div className="absolute top-2 right-2 flex gap-1.5 z-20">
                  <button onClick={toggleTileFs} title="Plein écran du flux"
                    className="bg-black/55 hover:bg-black/75 text-white w-8 h-8 rounded-lg flex items-center justify-center">
                    {tileFs ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                  </button>
                  <button onClick={() => setFocusedKey(null)} title="Vue mosaïque"
                    className="bg-black/55 hover:bg-black/75 text-white w-8 h-8 rounded-lg flex items-center justify-center">
                    <LayoutGrid size={16} />
                  </button>
                </div>
              </div>
              {others.length > 0 && (
                <div className="h-24 shrink-0 flex gap-2 overflow-x-auto">
                  {others.map((tr: any, i: number) => (
                    <button key={keyOf(tr) + i} onClick={() => setFocusedKey(keyOf(tr))} className="h-full aspect-video shrink-0">
                      <FbTile trackRef={tr} compact />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // ── Vue MOSAÏQUE : clic sur un flux pour l'agrandir ──
            <div className={`h-full w-full grid gap-2 p-2 ${tracks.length > 1 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
              {tracks.map((tr: any, i: number) => (
                <FbTile key={keyOf(tr) + i} trackRef={tr} onClick={() => setFocusedKey(keyOf(tr))} />
              ))}
            </div>
          )}
          <WaitingForPartner name={partnerName} />
        </div>
        {chatOpen && (
          <div className="shrink-0 flex" style={{ width: chatWidth }}>
            <div onMouseDown={startResize} title="Glisser pour redimensionner"
              className="w-1.5 cursor-col-resize bg-gray-700 hover:bg-teal-500 active:bg-teal-500 shrink-0 transition-colors" />
            <div className="flex-1 min-w-0">
              <FbChat onClose={() => setChatOpen(false)} slotId={slotId} />
            </div>
          </div>
        )}
      </div>

      {/* Barre de contrôle UNIQUE en français — tout visible, pas de scroll */}
      <div className="shrink-0 bg-gray-800 border-t border-gray-700 px-4 py-2.5 flex items-center justify-center gap-2 flex-wrap">
        {/* Groupe média */}
        <div className="flex items-center gap-2 bg-gray-900/50 rounded-2xl p-1">
          <CtrlBtn icon={mic.enabled ? <Mic size={20} /> : <MicOff size={20} />} label={mic.enabled ? 'Micro' : 'Coupé'} active={mic.enabled} onClick={() => mic.toggle()} />
          <CtrlBtn icon={cam.enabled ? <Video size={20} /> : <VideoOff size={20} />} label={cam.enabled ? 'Caméra' : 'Off'} active={cam.enabled} onClick={() => cam.toggle()} />
          <CtrlBtn icon={<MonitorUp size={20} />} label={screen.enabled ? 'Arrêter' : 'Écran'} active={screen.enabled} onClick={() => screen.toggle()} />
          <CtrlBtn icon={focusedKey ? <LayoutGrid size={20} /> : <Maximize2 size={20} />} label={focusedKey ? 'Mosaïque' : 'Focus'} active={!!focusedKey} onClick={toggleView} />
          <CtrlBtn icon={<MessageSquare size={20} />} label="Discussion" active={chatOpen} onClick={() => setChatOpen(!chatOpen)} badge={!chatOpen && unread > 0 ? (unread > 9 ? '9+' : unread) : undefined} />
        </div>
        {/* Groupe TDAH */}
        <div className="flex items-center gap-2 bg-gray-900/50 rounded-2xl p-1">
          <CtrlBtn icon={paused ? <Play size={20} /> : <Coffee size={20} />} label={paused ? 'Reprendre' : 'Pause'} active={!!paused} onClick={onPause} />
          <CtrlBtn icon={<Clock size={20} />} label="+10 min" active={false} onClick={onExtend} />
        </div>
        {/* Quitter */}
        <CtrlBtn icon={<PhoneOff size={20} />} label="Quitter" danger onClick={onLeave} />
      </div>
    </>
  );
}

type Phase = 'loading' | 'checkin' | 'live' | 'done' | 'fallback';

export default function LiveSession() {
  const { slotId } = useParams<{ slotId: string }>();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>('loading');
  const [slot, setSlot] = useState<any>(null);
  const [livekitToken, setLivekitToken] = useState('');
  const [livekitUrl, setLivekitUrl] = useState('');
  const [fallback, setFallback] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const liveRef = useRef<HTMLDivElement>(null);
  const [task, setTask] = useState('');
  const [_taskSet, setTaskSet] = useState(false);

  const [timeLeft, setTimeLeft] = useState(0);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  const [pauseRequest, setPauseRequest]   = useState(false);  // le partenaire propose une pause
  const [extendRequest, setExtendRequest] = useState(false);  // le partenaire propose +10 min
  const [requestSent, setRequestSent]     = useState<string | null>(null); // feedback "demande envoyée"
  const [partnerTask, setPartnerTask] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Démarrage synchronisé & anticipé
  const [myReady, setMyReady]           = useState(false);
  const [partnerReady, setPartnerReady] = useState(false);
  const [launchCount, setLaunchCount]   = useState<number | null>(null); // overlay 3-2-1
  const [nowMs, setNowMs]               = useState(() => Date.now());     // pour le compte à rebours vers startTime

  // Satisfaction post-session
  const [showFeedback, setShowFeedback]   = useState(false);
  const [feedbackRating,  setFeedbackRating]  = useState(0);
  const [feedbackHover,   setFeedbackHover]   = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackMood,    setFeedbackMood]    = useState('');
  const [feedbackSent,    setFeedbackSent]    = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  // ── Chargement token LiveKit ──────────────────────────────────────────────
  useEffect(() => {
    if (!slotId) return;
    api.get(`/slots/${slotId}/token`)
      .then(res => {
        setSlot(res.data);
        // Le partenaire est-il déjà dans mes favoris ?
        if (res.data.partner?.id) {
          getFavoriteIds().then(ids => setIsFavorite(ids.includes(res.data.partner.id))).catch(() => {});
        }
        if (res.data.fallback || !res.data.token) {
          setFallback(true);
          setPhase('fallback');
        } else {
          setLivekitToken(res.data.token);
          setLivekitUrl(res.data.url);
          setPhase('checkin');
        }
      })
      .catch(() => navigate('/dashboard'));

    const socket = getSocket();
    connectSocket(); // s'assurer que le temps réel est actif (prêt/lancement)
    socket.on('session:pause_requested',  () => setPauseRequest(true));
    socket.on('session:pause_declined',   () => { setRequestSent('Pause refusée'); setTimeout(() => setRequestSent(null), 3000); });
    socket.on('session:paused',   () => { setPaused(true); setPauseRequest(false); setRequestSent(null); });
    socket.on('session:resumed',  () => setPaused(false));
    socket.on('session:extend_requested', () => setExtendRequest(true));
    socket.on('session:extend_declined',  () => { setRequestSent('+10 min refusé'); setTimeout(() => setRequestSent(null), 3000); });
    socket.on('session:extended', () => { setTimeLeft(t => t + 600); setExtendRequest(false); setRequestSent(null); });
    socket.on('session:partner_task', ({ task: t }: any) => setPartnerTask(t));
    socket.on('session:partner_ready', ({ ready }: any) => setPartnerReady(!!ready));
    socket.on('session:launch', ({ at }: any) => {
      const remaining = Math.max(1, Math.round((Number(at) - Date.now()) / 1000));
      setLaunchCount(remaining);
    });

    return () => {
      socket.off('session:pause_requested');
      socket.off('session:pause_declined');
      socket.off('session:paused');
      socket.off('session:resumed');
      socket.off('session:extend_requested');
      socket.off('session:extend_declined');
      socket.off('session:extended');
      socket.off('session:partner_task');
      socket.off('session:partner_ready');
      socket.off('session:launch');
    };
  }, [slotId]);

  // Horloge (1 s) pour le compte à rebours vers l'heure prévue
  useEffect(() => {
    if (phase !== 'checkin') return;
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, [phase]);

  // ── Timer ─────────────────────────────────────────────────────────────────
  const startTimer = (durationMin: number) => {
    setTimeLeft(durationMin * 60);
    timerRef.current = setInterval(() => {
      if (pausedRef.current) return;            // en pause → on ne décompte pas
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setPhase('done');
          // Afficher le modal de satisfaction après 1 seconde
          setTimeout(() => setShowFeedback(true), 1000);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startLive = () => {
    if (task) {
      getSocket().emit('session:share_task', { slotId, task });
    }
    setTaskSet(true);
    setPhase('live');
    if (slot?.duration) startTimer(slot.duration);
  };

  // Se déclarer prêt / annuler (démarrage anticipé par accord mutuel)
  const toggleReady = () => {
    const next = !myReady;
    setMyReady(next);
    getSocket().emit(next ? 'session:ready' : 'session:ready_cancel', { slotId });
  };

  // Overlay 3-2-1 synchronisé puis bascule en LIVE pour les deux
  useEffect(() => {
    if (launchCount === null) return;
    if (launchCount <= 0) { startLive(); setLaunchCount(null); return; }
    const t = setTimeout(() => setLaunchCount(c => (c === null ? null : c - 1)), 1000);
    return () => clearTimeout(t);
  }, [launchCount]); // eslint-disable-line react-hooks/exhaustive-deps

  const leave = () => {
    clearInterval(timerRef.current!);
    if (slotId) completeSession(slotId);   // KPI complétion + fiabilité
    setPhase('done');
    setShowFeedback(true);
  };

  // ── Pause / +10 min : demande → acceptation par le partenaire ──
  const requestExtend = () => {
    getSocket().emit('session:extend_request', { slotId });
    setRequestSent('Demande +10 min envoyée…'); setTimeout(() => setRequestSent(null), 5000);
  };
  const acceptExtend  = () => { setTimeLeft(t => t + 600); getSocket().emit('session:extend_accept', { slotId }); setExtendRequest(false); };
  const declineExtend = () => { getSocket().emit('session:extend_decline', { slotId }); setExtendRequest(false); };
  const togglePause = () => {
    if (paused) { setPaused(false); getSocket().emit('session:resume', { slotId }); }
    else { getSocket().emit('session:pause_request', { slotId }); setRequestSent('Demande de pause envoyée…'); setTimeout(() => setRequestSent(null), 5000); }
  };
  const acceptPause  = () => { setPaused(true); getSocket().emit('session:pause_accept', { slotId }); setPauseRequest(false); };
  const declinePause = () => { getSocket().emit('session:pause_decline', { slotId }); setPauseRequest(false); };

  // Favori partenaire (depuis la salle)
  const toggleFavorite = async () => {
    const id = slot?.partner?.id;
    if (!id) return;
    if (isFavorite) { setIsFavorite(false); await removeFavorite(id).catch(() => {}); }
    else            { setIsFavorite(true);  await addFavorite(id).catch(() => {}); }
  };

  // Plein écran de la salle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) liveRef.current?.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.().catch(() => {});
  };
  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  // Plein écran automatique à l'entrée en session (suite au clic de démarrage)
  useEffect(() => {
    if (phase === 'live' && !document.fullscreenElement) {
      liveRef.current?.requestFullscreen?.().catch(() => { /* l'utilisateur pourra cliquer ⛶ */ });
    }
  }, [phase]);

  const submitFeedback = async () => {
    if (!slotId || feedbackLoading) return;
    setFeedbackLoading(true);
    try {
      await api.post(`/slots/${slotId}/feedback`, {
        rating:  feedbackRating || 5,
        comment: feedbackComment.trim() || undefined,
        mood:    feedbackMood || undefined,
      });
      setFeedbackSent(true);
    } catch { /* ignore */ }
    setFeedbackLoading(false);
  };

  const skipFeedback = () => {
    setShowFeedback(false);
    navigate('/dashboard');
  };

  const closeFeedback = () => {
    setShowFeedback(false);
    navigate('/dashboard');
  };

  const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const secs = String(timeLeft % 60).padStart(2, '0');
  const progress = slot?.duration ? ((slot.duration * 60 - timeLeft) / (slot.duration * 60)) * 100 : 0;

  // Compte à rebours vers l'heure prévue du créneau
  const startMs = slot?.startTime ? new Date(slot.startTime).getTime() : null;
  const secToStart = startMs !== null ? Math.round((startMs - nowMs) / 1000) : null;
  const startCountdown = secToStart !== null && secToStart > 0
    ? `${String(Math.floor(secToStart / 60)).padStart(2, '0')}:${String(secToStart % 60).padStart(2, '0')}`
    : null;

  // Overlay de lancement synchronisé (3-2-1) — rendu par-dessus le check-in
  const launchOverlay = launchCount !== null ? (
    <div className="fixed inset-0 z-[70] bg-teal-600/95 flex items-center justify-center">
      <motion.div key={launchCount} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="text-center text-white">
        <p className="text-sm font-bold opacity-80 mb-2">Vous êtes prêts tous les deux 🎉</p>
        <p className="text-8xl font-black tabular-nums">{launchCount > 0 ? launchCount : 'GO'}</p>
        <p className="text-sm opacity-80 mt-2">Démarrage de la session…</p>
      </motion.div>
    </div>
  ) : null;

  // ── Fallback : LiveKit non configuré ──────────────────────────────────────
  if (fallback || phase === 'fallback') return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-sm border border-gray-100">
        <div className="text-5xl mb-4">⚙️</div>
        <h2 className="text-xl font-black text-gray-900 mb-2">LiveKit non configuré</h2>
        <p className="text-gray-500 text-sm mb-6">
          Pour activer la vidéo en direct, ajoute tes clés LiveKit dans le fichier <code className="bg-gray-100 px-1 rounded">backend/.env</code>
        </p>
        <div className="bg-gray-50 rounded-xl p-4 text-left text-xs font-mono mb-6 text-gray-700">
          <p>LIVEKIT_API_KEY=APIxxxxxxxxxx</p>
          <p>LIVEKIT_API_SECRET=xxxxxxxxxxxxx</p>
          <p>LIVEKIT_URL=wss://xxx.livekit.cloud</p>
        </div>
        <a href="https://cloud.livekit.io" target="_blank" rel="noreferrer"
          className="block w-full bg-teal-500 text-white font-black py-3 rounded-xl hover:bg-teal-600 mb-3">
          Créer un compte LiveKit gratuit →
        </a>
        <button onClick={() => navigate('/dashboard')} className="text-gray-400 text-sm hover:text-gray-600">
          Retour au dashboard
        </button>
      </div>
    </div>
  );

  // ── Chargement ────────────────────────────────────────────────────────────
  if (phase === 'loading') return (
    <div className="min-h-screen flex items-center justify-center bg-teal-50">
      <div className="text-center">
        <div className="text-5xl mb-4 animate-pulse">🧠</div>
        <p className="text-gray-500 font-medium">Préparation de ta session...</p>
      </div>
    </div>
  );

  // ── Check-in ──────────────────────────────────────────────────────────────
  if (phase === 'checkin') return (
    <div className="min-h-screen bg-teal-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-8 max-w-md w-full shadow-sm">
        <h2 className="text-2xl font-black text-gray-900 mb-4">Prêt(e) à commencer ?</h2>

        {/* Carte partenaire : photo · nom · favori · nb sessions · fiabilité */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-teal-100 overflow-hidden flex items-center justify-center text-teal-600 font-black text-lg shrink-0">
            {slot?.partner?.avatar
              ? <img src={slot.partner.avatar} alt="" className="w-full h-full object-cover" />
              : (slot?.partner?.name?.[0]?.toUpperCase() || '?')}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-black text-gray-900 truncate">{slot?.partner?.name || 'Ton partenaire'}</p>
              <button onClick={toggleFavorite} title="Partenaire favori" className="text-lg leading-none">
                {isFavorite ? '⭐' : '☆'}
              </button>
            </div>
            <p className="text-xs text-gray-400">
              🎯 {slot?.partner?.sessionsCompleted ?? 0} session{(slot?.partner?.sessionsCompleted ?? 0) > 1 ? 's' : ''}
              {' · '}{reliability(slot?.partner).emoji} {reliability(slot?.partner).label}
            </p>
          </div>
          <span className="text-sm text-gray-400 shrink-0">{slot?.duration}min</span>
        </div>

        {/* Objectifs de la session (tâches normalisées) */}
        {(slot?.myTask || slot?.partnerTask) && (
          <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 mb-5">
            <p className="text-xs font-bold text-slate-500 uppercase mb-2">🎯 Objectifs de la session</p>
            {slot?.myTask && (
              <p className="text-sm text-slate-700 mb-1"><strong>Toi :</strong> "{slot.myTask}"</p>
            )}
            {slot?.partnerTask && (
              <p className="text-sm text-slate-700">
                <strong>{slot?.partner?.name} :</strong> "{slot.partnerTask}"
              </p>
            )}
          </div>
        )}

        <div className="mb-6">
          <label className="block text-sm font-bold text-gray-700 mb-2">
            🎯 Sur quoi tu te concentres ?
            <span className="text-gray-400 font-normal ml-1">(optionnel)</span>
          </label>
          <input
            value={task}
            onChange={e => setTask(e.target.value)}
            placeholder="Ex : Finir le chapitre 3, répondre aux emails..."
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-teal-500 focus:outline-none text-sm"
          />
          {task && <p className="text-xs text-teal-600 mt-1.5">✓ Partagé avec ton partenaire</p>}
        </div>

        {/* Démarrage synchronisé & anticipé (accord mutuel) */}
        <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 mb-3">
          {startCountdown
            ? <p className="text-sm text-gray-600 mb-3 text-center">⏳ Créneau prévu dans <strong className="tabular-nums">{startCountdown}</strong> — mais vous pouvez commencer dès que vous êtes <strong>prêts tous les deux</strong>.</p>
            : <p className="text-sm text-gray-600 mb-3 text-center">✅ C'est l'heure ! Déclarez-vous prêts pour démarrer ensemble.</p>}
          <div className="flex items-center justify-center gap-2 mb-3 text-xs flex-wrap">
            <span className={`px-3 py-1 rounded-full font-bold ${myReady ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-400'}`}>
              {myReady ? '✓ Toi : prêt' : 'Toi : pas prêt'}
            </span>
            <span className={`px-3 py-1 rounded-full font-bold ${partnerReady ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-400'}`}>
              {partnerReady ? `✓ ${slot?.partner?.name || 'Partenaire'} : prêt` : `${slot?.partner?.name || 'Partenaire'} : en attente…`}
            </span>
          </div>
          <button onClick={toggleReady}
            className={`w-full font-black py-3.5 rounded-xl transition-colors ${myReady ? 'bg-gray-200 text-gray-600 hover:bg-gray-300' : 'bg-teal-500 text-white hover:bg-teal-600'}`}>
            {myReady ? '✕ Annuler' : '✋ Je suis prêt(e)'}
          </button>
          {myReady && !partnerReady && (
            <p className="text-xs text-gray-400 text-center mt-2">En attente que {slot?.partner?.name || 'ton partenaire'} soit prêt…</p>
          )}
        </div>

        {/* Démarrage immédiat (sans attendre le partenaire) */}
        <button onClick={startLive}
          className="w-full border-2 border-gray-200 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-50 transition-colors text-sm">
          🚀 Démarrer maintenant (sans attendre)
        </button>
      </motion.div>
      {launchOverlay}
    </div>
  );

  // ── Session LIVE ───────────────────────────────────────────────────────────
  if (phase === 'live') {
    return (
      <div ref={liveRef} className="h-screen flex flex-col bg-gray-900 overflow-hidden">
        {/* Header : minuteur · tâches · carte partenaire + plein écran */}
        <div className="shrink-0 bg-gray-800 px-4 py-2.5 flex items-center justify-between gap-3 border-b border-gray-700">
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-2xl font-black text-white tabular-nums">{mins}:{secs}</div>
            <div className="w-28 h-2 bg-gray-600 rounded-full overflow-hidden">
              <motion.div className="h-full bg-teal-400 rounded-full" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* Tâches (au centre, tronquées) */}
          <div className="flex items-center gap-2 overflow-hidden flex-1 justify-center">
            {partnerTask && (
              <div className="bg-gray-700 rounded-xl px-3 py-1.5 text-xs text-gray-300 truncate max-w-[40%]">
                🎯 {slot?.partner?.name} : {partnerTask}
              </div>
            )}
            {task && (
              <div className="bg-teal-900/50 rounded-xl px-3 py-1.5 text-xs text-teal-300 truncate max-w-[40%]">
                🎯 Toi : {task}
              </div>
            )}
          </div>

          {/* Carte partenaire + plein écran */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 bg-gray-700 rounded-xl px-2.5 py-1.5">
              <div className="w-6 h-6 rounded-full bg-teal-600 overflow-hidden flex items-center justify-center text-white text-[10px] font-black shrink-0">
                {slot?.partner?.avatar
                  ? <img src={slot.partner.avatar} alt="" className="w-full h-full object-cover" />
                  : (slot?.partner?.name?.[0]?.toUpperCase() || '?')}
              </div>
              <span className="text-xs text-white font-bold max-w-[90px] truncate">{slot?.partner?.name}</span>
              <span className="text-[10px] text-gray-400 shrink-0">· {slot?.partner?.sessionsCompleted ?? 0} sess.</span>
              <button onClick={toggleFavorite} title="Partenaire favori" className="text-sm leading-none">
                {isFavorite ? '⭐' : '☆'}
              </button>
            </div>
            <button onClick={toggleFullscreen} title="Plein écran" aria-label="Plein écran"
              className="text-white bg-gray-700 hover:bg-gray-600 w-9 h-9 rounded-xl flex items-center justify-center transition-colors">
              {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
          </div>
        </div>

        {/* Salle LiveKit : vidéo + chat + barre de contrôle unique (français) — tout dans l'écran */}
        <LiveKitRoom
          token={livekitToken}
          serverUrl={livekitUrl}
          connect={true}
          video={true}
          audio={true}
          onDisconnected={() => setPhase('done')}
          options={{
            adaptiveStream: true,
            dynacast: true,
            audioCaptureDefaults: {
              noiseSuppression: true,
              echoCancellation: true,
              autoGainControl: true,
            },
          }}
          className="flex-1 min-h-0 flex flex-col"
        >
          {/* Bandeaux : demandes de pause / +10 min (accepter/refuser) + feedback + pause active */}
          <AnimatePresence>
            {pauseRequest && (
              <motion.div key="pr" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="shrink-0 bg-amber-500 text-white text-xs font-bold px-4 py-2 flex items-center justify-center gap-3">
                ☕ {slot?.partner?.name || 'Ton partenaire'} propose une pause
                <span className="flex gap-2">
                  <button onClick={acceptPause} className="bg-white text-amber-600 px-2 py-0.5 rounded-lg">Accepter</button>
                  <button onClick={declinePause} className="bg-amber-700/50 text-white px-2 py-0.5 rounded-lg">Refuser</button>
                </span>
              </motion.div>
            )}
            {extendRequest && (
              <motion.div key="er" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="shrink-0 bg-teal-600 text-white text-xs font-bold px-4 py-2 flex items-center justify-center gap-3">
                ⏱️ {slot?.partner?.name || 'Ton partenaire'} propose +10 min
                <span className="flex gap-2">
                  <button onClick={acceptExtend} className="bg-white text-teal-700 px-2 py-0.5 rounded-lg">Accepter</button>
                  <button onClick={declineExtend} className="bg-teal-800/50 text-white px-2 py-0.5 rounded-lg">Refuser</button>
                </span>
              </motion.div>
            )}
            {requestSent && !pauseRequest && !extendRequest && (
              <motion.div key="rs" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="shrink-0 bg-gray-700 text-white text-xs font-bold px-4 py-2 text-center">⏳ {requestSent}</motion.div>
            )}
            {paused && (
              <motion.div key="pz" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="shrink-0 bg-amber-500 text-white text-xs font-bold px-4 py-2 text-center">
                ⏸ Session en pause — le minuteur est arrêté pour vous deux
              </motion.div>
            )}
          </AnimatePresence>

          <RoomBody
            partnerName={slot?.partner?.name}
            slotId={slotId}
            chatOpen={chatOpen}
            setChatOpen={setChatOpen}
            paused={paused}
            onPause={togglePause}
            onExtend={requestExtend}
            onLeave={leave}
          />
          <RoomAudioRenderer />
        </LiveKitRoom>
      </div>
    );
  }

  // ── Fin de session ────────────────────────────────────────────────────────
  if (phase === 'done') return (
    <div className="min-h-screen bg-teal-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl p-10 max-w-md w-full text-center shadow-sm">
        <div className="text-7xl mb-5">🎉</div>
        <h1 className="text-3xl font-black text-gray-900 mb-2">Session terminée !</h1>
        <p className="text-xl text-teal-600 font-bold mb-1">Ton cerveau TDAH vient de faire quelque chose de difficile.</p>
        <p className="text-gray-400 text-sm mb-8">
          Tu as créé <strong>{slot?.duration}</strong> minutes de focus avec{' '}
          <strong>{slot?.partner?.name || 'ton partenaire'}</strong>.
        </p>

        <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
          <p className="text-sm font-bold text-gray-700 mb-2">💜 Ajouter au Cercle de Confiance ?</p>
          <p className="text-xs text-gray-400 mb-3">
            Ajouter {slot?.partner?.name} pour le matcher en priorité lors de tes prochaines sessions.
          </p>
          <button
            onClick={() => api.post(`/matching/circle/${slot?.partner?.id}`).then(() => navigate('/dashboard'))}
            className="w-full bg-teal-500 text-white font-bold py-2.5 rounded-xl hover:bg-teal-600 text-sm transition-colors"
          >
            ✓ Ajouter au cercle
          </button>
        </div>

        <button onClick={closeFeedback}
          className="text-gray-400 hover:text-gray-600 text-sm transition-colors">
          Retour au dashboard →
        </button>
      </motion.div>

      {/* ── MODAL SATISFACTION POST-SESSION ── */}
      <AnimatePresence>
        {showFeedback && (
          <motion.div
            className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden"
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', damping: 20 }}
            >
              {!feedbackSent ? (
                <div className="p-6">
                  {/* Header */}
                  <div className="text-center mb-5">
                    <p className="text-3xl mb-2">✨</p>
                    <h3 className="font-black text-gray-900 text-xl">Comment s'est passée la session ?</h3>
                    <p className="text-gray-400 text-sm mt-1">Avec {slot?.partner?.name || 'ton partenaire'}</p>
                  </div>

                  {/* Étoiles */}
                  <div className="flex justify-center gap-3 mb-5">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        onMouseEnter={() => setFeedbackHover(star)}
                        onMouseLeave={() => setFeedbackHover(0)}
                        onClick={() => setFeedbackRating(star)}
                        className="transition-transform hover:scale-125 active:scale-90"
                      >
                        <span className={`text-4xl transition-all ${
                          star <= (feedbackHover || feedbackRating)
                            ? 'opacity-100'
                            : 'opacity-25 grayscale'
                        }`}>⭐</span>
                      </button>
                    ))}
                  </div>

                  {/* Label du rating */}
                  {feedbackRating > 0 && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center text-sm font-bold text-teal-600 mb-4"
                    >
                      {feedbackRating === 5 ? '🔥 Excellente session !'
                        : feedbackRating === 4 ? '😊 Très bonne session'
                        : feedbackRating === 3 ? '👍 Session correcte'
                        : feedbackRating === 2 ? '😕 Session difficile'
                        : '😔 Session compliquée'}
                    </motion.p>
                  )}

                  {/* Humeur post-session */}
                  <div className="mb-4">
                    <p className="text-xs text-gray-400 font-bold uppercase mb-2">Comment tu te sens maintenant ?</p>
                    <div className="flex justify-center gap-3">
                      {['😊', '😌', '💪', '😐', '😴'].map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => setFeedbackMood(feedbackMood === emoji ? '' : emoji)}
                          className={`text-2xl p-2 rounded-xl transition-all ${
                            feedbackMood === emoji
                              ? 'bg-teal-100 scale-110 ring-2 ring-teal-400'
                              : 'hover:bg-gray-100 hover:scale-110'
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Commentaire optionnel */}
                  <div className="mb-5">
                    <p className="text-xs text-gray-400 font-bold uppercase mb-2">
                      Un commentaire ? <span className="font-normal text-gray-300">(optionnel)</span>
                    </p>
                    <textarea
                      value={feedbackComment}
                      onChange={e => setFeedbackComment(e.target.value)}
                      placeholder="Ce qui a bien marché, ce qui était difficile..."
                      rows={2}
                      maxLength={500}
                      className="w-full border-2 border-gray-200 focus:border-teal-400 rounded-xl px-3 py-2.5 text-sm outline-none resize-none"
                    />
                    <p className="text-xs text-gray-300 text-right mt-0.5">{feedbackComment.length}/500</p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={skipFeedback}
                      className="flex-1 border-2 border-gray-200 text-gray-500 font-bold py-3 rounded-2xl hover:bg-gray-50 text-sm transition-colors"
                    >
                      Passer
                    </button>
                    <button
                      onClick={submitFeedback}
                      disabled={feedbackRating === 0 || feedbackLoading}
                      className="flex-1 bg-teal-500 hover:bg-teal-600 disabled:opacity-40 text-white font-black py-3 rounded-2xl text-sm transition-colors"
                    >
                      {feedbackLoading ? '⏳...' : '✓ Envoyer'}
                    </button>
                  </div>

                  <p className="text-center text-xs text-gray-300 mt-3">
                    Ton avis aide à améliorer FocusBrain 💜
                  </p>
                </div>
              ) : (
                /* Confirmation envoi */
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-8 text-center"
                >
                  <p className="text-5xl mb-3">💜</p>
                  <h3 className="font-black text-gray-900 text-xl mb-2">Merci !</h3>
                  <p className="text-gray-500 text-sm mb-6">
                    Ton avis aide toute la communauté TDAH à mieux se retrouver.
                  </p>
                  <button
                    onClick={closeFeedback}
                    className="w-full bg-teal-500 text-white font-black py-3 rounded-2xl hover:bg-teal-600 transition-colors"
                  >
                    Retour au dashboard →
                  </button>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return null;
}
