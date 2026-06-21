/**
 * MonEspace.tsx — Tableau de bord personnel TDAH
 * KPIs positifs · Activité récente · Badges · Objectifs
 * Règle TDAH : jamais de culpabilité, toujours encourageant
 */
import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { useAppStore } from '../stores/useStore';

// ── Config ─────────────────────────────────────────────────────────────────────

const SPACE_LABELS: Record<string, { label: string; emoji: string }> = {
  STRATEGIES_TDAH: { label: 'Stratégies TDAH', emoji: '🧠' },
  MEDICATION:      { label: 'Médication',       emoji: '💊' },
  OUTILS:          { label: 'Outils',           emoji: '🛠️' },
  TRAVAIL:         { label: 'Travail',          emoji: '💼' },
  ETUDES:          { label: 'Études',           emoji: '📚' },
  VIE_PERSO:       { label: 'Vie perso',        emoji: '💜' },
};

const TDAH_LABELS: Record<string, string> = {
  INATTENTIF:   '🌊 Inattentif',
  HYPERACTIF:   '⚡ Hyperactif',
  COMBINE:      '🌀 Combiné',
  NON_SPECIFIE: '❓ TDAH',
};

const WORK_STYLE: Record<string, string> = {
  SOCIAL:     '👥 Social',
  SILENCIEUX: '🤫 Silencieux',
  FLEXIBLE:   '🔀 Flexible',
};

// ── Composant KPI Card ─────────────────────────────────────────────────────────

