import { useMemo } from 'react'
import { useSolverStore } from '@/store/solverStore'
import { useUIStore } from '@/store/uiStore'
import { PEERS } from '@/core/units'
import type { CellViewModel } from '@/core/types'

/**
 * Derive CellViewModel for every cell from the current store state.
 * Re-runs only when relevant store slices change.
 */
export function useBoardView(): CellViewModel[] {
  const snapshot = useSolverStore(s => s.currentSnapshot())
  const given = useSolverStore(s => s.given)
  const pending = useSolverStore(s => s.pending)
  const selectedCell = useUIStore(s => s.selectedCell)

  return useMemo(() => {
    const selectedValue =
      selectedCell !== null ? snapshot.values[selectedCell] : null

    // Build annotation lookup from pending result
    const annotationMap = new Map<string, 'highlight' | 'eliminate'>()
    const patternCellSet = new Set<number>()

    if (pending) {
      for (const cell of pending.highlightCells) patternCellSet.add(cell)
      for (const { cell, digit, kind } of pending.candidateAnnotations) {
        annotationMap.set(`${cell}:${digit}`, kind)
      }
    }

    return Array.from({ length: 81 }, (_, idx): CellViewModel => {
      const isPeer =
        selectedCell !== null && selectedCell !== idx && PEERS[selectedCell].includes(idx)

      const isSameValue =
        selectedValue !== null &&
        snapshot.values[idx] === selectedValue &&
        idx !== selectedCell

      // Build per-candidate annotation map for this cell
      const candidateAnnotations = new Map<number, 'highlight' | 'eliminate'>()
      for (let d = 1; d <= 9; d++) {
        const kind = annotationMap.get(`${idx}:${d}`)
        if (kind) candidateAnnotations.set(d, kind)
      }

      return {
        idx,
        value: snapshot.values[idx],
        isGiven: given[idx] !== null,
        isSelected: selectedCell === idx,
        isPeer,
        isSameValue,
        isPatternCell: patternCellSet.has(idx),
        candidates: snapshot.candidates[idx],
        candidateAnnotations,
      }
    })
  }, [snapshot, given, pending, selectedCell])
}
