import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSlotStore } from '../../stores/useSlotStore';
import { getSocket } from '../../lib/socket';
import { useAppStore } from '../../stores/useStore';
import { useQueryClient } from '@tanstack/react-query';

export default function SlotNotifications() {
  const { notifications, addNotification, removeNotification, addCandidate } = useSlotStore();
  const user = useAppStore(s => s.user);
  const qc = useQueryClient();
  const registered = useRef(false);

  useEffect(() => {
    if (!user || registered.current) return;
    registered.current = true;
    const socket = getSocket();

    // Nouveau candidat sur MON créneau
    socket.on('slot:request_received', (data: any) => {
      addNotification({
        id: Date.now().toString(),
        type: 'request',
        slotId: data.slotId,
        message: `${data.candidate.name} veut rejoindre ton créneau ${new Date(data.startTime).toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' })}`,
        candidate: data.candidate,
        totalCandidates: data.totalCandidates,
      });
      addCandidate(data.slotId, data.candidate);
      qc.invalidateQueries({ queryKey: ['slots-mine'] });
    });

    // Ma demande confirmée
    socket.on('slot:confirmed', (data: any) => {
      addNotification({
        id: Date.now().toString(),
        type: 'confirmed',
        slotId: data.slotId,
        message: `✅ ${data.creator.name} a confirmé ta demande !`,
      });
      qc.invalidateQueries({ queryKey: ['slots-mine'] });
      qc.invalidateQueries({ queryKey: ['slots-pending'] });
    });

    // Ma demande refusée
    socket.on('slot:rejected', (data: any) => {
      addNotification({
        id: Date.now().toString(),
        type: 'rejected',
        slotId: data.slotId,
        message: `❌ Ce créneau a été pris`,
      });
      qc.invalidateQueries({ queryKey: ['slots-pending'] });
      qc.invalidateQueries({ queryKey: ['slots'] });
    });

    // Calendrier mis à jour
    socket.on('slot:created', () => qc.invalidateQueries({ queryKey: ['slots'] }));
    socket.on('slot:updated', () => qc.invalidateQueries({ queryKey: ['slots'] }));
    socket.on('slot:cancelled', () => qc.invalidateQueries({ queryKey: ['slots'] }));

    return () => {
      socket.off('slot:request_received');
      socket.off('slot:confirmed');
      socket.off('slot:rejected');
      socket.off('slot:created');
      socket.off('slot:updated');
      socket.off('slot:cancelled');
    };
  }, [user]);

  return (
    <div className="fixed bottom-6 right-6 z-50 space-y-2 max-w-sm">
      <AnimatePresence>
        {notifications.map(n => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, x: 80, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 80, scale: 0.95 }}
            className={`rounded-2xl p-4 shadow-lg border text-sm font-medium flex items-start gap-3 ${
              n.type === 'confirmed' ? 'bg-teal-50 border-teal-200 text-teal-800' :
              n.type === 'rejected'  ? 'bg-red-50 border-red-200 text-red-700' :
                                      'bg-white border-gray-200 text-gray-800'
            }`}
          >
            <span className="text-xl mt-0.5">
              {n.type === 'confirmed' ? '✅' : n.type === 'rejected' ? '❌' : '🔔'}
            </span>
            <div className="flex-1">
              <p>{n.message}</p>
            </div>
            <button
              onClick={() => removeNotification(n.id)}
              className="text-gray-300 hover:text-gray-500 ml-2 text-lg leading-none"
            >×</button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
