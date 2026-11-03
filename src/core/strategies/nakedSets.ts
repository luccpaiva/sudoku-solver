import type {
  Snapshot,
  StratResult,
  StratInstance,
  CandidateAnnotation,
  CellIdx,
  UnitKind,
  UnitRef,
} from '../types'
import { ROWS, COLS, BOXES } from '../units'
import { combinations, cellLabel, dedupeAnnotations, proseList, unitDisplayName } from '../utils'

const UNIT_GROUPS: Array<[UnitKind, ReadonlyArray<ReadonlyArray<CellIdx>>]> = [
  ['row', ROWS],
  ['col', COLS],
  ['box', BOXES],
]

function nakedSetsForSize(snapshot: Snapshot, size: 2 | 3 | 4): StratResult | null {
  const { values, candidates } = snapshot

  // One instance per cell combo. A set living in two units at once
  // (e.g. a pair sharing a row and a box) merges into a single instance.
  const byCombo = new Map<string, StratInstance>()

  for (const [kind, group] of UNIT_GROUPS) {
    for (let index = 0; index < 9; index++) {
      const unsolved = group[index].filter(i => values[i] === null)

      // Only cells with 2..size candidates can be part of a naked set
      const eligible = unsolved.filter(i => candidates[i].size >= 2 && candidates[i].size <= size)
      if (eligible.length < size) continue

      for (const combo of combinations(eligible, size)) {
        const combined = new Set<number>()
        for (const cell of combo) {
          for (const d of candidates[cell]) combined.add(d)
        }
        if (combined.size !== size) continue

        // Look for eliminations elsewhere in this unit
        const toEliminate: CandidateAnnotation[] = []
        for (const cell of unsolved) {
          if (combo.includes(cell)) continue
          for (const digit of combined) {
            if (candidates[cell].has(digit)) toEliminate.push({ cell, digit, kind: 'eliminate' })
          }
        }
        if (toEliminate.length === 0) continue

        const comboKey = [...combo].sort((a, b) => a - b).join(',')
        const unit: UnitRef = { kind, index }

        const existing = byCombo.get(comboKey)
        if (existing) {
          existing.units.push(unit)
          existing.candidateAnnotations = dedupeAnnotations([
            ...existing.candidateAnnotations,
            ...toEliminate,
          ])
          existing.narrative = narrate(size, combo, combined, existing.units)
          continue
        }

        const pattern: CandidateAnnotation[] = combo.flatMap(cell =>
          [...candidates[cell]].map(digit => ({ cell, digit, kind: 'highlight' as const })),
        )
        byCombo.set(comboKey, {
          patternCells: [...combo],
          solvedCells: [],
          candidateAnnotations: [...pattern, ...toEliminate],
          units: [unit],
          label: `${combo.map(cellLabel).join('/')} locks ${[...combined].sort().join('/')}`,
          narrative: narrate(size, combo, combined, [unit]),
        })
      }
    }
  }

  const instances = [...byCombo.values()]
  if (instances.length === 0) return null
  return { name: SIZE_NAMES[size], instances }
}

const COUNT_WORDS: Record<number, string> = { 2: 'two', 3: 'three', 4: 'four' }

function narrate(
  size: number,
  combo: CellIdx[],
  digits: Set<number>,
  units: UnitRef[],
): string {
  const cells = proseList(combo.map(cellLabel))
  const digitList = proseList([...digits].sort(), 'or')
  const where = proseList(units.map(unitDisplayName))
  const claim = size === 2 ? 'both digits' : `all ${COUNT_WORDS[size]} digits`
  return (
    `${cells} can each only be ${digitList}. Between them these ${COUNT_WORDS[size]} cells ` +
    `claim ${claim}, so no other cell in ${where} can hold them: ` +
    `the crossed-out candidates are removed.`
  )
}

const SIZE_NAMES: Record<number, string> = {
  2: 'Naked Pairs',
  3: 'Naked Triples',
  4: 'Naked Quads',
}

export const nakedPairs = (s: Snapshot) => nakedSetsForSize(s, 2)
export const nakedTriples = (s: Snapshot) => nakedSetsForSize(s, 3)
export const nakedQuads = (s: Snapshot) => nakedSetsForSize(s, 4)
