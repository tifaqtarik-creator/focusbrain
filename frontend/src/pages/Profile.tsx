import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import api from '../lib/api';
import { useI18n } from '../lib/i18n';

const BADGE_INFO: Record<string, { emoji: string; label: string; message: string }> = {
  PREMIER_PAS: { emoji: '🌱', label: 'Premier pas', message: 'Ton cerveau TDAH vient de faire quelque chose de difficile.' },
  REGULIER: { emoji: '⭐', label: 'Régulier', message: '10 fois tu as choisi de commencer. C\'est énorme.' },
  BODY_DOUBLER: { emoji: '🧠', label: 'Body Doubler', message: 'Tu es maintenant un expert du Body Doubling.' },
  CERCLE_FIDELE: { emoji: '💜', label: 'Cercle Fidèle', message: 'La régularité est ta superforce.' },
  EARLY_ACTIVATOR: { emoji: '🌅', label: 'Early Activator', message: 'Ton cerveau TDAH carbure tôt.' },
  REBOUND_CHAMPION: { emoji: '🏆', label: 'Rebound Champion', message: 'Tu es revenu. C\'est le plus difficile. Bravo.' },
  BRAIN_BREAK_MASTER: { emoji: '☕', label: 'Brain Break Master', message: 'Tu écoutes ton cerveau.' },
};

export default function Profile() {
  const { t } = useI18n();
  const p = t.profile;

  const { data: user, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get('/users/me').then(r => r.data),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center py-20 text-gray-400">
      <span className="animate-spin text-2xl mr-2">⏳</span> {t.common.loading}
    </div>
  );
  if (!user) return null;

  const focusH = Math.floor((user.stats?.focusMinutes ?? 0) / 60);
  const focusM = (user.stats?.focusMinutes ?? 0) % 60;

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      {/* En-tête profil — simple, aéré */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
        <div className="w-20 h-20 bg-teal-100 rounded-2xl flex items-center justify-center text-3xl font-black text-teal-600 mx-auto mb-4">
          {user.name[0].toUpperCase()}
        </div>
        <h1 className="text-2xl font-black text-gray-900">{user.name}</h1>
        <p className="text-teal-600 font-semibold mt-1">
          {user.tdahType?.replace(/_/g, ' ') || 'TDAH'}
          {user.isPremium && <span className="ml-2 text-amber-500">⭐ Premium</span>}
        </p>
      </motion.div>

      {/* Stats — 3 cartes, pas plus */}
      <section className="mb-10">
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">{p.stats}</h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { val: user.stats?.totalSessions ?? 0, label: p.totalSessions, icon: '🧠', color: 'text-teal-600' },
            { val: `${focusH}h${focusM}m`, label: p.focusHours, icon: '⏱️', color: 'text-violet-600' },
            { val: user.stats?.uniquePartners ?? 0, label: p.partners, icon: '🤝', color: 'text-amber-600' },
          ].map(s => (
            <div key={s.label} className="bg-white border border-gray-100 rounded-2xl p-5 text-center">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className={`text-2xl font-black ${s.color}`}>{s.val}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Badges — grille 2 colonnes */}
      <section>
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">{p.badges}</h2>
        {(!user.badges || user.badges.length === 0) ? (
          <div className="bg-teal-50 rounded-2xl p-8 text-center">
            <div className="text-4xl mb-3">🌱</div>
            <p className="text-gray-600">{p.noBadges}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {user.badges.map((b: { type: string }) => {
              const info = BADGE_INFO[b.type];
              if (!info) return null;
              return (
                <motion.div
                  key={b.type}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white border border-gray-100 rounded-2xl p-5"
                >
                  <div className="text-3xl mb-2">{info.emoji}</div>
                  <div className="font-bold text-gray-900 text-sm">{info.label}</div>
                  <div className="text-xs text-gray-400 mt-1 italic">"{info.message}"</div>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
