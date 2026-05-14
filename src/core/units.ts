import type { CellIdx } from './types'

/** All 9 cell indices in each row (ROWS[r] = cells in row r). */
export const ROWS: ReadonlyArray<ReadonlyArray<CellIdx>> = Array.from(
  { length: 9 },
  (_, r) => Array.from({ length: 9 }, (_, c) => r * 9 + c),
)

/** All 9 cell indices in each column (COLS[c] = cells in col c). */
export const COLS: ReadonlyArray<ReadonlyArray<CellIdx>> = Array.from(
  { length: 9 },
  (_, c) => Array.from({ length: 9 }, (_, r) => r * 9 + c),
)

/**
 * All 9 cell indices in each 3×3 box.
 * Box numbering: 0=top-left, 1=top-mid, 2=top-right, 3=mid-left, …
 */
export const BOXES: ReadonlyArray<ReadonlyArray<CellIdx>> = Array.from(
  { length: 9 },
  (_, b) => {
    const br = ((b / 3) | 0) * 3
    const bc = (b % 3) * 3
    return Array.from({ length: 9 }, (_, i) => (br + ((i / 3) | 0)) * 9 + bc + (i % 3))
  },
)

/** All 27 units combined (rows first, then cols, then boxes). */
export const ALL_UNITS: ReadonlyArray<ReadonlyArray<CellIdx>> = [
  ...ROWS,
  ...COLS,
  ...BOXES,
]

/**
 * For each cell, its {row, col, box} unit indices.
 * CELL_UNITS[idx].row ∈ 0-8, same for col and box.
 */
export const CELL_UNITS: ReadonlyArray<{ row: number; col: number; box: number }> =
  Array.from({ length: 81 }, (_, i) => {
    const row = (i / 9) | 0
    const col = i % 9
    const box = ((row / 3) | 0) * 3 + ((col / 3) | 0)
    return { row, col, box }
  })

/**
 * The 20 peers of each cell: all cells that share a row, column, or box.
 * PEERS[idx] never includes idx itself.
 */
export const PEERS: ReadonlyArray<ReadonlyArray<CellIdx>> = Array.from(
  { length: 81 },
  (_, i) => {
    const { row, col, box } = CELL_UNITS[i]
    const peers = new Set<CellIdx>()
    for (const c of ROWS[row]) peers.add(c)
    for (const c of COLS[col]) peers.add(c)
    for (const c of BOXES[box]) peers.add(c)
    peers.delete(i)
    return [...peers]
  },
)
