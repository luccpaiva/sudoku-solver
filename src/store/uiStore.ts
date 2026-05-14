import { create } from 'zustand'
import type { CellIdx } from '@/core/types'

interface UIState {
  selectedCell: CellIdx | null
  showCandidates: boolean

  selectCell: (cell: CellIdx | null) => void
  toggleCandidates: () => void
}

export const useUIStore = create<UIState>(set => ({
  selectedCell: null,
  showCandidates: true,

  selectCell: (cell) => set({ selectedCell: cell }),
  toggleCandidates: () => set(s => ({ showCandidates: !s.showCandidates })),
}))
