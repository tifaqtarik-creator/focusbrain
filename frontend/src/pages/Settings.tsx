import { useAppStore } from '../stores/useStore';
import { useI18n, LANGUAGES } from '../lib/i18n';
import api from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function Settings() {
  const { user, toggleLowStim, lowStimMode, logout } = useAppStore();
  const { t, lang, setLang } = useI18n();
  const s = t.settings;
  const navigate = useNavigate();

  const handleDelete = async () => {
    if (!confirm(s.deleteConfirm)) return;
    await api.delete('/users/me');
    logout();
    navigate('/');
  };

  const handleExport = async () => {
    const res = await api.get('/users/me');
    const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'focusbrain-mes-donnees.json'; a.click();
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <h1 className="text-2xl font-black text-gray-900 mb-8">{s.title}</h1>

      <div className="space-y-3">
        {/* Langue — 1 choix visible */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-gray-100 rounded-2xl p-5">
          <h2 className="font-bold text-gray-900 mb-4">{s.language}</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {LANGUAGES.map(l => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                  lang === l.code
                    ? 'bg-teal-500 text-white'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span>{l.flag}</span>
                <span>{l.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Low Stim — toggle simple */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-white border border-gray-100 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-gray-900">{s.lowStim}</h2>
              <p className="text-sm text-gray-500 mt-0.5">{s.lowStimDesc}</p>
            </div>
            <button
              onClick={toggleLowStim}
              className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${lowStimMode ? 'bg-teal-500' : 'bg-gray-200'}`}
              aria-pressed={lowStimMode} role="switch"
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${lowStimMode ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
        </motion.div>

        {/* Notifications — liste simple */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white border border-gray-100 rounded-2xl p-5">
          <h2 className="font-bold text-gray-900 mb-3">{s.notifications}</h2>
          <ul className="space-y-2">
            {[
              { ok: true, text: 'Partenaire du cercle disponible' },
              { ok: true, text: 'Session dans 10 minutes' },
              { ok: true, text: 'Nouveau message' },
              { ok: false, text: '"Tu n\'as pas travaillé cette semaine"' },
              { ok: false, text: 'Comparaisons de performance' },
            ].map(n => (
              <li key={n.text} className="flex items-center gap-2 text-sm">
                <span>{n.ok ? '✅' : '🚫'}</span>
                <span className={n.ok ? 'text-gray-700' : 'text-gray-400 line-through'}>{n.text}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Données RGPD */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-white border border-gray-100 rounded-2xl p-5">
          <h2 className="font-bold text-gray-900 mb-3">{s.myData}</h2>
          <div className="flex flex-col gap-2">
            <button onClick={handleExport} className="flex items-center gap-2 text-sm text-teal-600 font-semibold px-4 py-2.5 border border-teal-200 rounded-xl hover:bg-teal-50 transition-colors">
              📥 {s.export}
            </button>
            <button onClick={handleDelete} className="flex items-center gap-2 text-sm text-red-500 font-semibold px-4 py-2.5 border border-red-100 rounded-xl hover:bg-red-50 transition-colors">
              🗑️ {s.delete}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-3">{s.deleteNote}</p>
        </motion.div>

        {/* Déconnexion */}
        <button
          onClick={() => { logout(); navigate('/'); }}
          className="w-full text-gray-400 hover:text-gray-600 text-sm py-3 transition-colors font-medium"
        >
          {s.logout}
        </button>
      </div>
    </div>
  );
}
