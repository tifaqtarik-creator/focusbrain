import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe, MessageSquare, Pin, Search, Pencil, X, Users, Flame, Trash2,
  AlertTriangle, ImagePlus, Camera, Tag, Lightbulb, Clock, Send,
  Brain, Pill, Wrench, Briefcase, BookOpen, Heart,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import api from '../lib/api';
import { useAppStore } from '../stores/useStore';

// ── Config ─────────────────────────────────────────────────────────────────────

const SPACES = [
  { id: 'STRATEGIES_TDAH', label: 'Stratégies', Icon: Brain,     color: 'teal',   full: 'Stratégies TDAH',   desc: 'Astuces, techniques, routines' },
  { id: 'MEDICATION',      label: 'Médication', Icon: Pill,      color: 'purple', full: 'Médication',         desc: 'Traitements, effets, questions médicales' },
  { id: 'OUTILS',          label: 'Outils',     Icon: Wrench,    color: 'blue',  full: 'Outils & Apps',      desc: 'Apps, outils, ressources utiles' },
  { id: 'TRAVAIL',         label: 'Travail',    Icon: Briefcase, color: 'amber', full: 'Travail',             desc: 'Emploi, télétravail, entreprise' },
  { id: 'ETUDES',          label: 'Études',     Icon: BookOpen,  color: 'green', full: 'Études',              desc: 'Université, examens, apprentissage' },
  { id: 'VIE_PERSO',       label: 'Vie perso',  Icon: Heart,     color: 'pink',  full: 'Vie personnelle',    desc: 'Relations, famille, bien-être' },
] as const;

type SpaceId = typeof SPACES[number]['id'];

const ACTIVE_COLOR: Record<string, string> = {
  teal:   'bg-teal-500',
  purple: 'bg-purple-500',
  blue:   'bg-blue-500',
  amber:  'bg-amber-500',
  green:  'bg-green-500',
  pink:   'bg-pink-500',
};

const BORDER_COLOR: Record<string, string> = {
  teal:   'border-l-teal-500',
  purple: 'border-l-purple-500',
  blue:   'border-l-blue-500',
  amber:  'border-l-amber-500',
  green:  'border-l-green-500',
  pink:   'border-l-pink-500',
};

const SORT_OPTIONS: { value: string; label: string; Icon: LucideIcon; desc: string }[] = [
  { value: 'recent',     label: 'Récents',       Icon: Clock,         desc: 'Les dernières discussions' },
  { value: 'popular',    label: 'Populaires',    Icon: Flame,         desc: 'Les plus aimés' },
  { value: 'unanswered', label: 'Sans réponse',  Icon: MessageSquare, desc: 'Attendent une réponse' },
];

const REACTIONS = ['❤️','💪','🧠','✨','🤝','😊'];

const TDAH_LABELS: Record<string, string> = {
  INATTENTIF:   '🌊 Inattentif',
  HYPERACTIF:   '⚡ Hyperactif',
  COMBINE:      '🌀 Combiné',
  NON_SPECIFIE: '❓ TDAH',
};

