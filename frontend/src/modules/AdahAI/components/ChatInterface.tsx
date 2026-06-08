/**
 * ChatInterface.tsx — Interface de chat ADAH AI
 * Claude Sonnet 4.5 · Streaming · Format TDAH strict
 * Règles : max 3 phrases, 1 action, jamais de culpabilité
 */
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdahStore } from '../store/adahStore';
import { useAdahChat } from '../hooks/useAdahChat';
import { useAppStore } from '../../../stores/useStore';

const MOOD_OPTIONS = [
  { value: 'bien',       emoji: '😊', label: 'Je vais bien' },
  { value: 'neutre',     emoji: '😐', label: 'Neutre' },
  { value: 'anxieux',    emoji: '😰', label: 'Anxieux(se)' },
  { value: 'bloqué',     emoji: '🧱', label: 'Bloqué(e)' },
  { value: 'fatigué',    emoji: '😴', label: 'Fatigué(e)' },
  { value: 'submergé',   emoji: '🌊', label: 'Submergé(e)' },
];

// Suggestions rapides multilingues
const QUICK_STARTS_I18N: Record<string, string[]> = {
  fr: [
    "J'ai du mal à commencer ma tâche principale",
    "Je me sens submergé(e) par tout ce que j'ai à faire",
    "J'ai procrastiné toute la journée et je me sens mal",
    "J'ai besoin d'aide pour rester concentré(e)",
  ],
  en: [
    "I can't start my main task today",
    "I feel overwhelmed by everything I need to do",
    "I've been procrastinating all day and feel bad",
    "I need help staying focused",
  ],
  ar: [
    "لا أستطيع البدء في مهمتي الرئيسية",
    "أشعر بالإرهاق من كل ما يجب علي فعله",
    "لقد أجّلت العمل طوال اليوم وأشعر بالذنب",
    "أحتاج مساعدة للتركيز",
  ],
};

const MOOD_I18N: Record<string, typeof MOOD_OPTIONS> = {
  fr: MOOD_OPTIONS,
  en: [
    { value: 'bien', emoji: '😊', label: 'Doing well' },
    { value: 'neutre', emoji: '😐', label: 'Neutral' },
    { value: 'anxieux', emoji: '😰', label: 'Anxious' },
    { value: 'bloqué', emoji: '🧱', label: 'Blocked' },
    { value: 'fatigué', emoji: '😴', label: 'Tired' },
    { value: 'submergé', emoji: '🌊', label: 'Overwhelmed' },
  ],
  ar: [
    { value: 'bien', emoji: '😊', label: 'بخير' },
    { value: 'neutre', emoji: '😐', label: 'محايد' },
    { value: 'anxieux', emoji: '😰', label: 'قلق' },
    { value: 'bloqué', emoji: '🧱', label: 'متعثر' },
    { value: 'fatigué', emoji: '😴', label: 'متعب' },
    { value: 'submergé', emoji: '🌊', label: 'مثقل' },
  ],
};

interface Props {
  onStartVoice?: () => void;
}

