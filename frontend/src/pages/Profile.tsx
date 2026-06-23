import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { Sprout, Star, Brain, Heart, Sunrise, Trophy, Coffee, Timer, Handshake, Loader2 } from 'lucide-react';
import api from '../lib/api';
import { useI18n } from '../lib/i18n';

const BADGE_INFO: Record<string, { Icon: LucideIcon; label: string; message: string }> = {
  PREMIER_PAS: { Icon: Sprout, label: 'Premier pas', message: 'Ton cerveau TDAH vient de faire quelque chose de difficile.' },
  REGULIER: { Icon: Star, label: 'Régulier', message: '10 fois tu as choisi de commencer. C\'est énorme.' },
  BODY_DOUBLER: { Icon: Brain, label: 'Body Doubler', message: 'Tu es maintenant un expert du Body Doubling.' },
  CERCLE_FIDELE: { Icon: Heart, label: 'Cercle Fidèle', message: 'La régularité est ta superforce.' },
  EARLY_ACTIVATOR: { Icon: Sunrise, label: 'Early Activator', message: 'Ton cerveau TDAH carbure tôt.' },
  REBOUND_CHAMPION: { Icon: Trophy, label: 'Rebound Champion', message: 'Tu es revenu. C\'est le plus difficile. Bravo.' },
  BRAIN_BREAK_MASTER: { Icon: Coffee, label: 'Brain Break Master', message: 'Tu écoutes ton cerveau.' },
};

export default function Profile() {
  const { t } = useI18n();
  const p = t.profile;

  const { data: user, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get('/users/me').then(r => r.data),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center py-20 text-ink-400">
      <Loader2 size={28} strokeWidth={2} className="animate-spin mr-2" /> {t.common.loading}
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
        <h1 className="text-2xl font-black text-ink-900">{user.name}</h1>
        <p className="flex items-center justify-center gap-1 text-teal-600 font-semibold mt-1">
          {user.tdahType?.replace(/_/g, ' ') || 'TDAH'}
          {user.isPremium && (
            <span className="ml-2 inline-flex items-center gap-1 text-amber-500">
              <Star size={14} strokeWidth={2} className="fill-current" /> Premium
            </span>
          )}
        </p>
      </motion.div>

      {/* Stats — 3 cartes, pas plus */}
      <section className="mb-10">
        <h2 className="text-sm font-bold text-ink-500 uppercase tracking-wide mb-4">{p.stats}</h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { val: user.stats?.totalSessions ?? 0, label: p.totalSessions, Icon: Brain, color: 'text-teal-600' },
            { val: `${focusH}h${focusM}m`, label: p.focusHours, Icon: Timer, color: 'text-violet-600' },
            { val: user.stats?.uniquePartners ?? 0, label: p.partners, Icon: Handshake, color: 'text-teal-600' },
          ].map(s => (
            <div key={s.label} className="bg-white border border-line rounded-2xl p-5 text-center">
              <s.Icon size={24} strokeWidth={2} className={`mx-auto mb-1 ${s.color}`} />
              <div className={`text-2xl font-black ${s.color}`}>{s.val}</div>
              <div className="text-xs text-ink-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Badges — grille 2 colonnes */}
      <section>
        <h2 className="text-sm font-bold text-ink-500 uppercase tracking-wide mb-4">{p.badges}</h2>
        {(!user.badges || user.badges.length === 0) ? (
          <div className="bg-teal-50 rounded-2xl p-8 text-center">
            <Sprout size={36} strokeWidth={2} className="mx-auto mb-3 text-teal-600" />
            <p className="text-ink-500">{p.noBadges}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {user.badges.map((b: { type: string }) => {
              const info = BADGE_INFO[b.type];
              if (!info) return null;
              const BadgeIcon = info.Icon;
              return (
                <motion.div
                  key={b.type}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white border border-line rounded-2xl p-5"
                >
                  <BadgeIcon size={28} strokeWidth={2} className="mb-2 text-teal-600" />
                  <div className="font-bold text-ink-900 text-sm">{info.label}</div>
                  <div className="text-xs text-ink-400 mt-1 italic">"{info.message}"</div>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
