import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      // Semantic palette — actual values live as CSS variables in index.css,
      // swapped by the `dark` class (Puzzle Page by day, Instrument by night).
      colors: {
        paper: 'rgb(var(--c-paper) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        soft: 'rgb(var(--c-soft) / <alpha-value>)',
        line: 'rgb(var(--c-line) / <alpha-value>)',
        wash: 'rgb(var(--c-wash) / <alpha-value>)',
        pat: 'rgb(var(--c-pat) / <alpha-value>)',
        accent: 'rgb(var(--c-accent) / <alpha-value>)',
        removal: 'rgb(var(--c-removal) / <alpha-value>)',
        entry: 'rgb(var(--c-entry) / <alpha-value>)',
      },
      fontFamily: {
        display: ['var(--font-display)'],
        cand: ['var(--font-cand)'],
      },
    },
  },
  plugins: [],
} satisfies Config
