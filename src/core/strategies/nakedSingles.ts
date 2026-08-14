import type { Snapshot, StratResult, StratInstance } from '../types'
import { cellLabel } from '../utils'

export function nakedSingles(snapshot: Snapshot): StratResult | null {
  const { values, candidates } = snapshot
  const instances: StratInstance[] = []

  for (let i = 0; i < 81; i++) {
    if (values[i] === null && candidates[i].size === 1) {
      const digit = [...candidates[i]][0]
      instances.push({
        patternCells: [i],
        solvedCells: [{ cell: i, digit }],
        candidateAnnotations: [{ cell: i, digit, kind: 'highlight' }],
        units: [],
        label: `${cellLabel(i)} = ${digit} (only candidate)`,
        narrative: `${cellLabel(i)} has only one candidate left — it must be ${digit}.`,
      })
    }
  }

  if (instances.length === 0) return null
  return { name: 'Naked Singles', instances }
}
