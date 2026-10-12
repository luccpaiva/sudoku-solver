import { useCallback, useEffect } from 'react'
import { useSolverStore } from '@/store/solverStore'
import { useUIStore } from '@/store/uiStore'

export function useSolverStep() {
  const pending = useSolverStore(s => s.pending)
  const findNext = useSolverStore(s => s.findNext)
  const applyPending = useSolverStore(s => s.applyPending)
  const enabledStrategies = useUIStore(s => s.enabledStrategies)

  return useCallback(() => {
    if (pending === null) {
      findNext(enabledStrategies)
    } else {
      applyPending()
    }
  }, [pending, findNext, applyPending, enabledStrategies])
}

/** How long a found step stays marked on the board before a run applies it. */
const SHOW_MS = 720
/** The pause after applying, before a run looks for the next step. */
const SEARCH_MS = 200

/**
 * While the store says `running`, keep stepping: find, show, apply, find…
 * The store ends the run itself when the board is solved, when nothing
 * applies, or when the history is moved by hand.
 */
export function useAutoRun() {
  const running = useSolverStore(s => s.running)
  const pending = useSolverStore(s => s.pending)
  const step = useSolverStep()

  useEffect(() => {
    if (!running) return
    const timer = setTimeout(step, pending ? SHOW_MS : SEARCH_MS)
    return () => clearTimeout(timer)
  }, [running, pending, step])
}

/**
 * Keyboard handler for the board: number keys set cells, Backspace clears.
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
