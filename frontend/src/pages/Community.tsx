import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useAppStore } from '../stores/useStore';

const SPACES = [
  { id: 'STRATEGIES_TDAH', label: '🧠 Stratégies TDAH' },
  { id: 'MEDICATION', label: '💊 Médication' },
  { id: 'OUTILS', label: '🛠️ Outils' },
  { id: 'TRAVAIL', label: '💼 Travail' },
  { id: 'ETUDES', label: '📚 Études' },
  { id: 'VIE_PERSO', label: '🌱 Vie perso' },
];

const REACTIONS = ['❤️', '💪', '🧠', '✨', '🤝'];

export default function Community() {
  const [space, setSpace] = useState('STRATEGIES_TDAH');
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
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-black mb-8">Communauté TDAH</h1>

      {/* Espaces thématiques */}
      <div className="flex gap-2 flex-wrap mb-8">
        {SPACES.map(s => (
          <button
            key={s.id}
            onClick={() => setSpace(s.id)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${space === s.id ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Composer — Premium uniquement */}
      {isPremium ? (
        <div className="bg-white border-2 border-gray-100 rounded-2xl p-6 mb-8">
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Partage ta stratégie, ton expérience, ta question..."
            className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 focus:border-teal-500 focus:outline-none resize-none h-24"
          />
          <div className="flex justify-end mt-3">
            <button
              onClick={() => post.mutate()}
              disabled={!content.trim() || post.isPending}
              className="bg-teal-500 text-white font-bold px-6 py-2 rounded-xl hover:bg-teal-600 transition-colors disabled:opacity-50"
            >
              Publier
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-teal-50 rounded-2xl p-6 mb-8 text-center">
          <p className="font-semibold mb-2">Participation réservée aux membres Premium</p>
          <p className="text-gray-500 text-sm">Tu peux lire tous les posts gratuitement.</p>
        </div>
      )}

      {/* Posts */}
      <div className="space-y-6">
        {posts.map((p: any) => (
          <div key={p.id} className="bg-white border-2 border-gray-100 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center text-sm font-bold text-teal-600">
                {p.user.name[0].toUpperCase()}
              </div>
              <div>
                <span className="font-semibold text-sm">{p.user.name}</span>
                {p.user.tdahType && <span className="ml-2 text-xs text-gray-400">{p.user.tdahType.replace('_', ' ')}</span>}
              </div>
            </div>
            <p className="text-gray-800 mb-4">{p.content}</p>
            <div className="flex gap-2">
              {REACTIONS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => react.mutate({ id: p.id, emoji })}
                  className="text-xl hover:scale-125 transition-transform"
                  aria-label={`Réagir avec ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
