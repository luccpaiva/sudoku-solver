import { useCallback } from 'react'
import { useSolverStore } from '@/store/solverStore'

/**
 * Keyboard-aware solver step handler.
 * First call: finds next strategy (shows highlights).
 * Second call: applies pending result.
 * Mirrors the Python two-phase Space-key behaviour.
 */
export function useSolverStep() {
  const pending = useSolverStore(s => s.pending)
  const findNext = useSolverStore(s => s.findNext)
  const applyPending = useSolverStore(s => s.applyPending)

  return useCallback(() => {
    if (pending === null) {
      findNext()
    } else {
      applyPending()
    }
  }, [pending, findNext, applyPending])
}

/**
 * Keyboard handler for the board — number keys set cells, Backspace clears.
 */
export function useCellKeyHandler() {
  const setCell = useSolverStore(s => s.setCell)
  const clearCell = useSolverStore(s => s.clearCell)
  const isGiven = useSolverStore(s => s.isGiven)

  return useCallback(
    (cell: number, key: string) => {
      if (isGiven(cell)) return

      const digit = parseInt(key, 10)
      if (digit >= 1 && digit <= 9) {
        setCell(cell, digit)
      } else if (key === 'Backspace' || key === 'Delete' || key === '0') {
        clearCell(cell)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setCell, clearCell, isGiven],
  )
}
