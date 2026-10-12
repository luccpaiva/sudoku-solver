/**
 * Flat cell index 0 to 80.
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

export type UnitKind = 'row' | 'col' | 'box'

/** Reference to one of the 27 units, e.g. { kind: 'row', index: 0 } = row A. */
export type UnitRef = {
  kind: UnitKind
  index: number
}

/**
 * One occurrence of a pattern. The UI displays exactly one instance at a
 * time (with a stepper when a result holds several).
 */
export type StratInstance = {
  /** Cells forming the pattern: they get background emphasis and a ring. */
  patternCells: CellIdx[]
  /** Cells that get a value set when this result is applied. */
  solvedCells: SolvedCell[]
  /** Per-candidate annotations (highlight = green, eliminate = red slash). */
  candidateAnnotations: CandidateAnnotation[]
  /** Units the logic operates in: tinted on the board, while everything else dims. */
  units: UnitRef[]
  /** Compact expert notation, e.g. "A2/A3 locks 1/6". */
  label: string
  /** Plain-language explanation for someone new to sudoku. */
  narrative: string
}

/**
 * Everything a strategy returns: one entry per found occurrence.
 * Applying the result applies every instance at once.
 */
export type StratResult = {
  name: string
  instances: StratInstance[]
}

/**
 * What one applied step did. Kept next to the history so the solve can be
 * read back as a list.
 */
export type StepRecord = {
  /** Strategy name, or how the user changed the board by hand. */
  name: string
  /** How many occurrences of the pattern were applied together. */
  occurrences: number
  /** Digits written into cells. */
  placed: number
  /** Candidates removed by the pattern itself (not by a placed digit's peers). */
  removed: number
}

// ── UI view model ─────────────────────────────────────────────────────────────

/**
 * Everything a single cell needs to know to render itself.
 * Derived from store state, never stored directly.
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
  /** Cell holds, or can still take, the digit picked in the digit strip */
  hasFocusDigit: boolean
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
