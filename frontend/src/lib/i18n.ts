import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import fr from '../locales/fr';
import en from '../locales/en';
import ar from '../locales/ar';
import es from '../locales/es';
import pt from '../locales/pt';

export type Lang = 'fr' | 'en' | 'ar' | 'es' | 'pt';

export const LANGUAGES: { code: Lang; label: string; flag: string; rtl?: boolean }[] = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'ar', label: 'العربية', flag: '🇲🇦', rtl: true },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
];

const translations = { fr, en, ar, es, pt };

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };
type Translations = typeof fr;

interface I18nStore {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Translations;
}

export const useI18n = create<I18nStore>()(
  persist(
    (set, get) => ({
      lang: 'fr',
      t: fr,
      setLang: (lang: Lang) => {
        const t = translations[lang] as Translations;
        // Apply RTL for Arabic
        document.documentElement.dir = LANGUAGES.find(l => l.code === lang)?.rtl ? 'rtl' : 'ltr';
        document.documentElement.lang = lang;
        set({ lang, t });
      },
    }),
    {
      name: 'focusbrain-lang',
      onRehydrateStorage: () => (state) => {
        if (state) {
          const t = translations[state.lang] as Translations;
          state.t = t;
          document.documentElement.dir = LANGUAGES.find(l => l.code === state.lang)?.rtl ? 'rtl' : 'ltr';
          document.documentElement.lang = state.lang;
        }
      },
    }
  )
);
