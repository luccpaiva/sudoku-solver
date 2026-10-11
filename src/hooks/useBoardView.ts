import { useMemo } from 'react'
import { useSolverStore } from '@/store/solverStore'
import { useUIStore } from '@/store/uiStore'
import { PEERS } from '@/core/units'
import type { CellViewModel, StratInstance } from '@/core/types'

/** The occurrence of the found step that the board and the explainer show. */
export function useActiveInstance(): StratInstance | null {
  const pending = useSolverStore(s => s.pending)
  const activeInstance = useSolverStore(s => s.activeInstance)
  if (!pending) return null
  return pending.instances[Math.min(activeInstance, pending.instances.length - 1)] ?? null
}

/**
 * Derive CellViewModel for every cell from the current store state.
 * Re-runs only when relevant store slices change.
 */
export function useBoardView(): CellViewModel[] {
  const snapshot = useSolverStore(s => s.currentSnapshot())
  const given = useSolverStore(s => s.given)
  const instance = useActiveInstance()
  const selectedCell = useUIStore(s => s.selectedCell)
  const focusDigit = useUIStore(s => s.focusDigit)

  return useMemo(() => {
    const selectedValue =
      selectedCell !== null ? snapshot.values[selectedCell] : null

    // Build annotation lookup from the active instance of the pending result
    const annotationMap = new Map<string, 'highlight' | 'eliminate'>()
    const patternCellSet = new Set<number>()

    if (instance) {
      for (const cell of instance.patternCells) patternCellSet.add(cell)
      for (const { cell } of instance.solvedCells) patternCellSet.add(cell)
      for (const { cell, digit, kind } of instance.candidateAnnotations) {
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
        hasFocusDigit:
          focusDigit !== null &&
          (snapshot.values[idx] === focusDigit || snapshot.candidates[idx].has(focusDigit)),
        candidates: snapshot.candidates[idx],
        candidateAnnotations,
      }
    })
  }, [snapshot, given, instance, selectedCell, focusDigit])
}
