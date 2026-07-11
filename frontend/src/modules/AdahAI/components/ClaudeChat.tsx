/**
 * ClaudeChat.tsx — Interface chat style Claude.ai pour ADAH AI (TCC TDAH)
 * Sidebar sessions (groupées par date) + chat markdown + streaming + actions
 * Connecté au backend SÉCURISÉ (la clé API ne quitte jamais le serveur)
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/api';
import { useAppStore } from '../../../stores/useStore';
import Markdown from './Markdown';

interface Msg { id: string; role: 'user' | 'assistant'; content: string; createdAt?: string }
interface Sess { id: string; title: string; mood?: string; createdAt: string; updatedAt?: string; _count?: { messages: number } }

// Groupement par date relative
function dateGroup(d: string): string {
  const date = new Date(d);
  const now = new Date();
  const days = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (days === 0) return 'Aujourd\'hui';
  if (days <= 7) return 'Cette semaine';
  return 'Plus ancien';
}
function relTime(d: string): string {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `il y a ${m || 1}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  const days = Math.floor(h / 24);
  if (days === 1) return 'hier';
  if (days < 7) return new Date(d).toLocaleDateString('fr', { weekday: 'short' });
  return new Date(d).toLocaleDateString('fr', { day: 'numeric', month: 'short' });
}

const QUICK_STARTS = [
  "J'ai du mal à démarrer une tâche importante",
  "Je me sens submergé(e) par tout ce que j'ai à faire",
  "J'ai procrastiné toute la journée, je culpabilise",
  "Comment créer une routine qui tient ?",
];

export default function ClaudeChat({ onExit }: { onExit?: () => void }) {
  const user = useAppStore(s => s.user);
  const qc = useQueryClient();

  const [activeId, setActiveId]     = useState<string | null>(null);
  const [messages, setMessages]     = useState<Msg[]>([]);
  const [stream, setStream]         = useState('');
  const [isStreaming, setStreaming] = useState(false);
  const [input, setInput]           = useState('');
  const [search, setSearch]         = useState('');
  const [error, setError]           = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [renaming, setRenaming]     = useState<string | null>(null);
  const [renameVal, setRenameVal]   = useState('');

  const endRef   = useRef<HTMLDivElement>(null);
  const taRef    = useRef<HTMLTextAreaElement>(null);

  // Liste des sessions
  const { data: sessions = [] } = useQuery<Sess[]>({
    queryKey: ['adah-sessions'],
    queryFn: () => api.get('/adah/sessions').then(r => r.data),
  });

  // Auto-scroll
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, stream]);

  // Auto-resize textarea
  useEffect(() => {
    if (taRef.current) {
      taRef.current.style.height = 'auto';
      taRef.current.style.height = Math.min(taRef.current.scrollHeight, 160) + 'px';
    }
  }, [input]);

  const greeting = useCallback(() => {
    const first = user?.name?.split(' ')[0] || 'toi';
    return `Bonjour ${first} 💜 Je suis ADAH, ton assistant TCC spécialisé TDAH. Je suis là pour toi, sans jugement.\n\nDis-moi : qu'est-ce qui se passe pour toi en ce moment ?`;
  }, [user]);

  // Nouvelle session
  const newSession = useCallback(async () => {
    try {
      const res = await api.post('/adah/sessions', { mode: 'chat' });
      const id = res.data.session.id;
      setActiveId(id);
      setMessages([{ id: 'greet', role: 'assistant', content: greeting() }]);
      setError(''); setStream('');
      qc.invalidateQueries({ queryKey: ['adah-sessions'] });
      setTimeout(() => taRef.current?.focus(), 100);
    } catch { setError('Impossible de créer une session'); }
  }, [greeting, qc]);

  // Sélectionner une session
  const selectSession = useCallback(async (id: string) => {
    try {
      const res = await api.get(`/adah/sessions/${id}`);
      setActiveId(id);
      const msgs = res.data.messages || [];
      setMessages(msgs.length ? msgs : [{ id: 'greet', role: 'assistant', content: greeting() }]);
      setStream(''); setError('');
    } catch { setError('Impossible de charger la session'); }
  }, [greeting]);

  // Au montage : ouvrir la dernière session ou en créer une
  useEffect(() => {
    if (activeId) return;
    if (sessions.length > 0) selectSession(sessions[0].id);
    else newSession();
  }, [sessions.length]);

  // Envoyer un message (streaming)
  const send = useCallback(async (text: string) => {
    const content = text.trim();
    if (!content || isStreaming || !activeId) return;
    setInput(''); setError('');
    setMessages(prev => [...prev, { id: `u-${Date.now()}`, role: 'user', content }]);
    setStreaming(true); setStream('');

    const isFirst = messages.filter(m => m.role === 'user').length === 0;

    try {
      const token = useAppStore.getState().accessToken;
      const resp = await fetch(
        `${import.meta.env.VITE_API_URL || '/api'}/adah/sessions/${activeId}/chat`,
        { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ message: content }) }
      );
      if (!resp.ok) throw new Error((await resp.json()).error || 'Erreur serveur');

      const reader = resp.body!.getReader();
      const dec = new TextDecoder();
      let buf = ''; let full = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n'); buf = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          // Le parse peut échouer sur un fragment (ignoré), mais une erreur envoyée
          // par le serveur doit REMONTER — pas être avalée par le catch du parse
          let d: any = null;
          try { d = JSON.parse(line.slice(6)); } catch { continue; }
          if (d.error) throw new Error(d.error);
          if (d.text) { full += d.text; setStream(full); }
        }
      }
      setMessages(prev => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content: full }]);
      setStream(''); setStreaming(false);

      // Titre intelligent généré par l'IA (synthétique + corrigé)
      const userMsgCount = messages.filter(m => m.role === 'user').length + 1;
      if (isFirst || userMsgCount === 3) {
        // Génère après le 1er échange, puis affine au 3e (plus de contexte)
        api.post(`/adah/sessions/${activeId}/title`)
          .then(() => qc.invalidateQueries({ queryKey: ['adah-sessions'] }))
          .catch(() => qc.invalidateQueries({ queryKey: ['adah-sessions'] }));
      } else {
        qc.invalidateQueries({ queryKey: ['adah-sessions'] });
      }
    } catch (e: any) {
      setStreaming(false); setStream('');
      setError(e.message || 'Erreur de connexion');
    }
  }, [activeId, isStreaming, messages, qc]);

  // Régénérer la dernière réponse
  const regenerate = useCallback(() => {
    const lastUser = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUser) return;
    // retirer la dernière réponse IA
    setMessages(prev => {
      const idx = prev.map(m => m.role).lastIndexOf('assistant');
      return idx >= 0 ? prev.slice(0, idx) : prev;
    });
    send(lastUser.content);
  }, [messages, send]);

  const deleteSession = useCallback(async (id: string) => {
    if (!window.confirm('Supprimer cette conversation ?')) return;
    await api.delete(`/adah/sessions/${id}`);
    qc.invalidateQueries({ queryKey: ['adah-sessions'] });
    if (id === activeId) { setActiveId(null); setMessages([]); }
  }, [activeId, qc]);

  const doRename = useCallback(async (id: string) => {
    if (renameVal.trim()) {
      await api.patch(`/adah/sessions/${id}`, { title: renameVal.trim() });
      qc.invalidateQueries({ queryKey: ['adah-sessions'] });
    }
    setRenaming(null);
  }, [renameVal, qc]);

  // Filtrer + grouper les sessions
  const filtered = sessions.filter(s => s.title.toLowerCase().includes(search.toLowerCase()));
  const groups: Record<string, Sess[]> = {};
  filtered.forEach(s => {
    const g = dateGroup(s.updatedAt || s.createdAt);
    (groups[g] ||= []).push(s);
  });
  const groupOrder = ['Aujourd\'hui', 'Cette semaine', 'Plus ancien'];

  const activeSession = sessions.find(s => s.id === activeId);
  const wordCount = input.trim() ? input.trim().split(/\s+/).length : 0;
  const copyMsg = (text: string) => navigator.clipboard.writeText(text);

  return (
    <div className="flex h-full bg-[#F9F9F8] overflow-hidden">

      {/* ══ SIDEBAR ══════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -260 }} animate={{ x: 0 }} exit={{ x: -260 }}
            transition={{ duration: 0.15 }}
            className="w-[260px] bg-white border-r border-[#E5E5E5] flex flex-col shrink-0"
          >
            {/* Header */}
            <div className="p-3 border-b border-[#E5E5E5]">
              <div className="flex items-center justify-between mb-3">
                <span className="font-black text-gray-900 text-sm">Conversations</span>
                {onExit && (
                  <button onClick={onExit} className="text-gray-400 hover:text-gray-700 text-xs" title="Retour">✕</button>
                )}
              </div>
              <button onClick={newSession}
                className="w-full flex items-center justify-center gap-2 bg-[#3B5BDB] hover:bg-[#3450c5] text-white font-bold text-sm py-2.5 rounded-xl transition-colors">
                + Nouvelle
              </button>
              {/* Recherche */}
              <div className="relative mt-3">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Rechercher..."
                  className="w-full pl-8 pr-3 py-2 bg-[#F9F9F8] border border-[#E5E5E5] rounded-lg text-sm outline-none focus:border-[#748FFC]" />
              </div>
            </div>

            {/* Liste sessions */}
            <div className="flex-1 overflow-y-auto p-2">
              {filtered.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-6">Aucune conversation</p>
              )}
              {groupOrder.map(g => groups[g] && (
                <div key={g} className="mb-3">
                  <p className="text-xs text-gray-400 font-bold px-2 mb-1">{g}</p>
                  {groups[g].map(s => (
                    <div key={s.id}
                      onClick={() => selectSession(s.id)}
                      className={`group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer mb-0.5 transition-colors border-l-[3px] ${
                        activeId === s.id
                          ? 'bg-[#EEF2FF] border-[#3B5BDB]'
                          : 'border-transparent hover:bg-[#F0F0F0]'
                      }`}>
                      <span className="text-sm shrink-0">🧠</span>
                      <div className="flex-1 min-w-0">
                        {renaming === s.id ? (
                          <input autoFocus value={renameVal}
                            onChange={e => setRenameVal(e.target.value)}
                            onBlur={() => doRename(s.id)}
                            onKeyDown={e => { if (e.key === 'Enter') doRename(s.id); }}
                            onClick={e => e.stopPropagation()}
                            className="w-full text-sm border border-[#748FFC] rounded px-1 outline-none" />
                        ) : (
                          <p onDoubleClick={(e) => { e.stopPropagation(); setRenaming(s.id); setRenameVal(s.title); }}
                            className={`text-sm truncate ${activeId === s.id ? 'text-[#3B5BDB] font-semibold' : 'text-gray-800'}`}>
                            {s.title}
                          </p>
                        )}
                        <p className="text-xs text-gray-400">{relTime(s.updatedAt || s.createdAt)}</p>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 text-xs transition-opacity shrink-0">
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Footer utilisateur */}
            <div className="p-3 border-t border-[#E5E5E5] flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#EEF2FF] flex items-center justify-center text-[#3B5BDB] font-black text-sm">
                {user?.name?.[0]?.toUpperCase() || 'T'}
              </div>
              <span className="text-sm font-semibold text-gray-700 flex-1 truncate">{user?.name || 'Toi'}</span>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ══ ZONE CHAT ════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E5E5] bg-white">
          <button onClick={() => setSidebarOpen(v => !v)}
            className="text-gray-400 hover:text-gray-700 text-lg" title="Sessions">
            ☰
          </button>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-teal-400 rounded-full animate-pulse" />
            <p className="text-sm font-bold text-gray-700 truncate max-w-xs">
              {activeSession?.title || 'ADAH AI · TCC TDAH'}
            </p>
          </div>
          <button onClick={newSession}
            className="text-xs bg-[#EEF2FF] text-[#3B5BDB] font-bold px-3 py-1.5 rounded-lg hover:bg-[#dce3ff] transition-colors">
            + Nouvelle
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[720px] mx-auto px-6 py-6">
            {/* Suggestions si conversation vide (juste le greeting) */}
            {messages.length <= 1 && !isStreaming && (
              <div className="mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
                  {QUICK_STARTS.map((q, i) => (
                    <button key={i} onClick={() => send(q)}
                      className="text-left text-sm text-gray-600 bg-white hover:bg-[#EEF2FF] hover:text-[#3B5BDB] border border-[#E5E5E5] hover:border-[#748FFC] rounded-xl px-4 py-3 transition-all">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={m.id || i} className={`mb-5 flex ${m.role === 'user' ? 'justify-end' : 'justify-start gap-3'}`}>
                {m.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-[#3B5BDB] flex items-center justify-center text-white font-black text-sm shrink-0 mt-0.5">A</div>
                )}
                <div className={m.role === 'user' ? 'max-w-[70%]' : 'max-w-[85%]'}>
                  <div className={m.role === 'user'
                    ? 'bg-[#EEF2FF] text-[#1a1a1a] rounded-[18px_18px_4px_18px] px-4 py-3 text-[15px] leading-relaxed'
                    : 'text-[#1a1a1a] text-[15px] leading-relaxed'}>
                    {m.role === 'assistant' ? <Markdown content={m.content} /> : m.content}
                  </div>
                  {/* Actions sous message IA */}
                  {m.role === 'assistant' && m.id !== 'greet' && (
                    <div className="flex items-center gap-1 mt-1.5 opacity-60 hover:opacity-100 transition-opacity">
                      <button onClick={() => copyMsg(m.content)} title="Copier" className="text-xs text-gray-400 hover:text-gray-700 px-1.5 py-1 rounded hover:bg-gray-100">📋</button>
                      {i === messages.length - 1 && (
                        <button onClick={regenerate} title="Régénérer" className="text-xs text-gray-400 hover:text-gray-700 px-1.5 py-1 rounded hover:bg-gray-100">🔁</button>
                      )}
                      <button title="Utile" className="text-xs text-gray-400 hover:text-teal-500 px-1.5 py-1 rounded hover:bg-gray-100">👍</button>
                      <button title="Pas utile" className="text-xs text-gray-400 hover:text-red-400 px-1.5 py-1 rounded hover:bg-gray-100">👎</button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Streaming en cours */}
            {isStreaming && (
              <div className="mb-5 flex justify-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-[#3B5BDB] flex items-center justify-center text-white font-black text-sm shrink-0 mt-0.5">A</div>
                <div className="max-w-[85%] text-[#1a1a1a] text-[15px] leading-relaxed">
                  {stream ? (
                    <><Markdown content={stream} /><span className="inline-block w-1.5 h-4 bg-[#3B5BDB] ml-0.5 align-middle animate-pulse" /></>
                  ) : (
                    <span className="flex gap-1 items-center h-5">
                      {[0,1,2].map(d => <span key={d} className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: `${d*0.15}s` }} />)}
                    </span>
                  )}
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-center justify-between">
                <span>⚠️ {error}</span>
                <button onClick={() => { const lu = [...messages].reverse().find(m => m.role === 'user'); if (lu) send(lu.content); }}
                  className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-lg">Réessayer</button>
              </div>
            )}

            <div ref={endRef} />
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-[#E5E5E5] bg-white px-4 py-3">
          <div className="max-w-[720px] mx-auto">
            <div className="flex items-end gap-2 bg-[#F9F9F8] border border-[#E5E5E5] rounded-2xl px-3 py-2 focus-within:border-[#748FFC] transition-colors">
              <textarea ref={taRef} value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
                placeholder="Décris tes symptômes ou demande de l'aide..."
                rows={1} disabled={isStreaming}
                className="flex-1 bg-transparent resize-none outline-none text-[15px] py-1.5 max-h-40 leading-relaxed" />
              <button onClick={() => send(input)} disabled={!input.trim() || isStreaming}
                className="w-9 h-9 rounded-xl bg-[#3B5BDB] hover:bg-[#3450c5] disabled:opacity-30 text-white flex items-center justify-center shrink-0 transition-colors">
                {isStreaming ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : '↑'}
              </button>
            </div>
            <div className="flex items-center justify-between mt-1.5 px-1">
              <p className="text-xs text-gray-300">🔒 Soutien TCC · Pas de diagnostic médical</p>
              <p className="text-xs text-gray-300">{wordCount > 0 ? `~${wordCount} mots` : ''}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
