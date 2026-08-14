import type { Snapshot, StratResult, StratInstance, UnitKind, UnitRef, CellIdx } from '../types'
import { ROWS, COLS, BOXES } from '../units'
import { cellLabel, unitDisplayName } from '../utils'

const UNIT_GROUPS: Array<[UnitKind, ReadonlyArray<ReadonlyArray<CellIdx>>]> = [
  ['row', ROWS],
  ['col', COLS],
  ['box', BOXES],
]

export function hiddenSingles(snapshot: Snapshot): StratResult | null {
  const { values, candidates } = snapshot

  // Deduplicate since a cell may be a hidden single in multiple units
  const found = new Map<string, StratInstance>()

  for (const [kind, group] of UNIT_GROUPS) {
    for (let index = 0; index < 9; index++) {
      const unsolved = group[index].filter(i => values[i] === null)

      for (let digit = 1; digit <= 9; digit++) {
        const cells = unsolved.filter(i => candidates[i].has(digit))
        if (cells.length !== 1) continue

        const cell = cells[0]
        const key = `${cell}:${digit}`
        if (found.has(key)) continue

        const unit: UnitRef = { kind, index }
        found.set(key, {
          patternCells: [cell],
          solvedCells: [{ cell, digit }],
          candidateAnnotations: [{ cell, digit, kind: 'highlight' }],
          units: [unit],
          label: `${cellLabel(cell)} = ${digit} (unique in ${unitDisplayName(unit)})`,
          narrative:
            `In ${unitDisplayName(unit)}, only ${cellLabel(cell)} can take a ${digit} — ` +
            `every other cell there already rules it out. So ${cellLabel(cell)} must be ${digit}.`,
        })
      }
    }
  }

  if (found.size === 0) return null
  return { name: 'Hidden Singles', instances: [...found.values()] }
}
