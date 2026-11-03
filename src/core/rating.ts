import type { Snapshot } from './types'
import { applyStratResult, isSolved } from './board'
import { findNextStrategy, MAX_STEPS, STRATEGY_META } from './solver'

export type Rating = {
  /** Whether the strategies alone carry the puzzle to the end. */
  solved: boolean
  /** Steps taken: to the solution, or to where the strategies run out. */
  steps: number
  /** The furthest strategy down the pipeline that the solve called on. */
  hardest: string | null
  /** How many of the steps took a strategy beyond the basic ones (tough or diabolical). */
  tough: number
}

const RANK = new Map(STRATEGY_META.map((meta, i) => [meta.name, i]))
const TOUGH = new Set(STRATEGY_META.filter(meta => meta.category !== 'basic').map(meta => meta.name))

/**
 * Solve a copy of the puzzle with every strategy enabled and report
 * what it took.
 */
export function ratePuzzle(start: Snapshot): Rating {
  let snapshot = start
  let hardest: string | null = null
  let tough = 0

  for (let steps = 0; steps < MAX_STEPS; steps++) {
    if (isSolved(snapshot)) return { solved: true, steps, hardest, tough }

    const result = findNextStrategy(snapshot)
    if (!result) return { solved: false, steps, hardest, tough }

    if (hardest === null || RANK.get(result.name)! > RANK.get(hardest)!) hardest = result.name
    if (TOUGH.has(result.name)) tough++
    snapshot = applyStratResult(snapshot, result)
  }

  return { solved: false, steps: MAX_STEPS, hardest, tough }
}
