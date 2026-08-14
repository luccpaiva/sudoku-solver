import type { Snapshot, StratResult, StratInstance, CellIdx, UnitRef } from '../types'
import { BOXES, ROWS, COLS, CELL_UNITS } from '../units'
import { unitDisplayName } from '../utils'

/**
 * Pointing Pairs/Triples:
 * A digit within a box is confined to a single row or column.
 * → Eliminate that digit from the rest of that row/column outside the box.
 */
export function pointingPairs(snapshot: Snapshot): StratResult | null {
  const { values, candidates } = snapshot
  const instances: StratInstance[] = []

  for (let b = 0; b < 9; b++) {
    const boxUnsolved = BOXES[b].filter(i => values[i] === null)

    for (let digit = 1; digit <= 9; digit++) {
      const digitCells = boxUnsolved.filter(i => candidates[i].has(digit))
      if (digitCells.length < 2 || digitCells.length > 3) continue

      const rows = new Set(digitCells.map(i => CELL_UNITS[i].row))
      const cols = new Set(digitCells.map(i => CELL_UNITS[i].col))

      let toEliminate: CellIdx[] | null = null
      let line: UnitRef | null = null

      if (rows.size === 1) {
        const row = [...rows][0]
        toEliminate = ROWS[row].filter(
          i => values[i] === null && !digitCells.includes(i) && candidates[i].has(digit),
        )
        line = { kind: 'row', index: row }
      } else if (cols.size === 1) {
        const col = [...cols][0]
        toEliminate = COLS[col].filter(
          i => values[i] === null && !digitCells.includes(i) && candidates[i].has(digit),
        )
        line = { kind: 'col', index: col }
      }

      if (!toEliminate || toEliminate.length === 0 || !line) continue

      const box: UnitRef = { kind: 'box', index: b }
      instances.push({
        patternCells: digitCells,
        solvedCells: [],
        candidateAnnotations: [
          ...digitCells.map(cell => ({ cell, digit, kind: 'highlight' as const })),
          ...toEliminate.map(cell => ({ cell, digit, kind: 'eliminate' as const })),
        ],
        units: [box, line],
        label: `${digit} in ${unitDisplayName(box)} locked to ${unitDisplayName(line)}`,
        narrative:
          `Inside ${unitDisplayName(box)}, the digit ${digit} fits only in ${unitDisplayName(line)}. ` +
          `One of those cells must be the ${digit}, so it can't appear anywhere else ` +
          `in ${unitDisplayName(line)} — the crossed-out candidates are removed.`,
      })
    }
  }

  if (instances.length === 0) return null
  return { name: 'Pointing Pairs', instances }
}

/**
 * Box Reduction (Box/Line Reduction):
 * A digit within a row or column is confined to a single box.
 * → Eliminate that digit from the rest of that box outside the row/column.
 */
export function boxReduction(snapshot: Snapshot): StratResult | null {
  const { values, candidates } = snapshot
  const instances: StratInstance[] = []

  for (const lines of [ROWS, COLS] as const) {
    const isRow = lines === ROWS

    for (let lineIdx = 0; lineIdx < 9; lineIdx++) {
      const lineUnsolved = lines[lineIdx].filter(i => values[i] === null)

      for (let digit = 1; digit <= 9; digit++) {
        const digitCells = lineUnsolved.filter(i => candidates[i].has(digit))
        if (digitCells.length < 2 || digitCells.length > 3) continue

        const boxes = new Set(digitCells.map(i => CELL_UNITS[i].box))
        if (boxes.size !== 1) continue

        const boxIdx = [...boxes][0]
        const toEliminate = BOXES[boxIdx].filter(
          i => values[i] === null && !digitCells.includes(i) && candidates[i].has(digit),
        )
        if (toEliminate.length === 0) continue

        const line: UnitRef = { kind: isRow ? 'row' : 'col', index: lineIdx }
        const box: UnitRef = { kind: 'box', index: boxIdx }

        instances.push({
          patternCells: digitCells,
          solvedCells: [],
          candidateAnnotations: [
            ...digitCells.map(cell => ({ cell, digit, kind: 'highlight' as const })),
            ...toEliminate.map(cell => ({ cell, digit, kind: 'eliminate' as const })),
          ],
          units: [line, box],
          label: `${digit} in ${unitDisplayName(line)} locked to ${unitDisplayName(box)}`,
          narrative:
            `In ${unitDisplayName(line)}, the digit ${digit} fits only inside ${unitDisplayName(box)}. ` +
            `That pins the box's ${digit} to those cells, so it can be removed from ` +
            `the rest of ${unitDisplayName(box)}.`,
        })
      }
    }
  }

  if (instances.length === 0) return null
  return { name: 'Box-Reduction', instances }
}
