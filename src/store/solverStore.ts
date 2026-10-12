import { create } from 'zustand'
import type { CellIdx, Snapshot, StepRecord, StratResult } from '@/core/types'
import { loadPuzzle, applyStratResult, applyManualEntry, clearManualCell, isSolved } from '@/core/board'
import { serializeValues } from '@/core/utils'
import { findNextStrategy } from '@/core/solver'
import { ratePuzzle, type Rating } from '@/core/rating'

export interface SolverState {
  // ── Persistent data ──────────────────────────────────────────────────────
  /** Original puzzle clues; never changes after load. */
  given: ReadonlyArray<number | null>
  /** Where the puzzle came from, e.g. "X-Wing" or "Generated, hard". */
  title: string
  /** What the full strategy set makes of the puzzle, worked out on load. */
  rating: Rating
  /** Full solve history. history[0] = initial state. */
  history: Snapshot[]
  /** What each step did: steps[i] led from history[i] to history[i + 1]. */
  steps: StepRecord[]
  /** Which snapshot we're currently viewing (0-based index into history). */
  cursor: number
  /**
   * Strategy result that has been found but not yet applied.
   * The UI shows highlights; the user then chooses to apply or step back.
   */
  pending: StratResult | null
  /** Which instance of `pending` the board/explainer currently show. */
  activeInstance: number
  /** The last search came back empty: no enabled strategy applies here. */
  stalled: boolean
  /** How long the last search took, in milliseconds. */
  searchMs: number | null
  /** The solver is stepping by itself until it finishes or stalls. */
  running: boolean

  // ── Derived helpers (read current state without hooks) ───────────────────
  currentSnapshot: () => Snapshot
  canUndo: () => boolean
  canRedo: () => boolean
  isGiven: (cell: CellIdx) => boolean

  // ── Actions ──────────────────────────────────────────────────────────────
  loadPuzzleFromString: (input: string, title?: string) => void
  findNext: (enabledNames?: Set<string>) => void
  setActiveInstance: (index: number) => void
  applyPending: () => void
  /** Drop the found step and any "nothing applies" verdict, e.g. when the enabled strategies change. */
  clearSearch: () => void
  setRunning: (running: boolean) => void
  /**
   * Undo:
   *   - If pending exists, clear it (stay on same snapshot, remove highlights).
   *   - Otherwise move cursor back one step.
   */
  undo: () => void
  /** Redo: move cursor forward (only if we're in the middle of history). */
  redo: () => void
  /** Go straight to any point of the history. */
  jumpTo: (cursor: number) => void
  setCell: (cell: CellIdx, digit: number) => void
  clearCell: (cell: CellIdx) => void
  reset: () => void
}

const EMPTY_SNAPSHOT: Snapshot = {
  values: Array(81).fill(null),
  candidates: Array.from({ length: 81 }, () => new Set([1, 2, 3, 4, 5, 6, 7, 8, 9])),
}

/** Anything that moves through the history by hand ends the search and the run. */
const SETTLED = { pending: null, stalled: false, running: false } as const

function summarise(result: StratResult): StepRecord {
  const placed = new Set<number>()
  const removed = new Set<string>()
  for (const instance of result.instances) {
    for (const { cell } of instance.solvedCells) placed.add(cell)
    for (const { cell, digit, kind } of instance.candidateAnnotations) {
      if (kind === 'eliminate') removed.add(`${cell}:${digit}`)
    }
  }
  return {
    name: result.name,
    occurrences: result.instances.length,
    placed: placed.size,
    removed: removed.size,
  }
}

export const useSolverStore = create<SolverState>((set, get) => ({
  given: Array(81).fill(null),
  title: '',
  rating: { solved: false, steps: 0, hardest: null, tough: 0 },
  history: [EMPTY_SNAPSHOT],
  steps: [],
  cursor: 0,
  pending: null,
  activeInstance: 0,
  stalled: false,
  searchMs: null,
  running: false,

  currentSnapshot: () => get().history[get().cursor],
  canUndo: () => get().pending !== null || get().cursor > 0,
  canRedo: () => get().cursor < get().history.length - 1,
  isGiven: (cell) => get().given[cell] !== null,

  loadPuzzleFromString: (input, title = 'Pasted puzzle') => {
    const { given, snapshot } = loadPuzzle(input)
    set({
      given,
      title,
      rating: ratePuzzle(snapshot),
      history: [snapshot],
      steps: [],
      cursor: 0,
      searchMs: null,
      ...SETTLED,
    })
  },

  findNext: (enabledNames) => {
    const snapshot = get().currentSnapshot()
    const started = performance.now()
    const result = findNextStrategy(snapshot, enabledNames)
    const searchMs = performance.now() - started
    const stalled = result === null && !isSolved(snapshot)
    set({
      pending: result,
      activeInstance: 0,
      stalled,
      searchMs,
      running: get().running && result !== null,
    })
  },

  setActiveInstance: (index) => {
    const { pending } = get()
    if (!pending) return
    const max = pending.instances.length - 1
    set({ activeInstance: Math.max(0, Math.min(index, max)) })
  },

  applyPending: () => {
    const { pending, history, steps, cursor, running } = get()
    if (!pending) return

    const current = get().currentSnapshot()
    const next = applyStratResult(current, pending)

    // Truncate any redo history beyond cursor, then push
    set({
      history: [...history.slice(0, cursor + 1), next],
      steps: [...steps.slice(0, cursor), summarise(pending)],
      cursor: cursor + 1,
      pending: null,
      running: running && !isSolved(next),
    })
  },

  clearSearch: () => set({ pending: null, stalled: false }),

  setRunning: (running) => set({ running, stalled: false }),

  undo: () => {
    const { pending, cursor } = get()
    if (pending) {
      set(SETTLED)
    } else if (cursor > 0) {
      set({ cursor: cursor - 1, ...SETTLED })
    }
  },

  redo: () => {
    const { cursor, history } = get()
    if (cursor < history.length - 1) {
      set({ cursor: cursor + 1, ...SETTLED })
    }
  },

  jumpTo: (cursor) => {
    const last = get().history.length - 1
    set({ cursor: Math.max(0, Math.min(cursor, last)), ...SETTLED })
  },

  setCell: (cell, digit) => {
    const { given, history, steps, cursor } = get()
    if (given[cell] !== null) return // cannot override a given cell

    const current = get().currentSnapshot()
    const next = applyManualEntry(current, cell, digit)

    set({
      history: [...history.slice(0, cursor + 1), next],
      steps: [...steps.slice(0, cursor), { name: 'Entered by hand', occurrences: 1, placed: 1, removed: 0 }],
      cursor: cursor + 1,
      ...SETTLED,
    })
  },

  clearCell: (cell) => {
    const { given, history, steps, cursor } = get()
    if (given[cell] !== null) return

    const current = get().currentSnapshot()
    if (current.values[cell] === null) return // nothing to clear
    const next = clearManualCell(current, given, cell)

    set({
      history: [...history.slice(0, cursor + 1), next],
      steps: [...steps.slice(0, cursor), { name: 'Cleared by hand', occurrences: 1, placed: 0, removed: 0 }],
      cursor: cursor + 1,
      ...SETTLED,
    })
  },

  reset: () => {
    const { given } = get()
    const { snapshot } = loadPuzzle(serializeValues(given))
    set({ history: [snapshot], steps: [], cursor: 0, searchMs: null, ...SETTLED })
  },
}))
