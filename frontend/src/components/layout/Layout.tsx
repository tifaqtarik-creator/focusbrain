import { Outlet, NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAppStore } from '../../stores/useStore';
import { useI18n, LANGUAGES } from '../../lib/i18n';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSocket, connectSocket } from '../../lib/socket';
import {
  LayoutDashboard, CalendarDays, Brain, Music, Map as MapIcon, Users, User,
  Bell, BellOff, Wind, Check, ChevronRight,
  MessageSquare, Heart, Mail, Handshake, Target, type LucideIcon,
} from 'lucide-react';

// ── Types notification ────────────────────────────────────────────────────────
type NotifType = 'reply' | 'reaction' | 'message' | 'meeting' | 'slot';

interface AppNotif {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  link?: string;
  read: boolean;
  at: Date;
}

// Icône + couleur par type de notification (palette Calm Focus)
const NOTIF_ICON: Record<NotifType, { Icon: LucideIcon; tint: string }> = {
  reply:   { Icon: MessageSquare, tint: 'bg-teal-50 text-teal-600' },
  reaction:{ Icon: Heart,         tint: 'bg-amber-400/15 text-amber-600' },
  message: { Icon: Mail,          tint: 'bg-violet-100 text-violet-600' },
  meeting: { Icon: Handshake,     tint: 'bg-teal-50 text-teal-600' },
  slot:    { Icon: Target,        tint: 'bg-teal-50 text-teal-600' },
};

