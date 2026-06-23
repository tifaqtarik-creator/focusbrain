import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Loader2, Handshake } from 'lucide-react';
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
      <h1 className="text-2xl font-black text-ink-900 mb-1">{c.title}</h1>
      <p className="text-ink-500 text-sm mb-8">{c.sub}</p>

      {isLoading && (
        <div className="flex items-center justify-center py-12 text-ink-400">
          <Loader2 size={20} strokeWidth={2} className="animate-spin mr-2" /> {c.loading}
        </div>
      )}

      {!isLoading && circle.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-teal-50 rounded-2xl p-10 text-center"
        >
          <Handshake size={40} strokeWidth={2} className="text-teal-600 mx-auto mb-4" />
          <p className="font-bold text-ink-900 mb-2">{c.empty}</p>
          <p className="text-ink-500 text-sm">{c.emptyDesc}</p>
        </motion.div>
      )}

      <div className="space-y-3">
        {circle.map((p: { id: string; name: string }, i: number) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
            className="flex items-center justify-between bg-white border border-line rounded-2xl px-5 py-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center font-bold text-teal-600">
                {p.name[0].toUpperCase()}
              </div>
              <span className="font-semibold text-ink-900">{p.name}</span>
            </div>
            <button
              onClick={() => remove.mutate(p.id)}
              className="text-ink-400 hover:text-red-400 text-sm font-medium transition-colors px-3 py-1 rounded-lg hover:bg-red-50"
            >
              {c.remove}
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
