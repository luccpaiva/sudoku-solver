import { create } from 'zustand'
import type { CellIdx } from '@/core/types'
import { STRATEGY_META } from '@/core/solver'

interface UIState {
  selectedCell: CellIdx | null
  showCandidates: boolean
  /** Digit picked in the strip under the board: the board shows where it can still go. */
  focusDigit: number | null
  darkMode: boolean
  enabledStrategies: Set<string>

  selectCell: (cell: CellIdx | null) => void
  toggleCandidates: () => void
  /** Picking the focused digit again lets go of it. */
  toggleFocusDigit: (digit: number) => void
  toggleDark: () => void
  toggleStrategy: (name: string) => void
}

const THEME_KEY = 'sudoku-theme'

function initialDarkMode(): boolean {
  // URL override first (handy for sharing/debugging), then saved choice, then OS
  const param = new URLSearchParams(window.location.search).get('theme')
  if (param === 'light' || param === 'dark') return param === 'dark'
  const stored = localStorage.getItem(THEME_KEY)
  if (stored !== null) return stored === 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export const useUIStore = create<UIState>(set => ({
  selectedCell: null,
  showCandidates: true,
  focusDigit: null,
  darkMode: initialDarkMode(),
  enabledStrategies: new Set(STRATEGY_META.map(m => m.name)),

  selectCell: (cell) => set({ selectedCell: cell }),
  toggleCandidates: () => set(s => ({ showCandidates: !s.showCandidates })),
  toggleFocusDigit: (digit) => set(s => ({ focusDigit: s.focusDigit === digit ? null : digit })),
  toggleDark: () => set(s => {
    const darkMode = !s.darkMode
    localStorage.setItem(THEME_KEY, darkMode ? 'dark' : 'light')
    return { darkMode }
  }),
  toggleStrategy: (name) => set(s => {
    const next = new Set(s.enabledStrategies)
    if (next.has(name)) next.delete(name)
    else next.add(name)
    return { enabledStrategies: next }
  }),
}))
