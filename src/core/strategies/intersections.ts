import type { Snapshot, StratResult, CandidateAnnotation, CellIdx } from '../types'
import { BOXES, ROWS, COLS, CELL_UNITS } from '../units'
import { cellLabel } from '../utils'

/**
 * Pointing Pairs/Triples:
 * A digit within a box is confined to a single row or column.
 * → Eliminate that digit from the rest of that row/column outside the box.
 */
export function pointingPairs(snapshot: Snapshot): StratResult | null {
  const { values, candidates } = snapshot

  for (let b = 0; b < 9; b++) {
    const boxUnsolved = BOXES[b].filter(i => values[i] === null)

    for (let digit = 1; digit <= 9; digit++) {
      const digitCells = boxUnsolved.filter(i => candidates[i].has(digit))
      if (digitCells.length < 2 || digitCells.length > 3) continue

      const rows = new Set(digitCells.map(i => CELL_UNITS[i].row))
      const cols = new Set(digitCells.map(i => CELL_UNITS[i].col))

      let line: CellIdx[] | null = null
      let lineLabel = ''

      if (rows.size === 1) {
        const row = [...rows][0]
        line = ROWS[row].filter(i => values[i] === null && !digitCells.includes(i) && candidates[i].has(digit))
        lineLabel = `row ${row + 1}`
      } else if (cols.size === 1) {
        const col = [...cols][0]
        line = COLS[col].filter(i => values[i] === null && !digitCells.includes(i) && candidates[i].has(digit))
        lineLabel = `col ${col + 1}`
      }

      if (!line || line.length === 0) continue

      const annotations: CandidateAnnotation[] = [
        ...digitCells.map(cell => ({ cell, digit, kind: 'highlight' as const })),
        ...line.map(cell => ({ cell, digit, kind: 'eliminate' as const })),
      ]

      return {
        name: 'Pointing Pairs',
        solvedCells: [],
        highlightCells: digitCells,
        candidateAnnotations: annotations,
        description: [
          `Pointing Pairs: ${digit} in box ${b + 1} locked to ${lineLabel}`,
          `Eliminates ${digit} from ${line.map(cellLabel).join(', ')}`,
        ],
      }
    }
  }

  return null
}

/**
 * Box Reduction (Box/Line Reduction):
 * A digit within a row or column is confined to a single box.
 * → Eliminate that digit from the rest of that box outside the row/column.
 */
export function boxReduction(snapshot: Snapshot): StratResult | null {
  const { values, candidates } = snapshot

  for (const lines of [ROWS, COLS] as const) {
    const isRow = lines === ROWS

    for (let lineIdx = 0; lineIdx < 9; lineIdx++) {
      const lineUnsolved = lines[lineIdx].filter(i => values[i] === null)

      for (let digit = 1; digit <= 9; digit++) {
        const digitCells = lineUnsolved.filter(i => candidates[i].has(digit))
        if (digitCells.length < 2 || digitCells.length > 3) continue

        const boxes = new Set(digitCells.map(i => CELL_UNITS[i].box))
        if (boxes.size !== 1) continue

        const box = [...boxes][0]
        const toEliminate = BOXES[box].filter(
          i => values[i] === null && !digitCells.includes(i) && candidates[i].has(digit),
        )

        if (toEliminate.length === 0) continue

        const annotations: CandidateAnnotation[] = [
          ...digitCells.map(cell => ({ cell, digit, kind: 'highlight' as const })),
          ...toEliminate.map(cell => ({ cell, digit, kind: 'eliminate' as const })),
        ]

        const lineLabel = isRow ? `row ${lineIdx + 1}` : `col ${lineIdx + 1}`

        return {
          name: 'Box-Reduction',
          solvedCells: [],
          highlightCells: digitCells,
          candidateAnnotations: annotations,
          description: [
            `Box-Reduction: ${digit} in ${lineLabel} locked to box ${box + 1}`,
            `Eliminates ${digit} from ${toEliminate.map(cellLabel).join(', ')}`,
          ],
        }
      }
    }
  }

  return null
}
