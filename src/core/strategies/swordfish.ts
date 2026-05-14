import type { Snapshot, StratResult, CandidateAnnotation, CellIdx } from '../types'
import { ROWS, COLS, CELL_UNITS } from '../units'
import { combinations, cellLabel } from '../utils'

export function swordfish(snapshot: Snapshot): StratResult | null {
  const { values, candidates } = snapshot

  for (let digit = 1; digit <= 9; digit++) {
    // ── Row-based Swordfish ─────────────────────────────────────────────────
    // Rows where digit appears in 2 or 3 cells
    const rowMap: Map<number, CellIdx[]> = new Map()
    for (let r = 0; r < 9; r++) {
      const cells = ROWS[r].filter(i => values[i] === null && candidates[i].has(digit))
      if (cells.length >= 2 && cells.length <= 3) rowMap.set(r, cells)
    }

    if (rowMap.size >= 3) {
      for (const rowCombo of combinations([...rowMap.keys()], 3)) {
        const allCells = rowCombo.flatMap(r => rowMap.get(r)!)
        const colSet = new Set(allCells.map(i => CELL_UNITS[i].col))

        if (colSet.size !== 3) continue

        const toEliminate: CellIdx[] = []
        for (const col of colSet) {
          for (const i of COLS[col]) {
            if (values[i] === null && candidates[i].has(digit) && !allCells.includes(i)) {
              toEliminate.push(i)
            }
          }
        }

        if (toEliminate.length === 0) continue

        return buildResult(
          digit,
          allCells,
          toEliminate,
          `Swordfish on ${digit}: rows ${rowCombo.map(r => r + 1).join('/')} ` +
            `in cols ${[...colSet].sort((a, b) => a - b).map(c => c + 1).join('/')}`,
        )
      }
    }

    // ── Column-based Swordfish ──────────────────────────────────────────────
    const colMap: Map<number, CellIdx[]> = new Map()
    for (let c = 0; c < 9; c++) {
      const cells = COLS[c].filter(i => values[i] === null && candidates[i].has(digit))
      if (cells.length >= 2 && cells.length <= 3) colMap.set(c, cells)
    }

    if (colMap.size >= 3) {
      for (const colCombo of combinations([...colMap.keys()], 3)) {
        const allCells = colCombo.flatMap(c => colMap.get(c)!)
        const rowSet = new Set(allCells.map(i => CELL_UNITS[i].row))

        if (rowSet.size !== 3) continue

        const toEliminate: CellIdx[] = []
        for (const row of rowSet) {
          for (const i of ROWS[row]) {
            if (values[i] === null && candidates[i].has(digit) && !allCells.includes(i)) {
              toEliminate.push(i)
            }
          }
        }

        if (toEliminate.length === 0) continue

        return buildResult(
          digit,
          allCells,
          toEliminate,
          `Swordfish on ${digit}: cols ${colCombo.map(c => c + 1).join('/')} ` +
            `in rows ${[...rowSet].sort((a, b) => a - b).map(r => r + 1).join('/')}`,
        )
      }
    }
  }

  return null
}

function buildResult(
  digit: number,
  patternCells: CellIdx[],
  toEliminate: CellIdx[],
  label: string,
): StratResult {
  const annotations: CandidateAnnotation[] = [
    ...patternCells.map(cell => ({ cell, digit, kind: 'highlight' as const })),
    ...toEliminate.map(cell => ({ cell, digit, kind: 'eliminate' as const })),
  ]
  return {
    name: 'Swordfish',
    solvedCells: [],
    highlightCells: patternCells,
    candidateAnnotations: annotations,
    description: [label, `Eliminates ${digit} from ${toEliminate.map(cellLabel).join(', ')}`],
  }
}
