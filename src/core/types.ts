/**
 * Flat cell index 0–80.
 *   row  = (idx / 9) | 0
 *   col  = idx % 9
 *   box  = ((row / 3) | 0) * 3 + ((col / 3) | 0)
 */
export type CellIdx = number

export type Digit = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

// ── Board state ─────────────────────────────────────────────────────────────

/**
 * Immutable snapshot of the board at one point in the solve history.
 * Both arrays have exactly 81 elements.
 */
export type Snapshot = {
  /** Solved values. null = cell is still unsolved. */
  readonly values: ReadonlyArray<number | null>
  /** Remaining candidates per cell. Empty set if cell is solved. */
  readonly candidates: ReadonlyArray<ReadonlySet<number>>
}

// ── Strategy results ─────────────────────────────────────────────────────────

export type CandidateAnnotation = {
  cell: CellIdx
  digit: number
  /** green circle = part of the pattern; yellow = will be eliminated */
  kind: 'highlight' | 'eliminate'
}

export type SolvedCell = {
  cell: CellIdx
  digit: number
}

/**
 * Everything a strategy returns: what to highlight, what to eliminate,
 * what to set, and a human-readable explanation.
 */
export type StratResult = {
  name: string
  /** Cells that get a value set when this result is applied. */
  solvedCells: SolvedCell[]
  /** Cells whose background should be highlighted (pattern cells). */
  highlightCells: CellIdx[]
  /** Per-candidate annotations (highlight = green, eliminate = yellow). */
  candidateAnnotations: CandidateAnnotation[]
  /** One description line per found instance of the pattern. */
  description: string[]
}

// ── UI view model ─────────────────────────────────────────────────────────────

/**
 * Everything a single cell needs to know to render itself.
 * Derived from store state — never stored directly.
 */
export type CellViewModel = {
  idx: CellIdx
  value: number | null
  isGiven: boolean
  isSelected: boolean
  /** Same row, col, or box as selected cell */
  isPeer: boolean
  /** Same digit as selected cell (for same-value highlighting) */
  isSameValue: boolean
  /** Cell is part of the current strategy's pattern */
  isPatternCell: boolean
  candidates: ReadonlySet<number>
  /** Per-candidate decoration (highlight or eliminate) */
  candidateAnnotations: ReadonlyMap<number, 'highlight' | 'eliminate'>
}

// ── Strategy metadata ─────────────────────────────────────────────────────────

export type StrategyCategory = 'basic' | 'tough'

export type StrategyMeta = {
  name: string
  category: StrategyCategory
  /** Short explanation shown in the strategy panel */
  summary: string
}
