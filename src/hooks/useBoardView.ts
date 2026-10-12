import { useMemo } from 'react'
import { useSolverStore } from '@/store/solverStore'
import { useUIStore } from '@/store/uiStore'
import { PEERS } from '@/core/units'
import type { CandidateAnnotation, CellViewModel, Spot, StratInstance } from '@/core/types'

/** The occurrence of the found step that the board and the explainer show. */
export function useActiveInstance(): StratInstance | null {
  const pending = useSolverStore(s => s.pending)
  const activeInstance = useSolverStore(s => s.activeInstance)
  if (!pending) return null
  return pending.instances[Math.min(activeInstance, pending.instances.length - 1)] ?? null
}

/**
 * The part of the found step the board picks out, if any: the one under the
 * pointer, or else the one held by a click. Either is dropped once the
 * occurrence it belongs to is no longer the one shown.
 */
export function useSpot(): Spot | null {
  const instance = useActiveInstance()
  const peek = useUIStore(s => s.peek)
  const held = useUIStore(s => s.spot)
  if (!instance) return null
  if (peek?.of === instance) return peek
  return held?.of === instance ? held : null
}

/**
 * Derive CellViewModel for every cell from the current store state.
 * Re-runs only when relevant store slices change.
 */
export function useBoardView(): CellViewModel[] {
  const snapshot = useSolverStore(s => s.currentSnapshot())
  const given = useSolverStore(s => s.given)
  const instance = useActiveInstance()
  const spot = useSpot()
  const selectedCell = useUIStore(s => s.selectedCell)
  // a part picked out has the board to itself: the digit of the strip waits
  const focusDigit = useUIStore(s => (spot ? null : s.focusDigit))

  return useMemo(() => {
    const selectedValue =
      selectedCell !== null ? snapshot.values[selectedCell] : null

    // Build annotation lookup from the active instance of the pending result
    const annotationMap = new Map<string, CandidateAnnotation['kind']>()
    const patternCellSet = new Set<number>()
    const written = new Map<number, number>()

    if (instance) {
      if (spot?.layer === 'writes') {
        for (const { cell, digit } of instance.solvedCells) written.set(cell, digit)
      }
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
      const candidateAnnotations = new Map<number, CandidateAnnotation['kind']>()
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
        isSpot: spot?.cells.has(idx) ?? false,
        preview: written.get(idx) ?? null,
        candidates: snapshot.candidates[idx],
        candidateAnnotations,
      }
    })
  }, [snapshot, given, instance, spot, selectedCell, focusDigit])
}
