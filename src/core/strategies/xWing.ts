import type { Snapshot, StratResult, CandidateAnnotation, CellIdx } from '../types'
import { ROWS, COLS, CELL_UNITS } from '../units'
import { cellLabel } from '../utils'

export function xWing(snapshot: Snapshot): StratResult | null {
  const { values, candidates } = snapshot

  for (let digit = 1; digit <= 9; digit++) {
    // ── Row-based X-Wing ────────────────────────────────────────────────────
    // Find rows where the digit appears in exactly 2 cells
    const rowsWith2: Map<number, CellIdx[]> = new Map()
    for (let r = 0; r < 9; r++) {
      const cells = ROWS[r].filter(i => values[i] === null && candidates[i].has(digit))
      if (cells.length === 2) rowsWith2.set(r, cells)
    }

    const rowEntries = [...rowsWith2.entries()]
    for (let a = 0; a < rowEntries.length; a++) {
      const [r1, cells1] = rowEntries[a]
      const cols1 = cells1.map(i => CELL_UNITS[i].col).sort((x, y) => x - y)

      for (let b = a + 1; b < rowEntries.length; b++) {
        const [r2, cells2] = rowEntries[b]
        const cols2 = cells2.map(i => CELL_UNITS[i].col).sort((x, y) => x - y)

        if (cols1[0] !== cols2[0] || cols1[1] !== cols2[1]) continue

        const xWingCells = [...cells1, ...cells2]
        const toEliminate: CellIdx[] = []

        for (const col of cols1) {
          for (const i of COLS[col]) {
            if (values[i] === null && candidates[i].has(digit) && !xWingCells.includes(i)) {
              toEliminate.push(i)
            }
          }
        }

        if (toEliminate.length === 0) continue

        return buildResult(
          digit,
          xWingCells,
          toEliminate,
          `X-Wing on ${digit}: rows ${r1 + 1}&${r2 + 1}, cols ${cols1[0] + 1}&${cols1[1] + 1}`,
        )
      }
    }

    // ── Column-based X-Wing ─────────────────────────────────────────────────
    const colsWith2: Map<number, CellIdx[]> = new Map()
    for (let c = 0; c < 9; c++) {
      const cells = COLS[c].filter(i => values[i] === null && candidates[i].has(digit))
      if (cells.length === 2) colsWith2.set(c, cells)
    }

    const colEntries = [...colsWith2.entries()]
    for (let a = 0; a < colEntries.length; a++) {
      const [c1, cells1] = colEntries[a]
      const rows1 = cells1.map(i => CELL_UNITS[i].row).sort((x, y) => x - y)

      for (let b = a + 1; b < colEntries.length; b++) {
        const [c2, cells2] = colEntries[b]
        const rows2 = cells2.map(i => CELL_UNITS[i].row).sort((x, y) => x - y)

        if (rows1[0] !== rows2[0] || rows1[1] !== rows2[1]) continue

        const xWingCells = [...cells1, ...cells2]
        const toEliminate: CellIdx[] = []

        for (const row of rows1) {
          for (const i of ROWS[row]) {
            if (values[i] === null && candidates[i].has(digit) && !xWingCells.includes(i)) {
              toEliminate.push(i)
            }
          }
        }

        if (toEliminate.length === 0) continue

        return buildResult(
          digit,
          xWingCells,
          toEliminate,
          `X-Wing on ${digit}: cols ${c1 + 1}&${c2 + 1}, rows ${rows1[0] + 1}&${rows1[1] + 1}`,
        )
      }
    }
  }

  return null
}

function buildResult(
  digit: number,
  xWingCells: CellIdx[],
  toEliminate: CellIdx[],
  label: string,
): StratResult {
  const annotations: CandidateAnnotation[] = [
    ...xWingCells.map(cell => ({ cell, digit, kind: 'highlight' as const })),
    ...toEliminate.map(cell => ({ cell, digit, kind: 'eliminate' as const })),
  ]
  return {
    name: 'X-Wing',
    solvedCells: [],
    highlightCells: xWingCells,
    candidateAnnotations: annotations,
    description: [label, `Eliminates ${digit} from ${toEliminate.map(cellLabel).join(', ')}`],
  }
}
