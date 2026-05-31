import { useAppStore } from '../stores/useStore';
import { motion } from 'framer-motion';
import api from '../lib/api';

export default function Settings() {
  const { user, toggleLowStim, lowStimMode, logout } = useAppStore();

  const handleDelete = async () => {
    if (!confirm('Supprimer définitivement ton compte ? Toutes tes données seront effacées sous 72h (RGPD).')) return;
    await api.delete('/users/me');
    logout();
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <h1 className="text-2xl font-black mb-8">Préférences</h1>

      {/* Mode Low Stim — activable depuis n'importe quelle page */}
      <div className="bg-white border-2 border-gray-100 rounded-2xl p-6 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold">Mode Low Stimulation</div>
            <div className="text-sm text-gray-500">Fond blanc, aucune animation, police 18px</div>
          </div>
          <button
            onClick={toggleLowStim}
            className={`w-12 h-6 rounded-full transition-colors ${lowStimMode ? 'bg-teal-500' : 'bg-gray-300'}`}
            aria-checked={lowStimMode}
            role="switch"
            aria-label="Mode Low Stimulation"
          >
            <span className={`block w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${lowStimMode ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white border-2 border-gray-100 rounded-2xl p-6 mb-4">
        <h2 className="font-bold mb-3">Politique de notifications</h2>
        <ul className="space-y-2 text-sm">
          {[
            { allowed: true, text: 'Partenaire du cercle disponible' },
            { allowed: true, text: 'Session réservée dans 10 minutes' },
            { allowed: true, text: 'Nouveau message privé' },
            { allowed: false, text: '"Tu n\'as pas fait de session cette semaine"' },
            { allowed: false, text: 'Comparaisons de performance' },
          ].map(n => (
            <li key={n.text} className={`flex items-center gap-2 ${n.allowed ? 'text-teal-600' : 'text-gray-400 line-through'}`}>
              <span>{n.allowed ? '✅' : '🚫'}</span>
              <span>{n.text}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* RGPD */}
      <div className="bg-white border-2 border-gray-100 rounded-2xl p-6 mb-4">
        <h2 className="font-bold mb-3">Mes données (RGPD)</h2>
        <div className="flex gap-3">
          <button
            onClick={() => api.get('/users/me').then(r => {
              const blob = new Blob([JSON.stringify(r.data, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = 'focusbrain-data.json'; a.click();
            })}
            className="text-sm text-teal-600 border border-teal-200 px-4 py-2 rounded-xl hover:bg-teal-50 transition-colors"
          >
            Exporter mes données
          </button>
          <button
            onClick={handleDelete}
            className="text-sm text-red-500 border border-red-200 px-4 py-2 rounded-xl hover:bg-red-50 transition-colors"
          >
            Supprimer mon compte
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">Suppression complète sous 72h · Données de santé TDAH jamais partagées</p>
      </div>

      <button onClick={logout} className="text-gray-400 hover:text-gray-600 text-sm mt-4">
        Se déconnecter
      </button>
    </div>
  );
}
