import type { Snapshot, StratResult, CandidateAnnotation, CellIdx } from '../types'
import { ALL_UNITS } from '../units'
import { combinations, cellLabel, dedupeAnnotations } from '../utils'

function hiddenSetsForSize(snapshot: Snapshot, size: 2 | 3 | 4): StratResult | null {
  const { values, candidates } = snapshot

  const highlightCells: CellIdx[] = []
  const annotations: CandidateAnnotation[] = []
  const description: string[] = []
  const seenCombos = new Set<string>()

  for (const unit of ALL_UNITS) {
    const unsolved = unit.filter(i => values[i] === null)
    if (unsolved.length <= size) continue

    // Map digit → cells in this unit that contain it
    const digitCells = new Map<number, CellIdx[]>()
    for (let digit = 1; digit <= 9; digit++) {
      const cells = unsolved.filter(i => candidates[i].has(digit))
      // Only digits that appear in 2..size cells are candidates for a hidden set
      if (cells.length >= 2 && cells.length <= size) {
        digitCells.set(digit, cells)
      }
    }

    const eligibleDigits = [...digitCells.keys()]
    if (eligibleDigits.length < size) continue

    for (const digitCombo of combinations(eligibleDigits, size)) {
      // Union of all cells containing any of these digits
      const cellSet = new Set<CellIdx>()
      for (const digit of digitCombo) {
        for (const cell of digitCells.get(digit)!) cellSet.add(cell)
      }

      if (cellSet.size !== size) continue

      const comboKey = [...cellSet].sort((a, b) => a - b).join(',')
      if (seenCombos.has(comboKey)) continue

      const hiddenCells = [...cellSet]
      const hiddenDigits = new Set(digitCombo)

      // Anything in those cells that isn't one of the hidden digits gets eliminated
      const toEliminate: Array<{ cell: CellIdx; digit: number }> = []
      for (const cell of hiddenCells) {
        for (const d of candidates[cell]) {
          if (!hiddenDigits.has(d)) toEliminate.push({ cell, digit: d })
        }
      }

      if (toEliminate.length === 0) continue
      seenCombos.add(comboKey)

      for (const cell of hiddenCells) {
        highlightCells.push(cell)
        for (const d of candidates[cell]) {
          annotations.push({
            cell,
            digit: d,
            kind: hiddenDigits.has(d) ? 'highlight' : 'eliminate',
          })
        }
      }

      const name = SIZE_NAMES[size]
      description.push(
        `${name}: digits ${digitCombo.sort().join('/')} in ${hiddenCells.map(cellLabel).join('/')}`,
      )
    }
  }

  if (!annotations.some(a => a.kind === 'eliminate')) return null

  return {
    name: SIZE_NAMES[size],
    solvedCells: [],
    highlightCells: [...new Set(highlightCells)],
    candidateAnnotations: dedupeAnnotations(annotations),
    description,
  }
}

const SIZE_NAMES: Record<number, string> = {
  2: 'Hidden Pairs',
  3: 'Hidden Triples',
  4: 'Hidden Quads',
}

export const hiddenPairs = (s: Snapshot) => hiddenSetsForSize(s, 2)
export const hiddenTriples = (s: Snapshot) => hiddenSetsForSize(s, 3)
export const hiddenQuads = (s: Snapshot) => hiddenSetsForSize(s, 4)
