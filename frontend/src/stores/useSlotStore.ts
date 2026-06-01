import { create } from 'zustand';

interface Candidate {
  id: string;
  name: string;
  tdahType?: string;
  avatar?: string;
}

interface Notification {
  id: string;
  type: 'request' | 'confirmed' | 'rejected';
  slotId: string;
  message: string;
  candidate?: Candidate;
  totalCandidates?: number;
}

interface SlotStore {
  notifications: Notification[];
  candidates: Record<string, Candidate[]>; // slotId → candidates
  addNotification: (n: Notification) => void;
  removeNotification: (id: string) => void;
  addCandidate: (slotId: string, candidate: Candidate) => void;
  clearCandidates: (slotId: string) => void;
}

export const useSlotStore = create<SlotStore>((set) => ({
  notifications: [],
  candidates: {},

  addNotification: (n) => {
    set(s => ({ notifications: [n, ...s.notifications].slice(0, 5) }));
    // Auto-dismiss après 8 secondes
    setTimeout(() => {
      set(s => ({ notifications: s.notifications.filter(x => x.id !== n.id) }));
    }, 8000);
  },

  removeNotification: (id) =>
    set(s => ({ notifications: s.notifications.filter(n => n.id !== id) })),

  addCandidate: (slotId, candidate) =>
    set(s => ({
      candidates: {
        ...s.candidates,
        [slotId]: [...(s.candidates[slotId] || []).filter(c => c.id !== candidate.id), candidate],
      },
    })),

  clearCandidates: (slotId) =>
    set(s => {
      const next = { ...s.candidates };
      delete next[slotId];
      return { candidates: next };
    }),
}));