export default function Layout() {
  const { user, toggleLowStim, lowStimMode } = useAppStore();
  const { t, lang, setLang } = useI18n();
  const navigate    = useNavigate();
  const location    = useLocation();
  const isDashboard = location.pathname === '/dashboard';
  const [showLang,  setShowLang]  = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [notifs,    setNotifs]    = useState<AppNotif[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);

  const unread = notifs.filter(n => !n.read).length;

  // ── Connexion temps réel (active notifications, carte, salles de focus…) ────
  useEffect(() => { connectSocket(); }, []);

  // ── Fermer le panel notif en cliquant ailleurs ─────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotif(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Socket.io — écouter les événements de notification ────────────────────
  useEffect(() => {
    if (!user) return;
    const socket = getSocket();

    const addNotif = (n: Omit<AppNotif, 'id' | 'read' | 'at'>) => {
      const notif: AppNotif = { ...n, id: Date.now().toString(), read: false, at: new Date() };
      setNotifs(prev => [notif, ...prev].slice(0, 20));
    };

    // Quelqu'un répond à mon post
    socket.on('forum:reply', (data: any) => {
      addNotif({
        type: 'reply',
        title: `${data.fromUser?.name} a répondu à ton post`,
        body: data.postTitle?.slice(0, 60) || 'Voir la réponse',
        link: '/community',
      });
    });

    // Quelqu'un réagit à mon post
    socket.on('forum:reaction', (data: any) => {
      addNotif({
        type: 'reaction',
        title: `${data.fromUser?.name} a réagi à ton post`,
        body: data.postTitle?.slice(0, 60) || '',
        link: '/community',
      });
    });

    // Message privé
    socket.on('message:new', (data: any) => {
      if (location.pathname === '/map') return; // déjà géré dans la carte
      addNotif({
        type: 'message',
        title: `Message de ${data.from?.name}`,
        body: data.content?.slice(0, 80) || '',
        link: '/map',
      });
    });

    // Rencontre proposée
    socket.on('meeting:proposed', (data: any) => {
      addNotif({
        type: 'meeting',
        title: `${data.from?.name} te propose une rencontre`,
        body: `${data.type} — ${new Date(data.proposedAt).toLocaleDateString('fr')}`,
        link: '/map',
      });
    });

    // Créneau body doubling confirmé
    socket.on('slot:confirmed', (_data: any) => {
      addNotif({
        type: 'slot',
        title: 'Session body doubling confirmée',
        body: 'Ta session est confirmée.',
        link: '/dashboard',
      });
    });

    // Nouveau message de chat (reçu hors de la salle)
    socket.on('chat:message', (data: any) => {
      if (location.pathname.startsWith('/live/')) return; // déjà visible dans la salle
      addNotif({
        type: 'message',
        title: `Message de ${data.fromName || 'ton partenaire'}`,
        body: data.preview || '',
        link: data.slotId ? `/live/${data.slotId}` : '/dashboard',
      });
    });

    return () => {
      socket.off('forum:reply');
      socket.off('forum:reaction');
      socket.off('message:new');
      socket.off('meeting:proposed');
      socket.off('slot:confirmed');
      socket.off('chat:message');
    };
  }, [user, location.pathname]);

  const markAllRead = () => setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  const clearAll    = () => setNotifs([]);

  const navItems: { to: string; Icon: LucideIcon; label: string }[] = [
    { to: '/dashboard',  Icon: LayoutDashboard, label: t.nav.dashboard },
    { to: '/planner',    Icon: CalendarDays,    label: 'Planning' },
    { to: '/adah',       Icon: Brain,           label: 'ADAH AI' },
    { to: '/music',      Icon: Music,           label: 'Musique' },
    { to: '/map',        Icon: MapIcon,         label: 'Carte' },
    { to: '/community',  Icon: Users,           label: t.nav.community },
    { to: '/mon-espace', Icon: User,            label: 'Mon espace' },
  ];

  const timeAgo = (d: Date) => {
    const m = Math.floor((Date.now() - d.getTime()) / 60000);
    if (m < 1)  return 'à l\'instant';
    if (m < 60) return `il y a ${m}min`;
    return `il y a ${Math.floor(m / 60)}h`;
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-surface-soft">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm border-b border-line px-4 h-14 flex items-center justify-between flex-shrink-0 z-40">

        {/* Logo */}
        <button onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 font-display font-extrabold text-ink-900 tracking-tight">
          <span className="w-8 h-8 rounded-xl bg-teal-500 text-white flex items-center justify-center shadow-soft">
            <Brain size={18} strokeWidth={2.25} />
          </span>
          <span className="hidden sm:inline text-[17px]">FocusBrain</span>
        </button>

        {/* Nav centrale */}
        <nav className="flex items-center gap-0.5" role="navigation">
          {navItems.map(({ to, Icon, label }) => (
            <NavLink key={to} to={to} title={label}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  isActive ? 'bg-teal-50 text-teal-700' : 'text-ink-500 hover:bg-surface-muted hover:text-ink-900'
                }`
              }>
              <Icon size={18} strokeWidth={2} />
              <span className="hidden lg:inline">{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Actions droite */}
        <div className="flex items-center gap-2">

          {/* 🔔 Cloche de notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => { setShowNotif(v => !v); if (!showNotif) markAllRead(); }}
              className="relative p-2 rounded-xl text-ink-500 hover:bg-surface-muted hover:text-ink-900 transition-colors"
              aria-label="Notifications"
            >
              <Bell size={19} strokeWidth={2} />
              {unread > 0 && (
                <motion.span
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  className="absolute -top-0.5 -right-0.5 bg-amber-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center"
                >
                  {unread > 9 ? '9+' : unread}
                </motion.span>
              )}
            </button>

            {/* Panel notifications */}
            <AnimatePresence>
              {showNotif && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-card border border-line overflow-hidden z-50"
                >
                  {/* Header panel */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-line">
                    <h3 className="font-bold text-ink-900 text-sm flex items-center gap-2">
                      <Bell size={15} strokeWidth={2.25} className="text-teal-600" /> Notifications
                    </h3>
                    {notifs.length > 0 && (
                      <button onClick={clearAll} className="text-xs text-ink-400 hover:text-ink-700">Tout effacer</button>
                    )}
                  </div>

                  {/* Liste */}
                  <div className="max-h-96 overflow-y-auto">
                    {notifs.length === 0 ? (
                      <div className="text-center py-10">
                        <BellOff size={28} strokeWidth={1.75} className="mx-auto mb-2 text-ink-400" />
                        <p className="text-ink-500 text-sm">Aucune notification</p>
                        <p className="text-ink-400 text-xs mt-1">Elles apparaissent ici en temps réel</p>
                      </div>
                    ) : (
                      notifs.map(n => {
                        const { Icon, tint } = NOTIF_ICON[n.type];
                        return (
                          <button key={n.id}
                            onClick={() => { if (n.link) navigate(n.link); setShowNotif(false); }}
                            className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-surface-soft transition-colors text-left border-b border-line/60 ${!n.read ? 'bg-teal-50/40' : ''}`}
                          >
                            <span className={`shrink-0 mt-0.5 w-9 h-9 rounded-xl flex items-center justify-center ${tint}`}>
                              <Icon size={17} strokeWidth={2} />
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-ink-900 truncate">{n.title}</p>
                              {n.body && <p className="text-xs text-ink-500 truncate mt-0.5">{n.body}</p>}
                              <p className="text-xs text-ink-400 mt-1">{timeAgo(n.at)}</p>
                            </div>
                            {!n.read && <span className="w-2 h-2 bg-teal-500 rounded-full shrink-0 mt-2" />}
                          </button>
                        );
                      })
                    )}
                  </div>

                  {/* Footer */}
                  <div className="px-4 py-2 border-t border-line bg-surface-soft">
                    <Link to="/mon-espace" onClick={() => setShowNotif(false)}
                      className="text-xs text-teal-700 font-semibold hover:text-teal-800 flex items-center gap-1">
                      Voir toutes mes activités <ChevronRight size={13} strokeWidth={2.5} />
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Langue */}
          <div className="relative">
            <button onClick={() => setShowLang(v => !v)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-xl text-sm font-semibold bg-surface-muted hover:bg-surface-soft text-ink-700 transition-colors">
              <span>{LANGUAGES.find(l => l.code === lang)?.flag}</span>
              <span className="hidden sm:inline text-ink-500 uppercase text-xs">{lang}</span>
            </button>
            <AnimatePresence>
              {showLang && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-10 bg-white rounded-2xl shadow-card border border-line py-2 w-44 z-50">
                  {LANGUAGES.map(l => (
                    <button key={l.code} onClick={() => { setLang(l.code); setShowLang(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium hover:bg-teal-50 transition-colors ${lang === l.code ? 'text-teal-700 font-semibold' : 'text-ink-700'}`}>
                      <span>{l.flag}</span><span>{l.label}</span>
                      {lang === l.code && <Check size={15} strokeWidth={2.5} className="ml-auto text-teal-500" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Low Stim */}
          <button onClick={toggleLowStim} title={t.settings.lowStim}
            className={`p-2 rounded-xl transition-colors ${lowStimMode ? 'bg-teal-500 text-white' : 'bg-surface-muted text-ink-500 hover:text-ink-900'}`}>
            <Wind size={18} strokeWidth={2} />
          </button>

          {/* Avatar utilisateur → Mon espace */}
          <Link to="/mon-espace" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-teal-100 border-2 border-teal-200 flex items-center justify-center">
              {user?.avatar
                ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                : <span className="text-sm font-bold text-teal-700">{user?.name?.[0]}</span>
              }
            </div>
            <span className="text-sm font-semibold text-ink-700 hidden sm:inline">{user?.name?.split(' ')[0]}</span>
          </Link>
        </div>
      </header>

      {/* Contenu */}
      <main className={`flex-1 ${isDashboard ? 'overflow-hidden' : 'overflow-auto'}`}>
        <Outlet />
      </main>
    </div>
  );
}
