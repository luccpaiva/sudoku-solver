import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        board: {
          bg: '#1a1a2e',
          cell: '#16213e',
          cellHover: '#0f3460',
          selected: '#0f3460',
          peer: '#1a2a4a',
          highlight: '#1a3a2a',
          given: '#e2e8f0',
          solved: '#60a5fa',
          error: '#f87171',
        },
        candidate: {
          normal: '#6b7280',
          highlight: '#34d399',
          eliminate: '#fbbf24',
        },
        panel: {
          bg: '#0f172a',
          border: '#1e293b',
        },
      },
    },
  },
  plugins: [],
} satisfies Config
