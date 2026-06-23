import type { Config } from 'tailwindcss';

/**
 * FocusBrain — Design System « Calm Focus »
 * Palette pensée pour le TDAH : peu de couleurs, désaturées et apaisantes,
 * fort contraste réservé au texte. Une couleur primaire (teal), une couleur
 * d'accent unique (amber, usage rare), un secondaire discret, et des neutres.
 * Retune des clés existantes (teal/violet/amber) → tout l'app se calme sans
 * réécrire chaque page.
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
        // ── PRIMAIRE — teal apaisant (focus, calme) ──────────────────────────
        teal: {
          50:  '#ECF6F3',
          100: '#D6EDE7',
          200: '#AEDAD0',
          300: '#7DC3B5',
          400: '#4FAD9B',
          500: '#2E9D89',  // primaire
          600: '#1F8473',
          700: '#196D5F',
          800: '#15564B',
          900: '#11463E',
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
        // ── NEUTRES — ardoise tiède (texte / surfaces / bordures) ─────────────
        ink: {
          900: '#16231F',  // titres
          700: '#374842',  // texte
          500: '#5C6B66',  // texte secondaire
          400: '#8A9893',  // faible
        },
        surface: {
          DEFAULT: '#FFFFFF',
          soft: '#F5F8F7',  // fond de page
          muted: '#EDF2F1',
        },
        line: '#E4EBE9',     // bordures
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
