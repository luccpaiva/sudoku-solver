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
import { combinations, cellLabel, proseList, unitDisplayName } from '../utils'

const UNIT_GROUPS: Array<[UnitKind, ReadonlyArray<ReadonlyArray<CellIdx>>]> = [
  ['row', ROWS],
  ['col', COLS],
  ['box', BOXES],
]

function hiddenSetsForSize(snapshot: Snapshot, size: 2 | 3 | 4): StratResult | null {
  const { values, candidates } = snapshot

  // One instance per (cells, digits) combo. The same hidden set seen from a
  // second unit yields identical eliminations; just record the extra unit.
  const byCombo = new Map<string, StratInstance>()

  for (const [kind, group] of UNIT_GROUPS) {
    for (let index = 0; index < 9; index++) {
      const unsolved = group[index].filter(i => values[i] === null)
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

        const hiddenCells = [...cellSet].sort((a, b) => a - b)
        const hiddenDigits = new Set(digitCombo)
        const sortedDigits = [...digitCombo].sort()

        // Anything in those cells that isn't one of the hidden digits gets eliminated
        const toEliminate: CandidateAnnotation[] = []
        for (const cell of hiddenCells) {
          for (const d of candidates[cell]) {
            if (!hiddenDigits.has(d)) toEliminate.push({ cell, digit: d, kind: 'eliminate' })
          }
        }
        if (toEliminate.length === 0) continue

        const key = `${hiddenCells.join(',')}|${sortedDigits.join(',')}`
        const unit: UnitRef = { kind, index }

        const existing = byCombo.get(key)
        if (existing) {
          existing.units.push(unit)
          existing.narrative = narrate(hiddenCells, sortedDigits, existing.units)
          continue
        }

        const pattern: CandidateAnnotation[] = hiddenCells.flatMap(cell =>
          [...candidates[cell]]
            .filter(d => hiddenDigits.has(d))
            .map(d => ({ cell, digit: d, kind: 'highlight' as const })),
        )
        byCombo.set(key, {
          patternCells: hiddenCells,
          solvedCells: [],
          candidateAnnotations: [...pattern, ...toEliminate],
          units: [unit],
          label: `digits ${sortedDigits.join('/')} in ${hiddenCells.map(cellLabel).join('/')}`,
          narrative: narrate(hiddenCells, sortedDigits, [unit]),
        })
      }
    }
  }

  const instances = [...byCombo.values()]
  if (instances.length === 0) return null
  return { name: SIZE_NAMES[size], instances }
}

function narrate(cells: CellIdx[], digits: number[], units: UnitRef[]): string {
  const cellList = proseList(cells.map(cellLabel))
  const digitList = proseList(digits)
  const where = proseList(units.map(unitDisplayName))
  return (
    `Within ${where}, the digits ${digitList} fit only in ${cellList}. ` +
    `Those cells must hold them, so every other candidate in those cells ` +
    `is crossed out and removed.`
  )
}

const SIZE_NAMES: Record<number, string> = {
  2: 'Hidden Pairs',
  3: 'Hidden Triples',
  4: 'Hidden Quads',
}

export const hiddenPairs = (s: Snapshot) => hiddenSetsForSize(s, 2)
export const hiddenTriples = (s: Snapshot) => hiddenSetsForSize(s, 3)
export const hiddenQuads = (s: Snapshot) => hiddenSetsForSize(s, 4)
