/**
 * YouTubeSearch.tsx — Musique YouTube gratuite (titres complets) + recherche.
 * Lecture : embed YouTube (contrôles natifs, plein titre, aucune clé requise).
 * Recherche : YouTube Data API si VITE_YT_API_KEY présent, sinon repli Piped (sans clé).
 */
import { useState } from 'react';
import { MonitorPlay, Search, X, Link2, Loader2, Sparkles } from 'lucide-react';

interface YtResult { id: string; title: string; thumb: string; uploader: string; duration?: number; }

// Préférences rapides → lancent une recherche
const PREFS = [
  'lofi hip hop radio', 'deep focus music', 'classical study music',
  'jazz café', 'brown noise 10 hours', 'nature rain sounds', 'binaural beats focus', 'techno focus mix',
];

// Instances Piped (recherche sans clé) — on essaie l'une après l'autre
const PIPED = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.adminforge.de',
  'https://api.piped.private.coffee',
  'https://pipedapi.leptons.xyz',
];

function extractId(input: string): { video?: string; list?: string } {
  const s = input.trim();
  if (/^[\w-]{11}$/.test(s)) return { video: s };
  try {
    const u = new URL(s);
    const list = u.searchParams.get('list') || undefined;
    if (u.searchParams.get('v')) return { video: u.searchParams.get('v')!, list };
    if (u.hostname.includes('youtu.be')) return { video: u.pathname.slice(1), list };
    if (u.pathname.includes('/embed/')) return { video: u.pathname.split('/embed/')[1] };
    if (list) return { list };
  } catch { /* pas une URL */ }
  return {};
}

