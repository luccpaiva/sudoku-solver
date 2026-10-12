import { create } from 'zustand'
import type { CellIdx, Spot } from '@/core/types'
import { STRATEGY_META } from '@/core/solver'

interface UIState {
  selectedCell: CellIdx | null
  showCandidates: boolean
  /** Digit picked in the strip under the board: the board shows where it can still go. */
  focusDigit: number | null
  /** A part of the found step picked out on the board, held until it is clicked again. */
  spot: Spot | null
  /** The same, for as long as the pointer is over the words that name it. */
  peek: Spot | null
  darkMode: boolean
  enabledStrategies: Set<string>

  selectCell: (cell: CellIdx | null) => void
  toggleCandidates: () => void
  /** Picking the focused digit again lets go of it. */
  toggleFocusDigit: (digit: number) => void
  /** Picking the held part again lets go of it. */
  toggleSpot: (spot: Spot) => void
  setPeek: (spot: Spot | null) => void
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
  spot: null,
  peek: null,
  darkMode: initialDarkMode(),
  enabledStrategies: new Set(STRATEGY_META.map(m => m.name)),

  selectCell: (cell) => set({ selectedCell: cell }),
  toggleCandidates: () => set(s => ({ showCandidates: !s.showCandidates })),
  toggleFocusDigit: (digit) => set(s => ({ focusDigit: s.focusDigit === digit ? null : digit })),
  toggleSpot: (spot) => set(s => ({ spot: s.spot?.of === spot.of && s.spot.id === spot.id ? null : spot })),
  setPeek: (peek) => set({ peek }),
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
