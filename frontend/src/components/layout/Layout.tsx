import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../../stores/useStore';
import { useI18n, LANGUAGES } from '../../lib/i18n';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Layout() {
  const { user, toggleLowStim, lowStimMode, logout } = useAppStore();
  const { t, lang, setLang } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const isDashboard = location.pathname === '/dashboard';
  const [showLang, setShowLang] = useState(false);

  const navItems = [
    { to: '/dashboard', icon: '🏠', label: t.nav.dashboard },
    { to: '/profile/me', icon: '🧠', label: t.nav.profile },
    { to: '/circle', icon: '💜', label: t.nav.circle },
    { to: '/community', icon: '🌐', label: t.nav.community },
    { to: '/settings', icon: '⚙️', label: t.nav.settings },
  ];

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      {/* Header — max 5 éléments, toujours visible */}
      <header className="bg-white border-b border-gray-100 px-4 h-14 flex items-center justify-between flex-shrink-0 z-40">
        {/* Logo */}
        <button
          onClick={() => navigate('/dashboard')}
          className="text-lg font-black text-teal-500 flex items-center gap-2"
          style={{ fontFamily: 'DM Sans' }}
        >
          🧠 <span className="hidden sm:inline">FocusBrain</span>
        </button>

        {/* Nav centrale — max 5 items */}
        <nav className="flex items-center gap-1" role="navigation" aria-label="Navigation principale">
          {navItems.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              title={link.label}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors duration-200 ${
                  isActive
                    ? 'bg-teal-50 text-teal-700'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                }`
              }
            >
              <span aria-hidden="true">{link.icon}</span>
              <span className="hidden lg:inline">{link.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Actions droite — Low Stim + Langue + User */}
        <div className="flex items-center gap-2">
          {/* Sélecteur de langue */}
          <div className="relative">
            <button
              onClick={() => setShowLang(v => !v)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-xl text-sm font-semibold bg-gray-50 hover:bg-gray-100 transition-colors"
              aria-label="Changer de langue"
            >
              <span>{LANGUAGES.find(l => l.code === lang)?.flag}</span>
              <span className="hidden sm:inline text-gray-600 uppercase text-xs">{lang}</span>
            </button>
            <AnimatePresence>
              {showLang && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-10 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 w-44 z-50"
                >
                  {LANGUAGES.map(l => (
                    <button
                      key={l.code}
                      onClick={() => { setLang(l.code); setShowLang(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium hover:bg-teal-50 transition-colors ${lang === l.code ? 'text-teal-600 font-bold' : 'text-gray-700'}`}
                    >
                      <span>{l.flag}</span>
                      <span>{l.label}</span>
                      {lang === l.code && <span className="ml-auto text-teal-500">✓</span>}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Low Stim — accessible partout, 1 clic */}
          <button
            onClick={toggleLowStim}
            title={t.settings.lowStim}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors duration-200 ${
              lowStimMode ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
            aria-pressed={lowStimMode}
          >
            🧘
          </button>

          {/* User */}
          <span className="text-sm font-semibold text-gray-700 hidden sm:inline">{user?.name}</span>
          {user?.isPremium && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-bold hidden sm:inline">
              ⭐
            </span>
          )}
        </div>
      </header>

      {/* Contenu principal */}
      <main className={`flex-1 ${isDashboard ? 'overflow-hidden' : 'overflow-auto'}`}>
        <Outlet />
      </main>
    </div>
  );
}
