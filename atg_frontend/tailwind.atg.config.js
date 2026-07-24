import colors from 'tailwindcss/colors';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ─── Brand: premium blue ───────────────
        brand: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          850: '#1e3a8a',
          900: '#172554',
          950: '#0f172a',
        },
        // ─── Accent: rich violet-teal for interactive actions ──────────────────
        action: {
          50:  '#edfaf5',
          100: '#d2f2e4',
          200: '#a5e4cb',
          300: '#6ccfab',
          400: '#37b288',
          500: '#179971',
          600: '#0d7b5b',
          700: '#0b624a',
          800: '#0a4e3c',
          900: '#083f30',
          950: '#052a20',
        },
        // ─── Accent emerald for success ────────────────────────────────────────
        accent: {
          ...colors.emerald,
          500: '#10B981',
        },
        // ─── Surface/Neutral: warm slate ───────────────────────────────────────
        surface: {
          0:   '#ffffff',
          50:  '#f8f9fb',
          100: '#f2f3f7',
          200: '#e6e8f0',
          300: '#d1d4e0',
          400: '#9da3b8',
          500: '#6b728e',
          600: '#4f5673',
          700: '#3b4160',
          800: '#282f52',
          900: '#1b2240',
          950: '#101628',
        },
      },
      fontFamily: {
        serif: ['Newsreader', 'serif'],
        sans:  ['Inter', 'Public Sans', 'sans-serif'],
        mono:  ['IBM Plex Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
