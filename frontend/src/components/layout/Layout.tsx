import { Outlet, NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAppStore } from '../../stores/useStore';
import { useI18n, LANGUAGES } from '../../lib/i18n';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSocket, connectSocket } from '../../lib/socket';

// ── Types notification ────────────────────────────────────────────────────────
interface AppNotif {
  id: string;
  type: 'reply' | 'reaction' | 'message' | 'meeting' | 'slot';
  title: string;
  body: string;
  link?: string;
  emoji: string;
  read: boolean;
  at: Date;
}

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
        type: 'reply', emoji: '💬',
        title: `${data.fromUser?.name} a répondu à ton post`,
        body: data.postTitle?.slice(0, 60) || 'Voir la réponse',
        link: '/community',
      });
    });

    // Quelqu'un réagit à mon post
    socket.on('forum:reaction', (data: any) => {
      addNotif({
        type: 'reaction', emoji: data.emoji || '❤️',
        title: `${data.fromUser?.name} a réagi à ton post`,
        body: data.postTitle?.slice(0, 60) || '',
        link: '/community',
      });
    });

    // Message privé
    socket.on('message:new', (data: any) => {
      if (location.pathname === '/map') return; // déjà géré dans la carte
      addNotif({
        type: 'message', emoji: '✉️',
        title: `Message de ${data.from?.name}`,
        body: data.content?.slice(0, 80) || '',
        link: '/map',
      });
    });

    // Rencontre proposée
    socket.on('meeting:proposed', (data: any) => {
      addNotif({
        type: 'meeting', emoji: '🤝',
        title: `${data.from?.name} te propose une rencontre`,
        body: `${data.type} — ${new Date(data.proposedAt).toLocaleDateString('fr')}`,
        link: '/map',
      });
    });

    // Créneau body doubling confirmé
    socket.on('slot:confirmed', (_data: any) => {
      addNotif({
        type: 'slot', emoji: '🎯',
        title: 'Session body doubling confirmée !',
        body: `Ta session est confirmée 🎉`,
        link: '/dashboard',
      });
    });

    return () => {
      socket.off('forum:reply');
      socket.off('forum:reaction');
      socket.off('message:new');
      socket.off('meeting:proposed');
      socket.off('slot:confirmed');
    };
  }, [user, location.pathname]);

  const markAllRead = () => setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  const clearAll    = () => setNotifs([]);

  const navItems = [
    { to: '/dashboard',  icon: '🏠', label: t.nav.dashboard },
    { to: '/planner',    icon: '📋', label: 'Planning' },
    { to: '/adah',       icon: '🧠', label: 'ADAH AI' },
    { to: '/music',      icon: '🎵', label: 'Musique' },
    { to: '/map',        icon: '🗺️', label: 'Carte' },
    { to: '/community',  icon: '🌐', label: t.nav.community },
    { to: '/mon-espace', icon: '👤', label: 'Mon espace' },
  ];

  const timeAgo = (d: Date) => {
    const m = Math.floor((Date.now() - d.getTime()) / 60000);
    if (m < 1)  return 'à l\'instant';
    if (m < 60) return `il y a ${m}min`;
    return `il y a ${Math.floor(m / 60)}h`;
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 h-14 flex items-center justify-between flex-shrink-0 z-40">

        {/* Logo */}
        <button onClick={() => navigate('/dashboard')}
          className="text-lg font-black text-teal-500 flex items-center gap-2" style={{ fontFamily: 'DM Sans' }}>
          🧠 <span className="hidden sm:inline">FocusBrain</span>
        </button>

        {/* Nav centrale */}
        <nav className="flex items-center gap-0.5" role="navigation">
          {navItems.map(link => (
            <NavLink key={link.to} to={link.to} title={link.label}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  isActive ? 'bg-teal-50 text-teal-700' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                }`
              }>
              <span>{link.icon}</span>
              <span className="hidden lg:inline">{link.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Actions droite */}
        <div className="flex items-center gap-2">

          {/* 🔔 Cloche de notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => { setShowNotif(v => !v); if (!showNotif) markAllRead(); }}
              className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors"
              aria-label="Notifications"
            >
              <span className="text-lg">🔔</span>
              {unread > 0 && (
                <motion.span
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs font-black w-5 h-5 rounded-full flex items-center justify-center"
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
                  className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50"
                >
                  {/* Header panel */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <h3 className="font-black text-gray-900 text-sm">🔔 Notifications</h3>
                    {notifs.length > 0 && (
                      <button onClick={clearAll} className="text-xs text-gray-400 hover:text-gray-600">Tout effacer</button>
                    )}
                  </div>

                  {/* Liste */}
                  <div className="max-h-96 overflow-y-auto">
                    {notifs.length === 0 ? (
                      <div className="text-center py-10">
                        <p className="text-3xl mb-2">🔕</p>
                        <p className="text-gray-400 text-sm">Aucune notification</p>
                        <p className="text-gray-300 text-xs mt-1">Elles apparaissent ici en temps réel</p>
                      </div>
                    ) : (
                      notifs.map(n => (
                        <button key={n.id}
                          onClick={() => { if (n.link) navigate(n.link); setShowNotif(false); }}
                          className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 ${!n.read ? 'bg-teal-50/30' : ''}`}
                        >
                          <span className="text-2xl shrink-0 mt-0.5">{n.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900 truncate">{n.title}</p>
                            {n.body && <p className="text-xs text-gray-400 truncate mt-0.5">{n.body}</p>}
                            <p className="text-xs text-gray-300 mt-1">{timeAgo(n.at)}</p>
                          </div>
                          {!n.read && <span className="w-2 h-2 bg-teal-500 rounded-full shrink-0 mt-2" />}
                        </button>
                      ))
                    )}
                  </div>

                  {/* Footer */}
                  <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
                    <Link to="/mon-espace" onClick={() => setShowNotif(false)}
                      className="text-xs text-teal-600 font-bold hover:text-teal-700 flex items-center gap-1">
                      Voir toutes mes activités →
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Langue */}
          <div className="relative">
            <button onClick={() => setShowLang(v => !v)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-xl text-sm font-semibold bg-gray-50 hover:bg-gray-100 transition-colors">
              <span>{LANGUAGES.find(l => l.code === lang)?.flag}</span>
              <span className="hidden sm:inline text-gray-600 uppercase text-xs">{lang}</span>
            </button>
            <AnimatePresence>
              {showLang && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-10 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 w-44 z-50">
                  {LANGUAGES.map(l => (
                    <button key={l.code} onClick={() => { setLang(l.code); setShowLang(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium hover:bg-teal-50 transition-colors ${lang === l.code ? 'text-teal-600 font-bold' : 'text-gray-700'}`}>
                      <span>{l.flag}</span><span>{l.label}</span>
                      {lang === l.code && <span className="ml-auto text-teal-500">✓</span>}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Low Stim */}
          <button onClick={toggleLowStim} title={t.settings.lowStim}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${lowStimMode ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
            🧘
          </button>

          {/* Avatar utilisateur → Mon espace */}
          <Link to="/mon-espace" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-teal-100 border-2 border-teal-200 flex items-center justify-center">
              {user?.avatar
                ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                : <span className="text-sm font-black text-teal-600">{user?.name?.[0]}</span>
              }
            </div>
            <span className="text-sm font-semibold text-gray-700 hidden sm:inline">{user?.name?.split(' ')[0]}</span>
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
