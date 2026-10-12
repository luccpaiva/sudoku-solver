import { PEERS } from './units'

// ── Utilities ─────────────────────────────────────────────────────────────────

function shuffled(arr: number[]): number[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9]
const CELLS  = Array.from({ length: 81 }, (_, i) => i)

// ── Constraint check ──────────────────────────────────────────────────────────

function noConflict(grid: number[], cell: number, d: number): boolean {
  for (const p of PEERS[cell]) {
    if (grid[p] === d) return false
  }
  return true
}

// ── Complete board generation ─────────────────────────────────────────────────

function fill(grid: number[], idx: number): boolean {
  if (idx === 81) return true
  if (grid[idx] !== 0) return fill(grid, idx + 1)
  for (const d of shuffled(DIGITS)) {
    if (noConflict(grid, idx, d)) {
      grid[idx] = d
      if (fill(grid, idx + 1)) return true
      grid[idx] = 0
    }
  }
  return false
}

function randomCompleteBoard(): number[] {
  const grid = new Array<number>(81).fill(0)
  fill(grid, 0)
  return grid
}

// ── Solution counter (MRV, stops at `limit`) ──────────────────────────────────

function countSolutions(grid: number[], limit: number): number {
  let cell = -1
  let fewest = 10

  for (let i = 0; i < 81; i++) {
    if (grid[i] !== 0) continue
    let opts = 0
    for (const d of DIGITS) {
      if (noConflict(grid, i, d) && ++opts >= fewest) break
    }
    if (opts === 0) return 0        // Contradiction
    if (opts < fewest) { fewest = opts; cell = i }
    if (fewest === 1) break         // Can't improve
  }
  if (cell === -1) return 1         // Board complete

  let n = 0
  for (const d of DIGITS) {
    if (noConflict(grid, cell, d)) {
      grid[cell] = d
      n += countSolutions(grid, limit)
      grid[cell] = 0
      if (n >= limit) return n
    }
  }
  return n
}

// ── Clue removal ──────────────────────────────────────────────────────────────

function digOut(complete: number[], target: number): number[] {
  const grid = [...complete]
  let clues = 81
  for (const cell of shuffled(CELLS)) {
    if (clues <= target) break
    const saved = grid[cell]
    grid[cell] = 0
    if (countSolutions(grid, 2) === 1) {
      clues--
    } else {
      grid[cell] = saved
    }
  }
  return grid
}

// ── Public API ────────────────────────────────────────────────────────────────

const TARGET_CLUES: Record<'hard' | 'expert', number> = {
  hard:   26,
  expert: 22,
}

/**
 * A puzzle with one solution: a full grid with clues taken away, down
 * towards `target` of them. Says nothing about how hard it is.
 */
export function digPuzzle(target: number): string {
  const board  = randomCompleteBoard()
  const puzzle = digOut(board, target)
  return puzzle.map(v => (v === 0 ? '.' : String(v))).join('')
}

export function generatePuzzle(difficulty: 'hard' | 'expert'): string {
  return digPuzzle(TARGET_CLUES[difficulty])
}
