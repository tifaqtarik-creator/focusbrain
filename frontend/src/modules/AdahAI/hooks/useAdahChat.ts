/**
 * useAdahChat.ts — Hook de chat ADAH AI avec streaming SSE
 */
import { useState, useCallback } from 'react';
import api from '../../../lib/api';
import { useAdahStore } from '../store/adahStore';
import { useAppStore } from '../../../stores/useStore';

// Message d'accueil chaleureux personnalisé (TDAH-friendly)
function buildGreeting(name?: string, mood?: string): string {
  const first = name?.split(' ')[0] || 'toi';
  const moodLine: Record<string, string> = {
    bloque:   `Je sens que c'est difficile là, et c'est ok. On va avancer ensemble, un tout petit pas à la fois.`,
    submerge: `Tu te sens débordé(e) ? Respire. On va trier ça calmement, sans pression.`,
    anxieux:  `L'anxiété est là, je la vois. Tu es en sécurité ici, prends ton temps.`,
    fatigue:  `Tu es fatigué(e) — c'est une vraie info, pas une faiblesse. On fait simple aujourd'hui.`,
    bien:     `Content de te voir en forme aujourd'hui ! 😊`,
    neutre:   ``,
  };
  const extra = mood && moodLine[mood] ? `\n\n${moodLine[mood]}` : '';
  return `Bonjour ${first} 💜 Je suis ADAH, ton thérapeute IA. Je suis là pour toi, sans jugement.${extra}\n\nDis-moi simplement : qu'est-ce qui se passe pour toi en ce moment ?`;
}

export function useAdahChat() {
  const [error, setError] = useState<string | null>(null);
  const { session, addMessage, appendStream, commitStream, clearStream, setStreaming, startSession } = useAdahStore();
  const user = useAppStore(s => s.user);

  // Créer une nouvelle session si besoin
  const initSession = useCallback(async (mood?: string) => {
    try {
      const res = await api.post('/adah/sessions', { mode: 'chat', mood });
      startSession(res.data.session.id, res.data.session.title, 'chat', mood);
      // Message d'accueil immédiat (gratuit, instantané, personnalisé)
      const greeting = buildGreeting(useAppStore.getState().user?.name, mood);
      addMessage({ role: 'assistant', content: greeting });
      return res.data.session.id;
    } catch (err: any) {
      setError('Impossible de démarrer la session');
      return null;
    }
  }, [addMessage]);

  // Envoyer un message avec streaming SSE
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    let sessionId = session?.id;
    if (!sessionId) {
      sessionId = await initSession();
      if (!sessionId) return;
    }

    // Ajouter le message utilisateur
    addMessage({ role: 'user', content });
    setStreaming(true);
    setError(null);

    try {
      const token = useAppStore.getState().accessToken;
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || '/api'}/adah/sessions/${sessionId}/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ message: content }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Erreur serveur');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Stream non disponible');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          // Ne jamais avaler une erreur serveur dans le catch du JSON.parse
          let data: any = null;
          try { data = JSON.parse(line.slice(6)); } catch { continue; }
          if (data.error) throw new Error(data.error);
          if (data.text) appendStream(data.text);
          if (data.done) commitStream();
        }
      }

      commitStream();
    } catch (err: any) {
      clearStream();
      setError(err.message || 'Erreur de connexion');
    }
  }, [session, addMessage, appendStream, commitStream, clearStream, setStreaming, initSession]);

  // Terminer et résumer la session
  const endAndSummarize = useCallback(async () => {
    if (!session?.id) return null;
    try {
      const res = await api.post(`/adah/sessions/${session.id}/end`);
      return res.data;
    } catch { return null; }
  }, [session]);

  return { sendMessage, initSession, endAndSummarize, error, setError };
}
