import type { Snapshot, StratResult, CellIdx } from '../types'
import { ALL_UNITS, CELL_UNITS } from '../units'
import { cellLabel } from '../utils'

export function hiddenSingles(snapshot: Snapshot): StratResult | null {
  const { values, candidates } = snapshot

  // (cell, digit) pairs found; deduplicate since a cell may be a hidden single in multiple units
  const found = new Map<string, { cell: CellIdx; digit: number; unitLabel: string }>()

  for (const unit of ALL_UNITS) {
    const unsolved = unit.filter(i => values[i] === null)

    for (let digit = 1; digit <= 9; digit++) {
      const cells = unsolved.filter(i => candidates[i].has(digit))

      if (cells.length !== 1) continue

      const cell = cells[0]
      const key = `${cell}:${digit}`

      if (!found.has(key)) {
        found.set(key, { cell, digit, unitLabel: unitName(unit, cell) })
      }
    }
  }

  if (found.size === 0) return null

  const entries = [...found.values()]

  return {
    name: 'Hidden Singles',
    solvedCells: entries.map(({ cell, digit }) => ({ cell, digit })),
    highlightCells: [],
    candidateAnnotations: entries.map(({ cell, digit }) => ({
      cell,
      digit,
      kind: 'highlight',
    })),
    description: entries.map(
      ({ cell, digit, unitLabel }) =>
        `${cellLabel(cell)} = ${digit} (unique in ${unitLabel})`,
    ),
  }
}

function unitName(unit: ReadonlyArray<CellIdx>, exampleCell: CellIdx): string {
  const { row, col, box } = CELL_UNITS[exampleCell]
  if (unit.every(i => CELL_UNITS[i].row === row)) return `row ${row + 1}`
  if (unit.every(i => CELL_UNITS[i].col === col)) return `col ${col + 1}`
  return `box ${box + 1}`
}