export default function ChatInterface({ onStartVoice }: Props) {
  const { session, isStreaming, streamBuffer, focusMode } = useAdahStore();
  const { sendMessage, initSession, endAndSummarize, error } = useAdahChat();
  const user = useAppStore(s => s.user);

  // Détection langue de l'interface
  const detectLang = (text: string): 'fr' | 'en' | 'ar' => {
    if (/[؀-ۿ]/.test(text)) return 'ar';
    if (/\b(the|and|you|have|can|your|i'm|don't|help)\b/i.test(text)) return 'en';
    return 'fr';
  };
  const lastUserMsg = session?.messages.filter(m => m.role === 'user').slice(-1)[0]?.content || '';
  const uiLang = detectLang(lastUserMsg || user?.name || 'fr');
  const isRTL = uiLang === 'ar';
  const quickStarts = QUICK_STARTS_I18N[uiLang] || QUICK_STARTS_I18N.fr;
  const moodOpts = MOOD_I18N[uiLang] || MOOD_I18N.fr;

  const [input,       setInput]       = useState('');
  const [showMood,    setShowMood]    = useState(!session);
  const [selectedMood, setSelectedMood] = useState('');
  const [showSummary, setShowSummary] = useState(false);
  const [summary,     setSummary]     = useState<any>(null);
  const [ending,      setEnding]      = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.messages, streamBuffer]);

  const handleStart = async (mood: string) => {
    setSelectedMood(mood);
    setShowMood(false);
    const sessionId = await initSession(mood);
    if (sessionId) {
      // Message de bienvenue selon l'humeur
      const welcomeMsg = mood === 'bloqué'
        ? `Je me sens bloqué(e) et j'ai besoin d'aide`
        : mood === 'submergé'
        ? `Je me sens submergé(e) par tout ce que j'ai à faire`
        : `Je commence une session, mon humeur : ${mood}`;
      await sendMessage(welcomeMsg);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput('');
    await sendMessage(text);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleEnd = async () => {
    setEnding(true);
    const result = await endAndSummarize();
    setSummary(result);
    setShowSummary(true);
    setEnding(false);
  };

  const formatMessage = (text: string) => {
    // Mise en forme TDAH : gras sur les mots-clés importants
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>');
  };

  // ── Écran de sélection d'humeur ───────────────────────────────────────────
  if (showMood) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center h-full p-8"
      >
        <div className="w-16 h-16 bg-gradient-to-br from-teal-400 to-teal-600 rounded-2xl flex items-center justify-center text-3xl mb-6 shadow-lg">
          🧠
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-2 text-center">
          Comment tu vas, {user?.name?.split(' ')[0]} ?
        </h2>
        <p className="text-gray-500 text-sm mb-8 text-center max-w-xs">
          Je vais adapter notre session à ton état du moment
        </p>

        <div className="grid grid-cols-2 gap-3 w-full max-w-sm mb-8" dir={isRTL ? 'rtl' : 'ltr'}>
          {moodOpts.map(mood => (
            <button
              key={mood.value}
              onClick={() => handleStart(mood.value)}
              className="flex items-center gap-3 px-4 py-3 bg-white border-2 border-gray-200 hover:border-teal-400 hover:bg-teal-50 rounded-2xl transition-all text-left group"
            >
              <span className="text-2xl">{mood.emoji}</span>
              <span className="text-sm font-semibold text-gray-700 group-hover:text-teal-700">{mood.label}</span>
            </button>
          ))}
        </div>

        <p className="text-xs text-gray-400 text-center max-w-xs">
          🔒 ADAH AI est un outil de soutien TCC. Il ne fournit pas de diagnostics médicaux.
        </p>
      </motion.div>
    );
  }

  // ── Écran résumé de fin ───────────────────────────────────────────────────
  if (showSummary && summary) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center h-full p-8 text-center"
      >
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-2xl font-black text-gray-900 mb-2">Session terminée !</h2>
        <p className="text-gray-500 text-sm mb-6">
          {summary.duration ? `${Math.floor(summary.duration / 60)} minutes de focus TCC` : 'Session enregistrée'}
        </p>

        {summary.summary && (
          <div className="bg-teal-50 border border-teal-200 rounded-2xl p-5 mb-5 max-w-sm text-left">
            <p className="text-xs font-bold text-teal-600 uppercase mb-2">Résumé de la session</p>
            <p className="text-sm text-gray-700 leading-relaxed">{summary.summary}</p>
          </div>
        )}

        {summary.insights?.length > 0 && (
          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5 mb-6 max-w-sm text-left w-full">
            <p className="text-xs font-bold text-purple-600 uppercase mb-2">💡 Insights clés</p>
            {summary.insights.map((ins: string, i: number) => (
              <p key={i} className="text-sm text-gray-700 flex gap-2 mb-1">
                <span className="text-purple-400 shrink-0">•</span>{ins}
              </p>
            ))}
          </div>
        )}

        <button
          onClick={() => { setShowSummary(false); setShowMood(true); setSummary(null); useAdahStore.getState().endSession(); }}
          className="bg-teal-500 hover:bg-teal-600 text-white font-black px-8 py-3 rounded-2xl transition-colors"
        >
          Nouvelle session
        </button>
      </motion.div>
    );
  }

  // ── Interface chat principale ─────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">

      {/* Header session */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-white shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-teal-600 rounded-xl flex items-center justify-center text-white text-sm font-black">
            🧠
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm">ADAH AI</p>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-teal-400 rounded-full animate-pulse" />
              <span className="text-xs text-gray-400">Claude Sonnet 4.5 · TCC TDAH</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onStartVoice && (
            <button onClick={onStartVoice}
              className="flex items-center gap-1.5 text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 font-bold px-3 py-1.5 rounded-xl transition-colors">
              🎤 Voix
            </button>
          )}
          <button
            onClick={handleEnd}
            disabled={ending || !session?.messages.length}
            className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-40"
          >
            {ending ? '⏳' : '✓ Terminer'}
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className={`flex-1 overflow-y-auto px-5 py-4 space-y-4`} dir={isRTL ? 'rtl' : 'ltr'}>

        {/* Messages démarrés */}
        {session?.messages.length === 0 && (
          <div className="py-6">
            <p className="text-xs text-gray-400 font-bold uppercase text-center mb-3">Suggestions rapides</p>
            <div className="space-y-2" dir={isRTL ? 'rtl' : 'ltr'}>
              {quickStarts.map((s, i) => (
                <button key={i} onClick={() => sendMessage(s)}
                  className="w-full text-left text-sm text-gray-600 bg-gray-50 hover:bg-teal-50 hover:text-teal-700 border border-gray-200 hover:border-teal-300 rounded-xl px-4 py-2.5 transition-all">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Historique */}
        <AnimatePresence initial={false}>
          {session?.messages.map((msg, i) => (
            <motion.div
              key={msg.id || i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-3`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-teal-600 rounded-xl flex items-center justify-center text-white text-sm shrink-0 mt-0.5">
                  🧠
                </div>
              )}
              <div className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                msg.role === 'user'
                  ? 'bg-teal-500 text-white rounded-br-sm'
                  : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm shadow-sm'
              }`}>
                <p className="text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                />
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 bg-gray-200 rounded-xl overflow-hidden shrink-0 mt-0.5">
                  {user?.avatar
                    ? <img src={user.avatar} className="w-full h-full object-cover" />
                    : <div className="w-full h-full bg-teal-600 flex items-center justify-center text-white text-xs font-black">{user?.name?.[0]}</div>
                  }
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Stream en cours */}
        {isStreaming && streamBuffer && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-teal-600 rounded-xl flex items-center justify-center text-white text-sm shrink-0">
              🧠
            </div>
            <div className="max-w-[80%] px-4 py-3 rounded-2xl bg-white border border-teal-200 rounded-bl-sm shadow-sm">
              <p className="text-sm leading-relaxed text-gray-800"
                dangerouslySetInnerHTML={{ __html: formatMessage(streamBuffer) }}
              />
              <span className="inline-block w-2 h-4 bg-teal-400 animate-pulse ml-0.5 rounded-sm" />
            </div>
          </motion.div>
        )}

        {/* Indicateur de frappe */}
        {isStreaming && !streamBuffer && (
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-teal-600 rounded-xl flex items-center justify-center text-white text-sm shrink-0">
              🧠
            </div>
            <div className="px-4 py-3 rounded-2xl bg-white border border-gray-100 shadow-sm">
              <div className="flex gap-1.5 items-center h-4">
                {[0,1,2].map(i => (
                  <span key={i} className="w-2 h-2 bg-teal-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            ⚠️ {error}
            {error.includes('clé API') && (
              <p className="text-xs mt-1 text-red-500">Configure ta clé Anthropic dans le fichier .env du backend</p>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Zone de saisie */}
      <div className="px-4 py-4 bg-white border-t border-gray-100 shrink-0">
        <div className="flex gap-3 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
            placeholder="Écris ce que tu ressens... (Entrée pour envoyer)"
            disabled={isStreaming}
            rows={1}
            maxLength={2000}
            className="flex-1 resize-none bg-gray-50 border-2 border-gray-200 focus:border-teal-400 rounded-2xl px-4 py-3 text-sm outline-none leading-relaxed disabled:opacity-50 transition-colors"
            style={{ minHeight: '48px', maxHeight: '120px' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="w-11 h-11 bg-teal-500 hover:bg-teal-600 disabled:opacity-40 text-white rounded-2xl flex items-center justify-center transition-colors shrink-0 shadow-sm"
          >
            {isStreaming ? (
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <span className="text-lg">➤</span>
            )}
          </button>
        </div>
        {/* Bannière conformité EU AI Act */}
        <p className="text-center text-xs text-gray-300 mt-2">
          🔒 ADAH AI · Outil de soutien TCC — Ne fournit pas de diagnostics médicaux
        </p>
      </div>
    </div>
  );
}
