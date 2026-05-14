import type { CellIdx, Snapshot, StratResult } from './types'
import { PEERS } from './units'
import { parseInput } from './utils'

// ── Construction ──────────────────────────────────────────────────────────────

/**
 * Build the initial candidates for a set of given values.
 * Each unsolved cell starts with {1..9}, then each given cell's
 * value is eliminated from all its peers.
 */
function initCandidates(values: ReadonlyArray<number | null>): Array<Set<number>> {
  const candidates = Array.from({ length: 81 }, () => new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]))

  for (let i = 0; i < 81; i++) {
    const v = values[i]
    if (v !== null) {
      candidates[i].clear()
      for (const peer of PEERS[i]) {
        candidates[peer].delete(v)
      }
    }
  }

  return candidates
}

/**
 * Parse a puzzle string / grid and return the initial snapshot
 * plus the given-cell mask (for permanent immutability in the UI).
 */
export function loadPuzzle(input: string | number[][]): {
  given: Array<number | null>
  snapshot: Snapshot
} {
  const values = parseInput(input)
  const given = [...values]
  const candidates = initCandidates(values)
  return { given, snapshot: { values, candidates } }
}

// ── Applying strategy results ─────────────────────────────────────────────────

/**
 * Apply a StratResult to a snapshot and return the new snapshot.
 *
 * Order of operations:
 *   1. Apply candidate eliminations (naked/hidden set removals, etc.)
 *   2. Set solved cells + clear their candidates
 *   3. Propagate each newly-solved value through its peers
 */
export function applyStratResult(snapshot: Snapshot, result: StratResult): Snapshot {
  const values = [...snapshot.values] as Array<number | null>
  const candidates = snapshot.candidates.map(s => new Set(s))

  // 1. Candidate eliminations
  for (const ann of result.candidateAnnotations) {
    if (ann.kind === 'eliminate') {
      candidates[ann.cell].delete(ann.digit)
    }
  }

  // 2 & 3. Solved cells
  for (const { cell, digit } of result.solvedCells) {
    values[cell] = digit
    candidates[cell].clear()
    for (const peer of PEERS[cell]) {
      candidates[peer].delete(digit)
    }
  }

  return { values, candidates }
}

/**
 * Apply a manually entered digit (user types a number into a cell).
 * Wraps in a synthetic StratResult so the same apply logic is reused.
 */
export function applyManualEntry(
  snapshot: Snapshot,
  cell: CellIdx,
  digit: number,
): Snapshot {
  const syntheticResult: StratResult = {
    name: 'Manual Entry',
    solvedCells: [{ cell, digit }],
    highlightCells: [],
    candidateAnnotations: [],
    description: [],
  }
  return applyStratResult(snapshot, syntheticResult)
}

/**
 * Clear a manually entered cell (only allowed for non-given cells).
 * Rebuilds candidates by re-initialising from current values
 * (a full rebuild is needed since removing a value may restore candidates).
 */
export function clearManualCell(
  snapshot: Snapshot,
  given: ReadonlyArray<number | null>,
  cell: CellIdx,
): Snapshot {
  const values = [...snapshot.values] as Array<number | null>
  values[cell] = null
  const candidates = initCandidates(values)
  // Re-apply any values that are in the current snapshot but not in given
  // (they were manual entries that were already set — we just need the init)
  return { values, candidates }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function isSolved(snapshot: Snapshot): boolean {
  return snapshot.values.every(v => v !== null)
}
