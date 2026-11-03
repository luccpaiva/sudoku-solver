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
  /**
   * Which values are clues of the puzzle, as against digits solved since.
   * Only Avoidable Rectangles asks; without it every value counts as a clue.
   */
  readonly clues?: ReadonlyArray<boolean>
}

// ── Strategy results ─────────────────────────────────────────────────────────

export type CandidateAnnotation = {
  cell: CellIdx
  digit: number
  /**
   * highlight = part of the pattern; alternate = part of the pattern too, on
   * its other side (the second colour of a chain); eliminate = removed
   */
  kind: 'highlight' | 'alternate' | 'eliminate'
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
  /** Per-candidate annotations (highlight = disc, alternate = ring, eliminate = slash). */
  candidateAnnotations: CandidateAnnotation[]
  /** Units the logic operates in: tinted on the board, while everything else dims. */
  units: UnitRef[]
  /**
   * Ties to draw between pattern cells, for a pattern that is a chain of
   * cells rather than a set of lines. Without it the board ties the pattern
   * cells that share a row or column of `units`.
   */
  links?: Array<[CellIdx, CellIdx]>
  /**
   * Ties that only rule out (if one end is true, the other is not), drawn
   * dashed: the weak links of a chain, whose strong ones are in `links`.
   */
  weakLinks?: Array<[CellIdx, CellIdx]>
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
 * A part of the found step that the board picks out while the rest stands
 * back: one of the marks its key lists, or the cells and units its
 * explanation names.
 */
export type Spot = {
  /** The occurrence it is a part of. A spot does not outlive it. */
  of: StratInstance
  /** Tells one part of an occurrence from another. */
  id: string
  /**
   * What stays lit in its cells: the marks of one kind (pattern, removes),
   * the digits to be written in place of the candidates (writes), or all
   * there is (scope, cells).
   */
  layer: 'pattern' | 'writes' | 'removes' | 'scope' | 'cells'
  cells: ReadonlySet<CellIdx>
  /** The units to wash, for a part that is rows, columns or boxes. */
  units?: UnitRef[]
}

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
  /** Cell is in the part of the step being picked out */
  isSpot: boolean
  /** The digit the step writes here, shown as written while that part is picked out */
  preview: number | null
  candidates: ReadonlySet<number>
  /** Per-candidate decoration */
  candidateAnnotations: ReadonlyMap<number, CandidateAnnotation['kind']>
}

// ── Strategy metadata ─────────────────────────────────────────────────────────

/**
 * How hard a strategy is: its tier on sudokuwiki.org. The solver tries the
 * tiers in this order; the rating and the expert generator count the steps
 * past the basic ones.
 */
export type StrategyCategory = 'basic' | 'tough' | 'diabolical'

/**
 * What kind of reasoning a strategy uses. The strategy panel and the guide
 * group the strategies by family.
 *   Singles          one place or one digit left
 *   Intersections    a digit confined to where a line and a box overlap
 *   Locked sets      N cells that between them hold N digits
 *   Fish             a digit confined to N lines one way and N the other
 *   Wings            a few cells that between them must hold a digit
 *   Chains           links that force one candidate or another, followed along
 *   Deadly patterns  what would give the puzzle two solutions, or none
 */
export type StrategyFamily =
  | 'Singles'
  | 'Intersections'
  | 'Locked sets'
  | 'Fish'
  | 'Wings'
  | 'Chains'
  | 'Deadly patterns'

export type StrategyMeta = {
  name: string
  category: StrategyCategory
  family: StrategyFamily
  /** Short explanation shown in the strategy panel */
  summary: string
}
