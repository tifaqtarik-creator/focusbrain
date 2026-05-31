import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import api from '../lib/api';
import { useAppStore } from '../stores/useStore';
import { useI18n } from '../lib/i18n';

const SPACE_IDS = ['STRATEGIES_TDAH', 'MEDICATION', 'OUTILS', 'TRAVAIL', 'ETUDES', 'VIE_PERSO'] as const;
const REACTIONS = ['❤️', '💪', '🧠', '✨', '🤝'];

export default function Community() {
  const { t } = useI18n();
  const c = t.community;
  const [space, setSpace] = useState<typeof SPACE_IDS[number]>('STRATEGIES_TDAH');
  const [content, setContent] = useState('');
  const isPremium = useAppStore(s => s.user?.isPremium);
  const qc = useQueryClient();

  const { data: posts = [] } = useQuery({
    queryKey: ['forum', space],
    queryFn: () => api.get(`/forum/${space}`).then(r => r.data),
  });

  const post = useMutation({
    mutationFn: () => api.post('/forum', { spaceId: space, content }),
    onSuccess: () => { setContent(''); qc.invalidateQueries({ queryKey: ['forum', space] }); },
  });

  const react = useMutation({
    mutationFn: ({ id, emoji }: { id: string; emoji: string }) => api.post(`/forum/${id}/react`, { emoji }),
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-black text-gray-900 mb-6">{c.title}</h1>

      {/* Espaces — pills horizontaux */}
      <div className="flex gap-2 flex-wrap mb-6">
        {SPACE_IDS.map(id => (
          <button
            key={id}
            onClick={() => setSpace(id)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              space === id ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {c.spaces[id]}
          </button>
        ))}
      </div>

      {/* Composer */}
      {isPremium ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-gray-100 rounded-2xl p-5 mb-6"
        >
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder={c.postPlaceholder}
            className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 focus:border-teal-500 focus:outline-none resize-none h-24 text-base"
          />
          <div className="flex justify-end mt-3">
            <button
              onClick={() => post.mutate()}
              disabled={!content.trim() || post.isPending}
              className="bg-teal-500 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-teal-600 transition-colors disabled:opacity-50"
            >
              {c.publish}
            </button>
          </div>
        </motion.div>
      ) : (
        <div className="bg-teal-50 rounded-2xl p-5 mb-6 text-center">
          <p className="font-semibold text-gray-900 mb-1">{c.premiumOnly}</p>
          <p className="text-gray-500 text-sm">{c.premiumRead}</p>
        </div>
      )}

      {/* Posts */}
      <div className="space-y-4">
        {posts.map((p: any, i: number) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-white border border-gray-100 rounded-2xl p-5"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center text-sm font-bold text-teal-600">
                {p.user.name[0].toUpperCase()}
              </div>
              <div>
                <span className="font-semibold text-sm text-gray-900">{p.user.name}</span>
                {p.user.tdahType && (
                  <span className="ml-2 text-xs text-gray-400">{p.user.tdahType.replace('_', ' ')}</span>
                )}
              </div>
            </div>
            <p className="text-gray-700 text-sm mb-4 leading-relaxed">{p.content}</p>
            <div className="flex gap-3">
              {REACTIONS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => react.mutate({ id: p.id, emoji })}
                  className="text-xl hover:scale-125 transition-transform"
                  aria-label={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
