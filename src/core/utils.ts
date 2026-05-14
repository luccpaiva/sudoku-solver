import type { CellIdx, CandidateAnnotation } from './types'

// ── Cell labelling ────────────────────────────────────────────────────────────

/** Row labels A-J, skipping I to avoid confusion with 1. */
const ROW_LABELS = 'ABCDEFGHJ'

/** Human-readable cell label, e.g. index 0 → "A1", index 80 → "J9". */
export function cellLabel(idx: CellIdx): string {
  return `${ROW_LABELS[(idx / 9) | 0]}${(idx % 9) + 1}`
}

// ── Puzzle parsing ────────────────────────────────────────────────────────────

/**
 * Parse a puzzle from a string (81 chars, '.' or '0' for empty)
 * or a 9×9 grid of numbers (0 = empty).
 * Returns an 81-element array where null = empty cell.
 */
export function parseInput(input: string | number[][]): Array<number | null> {
  if (typeof input === 'string') {
    const end = input.indexOf('-')
    const src = end === -1 ? input : input.slice(0, end)
    return src
      .split('')
      .filter(c => c !== '\n' && c !== ' ')
      .slice(0, 81)
      .map(c => (c === '.' || c === '0' ? null : parseInt(c, 10)))
  }

  return input.flat().map(v => (v === 0 ? null : v))
}

/**
 * Serialize the current board values to a compact string
 * (81 chars, '.' for empty).
 */
export function serializeValues(values: ReadonlyArray<number | null>): string {
  return values.map(v => (v === null ? '.' : String(v))).join('')
}

// ── Combinatorics ─────────────────────────────────────────────────────────────

/**
 * Returns all r-length combinations from arr.
 * E.g. combinations([1,2,3], 2) → [[1,2],[1,3],[2,3]]
 */
export function combinations<T>(arr: readonly T[], r: number): T[][] {
  if (r === 0) return [[]]
  if (arr.length < r) return []

  const result: T[][] = []

  function go(start: number, current: T[]): void {
    if (current.length === r) {
      result.push([...current])
      return
    }
    const remaining = r - current.length
    for (let i = start; i <= arr.length - remaining; i++) {
      current.push(arr[i])
      go(i + 1, current)
      current.pop()
    }
  }

  go(0, [])
  return result
}

// ── Annotation helpers ────────────────────────────────────────────────────────

/**
 * Deduplicate candidate annotations, keeping the first occurrence
 * of each (cell, digit, kind) triple.
 */
export function dedupeAnnotations(annotations: CandidateAnnotation[]): CandidateAnnotation[] {
  const seen = new Set<string>()
  return annotations.filter(a => {
    const key = `${a.cell}:${a.digit}:${a.kind}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
