import type { Config } from 'tailwindcss';

/**
 * FocusBrain — Design System « Calm Focus »
 * Palette pensée pour le TDAH : peu de couleurs, désaturées et apaisantes,
 * fort contraste réservé au texte. Une couleur primaire (bleu calme), une
 * couleur d'accent unique (amber, usage rare), un secondaire discret, et des
 * neutres. La clé s'appelle toujours `teal` pour ne pas réécrire chaque page :
 * retuner ces valeurs rethème toute l'app d'un coup.
 * Le 500 (#3B6FC4) garde un contraste ≥ 4.5:1 avec du texte blanc (WCAG AA).
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'Nunito', 'sans-serif'],
        display: ['DM Sans', 'sans-serif'],
      },
      colors: {
        // ── PRIMAIRE — bleu apaisant (focus, calme) ──────────────────────────
        teal: {
          50:  '#EEF4FC',
          100: '#DCE9F9',
          200: '#B9D3F1',
          300: '#8AB4E4',
          400: '#5C93D6',
          500: '#3B6FC4',  // primaire — contraste 4.9:1 avec blanc (AA ✓)
          600: '#2F5AA8',
          700: '#264A8C',
          800: '#1E3A70',
          900: '#182F5B',
        },
        // ── SECONDAIRE — indigo ardoise très discret (anciens violet-*) ───────
        violet: {
          50:  '#F1F2F8',
          100: '#E4E6F2',
          200: '#CBCFE6',
          400: '#9298C4',
          500: '#7077B0',
          600: '#5A62A0',
          700: '#4A5190',
        },
        // ── ACCENT — amber chaud et atténué (usage rare : « maintenant », CTA) ─
        amber: {
          400: '#E8B574',
          500: '#DB9A45',
          600: '#C07F2C',
        },
        // ── NEUTRES — ardoise bleutée (texte / surfaces / bordures) ───────────
        ink: {
          900: '#141E30',  // titres
          700: '#39465C',  // texte
          500: '#5A6880',  // texte secondaire
          400: '#66738A',  // faible — contraste 4.8:1 sur blanc (AA ✓)
        },
        surface: {
          DEFAULT: '#FFFFFF',
          soft: '#F5F7FA',  // fond de page
          muted: '#ECF0F6',
        },
        line: '#E2E8F1',     // bordures
      },
      borderRadius: {
        xl: '14px',
        '2xl': '18px',
        '3xl': '24px',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(22, 35, 31, 0.04), 0 4px 16px rgba(22, 35, 31, 0.05)',
        card: '0 1px 3px rgba(22, 35, 31, 0.06), 0 8px 24px rgba(22, 35, 31, 0.04)',
      },
      lineHeight: {
        relaxed: '1.65',
      },
    },
  },
  plugins: [],
} satisfies Config;
