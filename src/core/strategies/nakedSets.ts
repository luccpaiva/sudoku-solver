import type { Snapshot, StratResult, CandidateAnnotation, CellIdx } from '../types'
import { ALL_UNITS } from '../units'
import { combinations, cellLabel, dedupeAnnotations } from '../utils'

function nakedSetsForSize(snapshot: Snapshot, size: 2 | 3 | 4): StratResult | null {
  const { values, candidates } = snapshot

  const highlightCells: CellIdx[] = []
  const annotations: CandidateAnnotation[] = []
  const description: string[] = []
  const seenCombos = new Set<string>()

  for (const unit of ALL_UNITS) {
    const unsolved = unit.filter(i => values[i] === null)

    // Only cells with 2..size candidates can be part of a naked set
    const eligible = unsolved.filter(i => candidates[i].size >= 2 && candidates[i].size <= size)
    if (eligible.length < size) continue

    for (const combo of combinations(eligible, size)) {
      const combined = new Set<number>()
      for (const cell of combo) {
        for (const d of candidates[cell]) combined.add(d)
      }
      if (combined.size !== size) continue

      const comboKey = [...combo].sort((a, b) => a - b).join(',')
      if (seenCombos.has(comboKey)) continue

      // Look for eliminations elsewhere in this unit
      const toEliminate: Array<{ cell: CellIdx; digit: number }> = []
      for (const cell of unsolved) {
        if (combo.includes(cell)) continue
        for (const digit of combined) {
          if (candidates[cell].has(digit)) toEliminate.push({ cell, digit })
        }
      }

      if (toEliminate.length === 0) continue
      seenCombos.add(comboKey)

      for (const cell of combo) {
        highlightCells.push(cell)
        for (const digit of candidates[cell]) {
          annotations.push({ cell, digit, kind: 'highlight' })
        }
      }
      for (const { cell, digit } of toEliminate) {
        annotations.push({ cell, digit, kind: 'eliminate' })
      }

      const name = SIZE_NAMES[size]
      description.push(
        `${name}: ${combo.map(cellLabel).join('/')} locks ${[...combined].sort().join('/')}`,
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
  2: 'Naked Pairs',
  3: 'Naked Triples',
  4: 'Naked Quads',
}

export const nakedPairs = (s: Snapshot) => nakedSetsForSize(s, 2)
export const nakedTriples = (s: Snapshot) => nakedSetsForSize(s, 3)
export const nakedQuads = (s: Snapshot) => nakedSetsForSize(s, 4)