function KpiCard({ emoji, value, label, sub, color = 'teal', trend }: {
  emoji: string; value: number | string; label: string; sub?: string;
  color?: 'teal' | 'purple' | 'amber' | 'green' | 'blue' | 'pink';
  trend?: number;
}) {
  const colors = {
    teal:   'from-teal-50 to-teal-100 border-teal-200 text-teal-600',
    purple: 'from-purple-50 to-purple-100 border-purple-200 text-purple-600',
    amber:  'from-amber-50 to-amber-100 border-amber-200 text-amber-600',
    green:  'from-green-50 to-green-100 border-green-200 text-green-600',
    blue:   'from-blue-50 to-blue-100 border-blue-200 text-blue-600',
    pink:   'from-pink-50 to-pink-100 border-pink-200 text-pink-600',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br ${colors[color]} border rounded-2xl p-5`}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-2xl">{emoji}</span>
        {trend !== undefined && trend > 0 && (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
            +{trend} cette semaine
          </span>
        )}
      </div>
      <p className="text-3xl font-black text-gray-900 mb-0.5">{value}</p>
      <p className="text-sm font-bold text-gray-700">{label}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </motion.div>
  );
}

// ── Page principale ────────────────────────────────────────────────────────────

export default function MonEspace() {
  const user = useAppStore(s => s.user);
  const updateUser = useAppStore(s => s.updateUser);

  // Upload photo de profil
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState('');

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setPhotoError('Image trop lourde (5 Mo max)'); return; }
    setPhotoError(''); setUploading(true);
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const res = await api.post('/users/me/avatar', fd);
      updateUser({ avatar: res.data.avatar });            // met à jour le store (header, calendrier…)
    } catch (err: any) {
      setPhotoError(err?.response?.data?.error || 'Erreur lors de l\'envoi');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['my-stats'],
    queryFn: () => api.get('/users/me/stats').then(r => r.data),
    staleTime: 60000,
  });

  // Stats Body Doubling (transférées depuis le Dashboard) — Sessions / Moi / Plateforme
  const { data: bd, isLoading: bdLoading } = useQuery({
    queryKey: ['bd-stats'],
    queryFn: () => api.get('/slots/stats').then(r => r.data),
    staleTime: 60000,
  });


  const timeAgo = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'aujourd\'hui';
    if (days === 1) return 'hier';
    return `il y a ${days}j`;
  };

  // Messages d'encouragement selon l'activité
  const getEncouragement = () => {
    if (!stats) return '💜 Ton espace TDAH personnel';
    const total = (stats.totalPosts || 0) + (stats.bdSessions || 0) + (stats.meetingsConfirmed || 0);
    if (total === 0) return '🌱 Commence ton aventure FocusBrain !';
    if (total < 5)  return '🚀 Tu démarres bien, continue !';
    if (total < 20) return '⚡ Tu progresses super bien !';
    return '🏆 Tu es un pilier de la communauté TDAH !';
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

      {/* ── En-tête profil ─────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-3xl p-6 text-white"
      >
        <div className="flex items-center gap-5">
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              title="Changer ma photo de profil"
              aria-label="Changer ma photo de profil"
              className="relative group w-20 h-20 rounded-2xl overflow-hidden border-4 border-white/30 block focus:outline-none focus:ring-2 focus:ring-white/60"
            >
              {user?.avatar
                ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-teal-400 flex items-center justify-center text-white font-black text-3xl">{user?.name?.[0]}</div>
              }
              {/* Overlay au survol / pendant l'upload */}
              <span className={`absolute inset-0 flex items-center justify-center bg-black/45 text-white text-xl transition-opacity ${uploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                {uploading ? '⏳' : '📷'}
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handlePhotoChange}
              className="hidden"
            />
            {photoError && <p className="text-[11px] text-amber-100 bg-red-500/40 rounded px-1.5 py-0.5 mt-1 max-w-[88px]">{photoError}</p>}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-black mb-1">{user?.name}</h1>
            <div className="flex flex-wrap gap-2 mb-2">
              {user?.tdahType && (
                <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-semibold">
                  {TDAH_LABELS[user.tdahType] || user.tdahType}
                </span>
              )}
              {user?.workStyle && (
                <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-semibold">
                  {WORK_STYLE[user.workStyle] || user.workStyle}
                </span>
              )}
              {user?.isPremium && (
                <span className="bg-amber-400 text-amber-900 px-3 py-1 rounded-full text-sm font-black">
                  ⭐ Premium
                </span>
              )}
            </div>
            <p className="text-white/80 text-sm">{getEncouragement()}</p>
          </div>
          <Link to="/settings"
            className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors shrink-0">
            ✏️ Modifier
          </Link>
        </div>
      </motion.div>

      {/* ── KPIs — Contributions communauté ───────────────────────────────── */}
      <section>
        <h2 className="text-lg font-black text-gray-900 mb-4">🌐 Mes contributions à la communauté</h2>
        {statsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="bg-gray-100 rounded-2xl p-5 animate-pulse h-28" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard emoji="📝" value={stats?.totalPosts || 0}
              label="Posts publiés"
              sub={`${stats?.postsThisWeek || 0} cette semaine`}
              trend={stats?.postsThisWeek}
              color="teal" />
            <KpiCard emoji="💬" value={stats?.totalReplies || 0}
              label="Réponses données"
              sub={`${stats?.repliesThisWeek || 0} cette semaine`}
              trend={stats?.repliesThisWeek}
              color="blue" />
            <KpiCard emoji="❤️" value={stats?.totalReactionsReceived || 0}
              label="Réactions reçues"
              sub="sur tes posts"
              color="pink" />
            <KpiCard emoji="💭" value={stats?.repliesOnMyPosts || 0}
              label="Réponses reçues"
              sub={`${stats?.repliesThisWeekOnMyPosts || 0} cette semaine`}
              trend={stats?.repliesThisWeekOnMyPosts}
              color="purple" />
          </div>
        )}
      </section>

      {/* ── KPIs — Connexions & Sessions ──────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-black text-gray-900 mb-4">🤝 Mes connexions & sessions</h2>
        {statsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="bg-gray-100 rounded-2xl p-5 animate-pulse h-28" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard emoji="💜" value={stats?.circleSize || 0}
              label="Cercle de confiance"
              sub="membres proches"
              color="purple" />
            <KpiCard emoji="✉️" value={stats?.messagesSent || 0}
              label="Messages envoyés"
              sub={`${stats?.messagesThisWeek || 0} cette semaine`}
              trend={stats?.messagesThisWeek}
              color="teal" />
            <KpiCard emoji="🎯" value={stats?.bdSessions || 0}
              label="Sessions body doubling"
              sub={`${stats?.bdSessionsWeek || 0} cette semaine`}
              trend={stats?.bdSessionsWeek}
              color="amber" />
            <KpiCard emoji="🤝" value={stats?.meetingsConfirmed || 0}
              label="Rencontres réelles"
              sub="confirmées"
              color="green" />
          </div>
        )}
      </section>

      {/* ── Body Doubling — MOI (transféré depuis le Dashboard) ───────────── */}
      <section>
        <h2 className="text-lg font-black text-gray-900 mb-4">⭐ Mon Body Doubling</h2>
        {bdLoading || !bd ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="bg-gray-100 rounded-2xl p-5 animate-pulse h-28" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard emoji="🎯" value={bd.user.sessionsCompleted} label="Sessions complétées" sub="body doubling" color="teal" />
            <KpiCard emoji="💜" value={bd.user.points} label="Points" sub="cumulés (jamais perdus)" color="purple" />
            <KpiCard emoji="⭐" value={bd.user.averageRating != null ? `${bd.user.averageRating}/5` : '—'} label="Note moyenne" sub={`${bd.user.reviewCount} avis reçu${bd.user.reviewCount > 1 ? 's' : ''}`} color="amber" />
            <KpiCard emoji="🤝" value={bd.user.matchSuccessRate != null ? `${bd.user.matchSuccessRate}%` : '—'} label="Taux d'appariement" sub="demandes confirmées" color="green" />
          </div>
        )}
      </section>

      {/* ── Body Doubling — SESSIONS (plateforme) ─────────────────────────── */}
      <section>
        <h2 className="text-lg font-black text-gray-900 mb-4">📅 Les sessions en direct</h2>
        {bdLoading || !bd ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="bg-gray-100 rounded-2xl p-5 animate-pulse h-28" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard emoji="✅" value={bd.sessions.completed} label="Terminées" sub="au total" color="green" />
            <KpiCard emoji="📅" value={bd.sessions.upcoming} label="À venir" sub="programmées" color="teal" />
            <KpiCard emoji="🟢" value={bd.sessions.active} label="Actives" sub="en ce moment" color="blue" />
            <KpiCard emoji="⚪" value={bd.sessions.cancelled} label="Annulées" sub="au total" color="amber" />
          </div>
        )}
      </section>

      {/* ── Body Doubling — PLATEFORME ────────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-black text-gray-900 mb-4">🌐 La plateforme FocusBrain</h2>
        {bdLoading || !bd ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="bg-gray-100 rounded-2xl p-5 animate-pulse h-28" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <KpiCard emoji="👥" value={bd.platform.activeUsers} label="Membres actifs" sub="ont déjà lancé une session" color="purple" />
            <KpiCard emoji="📆" value={bd.platform.completedThisWeek} label="Sessions cette semaine" sub="terminées" color="teal" />
            <KpiCard emoji="🗓️" value={bd.platform.completedThisMonth} label="Sessions ce mois" sub="terminées" color="pink" />
          </div>
        )}
      </section>

      {/* ── Score d'impact TDAH ───────────────────────────────────────────── */}
      {stats && (
        <section>
          <h2 className="text-lg font-black text-gray-900 mb-4">⚡ Ton impact sur la communauté TDAH</h2>
          <div className="bg-gradient-to-br from-purple-50 to-teal-50 rounded-2xl p-6 border border-purple-100">
            {(() => {
              const score = Math.min(100,
                (stats.totalPosts || 0) * 5 +
                (stats.totalReplies || 0) * 3 +
                (stats.totalReactionsReceived || 0) * 1 +
                (stats.bdSessions || 0) * 8 +
                (stats.circleSize || 0) * 10 +
                (stats.meetingsConfirmed || 0) * 15
              );
              const level = score < 10 ? { label: '🌱 Débutant', color: 'bg-gray-300' }
                : score < 30  ? { label: '🌿 En croissance', color: 'bg-green-400' }
                : score < 60  ? { label: '⚡ Actif', color: 'bg-teal-500' }
                : score < 90  ? { label: '🔥 Super contributeur', color: 'bg-purple-500' }
                : { label: '🏆 Pilier TDAH', color: 'bg-amber-500' };

              return (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-black text-gray-900 text-lg">{level.label}</span>
                    <span className="text-2xl font-black text-gray-900">{score}<span className="text-base text-gray-400">/100</span></span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${score}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className={`h-4 rounded-full ${level.color}`}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Basé sur tes posts, réponses, sessions body doubling et rencontres ·
                    {score < 100 && ` ${100 - score} points pour le niveau suivant`}
                  </p>
                </div>
              );
            })()}
          </div>
        </section>
      )}

      {/* ── Mes posts récents ────────────────────────────────────────────── */}
      {stats?.recentPosts?.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-gray-900">📝 Mes posts récents</h2>
            <Link to="/community" className="text-sm text-teal-600 font-bold hover:text-teal-700">
              Voir tout →
            </Link>
          </div>
          <div className="space-y-3">
            {stats.recentPosts.map((post: any, i: number) => {
              const space = SPACE_LABELS[post.spaceId] || { label: post.spaceId, emoji: '📝' };
              const reactions = Object.values((post.emojiReactions || {}) as Record<string, number>)
                .reduce((a: any, b: any) => a + b, 0);
              return (
                <motion.div key={post.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="bg-white border border-gray-100 rounded-2xl p-4 flex items-start gap-4 hover:shadow-sm transition-shadow"
                >
                  <span className="text-2xl shrink-0">{space.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm truncate">{post.title || post.content.slice(0, 60)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{space.label} · {timeAgo(post.createdAt)}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-gray-500">❤️ {reactions} réaction{reactions !== 1 ? 's' : ''}</span>
                      <span className="text-xs text-gray-500">💬 {post._count?.replies || 0} réponse{post._count?.replies !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <Link to="/community"
                    className="text-xs text-teal-600 font-bold hover:text-teal-700 shrink-0">
                    Voir →
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Message positif TDAH ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
        className="bg-gradient-to-br from-teal-50 to-purple-50 rounded-2xl p-6 text-center border border-teal-100"
      >
        <p className="text-3xl mb-2">💜</p>
        <p className="font-black text-gray-900 mb-1">Chaque contribution compte</p>
        <p className="text-gray-500 text-sm max-w-md mx-auto">
          Ton cerveau TDAH est une force pour cette communauté. Chaque post que tu publies,
          chaque réponse que tu donnes aide quelqu'un qui se sent seul avec le TDAH.
        </p>
        <div className="flex justify-center gap-3 mt-4">
          <Link to="/community"
            className="bg-teal-500 text-white font-bold px-5 py-2 rounded-xl text-sm hover:bg-teal-600 transition-colors">
            🌐 Aller à la communauté
          </Link>
          <Link to="/map"
            className="bg-purple-100 text-purple-700 font-bold px-5 py-2 rounded-xl text-sm hover:bg-purple-200 transition-colors">
            🗺️ Trouver des membres
          </Link>
        </div>
      </motion.div>

    </div>
  );
}
