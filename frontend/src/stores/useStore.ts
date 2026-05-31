import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  timezone: string;
  tdahType?: string;
  workStyle?: string;
  role: string;
  isPremium: boolean;
  lowStimMode: boolean;
}

interface AppStore {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  lowStimMode: boolean;

  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  toggleLowStim: () => void;
  updateUser: (partial: Partial<User>) => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      lowStimMode: false,

      setAuth: (user, accessToken, refreshToken) => {
        set({ user, accessToken, refreshToken, lowStimMode: user.lowStimMode });
      },

      logout: () => {
        set({ user: null, accessToken: null, refreshToken: null });
      },

      toggleLowStim: () => {
        const next = !get().lowStimMode;
        set({ lowStimMode: next });
        const user = get().user;
        if (user) set({ user: { ...user, lowStimMode: next } });
      },

      updateUser: (partial) => {
        const user = get().user;
        if (user) set({ user: { ...user, ...partial } });
      },
    }),
    {
      name: 'focusbrain-store',
      partialize: (s) => ({ user: s.user, accessToken: s.accessToken, refreshToken: s.refreshToken, lowStimMode: s.lowStimMode }),
    }
  )
);
