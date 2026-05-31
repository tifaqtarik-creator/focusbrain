import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import api from '../lib/api';

const BADGE_INFO: Record<string, { emoji: string; label: string; message: string }> = {
  PREMIER_PAS: { emoji: '🌱', label: 'Premier pas', message: 'Ton cerveau TDAH vient de faire quelque chose de difficile.' },
  REGULIER: { emoji: '⭐', label: 'Régulier', message: '10 fois tu as choisi de commencer. C\'est énorme.' },
  BODY_DOUBLER: { emoji: '🧠', label: 'Body Doubler', message: 'Tu es maintenant un expert du Body Doubling.' },
  CERCLE_FIDELE: { emoji: '💜', label: 'Cercle Fidèle', message: 'La régularité est la superforce des cerveaux TDAH.' },
  EARLY_ACTIVATOR: { emoji: '🌅', label: 'Early Activator', message: 'Ton cerveau TDAH carbure tôt. Impressionnant.' },
  REBOUND_CHAMPION: { emoji: '🏆', label: 'Rebound Champion', message: 'Tu es revenu. C\'est le plus difficile. Bravo.' },
  BRAIN_BREAK_MASTER: { emoji: '☕', label: 'Brain Break Master', message: 'Tu écoutes ton cerveau. C\'est la vraie sagesse TDAH.' },
};

export default function Profile() {
  const { data: user, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get('/users/me').then(r => r.data),
  });

  if (isLoading) return <div className="text-center py-20 text-gray-400">Chargement...</div>;
  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      {/* Header profil */}
      <div className="flex items-center gap-6 mb-12">
        <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center text-3xl font-black text-teal-600">
          {user.name[0].toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-black">{user.name}</h1>
          <p className="text-gray-500">{user.tdahType?.replace('_', ' ') || 'TDAH'} · {user.isPremium ? '⭐ Premium' : 'Gratuit'}</p>
        </div>
      </div>

      {/* Stats positives uniquement — jamais de périodes creuses */}
      <div className="grid grid-cols-3 gap-4 mb-12">
        {[
          { val: user.stats?.totalSessions ?? 0, label: 'Sessions totales', icon: '🧠' },
          { val: `${Math.floor((user.stats?.focusMinutes ?? 0) / 60)}h ${(user.stats?.focusMinutes ?? 0) % 60}m`, label: 'Heures de focus', icon: '⏱️' },
          { val: user.stats?.uniquePartners ?? 0, label: 'Partenaires rencontrés', icon: '🤝' },
        ].map(s => (
          <div key={s.label} className="bg-teal-50 rounded-2xl p-6 text-center">
            <div className="text-3xl mb-1">{s.icon}</div>
            <div className="text-2xl font-black text-teal-600">{s.val}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Badges TDAH-affirmatifs */}
      <h2 className="text-xl font-bold mb-6">Tes badges</h2>
      {user.badges?.length === 0 ? (
        <p className="text-gray-400">Fais ta première session pour débloquer ton premier badge !</p>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {user.badges.map((b: { type: string }) => {
            const info = BADGE_INFO[b.type];
            if (!info) return null;
            return (
              <motion.div
                key={b.type}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white border-2 border-teal-100 rounded-2xl p-5"
              >
                <div className="text-4xl mb-2">{info.emoji}</div>
                <div className="font-bold">{info.label}</div>
                <div className="text-sm text-gray-500 mt-1 italic">"{info.message}"</div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
