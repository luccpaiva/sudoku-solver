import type { Snapshot, StratResult } from '../types'
import { cellLabel } from '../utils'

export function nakedSingles(snapshot: Snapshot): StratResult | null {
  const { values, candidates } = snapshot
  const solvedCells: Array<{ cell: number; digit: number }> = []

  for (let i = 0; i < 81; i++) {
    if (values[i] === null && candidates[i].size === 1) {
      const digit = [...candidates[i]][0]
      solvedCells.push({ cell: i, digit })
    }
  }

  if (solvedCells.length === 0) return null

  return {
    name: 'Naked Singles',
    solvedCells,
    highlightCells: [],
    candidateAnnotations: solvedCells.map(({ cell, digit }) => ({
      cell,
      digit,
      kind: 'highlight',
    })),
    description: solvedCells.map(
      ({ cell, digit }) => `${cellLabel(cell)} = ${digit} (only candidate)`,
    ),
  }
}