async function searchYouTube(q: string): Promise<YtResult[] | null> {
  const key = import.meta.env.VITE_YT_API_KEY as string | undefined;
  // 1) API officielle si une clé est fournie (fiable)
  if (key) {
    try {
      const r = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=20&q=${encodeURIComponent(q)}&key=${key}`);
      if (r.ok) {
        const d = await r.json();
        return (d.items || []).map((i: any) => ({
          id: i.id.videoId, title: i.snippet.title,
          thumb: i.snippet.thumbnails?.medium?.url, uploader: i.snippet.channelTitle,
        }));
      }
    } catch { /* repli Piped */ }
  }
  // 2) Repli Piped (sans clé)
  for (const base of PIPED) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 6000);
      const r = await fetch(`${base}/search?q=${encodeURIComponent(q)}&filter=videos`, { signal: ctrl.signal });
      clearTimeout(t);
      if (!r.ok) continue;
      const d = await r.json();
      const items = (d.items || []).filter((i: any) => typeof i.url === 'string' && i.url.includes('v='));
      if (items.length) {
        return items.slice(0, 20).map((i: any) => ({
          id: i.url.split('v=')[1], title: i.title,
          thumb: i.thumbnail, uploader: i.uploaderName, duration: i.duration,
        }));
      }
    } catch { /* instance suivante */ }
  }
  return null;
}

const fmtDur = (s?: number) => (!s ? '' : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`);

export default function YouTubeSearch({ compact = false }: { compact?: boolean }) {
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState<YtResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [video, setVideo]     = useState<string | null>(null);
  const [list, setList]       = useState<string | null>(null);
  const [showLink, setShowLink] = useState(false);
  const [linkVal, setLinkVal]   = useState('');

  const run = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true); setError(null);
    const res = await searchYouTube(q.trim());
    setLoading(false);
    if (!res) { setError("Recherche momentanément indisponible. Colle un lien YouTube, ou réessaie."); return; }
    if (res.length === 0) { setError('Aucun résultat. Essaie d\'autres mots-clés.'); return; }
    setResults(res);
  };

  const playVideo = (id: string) => { setList(null); setVideo(id); };
  const playLink = () => {
    const { video: v, list: l } = extractId(linkVal);
    if (l) { setVideo(null); setList(l); setShowLink(false); }
    else if (v) { setList(null); setVideo(v); setShowLink(false); }
    else setError('Lien YouTube non reconnu.');
  };

  const src = list
    ? `https://www.youtube.com/embed/videoseries?list=${list}&autoplay=1`
    : video
      ? `https://www.youtube.com/embed/${video}?autoplay=1`
      : null;

  return (
    <div className="bg-white border border-line rounded-2xl p-4 mb-5">
      <div className="flex items-center justify-between mb-1">
        <p className="font-black text-ink-900 text-sm flex items-center gap-1.5">
          <MonitorPlay size={18} strokeWidth={2} className="text-red-500" /> Recherche YouTube
        </p>
        <span className="text-[10px] font-bold text-teal-700 bg-teal-50 rounded-full px-2 py-0.5">gratuit · titres complets</span>
      </div>
      <p className="text-xs text-ink-400 mb-3">Cherche n'importe quelle musique et écoute-la en entier.</p>

      {/* Barre de recherche */}
      <form onSubmit={e => { e.preventDefault(); run(query); }} className="flex gap-2 mb-2">
        <input value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Ex : lofi study, Hans Zimmer, pluie relaxante…"
          className="flex-1 border-2 border-line focus:border-teal-400 rounded-xl px-4 py-2.5 text-sm outline-none" />
        <button type="submit" disabled={loading || !query.trim()}
          className="bg-teal-500 hover:bg-teal-600 disabled:opacity-40 text-white font-black px-4 rounded-xl inline-flex items-center">
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} strokeWidth={2.5} />}
        </button>
      </form>

      {/* Préférences rapides */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {PREFS.map(p => (
          <button key={p} onClick={() => { setQuery(p); run(p); }}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-line text-ink-500 hover:bg-surface-soft hover:text-teal-600">
            <Sparkles size={12} strokeWidth={2} /> {p}
          </button>
        ))}
        <button onClick={() => setShowLink(v => !v)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-dashed border-line text-ink-400 hover:text-teal-600">
          <Link2 size={13} strokeWidth={2} /> Coller un lien
        </button>
      </div>

      {showLink && (
        <div className="flex gap-2 mb-3">
          <input value={linkVal} onChange={e => setLinkVal(e.target.value)} placeholder="https://youtube.com/watch?v=…"
            className="flex-1 border-2 border-line focus:border-teal-400 rounded-xl px-3 py-2 text-sm outline-none" />
          <button onClick={playLink} className="bg-ink-900 text-white font-bold px-4 rounded-xl text-sm">Lire</button>
        </div>
      )}

      {/* Lecteur (titre complet, contrôles natifs) */}
      {src && (
        <div className="mb-3">
          <iframe title="Lecteur YouTube" src={src} width="100%" height={compact ? 160 : 220}
            loading="lazy" style={{ border: 0, borderRadius: 12 }}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen" />
        </div>
      )}

      {error && (
        <p className="text-sm text-amber-700 bg-amber-50 rounded-xl px-3 py-2 mb-2 flex items-center gap-1.5">
          <X size={15} strokeWidth={2.5} /> {error}
        </p>
      )}

      {/* Résultats */}
      {results.length > 0 && (
        <div className={`space-y-1.5 overflow-y-auto ${compact ? 'max-h-48' : 'max-h-72'}`}>
          {results.map(r => (
            <button key={r.id} onClick={() => playVideo(r.id)}
              className={`w-full flex items-center gap-3 p-1.5 rounded-xl text-left hover:bg-surface-soft transition-colors ${video === r.id ? 'bg-teal-50' : ''}`}>
              <span className="relative shrink-0">
                {r.thumb
                  ? <img src={r.thumb} alt="" className="w-20 h-12 object-cover rounded-lg" loading="lazy" referrerPolicy="no-referrer" />
                  : <span className="w-20 h-12 rounded-lg bg-surface-muted flex items-center justify-center"><MonitorPlay size={18} className="text-ink-400" /></span>}
                {r.duration ? <span className="absolute bottom-0.5 right-0.5 bg-black/75 text-white text-[10px] px-1 rounded">{fmtDur(r.duration)}</span> : null}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink-800 line-clamp-2 leading-tight">{r.title}</span>
                <span className="block text-xs text-ink-400 truncate mt-0.5">{r.uploader}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
