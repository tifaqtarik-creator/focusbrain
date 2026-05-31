import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../stores/useStore';

export default function Layout() {
  const { user, toggleLowStim, lowStimMode } = useAppStore();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 h-16 flex items-center justify-between sticky top-0 z-50">
        <button onClick={() => navigate('/dashboard')} className="text-xl font-black text-teal-500" style={{ fontFamily: 'DM Sans' }}>
          🧠 FocusBrain
        </button>

        <div className="flex items-center gap-4">
          {/* Low Stim toggle — accessible depuis partout */}
          <button
            onClick={toggleLowStim}
            title="Mode Low Stimulation"
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${lowStimMode ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
            aria-label="Activer/désactiver le mode Low Stimulation"
          >
            🧘 Low Stim
          </button>

          <span className="text-sm text-gray-600 font-medium">{user?.name}</span>
          {user?.isPremium && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-semibold">Premium</span>}
        </div>
      </header>

      <div className="flex">
        {/* Sidebar nav */}
        <nav className="w-56 bg-white border-r border-gray-100 min-h-[calc(100vh-4rem)] p-4 space-y-1">
          {[
            { to: '/dashboard', icon: '🏠', label: 'Dashboard' },
            { to: '/profile/me', icon: '🧠', label: 'Mon profil' },
            { to: '/circle', icon: '💜', label: 'Cercle' },
            { to: '/community', icon: '🌐', label: 'Communauté' },
            { to: '/settings', icon: '⚙️', label: 'Préférences' },
          ].map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  isActive ? 'bg-teal-50 text-teal-700' : 'text-gray-600 hover:bg-gray-50'
                }`
              }
            >
              <span>{link.icon}</span>
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Contenu */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
