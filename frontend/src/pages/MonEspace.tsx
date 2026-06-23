/**
 * MonEspace.tsx — Tableau de bord personnel TDAH
 * KPIs positifs · Activité récente · Badges · Objectifs
 * Règle TDAH : jamais de culpabilité, toujours encourageant
 */
import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  FileText, MessageSquare, Heart, MessageCircle, Mail, Target, Handshake,
  Users, Sprout, Zap, Flame, Trophy, Pencil, Camera, Star, CheckCircle2,
  CalendarDays, CalendarClock, Radio, Circle, Globe, Sparkles,
  Map, Leaf, Loader2, type LucideIcon,
} from 'lucide-react';
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

function KpiCard({ icon: Icon, value, label, sub, color = 'teal', trend }: {
  icon: LucideIcon; value: number | string; label: string; sub?: string;
  color?: 'teal' | 'purple' | 'amber' | 'green' | 'blue' | 'pink';
  trend?: number;
}) {
  const colors = {
    teal:   'bg-teal-50 border-line text-teal-600',
    purple: 'bg-violet-50 border-line text-violet-600',
    amber:  'bg-surface-soft border-line text-ink-500',
    green:  'bg-teal-50 border-line text-teal-600',
    blue:   'bg-surface-soft border-line text-ink-500',
    pink:   'bg-violet-50 border-line text-violet-600',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${colors[color]} border rounded-2xl p-5`}
    >
      <div className="flex items-start justify-between mb-2">
        <Icon size={24} strokeWidth={2} />
        {trend !== undefined && trend > 0 && (
          <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-bold">
            +{trend} cette semaine
          </span>
        )}
      </div>
      <p className="text-3xl font-black text-ink-900 mb-0.5">{value}</p>
      <p className="text-sm font-bold text-ink-700">{label}</p>
      {sub && <p className="text-xs text-ink-500 mt-0.5">{sub}</p>}
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
    if (!stats) return 'Ton espace TDAH personnel';
    const total = (stats.totalPosts || 0) + (stats.bdSessions || 0) + (stats.meetingsConfirmed || 0);
    if (total === 0) return 'Commence ton aventure FocusBrain !';
    if (total < 5)  return 'Tu démarres bien, continue !';
    if (total < 20) return 'Tu progresses super bien !';
    return 'Tu es un pilier de la communauté TDAH !';
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
              <span className={`absolute inset-0 flex items-center justify-center bg-black/45 text-white transition-opacity ${uploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                {uploading
                  ? <Loader2 size={20} strokeWidth={2} className="animate-spin" />
                  : <Camera size={20} strokeWidth={2} />}
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
                <span className="bg-white/25 text-white px-3 py-1 rounded-full text-sm font-black inline-flex items-center gap-1.5">
                  <Star size={14} strokeWidth={2} /> Premium
                </span>
              )}
            </div>
            <p className="text-white/80 text-sm">{getEncouragement()}</p>
          </div>
          <Link to="/settings"
            className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors shrink-0 inline-flex items-center gap-1.5">
            <Pencil size={16} strokeWidth={2} /> Modifier
          </Link>
        </div>
      </motion.div>

      {/* ── KPIs — Contributions communauté ───────────────────────────────── */}
      <section>
        <h2 className="text-lg font-black text-ink-900 mb-4 flex items-center gap-2">
          <Globe size={20} strokeWidth={2} className="text-teal-600" /> Mes contributions à la communauté
        </h2>
        {statsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="bg-surface-muted rounded-2xl p-5 animate-pulse h-28" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard icon={FileText} value={stats?.totalPosts || 0}
              label="Posts publiés"
              sub={`${stats?.postsThisWeek || 0} cette semaine`}
              trend={stats?.postsThisWeek}
              color="teal" />
            <KpiCard icon={MessageSquare} value={stats?.totalReplies || 0}
              label="Réponses données"
              sub={`${stats?.repliesThisWeek || 0} cette semaine`}
              trend={stats?.repliesThisWeek}
              color="blue" />
            <KpiCard icon={Heart} value={stats?.totalReactionsReceived || 0}
              label="Réactions reçues"
              sub="sur tes posts"
              color="pink" />
            <KpiCard icon={MessageCircle} value={stats?.repliesOnMyPosts || 0}
              label="Réponses reçues"
              sub={`${stats?.repliesThisWeekOnMyPosts || 0} cette semaine`}
              trend={stats?.repliesThisWeekOnMyPosts}
              color="purple" />
          </div>
        )}
      </section>

      {/* ── KPIs — Connexions & Sessions ──────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-black text-ink-900 mb-4 flex items-center gap-2">
          <Handshake size={20} strokeWidth={2} className="text-teal-600" /> Mes connexions & sessions
        </h2>
        {statsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="bg-surface-muted rounded-2xl p-5 animate-pulse h-28" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard icon={Heart} value={stats?.circleSize || 0}
              label="Cercle de confiance"
              sub="membres proches"
              color="purple" />
            <KpiCard icon={Mail} value={stats?.messagesSent || 0}
              label="Messages envoyés"
              sub={`${stats?.messagesThisWeek || 0} cette semaine`}
              trend={stats?.messagesThisWeek}
              color="teal" />
            <KpiCard icon={Target} value={stats?.bdSessions || 0}
              label="Sessions body doubling"
              sub={`${stats?.bdSessionsWeek || 0} cette semaine`}
              trend={stats?.bdSessionsWeek}
              color="amber" />
            <KpiCard icon={Handshake} value={stats?.meetingsConfirmed || 0}
              label="Rencontres réelles"
              sub="confirmées"
              color="green" />
          </div>
        )}
      </section>

      {/* ── Body Doubling — MOI (transféré depuis le Dashboard) ───────────── */}
      <section>
        <h2 className="text-lg font-black text-ink-900 mb-4 flex items-center gap-2">
          <Star size={20} strokeWidth={2} className="text-teal-600" /> Mon Body Doubling
        </h2>
        {bdLoading || !bd ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="bg-surface-muted rounded-2xl p-5 animate-pulse h-28" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard icon={Target} value={bd.user.sessionsCompleted} label="Sessions complétées" sub="body doubling" color="teal" />
            <KpiCard icon={Sparkles} value={bd.user.points} label="Points" sub="cumulés (jamais perdus)" color="purple" />
            <KpiCard icon={Star} value={bd.user.averageRating != null ? `${bd.user.averageRating}/5` : '—'} label="Note moyenne" sub={`${bd.user.reviewCount} avis reçu${bd.user.reviewCount > 1 ? 's' : ''}`} color="amber" />
            <KpiCard icon={Handshake} value={bd.user.matchSuccessRate != null ? `${bd.user.matchSuccessRate}%` : '—'} label="Taux d'appariement" sub="demandes confirmées" color="green" />
          </div>
        )}
      </section>

      {/* ── Body Doubling — SESSIONS (plateforme) ─────────────────────────── */}
      <section>
        <h2 className="text-lg font-black text-ink-900 mb-4 flex items-center gap-2">
          <CalendarDays size={20} strokeWidth={2} className="text-teal-600" /> Les sessions en direct
        </h2>
        {bdLoading || !bd ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="bg-surface-muted rounded-2xl p-5 animate-pulse h-28" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard icon={CheckCircle2} value={bd.sessions.completed} label="Terminées" sub="au total" color="green" />
            <KpiCard icon={CalendarDays} value={bd.sessions.upcoming} label="À venir" sub="programmées" color="teal" />
            <KpiCard icon={Radio} value={bd.sessions.active} label="Actives" sub="en ce moment" color="blue" />
            <KpiCard icon={Circle} value={bd.sessions.cancelled} label="Annulées" sub="au total" color="amber" />
          </div>
        )}
      </section>

      {/* ── Body Doubling — PLATEFORME ────────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-black text-ink-900 mb-4 flex items-center gap-2">
          <Globe size={20} strokeWidth={2} className="text-teal-600" /> La plateforme FocusBrain
        </h2>
        {bdLoading || !bd ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="bg-surface-muted rounded-2xl p-5 animate-pulse h-28" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <KpiCard icon={Users} value={bd.platform.activeUsers} label="Membres actifs" sub="ont déjà lancé une session" color="purple" />
            <KpiCard icon={CalendarDays} value={bd.platform.completedThisWeek} label="Sessions cette semaine" sub="terminées" color="teal" />
            <KpiCard icon={CalendarClock} value={bd.platform.completedThisMonth} label="Sessions ce mois" sub="terminées" color="pink" />
          </div>
        )}
      </section>

      {/* ── Score d'impact TDAH ───────────────────────────────────────────── */}
      {stats && (
        <section>
          <h2 className="text-lg font-black text-ink-900 mb-4 flex items-center gap-2">
            <Zap size={20} strokeWidth={2} className="text-teal-600" /> Ton impact sur la communauté TDAH
          </h2>
          <div className="bg-surface-soft rounded-2xl p-6 border border-line">
            {(() => {
              const score = Math.min(100,
                (stats.totalPosts || 0) * 5 +
                (stats.totalReplies || 0) * 3 +
                (stats.totalReactionsReceived || 0) * 1 +
                (stats.bdSessions || 0) * 8 +
                (stats.circleSize || 0) * 10 +
                (stats.meetingsConfirmed || 0) * 15
              );
              const level = score < 10 ? { label: 'Débutant', icon: Sprout, color: 'bg-ink-300' }
                : score < 30  ? { label: 'En croissance', icon: Leaf, color: 'bg-teal-400' }
                : score < 60  ? { label: 'Actif', icon: Zap, color: 'bg-teal-500' }
                : score < 90  ? { label: 'Super contributeur', icon: Flame, color: 'bg-violet-500' }
                : { label: 'Pilier TDAH', icon: Trophy, color: 'bg-violet-600' };
              const LevelIcon = level.icon;

              return (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-black text-ink-900 text-lg flex items-center gap-2">
                      <LevelIcon size={20} strokeWidth={2} className="text-teal-600" /> {level.label}
                    </span>
                    <span className="text-2xl font-black text-ink-900">{score}<span className="text-base text-ink-400">/100</span></span>
                  </div>
                  <div className="w-full bg-surface-muted rounded-full h-4">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${score}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className={`h-4 rounded-full ${level.color}`}
                    />
                  </div>
                  <p className="text-xs text-ink-500 mt-2">
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
            <h2 className="text-lg font-black text-ink-900 flex items-center gap-2">
              <FileText size={20} strokeWidth={2} className="text-teal-600" /> Mes posts récents
            </h2>
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
                  className="bg-white border border-line rounded-2xl p-4 flex items-start gap-4 hover:shadow-card transition-shadow"
                >
                  <span className="text-2xl shrink-0">{space.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-ink-900 text-sm truncate">{post.title || post.content.slice(0, 60)}</p>
                    <p className="text-xs text-ink-400 mt-0.5">{space.label} · {timeAgo(post.createdAt)}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-ink-500 inline-flex items-center gap-1"><Heart size={14} strokeWidth={2} /> {reactions} réaction{reactions !== 1 ? 's' : ''}</span>
                      <span className="text-xs text-ink-500 inline-flex items-center gap-1"><MessageSquare size={14} strokeWidth={2} /> {post._count?.replies || 0} réponse{post._count?.replies !== 1 ? 's' : ''}</span>
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
        className="bg-surface-soft rounded-2xl p-6 text-center border border-line"
      >
        <Heart size={32} strokeWidth={2} className="mx-auto mb-2 text-teal-600" />
        <p className="font-black text-ink-900 mb-1">Chaque contribution compte</p>
        <p className="text-ink-500 text-sm max-w-md mx-auto">
          Ton cerveau TDAH est une force pour cette communauté. Chaque post que tu publies,
          chaque réponse que tu donnes aide quelqu'un qui se sent seul avec le TDAH.
        </p>
        <div className="flex justify-center gap-3 mt-4">
          <Link to="/community"
            className="bg-teal-500 text-white font-bold px-5 py-2 rounded-xl text-sm hover:bg-teal-600 transition-colors inline-flex items-center gap-1.5">
            <Globe size={16} strokeWidth={2} /> Aller à la communauté
          </Link>
          <Link to="/map"
            className="bg-violet-100 text-violet-700 font-bold px-5 py-2 rounded-xl text-sm hover:bg-violet-200 transition-colors inline-flex items-center gap-1.5">
            <Map size={16} strokeWidth={2} /> Trouver des membres
          </Link>
        </div>
      </motion.div>

    </div>
  );
}
