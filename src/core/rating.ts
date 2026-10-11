import type { Snapshot } from './types'
import { applyStratResult, isSolved } from './board'
import { findNextStrategy, STRATEGY_META } from './solver'

export type Rating = {
  /** Whether the strategies alone carry the puzzle to the end. */
  solved: boolean
  /** Steps taken: to the solution, or to where the strategies run out. */
  steps: number
  /** The furthest strategy down the pipeline that the solve called on. */
  hardest: string | null
}

const RANK = new Map(STRATEGY_META.map((meta, i) => [meta.name, i]))

/** Every step places a digit or removes a candidate, so 729 is a hard ceiling. */
const MAX_STEPS = 729

/**
 * Solve a copy of the puzzle with every strategy enabled and report
 * what it took.
 */
export function ratePuzzle(start: Snapshot): Rating {
  let snapshot = start
  let hardest: string | null = null

  for (let steps = 0; steps < MAX_STEPS; steps++) {
    if (isSolved(snapshot)) return { solved: true, steps, hardest }

    const result = findNextStrategy(snapshot)
    if (!result) return { solved: false, steps, hardest }

    if (hardest === null || RANK.get(result.name)! > RANK.get(hardest)!) hardest = result.name
    snapshot = applyStratResult(snapshot, result)
  }

  return { solved: false, steps: MAX_STEPS, hardest }
}
