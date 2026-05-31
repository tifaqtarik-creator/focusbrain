import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export default function Circle() {
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
    <div className="max-w-lg mx-auto px-4 py-12">
      <h1 className="text-2xl font-black mb-2">Ton Cercle de Confiance</h1>
      <p className="text-gray-500 mb-8">Tes partenaires TDAH prioritaires — jusqu'à 5 avec Premium</p>

      {isLoading && <p className="text-gray-400">Chargement...</p>}

      {circle.length === 0 && !isLoading && (
        <div className="bg-teal-50 rounded-2xl p-8 text-center">
          <div className="text-4xl mb-4">💜</div>
          <p className="font-semibold mb-2">Ton cercle est vide</p>
          <p className="text-gray-500 text-sm">Après une session, tu peux inviter ton partenaire dans ton cercle pour le matcher en priorité.</p>
        </div>
      )}

      <div className="space-y-3">
        {circle.map((p: { id: string; name: string; avatar?: string }) => (
          <div key={p.id} className="flex items-center justify-between bg-white border-2 border-gray-100 rounded-2xl px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center font-bold text-teal-600">
                {p.name[0].toUpperCase()}
              </div>
              <span className="font-medium">{p.name}</span>
            </div>
            <button
              onClick={() => remove.mutate(p.id)}
              className="text-gray-300 hover:text-red-400 text-sm transition-colors"
            >
              Retirer
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
