/**
 * adahStore.ts — État de session ADAH AI
 * Zustand store pour la session en cours + historique local
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AdahMessage {
  id:        string;
  role:      'user' | 'assistant';
  content:   string;
  createdAt: Date;
  tokens?:   number;
}

export interface AdahSession {
  id:        string;
  title:     string;
  mode:      'chat' | 'voice' | 'video';
  mood?:     string;
  messages:  AdahMessage[];
  startedAt: Date;
}

interface AdahStore {
  // Session courante
  session:       AdahSession | null;
  isStreaming:   boolean;
  streamBuffer:  string;
  focusMode:     boolean;  // masque les distractions
  voiceActive:   boolean;

  // Actions session
  startSession:   (id: string, title: string, mode?: AdahSession['mode'], mood?: string) => void;
  endSession:     () => void;
  addMessage:     (msg: Omit<AdahMessage, 'id' | 'createdAt'>) => void;
  appendStream:   (text: string) => void;
  commitStream:   () => void;
  clearStream:    () => void;

  // UI
  setFocusMode:   (v: boolean) => void;
  setVoiceActive: (v: boolean) => void;
  setStreaming:   (v: boolean) => void;
}

export const useAdahStore = create<AdahStore>()(
  persist(
    (set, get) => ({
      session:      null,
      isStreaming:  false,
      streamBuffer: '',
      focusMode:    false,
      voiceActive:  false,

      startSession: (id, title, mode = 'chat', mood) => set({
        session: { id, title, mode, mood, messages: [], startedAt: new Date() },
        streamBuffer: '',
        isStreaming:  false,
        focusMode:    true,
      }),

      endSession: () => set({ session: null, focusMode: false, voiceActive: false }),

      addMessage: (msg) => set(state => ({
        session: state.session ? {
          ...state.session,
          messages: [...state.session.messages, {
            ...msg,
            id: Date.now().toString(),
            createdAt: new Date(),
          }],
        } : null,
      })),

      appendStream: (text) => set(state => ({ streamBuffer: state.streamBuffer + text })),

      commitStream: () => {
        const { streamBuffer, session } = get();
        if (!streamBuffer || !session) return;
        set(state => ({
          session: state.session ? {
            ...state.session,
            messages: [...state.session.messages, {
              id: Date.now().toString(),
              role: 'assistant',
              content: streamBuffer,
              createdAt: new Date(),
            }],
          } : null,
          streamBuffer: '',
          isStreaming:  false,
        }));
      },

      clearStream:    () => set({ streamBuffer: '', isStreaming: false }),
      setFocusMode:   (v) => set({ focusMode: v }),
      setVoiceActive: (v) => set({ voiceActive: v }),
      setStreaming:   (v) => set({ isStreaming: v }),
    }),
    {
      name: 'adah-session',
      partialize: (s) => ({ session: s.session }), // persister seulement la session
    }
  )
);