const REPLY_SUGGESTIONS = [
  'Je vis exactement la même chose ! 🤝',
  'Merci pour ce partage, très utile 🧠',
  'Ça m\'a aidé aussi, je confirme ! 💪',
  'Super conseil, je vais essayer ✨',
];

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'à l\'instant';
  if (m < 60) return `il y a ${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7)  return `il y a ${d}j`;
  return new Date(date).toLocaleDateString('fr', { day: 'numeric', month: 'short' });
}

function totalReactions(obj: any): number {
  return Object.values(obj || {}).reduce((a: any, b: any) => a + b, 0) as number;
}

function topReactions(obj: any): [string, number][] {
  return Object.entries(obj || {}).sort(([,a],[,b]) => (b as number) - (a as number)).slice(0, 4) as [string, number][];
}

// ── Composant PostCard ────────────────────────────────────────────────────────

function PostCard({
  post, spaceColor, currentUserId, onReply, onReact, onDelete
}: {
  post: any; spaceColor: string; currentUserId?: string;
  onReply: (p: any) => void;
  onReact: (id: string, emoji: string) => void;
  onDelete: (id: string) => void;
}) {
  const [repliesOpen, setRepliesOpen] = useState(false);
  const [contentOpen, setContentOpen] = useState(false);
  const [reacted,     setReacted]     = useState<string | null>(null);
  const [lightbox,    setLightbox]    = useState<string | null>(null);
  const replyCount  = post._count?.replies ?? post.replies?.length ?? 0;
  const total       = totalReactions(post.emojiReactions);
  const top         = topReactions(post.emojiReactions);
  const CONTENT_LIMIT = 300; // nb de caractères avant "Lire la suite"
  const isTruncated = post.content?.length > CONTENT_LIMIT && !contentOpen;

  const handleReact = (emoji: string) => {
    setReacted(emoji);
    onReact(post.id, emoji);
    setTimeout(() => setReacted(null), 800);
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-2xl border border-line border-l-4 ${BORDER_COLOR[spaceColor]} shadow-sm hover:shadow-card transition-all overflow-hidden`}
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-line shrink-0 flex items-center justify-center bg-teal-50">
            {post.user?.avatar
              ? <img src={post.user.avatar} alt={post.user.name} className="w-full h-full object-cover" />
              : <span className="font-black text-teal-600 text-sm">{post.user?.name?.[0]?.toUpperCase()}</span>
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-ink-900 text-sm">{post.user?.name}</span>
              {post.user?.tdahType && (
                <span className="text-xs bg-surface-muted text-ink-500 px-2 py-0.5 rounded-full">
                  {TDAH_LABELS[post.user.tdahType] || post.user.tdahType}
                </span>
              )}
              {post.isPinned && (
                <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">
                  <Pin size={12} strokeWidth={2} /> Épinglé
                </span>
              )}
              <span className="text-xs text-ink-400 ml-auto">{timeAgo(post.createdAt)}</span>
            </div>
            {/* Tags */}
            {post.tags?.length > 0 && (
              <div className="flex gap-1.5 mt-1 flex-wrap">
                {post.tags.map((tag: string) => (
                  <span key={tag} className="text-xs text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          {currentUserId === post.user?.id && (
            <button
              onClick={() => onDelete(post.id)}
              className="flex items-center gap-1 text-xs text-ink-400 hover:text-red-500 hover:bg-red-50 px-2 py-1 rounded-lg transition-all shrink-0 border border-transparent hover:border-red-200"
              title="Supprimer mon post"
            >
              <Trash2 size={14} strokeWidth={2} /> <span className="hidden sm:inline">Supprimer</span>
            </button>
          )}
        </div>

        {/* Titre */}
        {post.title && (
          <h3 className="font-black text-ink-900 text-base mb-2 leading-snug">{post.title}</h3>
        )}

        {/* Contenu avec "Lire la suite" */}
        <div className="text-ink-500 text-sm leading-relaxed whitespace-pre-line">
          {isTruncated ? (
            <>
              {post.content.slice(0, CONTENT_LIMIT)}
              <span className="text-ink-400">...</span>
              <button
                onClick={() => setContentOpen(true)}
                className="ml-1 text-teal-600 hover:text-teal-700 font-semibold text-xs inline-flex items-center gap-1"
              >
                Lire la suite ▾
              </button>
            </>
          ) : (
            <>
              {post.content}
              {post.content?.length > CONTENT_LIMIT && (
                <button
                  onClick={() => setContentOpen(false)}
                  className="ml-1 text-ink-400 hover:text-ink-700 font-semibold text-xs inline-flex items-center gap-1"
                >
                  Réduire ▴
                </button>
              )}
            </>
          )}
        </div>

        {/* ── Images du post ── */}
        {post.images?.length > 0 && (
          <div className={`mt-3 grid gap-2 ${post.images.length === 1 ? 'grid-cols-1' : post.images.length === 2 ? 'grid-cols-2' : 'grid-cols-2'}`}>
            {post.images.map((url: string, i: number) => (
              <button key={i} onClick={() => setLightbox(url)}
                className={`rounded-xl overflow-hidden bg-surface-muted ${post.images.length === 3 && i === 0 ? 'col-span-2' : ''}`}>
                <img src={url} alt={`Image ${i + 1}`}
                  className="w-full object-cover hover:opacity-90 transition-opacity"
                  style={{ maxHeight: post.images.length === 1 ? '400px' : '200px' }}
                />
              </button>
            ))}
            {post.images.length > 4 && (
              <div className="rounded-xl bg-ink-900/80 flex items-center justify-center text-white font-black text-xl">
                +{post.images.length - 4}
              </div>
            )}
          </div>
        )}

        {/* Lightbox image */}
        {lightbox && (
          <motion.div
            className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            onClick={() => setLightbox(null)}
          >
            <button onClick={() => setLightbox(null)}
              className="absolute top-4 right-4 text-white hover:text-ink-300 z-10"><X size={28} strokeWidth={2} /></button>
            <img src={lightbox} alt="Plein écran"
              className="max-w-full max-h-full rounded-2xl object-contain shadow-card"
              onClick={e => e.stopPropagation()}
            />
          </motion.div>
        )}

        {/* ── Réactions ── */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-line">
          <div className="flex items-center gap-2">
            {/* Boutons réactions */}
            <div className="flex gap-0.5">
              {REACTIONS.map(emoji => (
                <motion.button
                  key={emoji}
                  onClick={() => handleReact(emoji)}
                  animate={reacted === emoji ? { scale: [1, 1.4, 1] } : { scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="text-base p-1.5 hover:bg-surface-muted rounded-lg transition-colors"
                  title={`Réagir avec ${emoji}`}
                >
                  {emoji}
                </motion.button>
              ))}
            </div>
            {/* Compteurs */}
            {total > 0 && (
              <div className="flex items-center gap-1 ml-1">
                {top.map(([emoji, count]) => (
                  <span key={emoji} className="text-xs bg-surface-muted rounded-full px-1.5 py-0.5 text-ink-500 font-medium">
                    {emoji}{count > 1 ? count : ''}
                  </span>
                ))}
                {total > 5 && (
                  <span className="text-xs text-ink-400 font-medium">{total} réactions</span>
                )}
              </div>
            )}
          </div>

          {/* Actions droite */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setRepliesOpen(v => !v)}
              className="flex items-center gap-1.5 text-xs text-ink-400 hover:text-teal-600 font-medium transition-colors px-2 py-1 rounded-lg hover:bg-teal-50"
            >
              <MessageSquare size={16} strokeWidth={2} />
              <span>{replyCount}</span>
            </button>
            <button
              onClick={() => onReply(post)}
              className="text-xs bg-teal-50 hover:bg-teal-100 text-teal-600 font-bold px-3 py-1.5 rounded-xl transition-colors border border-teal-100"
            >
              Répondre
            </button>
          </div>
        </div>
      </div>

      {/* ── Réponses expandables ── */}
      <AnimatePresence>
        {repliesOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-line bg-gradient-to-b from-surface-soft to-white"
          >
            <div className="p-4 space-y-3">
              {post.replies?.length === 0 && (
                <p className="text-sm text-ink-400 text-center py-4">Sois le premier à répondre !</p>
              )}
              {post.replies?.map((reply: any) => (
                <div key={reply.id} className="flex gap-3">
                  <div className="relative mt-0.5">
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-line flex items-center justify-center bg-purple-50 shrink-0">
                      {reply.user?.avatar
                        ? <img src={reply.user.avatar} alt={reply.user.name} className="w-full h-full object-cover" />
                        : <span className="text-xs font-black text-purple-600">{reply.user?.name?.[0]}</span>
                      }
                    </div>
                  </div>
                  <div className="flex-1 bg-white rounded-2xl rounded-tl-sm px-4 py-3 border border-line shadow-sm">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-bold text-ink-900">{reply.user?.name}</span>
                      <span className="text-xs text-ink-400">{timeAgo(reply.createdAt)}</span>
                      {/* Réactions sur réponses */}
                      {totalReactions(reply.emojiReactions) > 0 && (
                        <div className="ml-auto flex gap-0.5">
                          {topReactions(reply.emojiReactions).slice(0, 2).map(([e, c]) => (
                            <span key={e} className="text-xs">{e}{c > 1 ? c : ''}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-ink-700 leading-relaxed">{reply.content}</p>
                    {/* Réagir sur réponse */}
                    <div className="flex gap-0.5 mt-2">
                      {REACTIONS.slice(0, 4).map(emoji => (
                        <button key={emoji} onClick={() => onReact(reply.id, emoji)}
                          className="text-sm hover:scale-125 transition-transform p-0.5">
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

// ── Page principale ────────────────────────────────────────────────────────────

export default function Community() {
  const user = useAppStore(s => s.user);
  const qc   = useQueryClient();

  const [space,  setSpace]  = useState<SpaceId>('STRATEGIES_TDAH');
  const [sort,   setSort]   = useState('recent');
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [showCompose,  setShowCompose]  = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null); // ID du post à supprimer
  const [replyTo,      setReplyTo]      = useState<any>(null);
  const [content,     setContent]     = useState('');
  const [postTitle,   setPostTitle]   = useState('');
  const [postTags,    setPostTags]    = useState<string[]>([]);
  const [postImages,  setPostImages]  = useState<{ file: File; preview: string; url?: string }[]>([]);
  const [uploading,   setUploading]   = useState(false);
  const [postError,   setPostError]   = useState('');
  const [replyContent, setReplyContent] = useState('');
  const searchRef  = useRef<HTMLInputElement>(null);
  const imageRef   = useRef<HTMLInputElement>(null);

  const currentSpace = SPACES.find(s => s.id === space)!;

  // ── Données ────────────────────────────────────────────────────────────────

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['forum', space, sort, search],
    queryFn: () => api.get(`/forum/${space}?sort=${sort}&search=${encodeURIComponent(search)}`).then(r => r.data),
    staleTime: 30000,
  });

  const { data: stats } = useQuery({
    queryKey: ['forum-stats'],
    queryFn: () => api.get('/forum/stats/global').then(r => r.data),
    staleTime: 60000,
  });

  // Filtrer par tag côté frontend
  const filteredPosts = tagFilter
    ? posts.filter((p: any) => p.tags?.includes(tagFilter))
    : posts;

  // Tous les tags uniques du feed actuel
  const allTags = [...new Set(posts.flatMap((p: any) => p.tags || []))].slice(0, 15);

  // ── Mutations ──────────────────────────────────────────────────────────────

  const handleAddImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const valid = files.filter(f => allowed.includes(f.type));
    if (valid.length < files.length) {
      setPostError('Certains fichiers ignorés — formats acceptés : JPG, PNG, GIF, WEBP');
    }
    const newImgs = valid.slice(0, 4 - postImages.length).map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setPostImages(prev => [...prev, ...newImgs].slice(0, 4));
    e.target.value = '';
  };

  // Fonction de publication : upload images puis créer le post
  const handlePublish = async () => {
    if (!postTitle.trim() || !content.trim()) return;
    setPostError('');
    setUploading(true);

    try {
      // 1. Upload des images si présentes
      let imageUrls: string[] = [];
      if (postImages.length > 0) {
        const fd = new FormData();
        postImages.forEach(img => fd.append('images', img.file));
        // axios gère automatiquement le Content-Type multipart avec boundary
        const uploadRes = await api.post('/forum/upload', fd);
        imageUrls = uploadRes.data.urls || [];
        console.log('✅ Images uploadées:', imageUrls);
      }

      // 2. Créer le post
      await api.post('/forum', {
        spaceId: space,
        title:   postTitle.trim(),
        content: content.trim(),
        tags:    postTags,
        images:  imageUrls,
      });

      // 3. Succès — reset + fermer
      setContent(''); setPostTitle(''); setPostTags([]);
      postImages.forEach(img => URL.revokeObjectURL(img.preview));
      setPostImages([]); setPostError(''); setShowCompose(false);
      qc.invalidateQueries({ queryKey: ['forum'] });
      qc.invalidateQueries({ queryKey: ['forum-stats'] });

    } catch (err: any) {
      const msg = err?.response?.data?.message
        || err?.response?.data?.error
        || err?.message
        || 'Erreur lors de la publication. Réessaie.';
      setPostError(msg);
    } finally {
      setUploading(false);
    }
  };


  const createReply = useMutation({
    mutationFn: (text: string) => api.post('/forum', {
      spaceId: space, content: text, parentId: replyTo.id,
    }),
    onSuccess: () => {
      setReplyContent(''); setReplyTo(null);
      qc.invalidateQueries({ queryKey: ['forum', space] });
    },
  });

  const reactPost = useMutation({
    mutationFn: ({ id, emoji }: { id: string; emoji: string }) => api.post(`/forum/${id}/react`, { emoji }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forum', space] }),
  });

  const deletePost = useMutation({
    mutationFn: (id: string) => api.delete(`/forum/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forum', space] }),
  });

  const AVAILABLE_TAGS = ['#procrastination','#routines','#focus','#hyperfocus','#body-doubling','#médication','#anxiété','#sommeil','#travail','#études','#diagnostic','#relations','#oubli','#organisation','#émotions'];

  return (
    <div className="h-full flex bg-surface-soft overflow-hidden">

      {/* ══ SIDEBAR GAUCHE ══════════════════════════════════════════════════ */}
      <aside className="w-56 bg-white border-r border-line flex flex-col shrink-0 overflow-y-auto">
        <div className="p-4 border-b border-line">
          <h2 className="flex items-center gap-2 font-black text-ink-900">
            <Globe size={18} strokeWidth={2} className="text-teal-600" /> Communauté
          </h2>
          <p className="text-xs text-ink-400 mt-0.5">
            {stats?.totalMembers || 0} membres · {stats?.totalPosts || 0} posts
          </p>
        </div>

        {/* Espaces */}
        <nav className="p-2 flex-1">
          <p className="text-xs text-ink-400 font-bold uppercase px-2 mb-1.5 mt-1">Espaces</p>
          {SPACES.map(s => (
            <button key={s.id} onClick={() => { setSpace(s.id as SpaceId); setSearch(''); setTagFilter(''); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all mb-0.5 group ${
                space === s.id
                  ? `${ACTIVE_COLOR[s.color]} text-white shadow-sm`
                  : 'text-ink-500 hover:bg-surface-soft'
              }`}>
              <s.Icon size={18} strokeWidth={2} className="shrink-0" />
              <div>
                <p className={`text-sm font-semibold ${space === s.id ? 'text-white' : 'text-ink-700'}`}>{s.label}</p>
                <p className={`text-xs ${space === s.id ? 'text-white/70' : 'text-ink-400'}`}>{s.desc}</p>
              </div>
            </button>
          ))}
        </nav>

        {/* Tri */}
        <div className="p-2 border-t border-line">
          <p className="text-xs text-ink-400 font-bold uppercase px-2 mb-1.5">Trier</p>
          {SORT_OPTIONS.map(o => (
            <button key={o.value} onClick={() => setSort(o.value)}
              className={`w-full flex items-center gap-2 text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors mb-0.5 ${
                sort === o.value ? 'bg-surface-muted text-ink-900' : 'text-ink-500 hover:bg-surface-soft'
              }`}>
              <o.Icon size={14} strokeWidth={2} className="shrink-0" />
              {o.label}
            </button>
          ))}
        </div>

        {/* Stats */}
        {stats && (
          <div className="p-3 border-t border-line">
            <div className="bg-teal-50 rounded-xl p-3 text-center">
              <p className="text-teal-600 font-black text-xl">{stats.postsThisWeek}</p>
              <p className="text-teal-500 text-xs">discussions cette semaine</p>
            </div>
          </div>
        )}
      </aside>

      {/* ══ FEED CENTRAL ════════════════════════════════════════════════════ */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Barre supérieure sticky */}
        <div className="bg-white border-b border-line px-5 py-3 shrink-0">
          <div className="flex items-center gap-3 mb-2">
            <currentSpace.Icon size={22} strokeWidth={2} className="text-ink-700 shrink-0" />
            <div className="flex-1">
              <h1 className="font-black text-ink-900 text-base">{currentSpace.full}</h1>
              <p className="text-xs text-ink-400">{currentSpace.desc}</p>
            </div>
            {/* Recherche */}
            <div className="relative">
              <Search size={16} strokeWidth={2} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
              <input ref={searchRef} value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher..."
                className="pl-8 pr-8 py-2 border-2 border-line focus:border-teal-400 rounded-xl text-sm outline-none w-44"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700">
                  <X size={14} strokeWidth={2} />
                </button>
              )}
            </div>
            {/* Bouton écrire */}
            <button onClick={() => { setShowCompose(true); setPostError(''); }}
              className="flex items-center gap-1.5 bg-teal-500 hover:bg-teal-600 text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors shadow-sm">
              <Pencil size={18} strokeWidth={2} /> Écrire
            </button>
          </div>

          {/* Filtres par tags */}
          {allTags.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              <button onClick={() => setTagFilter('')}
                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors border ${
                  !tagFilter ? 'bg-teal-500 text-white border-teal-500' : 'bg-white text-ink-500 border-line hover:border-teal-300'
                }`}>
                Tous
              </button>
              {(allTags as string[]).map((tag: string) => (
                <button key={tag} onClick={() => setTagFilter(tagFilter === tag ? '' : tag)}
                  className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors border ${
                    tagFilter === tag ? 'bg-teal-500 text-white border-teal-500' : 'bg-white text-ink-500 border-line hover:border-teal-300'
                  }`}>
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Feed scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {isLoading && (
            <div className="space-y-4">
              {[1,2,3,4].map(i => (
                <div key={i} className="bg-white rounded-2xl p-5 animate-pulse border border-line">
                  <div className="flex gap-3 mb-3">
                    <div className="w-10 h-10 bg-surface-muted rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-surface-muted rounded w-32" />
                      <div className="h-2 bg-surface-muted rounded w-20" />
                    </div>
                  </div>
                  <div className="h-4 bg-surface-muted rounded w-3/4 mb-2" />
                  <div className="h-3 bg-surface-muted rounded w-full mb-1" />
                  <div className="h-3 bg-surface-muted rounded w-2/3" />
                </div>
              ))}
            </div>
          )}

          {!isLoading && filteredPosts.length === 0 && (
            <div className="text-center py-16">
              <MessageSquare size={40} strokeWidth={2} className="text-ink-400 mx-auto mb-3" />
              <p className="font-black text-ink-900 text-xl mb-2">
                {search || tagFilter ? 'Aucun résultat' : 'Sois le premier à écrire !'}
              </p>
              <p className="text-ink-400 text-sm mb-6">
                {search ? `"${search}" — aucun post trouvé` : tagFilter ? `Aucun post avec ${tagFilter}` : 'La communauté TDAH t\'attend'}
              </p>
              {!search && !tagFilter && (
                <button onClick={() => { setShowCompose(true); setPostError(''); }}
                  className="inline-flex items-center gap-2 bg-teal-500 text-white font-bold px-6 py-3 rounded-xl hover:bg-teal-600 transition-colors">
                  <Pencil size={18} strokeWidth={2} /> Créer le premier post
                </button>
              )}
            </div>
          )}

          <div className="space-y-4 max-w-2xl">
            {filteredPosts.map((post: any, i: number) => (
              <motion.div key={post.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}>
                <PostCard
                  post={post}
                  spaceColor={currentSpace.color}
                  currentUserId={user?.id}
                  onReply={p => { setReplyTo(p); setReplyContent(''); }}
                  onReact={(id, emoji) => reactPost.mutate({ id, emoji })}
                  onDelete={id => setDeleteTarget(id)}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </main>

      {/* ══ SIDEBAR DROITE ══════════════════════════════════════════════════ */}
      <aside className="w-52 bg-white border-l border-line shrink-0 overflow-y-auto hidden xl:flex flex-col">

        {/* Membres actifs */}
        {stats?.activeMembers?.length > 0 && (
          <div className="p-4 border-b border-line">
            <p className="flex items-center gap-1.5 text-xs text-ink-400 font-bold uppercase mb-3">
              <Users size={14} strokeWidth={2} /> Membres actifs
            </p>
            <div className="space-y-2.5">
              {stats.activeMembers.slice(0, 6).map((m: any) => (
                <div key={m.id} className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 bg-teal-50 border border-line flex items-center justify-center">
                    {m.avatar
                      ? <img src={m.avatar} alt={m.name} className="w-full h-full object-cover" />
                      : <span className="text-xs font-black text-teal-600">{m.name?.[0]}</span>
                    }
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-ink-900 truncate">{m.name}</p>
                    <p className="text-xs text-ink-400">{TDAH_LABELS[m.tdahType] || '🧠'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trending */}
        {stats?.trending?.length > 0 && (
          <div className="p-4 border-b border-line">
            <p className="flex items-center gap-1.5 text-xs text-ink-400 font-bold uppercase mb-3">
              <Flame size={14} strokeWidth={2} /> En ce moment
            </p>
            <div className="space-y-2.5">
              {stats.trending.map((p: any) => (
                <button key={p.id}
                  onClick={() => { const s = SPACES.find(sp => sp.id === p.spaceId); if (s) setSpace(s.id as SpaceId); }}
                  className="w-full text-left group">
                  <p className="text-xs font-semibold text-ink-700 line-clamp-2 group-hover:text-teal-600 transition-colors">{p.title || p.content?.slice(0, 70)}</p>
                  <p className="flex items-center gap-1 text-xs text-ink-400 mt-0.5">
                    <MessageSquare size={12} strokeWidth={2} /> {p._count?.replies || 0} réponses
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message TDAH du jour */}
        <div className="p-4 mt-auto">
          <div className="bg-gradient-to-br from-teal-50 to-purple-50 rounded-2xl p-4 text-center border border-teal-100">
            <Heart size={24} strokeWidth={2} className="text-purple-500 mx-auto mb-2" />
            <p className="text-xs font-bold text-ink-700 mb-1">Tu n'es pas seul(e)</p>
            <p className="text-xs text-ink-500 leading-relaxed">Chaque question ici aide quelqu'un d'autre dans notre communauté TDAH</p>
          </div>
        </div>
      </aside>

      {/* ══ MODAL — Créer un post ════════════════════════════════════════════ */}
      <AnimatePresence>
        {showCompose && (
          <motion.div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowCompose(false)}>
            <motion.div className="bg-white rounded-3xl w-full max-w-lg shadow-card overflow-hidden"
              initial={{ scale: 0.94, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, opacity: 0 }}
              onClick={e => e.stopPropagation()}>

              <div className="p-5 border-b border-line flex items-center justify-between">
                <div>
                  <h3 className="flex items-center gap-2 font-black text-ink-900 text-lg">
                    <Pencil size={20} strokeWidth={2} className="text-teal-600" /> Nouveau post
                  </h3>
                  <p className="flex items-center gap-1.5 text-xs text-ink-400 mt-0.5">
                    <currentSpace.Icon size={14} strokeWidth={2} /> {currentSpace.full}
                  </p>
                </div>
                <button onClick={() => setShowCompose(false)} className="text-ink-400 hover:text-ink-700 w-8 h-8 flex items-center justify-center">
                  <X size={22} strokeWidth={2} />
                </button>
              </div>

              <div className="p-5">
                {/* Auteur */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-teal-50 border border-line flex items-center justify-center shrink-0">
                    {user?.avatar
                      ? <img src={user.avatar} alt={user?.name} className="w-full h-full object-cover" />
                      : <span className="font-black text-teal-600">{user?.name?.[0]}</span>
                    }
                  </div>
                  <div>
                    <p className="font-bold text-ink-900 text-sm">{user?.name}</p>
                    <p className="text-xs text-ink-400">{TDAH_LABELS[user?.tdahType || ''] || '🧠 Membre TDAH'}</p>
                  </div>
                </div>

                {/* Titre */}
                <input
                  value={postTitle}
                  onChange={e => setPostTitle(e.target.value)}
                  placeholder="Titre de ton post (obligatoire)"
                  maxLength={120}
                  className="w-full border-2 border-line focus:border-teal-400 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none mb-3"
                />

                {/* Contenu */}
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Développe ta question, ton expérience, ton conseil... La communauté TDAH t'écoute 💜"
                  rows={4}
                  maxLength={2000}
                  autoFocus
                  className="w-full border-2 border-line focus:border-teal-400 rounded-xl px-4 py-3 text-sm outline-none resize-none leading-relaxed mb-1"
                />
                <p className="text-xs text-ink-400 text-right mb-3">{content.length}/2000</p>

                {/* Photos */}
                <div className="mb-4">
                  <p className="flex items-center gap-1.5 text-xs text-ink-400 font-bold mb-2">
                    <ImagePlus size={14} strokeWidth={2} /> Photos (max 4)
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {postImages.map((img, i) => (
                      <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-line">
                        <img src={img.preview} alt="" className="w-full h-full object-cover" />
                        <button
                          onClick={() => setPostImages(prev => prev.filter((_, idx) => idx !== i))}
                          className="absolute top-1 right-1 bg-ink-900/60 text-white w-5 h-5 rounded-full flex items-center justify-center hover:bg-red-500 transition-colors"
                        ><X size={12} strokeWidth={2.5} /></button>
                      </div>
                    ))}
                    {postImages.length < 4 && (
                      <button
                        onClick={() => imageRef.current?.click()}
                        className="w-20 h-20 rounded-xl border-2 border-dashed border-line hover:border-teal-400 flex flex-col items-center justify-center gap-1 text-ink-400 hover:text-teal-500 transition-colors"
                      >
                        <Camera size={22} strokeWidth={2} />
                        <span className="text-xs">Ajouter</span>
                      </button>
                    )}
                  </div>
                  <input ref={imageRef} type="file" accept="image/*" multiple onChange={handleAddImages} className="hidden" />
                  <p className="text-xs text-ink-400 mt-1">JPG, PNG, GIF, WEBP · Max 5 Mo par image</p>
                </div>

                {/* Tags */}
                <div className="mb-4">
                  <p className="flex items-center gap-1.5 text-xs text-ink-400 font-bold mb-2">
                    <Tag size={14} strokeWidth={2} /> Tags (max 3)
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {AVAILABLE_TAGS.map(tag => (
                      <button key={tag} type="button"
                        onClick={() => setPostTags(prev =>
                          prev.includes(tag) ? prev.filter(t => t !== tag) : prev.length < 3 ? [...prev, tag] : prev
                        )}
                        className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-all ${
                          postTags.includes(tag)
                            ? 'bg-teal-500 text-white border-teal-500'
                            : 'bg-white text-ink-500 border-line hover:border-teal-300'
                        }`}>
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message d'erreur */}
                {postError && (
                  <div className="mb-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2">
                    <AlertTriangle size={18} strokeWidth={2} className="text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-red-700 text-sm font-semibold">Erreur de publication</p>
                      <p className="text-red-600 text-xs mt-0.5">{postError}</p>
                    </div>
                    <button onClick={() => setPostError('')} className="ml-auto text-red-400 hover:text-red-600">
                      <X size={16} strokeWidth={2} />
                    </button>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowCompose(false); setPostError(''); }}
                    className="flex-1 border-2 border-line text-ink-500 font-bold py-3 rounded-2xl hover:bg-surface-soft transition-colors text-sm">
                    Annuler
                  </button>
                  <button
                    onClick={handlePublish}
                    disabled={!postTitle.trim() || !content.trim() || uploading}
                    className="flex-1 bg-teal-500 hover:bg-teal-600 disabled:opacity-40 text-white font-black py-3 rounded-2xl transition-colors text-sm shadow-sm flex items-center justify-center gap-2">
                    {uploading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        {postImages.length > 0 ? 'Upload image...' : 'Publication...'}
                      </>
                    ) : (
                      <><Send size={18} strokeWidth={2} /> Publier</>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ MODAL — Confirmer suppression ══════════════════════════════════ */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setDeleteTarget(null)}
          >
            <motion.div
              className="bg-white rounded-2xl w-full max-w-sm shadow-card overflow-hidden"
              initial={{ scale: 0.9, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 text-center">
                <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 size={28} strokeWidth={2} className="text-red-500" />
                </div>
                <h3 className="font-black text-ink-900 text-lg mb-2">Supprimer ce post ?</h3>
                <p className="text-ink-500 text-sm mb-6">
                  Cette action est irréversible. Le post et toutes ses réponses seront supprimés définitivement.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteTarget(null)}
                    className="flex-1 border-2 border-line text-ink-500 font-bold py-3 rounded-xl hover:bg-surface-soft transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => {
                      deletePost.mutate(deleteTarget);
                      setDeleteTarget(null);
                    }}
                    disabled={deletePost.isPending}
                    className="flex-1 inline-flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-black py-3 rounded-xl transition-colors"
                  >
                    {deletePost.isPending
                      ? '...'
                      : <><Trash2 size={18} strokeWidth={2} /> Supprimer</>}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ MODAL — Répondre ════════════════════════════════════════════════ */}
      <AnimatePresence>
        {replyTo && (
          <motion.div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setReplyTo(null)}>
            <motion.div className="bg-white rounded-3xl w-full max-w-md shadow-card overflow-hidden"
              initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              onClick={e => e.stopPropagation()}>

              <div className="p-4 border-b border-line flex items-center justify-between">
                <div>
                  <h3 className="flex items-center gap-2 font-black text-ink-900">
                    <MessageSquare size={18} strokeWidth={2} className="text-teal-600" /> Répondre
                  </h3>
                  <p className="text-xs text-ink-400 mt-0.5 line-clamp-1">à {replyTo.user?.name} — {replyTo.title || replyTo.content?.slice(0, 50)}</p>
                </div>
                <button onClick={() => setReplyTo(null)} className="text-ink-400 hover:text-ink-700 w-8 h-8 flex items-center justify-center">
                  <X size={20} strokeWidth={2} />
                </button>
              </div>

              <div className="p-4">
                {/* Suggestions anti-paralysie TDAH */}
                <p className="flex items-center gap-1.5 text-xs text-ink-400 font-bold uppercase mb-2">
                  <Lightbulb size={14} strokeWidth={2} /> Réponses rapides
                </p>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {REPLY_SUGGESTIONS.map(s => (
                    <button key={s} onClick={() => createReply.mutate(s)}
                      disabled={createReply.isPending}
                      className="text-xs text-left bg-teal-50 hover:bg-teal-100 text-teal-700 font-medium px-3 py-2 rounded-xl border border-teal-100 transition-colors leading-relaxed">
                      {s}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <div className="flex-1 h-px bg-line" />
                  <span className="text-xs text-ink-400">ou écris la tienne</span>
                  <div className="flex-1 h-px bg-line" />
                </div>

                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-teal-50 flex items-center justify-center shrink-0 border border-line">
                    {user?.avatar
                      ? <img src={user.avatar} className="w-full h-full object-cover" />
                      : <span className="text-xs font-black text-teal-600">{user?.name?.[0]}</span>
                    }
                  </div>
                  <textarea
                    value={replyContent}
                    onChange={e => setReplyContent(e.target.value)}
                    placeholder="Ta réponse bienveillante..."
                    rows={3}
                    maxLength={1000}
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && replyContent.trim()) { e.preventDefault(); createReply.mutate(replyContent); } }}
                    className="flex-1 border-2 border-line focus:border-teal-400 rounded-xl px-3 py-2.5 text-sm outline-none resize-none"
                  />
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => setReplyTo(null)}
                    className="flex-1 border-2 border-line text-ink-500 font-bold py-2.5 rounded-xl text-sm hover:bg-surface-soft">
                    Annuler
                  </button>
                  <button
                    onClick={() => { if (replyContent.trim()) createReply.mutate(replyContent); }}
                    disabled={!replyContent.trim() || createReply.isPending}
                    className="flex-1 inline-flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-600 disabled:opacity-40 text-white font-black py-2.5 rounded-xl text-sm transition-colors">
                    {createReply.isPending
                      ? '...'
                      : <><Send size={16} strokeWidth={2} /> Envoyer</>}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
