import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Nunito', 'sans-serif'],
        display: ['DM Sans', 'sans-serif'],
      },
      colors: {
        teal: {
          50: '#F0FDFA',
          100: '#CCFBF1',
          200: '#99F6E4',
          300: '#5EEAD4',
          400: '#2DD4BF',
          500: '#5DCAA5',
          600: '#0D9488',
          700: '#0F766E',
          800: '#115E59',
          900: '#134E4A',
        },
        violet: {
          50: '#F5F3FF',
          100: '#EDE9FE',
          400: '#A78BFA',
          500: '#7F77DD',
          600: '#7C3AED',
          700: '#6D28D9',
        },
        amber: {
          400: '#FBBF24',
          500: '#EF9F27',
          600: '#D97706',
        },
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
      },
      lineHeight: {
        relaxed: '1.7',
      },
    },
  },
  plugins: [],
} satisfies Config;
