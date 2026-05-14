import { create } from 'zustand'
import type { CellIdx, Snapshot, StratResult } from '@/core/types'
import { loadPuzzle, applyStratResult, applyManualEntry, clearManualCell } from '@/core/board'
import { serializeValues } from '@/core/utils'
import { findNextStrategy } from '@/core/solver'

export interface SolverState {
  // ── Persistent data ──────────────────────────────────────────────────────
  /** Original puzzle clues — never changes after load. */
  given: ReadonlyArray<number | null>
  /** Full solve history. history[0] = initial state. */
  history: Snapshot[]
  /** Which snapshot we're currently viewing (0-based index into history). */
  cursor: number
  /**
   * Strategy result that has been found but not yet applied.
   * The UI shows highlights; the user then chooses to apply or step back.
   */
  pending: StratResult | null

  // ── Derived helpers (read current state without hooks) ───────────────────
  currentSnapshot: () => Snapshot
  canUndo: () => boolean
  canRedo: () => boolean
  isGiven: (cell: CellIdx) => boolean

  // ── Actions ──────────────────────────────────────────────────────────────
  loadPuzzleFromString: (input: string) => void
  findNext: () => void
  applyPending: () => void
  /**
   * Undo:
   *   - If pending exists, clear it (stay on same snapshot, remove highlights).
   *   - Otherwise move cursor back one step.
   */
  undo: () => void
  /** Redo: move cursor forward (only if we're in the middle of history). */
  redo: () => void
  setCell: (cell: CellIdx, digit: number) => void
  clearCell: (cell: CellIdx) => void
  reset: () => void
}

const EMPTY_SNAPSHOT: Snapshot = {
  values: Array(81).fill(null),
  candidates: Array.from({ length: 81 }, () => new Set([1, 2, 3, 4, 5, 6, 7, 8, 9])),
}

export const useSolverStore = create<SolverState>((set, get) => ({
  given: Array(81).fill(null),
  history: [EMPTY_SNAPSHOT],
  cursor: 0,
  pending: null,

  currentSnapshot: () => get().history[get().cursor],
  canUndo: () => get().pending !== null || get().cursor > 0,
  canRedo: () => get().cursor < get().history.length - 1,
  isGiven: (cell) => get().given[cell] !== null,

  loadPuzzleFromString: (input) => {
    const { given, snapshot } = loadPuzzle(input)
    set({
      given,
      history: [snapshot],
      cursor: 0,
      pending: null,
    })
  },

  findNext: () => {
    const snapshot = get().currentSnapshot()
    const result = findNextStrategy(snapshot)
    set({ pending: result })
  },

  applyPending: () => {
    const { pending, history, cursor } = get()
    if (!pending) return

    const current = get().currentSnapshot()
    const next = applyStratResult(current, pending)

    // Truncate any redo history beyond cursor, then push
    set({
      history: [...history.slice(0, cursor + 1), next],
      cursor: cursor + 1,
      pending: null,
    })
  },

  undo: () => {
    const { pending, cursor } = get()
    if (pending) {
      set({ pending: null })
    } else if (cursor > 0) {
      set({ cursor: cursor - 1, pending: null })
    }
  },

  redo: () => {
    const { cursor, history } = get()
    if (cursor < history.length - 1) {
      set({ cursor: cursor + 1, pending: null })
    }
  },

  setCell: (cell, digit) => {
    const { given, history, cursor } = get()
    if (given[cell] !== null) return // cannot override a given cell

    const current = get().currentSnapshot()
    const next = applyManualEntry(current, cell, digit)

    set({
      history: [...history.slice(0, cursor + 1), next],
      cursor: cursor + 1,
      pending: null,
    })
  },

  clearCell: (cell) => {
    const { given, history, cursor } = get()
    if (given[cell] !== null) return

    const current = get().currentSnapshot()
    const next = clearManualCell(current, given, cell)

    set({
      history: [...history.slice(0, cursor + 1), next],
      cursor: cursor + 1,
      pending: null,
    })
  },

  reset: () => {
    const { given } = get()
    const { snapshot } = loadPuzzle(serializeValues(given))
    set({ history: [snapshot], cursor: 0, pending: null })
  },
}))
