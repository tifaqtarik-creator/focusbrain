import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import api from '../lib/api';
import { useI18n } from '../lib/i18n';

export default function Circle() {
  const { t } = useI18n();
  const c = t.circle;
  const qc = useQueryClient();

  const { data: circle = [], isLoading } = useQuery({
    queryKey: ['circle'],
    queryFn: () => api.get('/matching/circle-online').then(r => r.data),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/matching/circle/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['circle'] }),
  });

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <h1 className="text-2xl font-black text-gray-900 mb-1">{c.title}</h1>
      <p className="text-gray-500 text-sm mb-8">{c.sub}</p>

      {isLoading && (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <span className="animate-spin text-2xl mr-2">⏳</span> {c.loading}
        </div>
      )}

      {!isLoading && circle.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-teal-50 rounded-2xl p-10 text-center"
        >
          <div className="text-5xl mb-4">💜</div>
          <p className="font-bold text-gray-900 mb-2">{c.empty}</p>
          <p className="text-gray-500 text-sm">{c.emptyDesc}</p>
        </motion.div>
      )}

      <div className="space-y-3">
        {circle.map((p: { id: string; name: string }, i: number) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
            className="flex items-center justify-between bg-white border border-gray-100 rounded-2xl px-5 py-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center font-bold text-teal-600">
                {p.name[0].toUpperCase()}
              </div>
              <span className="font-semibold text-gray-900">{p.name}</span>
            </div>
            <button
              onClick={() => remove.mutate(p.id)}
              className="text-gray-300 hover:text-red-400 text-sm font-medium transition-colors px-3 py-1 rounded-lg hover:bg-red-50"
            >
              {c.remove}
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
