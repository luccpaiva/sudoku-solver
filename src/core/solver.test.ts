import { describe, expect, it } from 'vitest'
import { applyStratResult, isSolved, loadPuzzle } from './board'
import { findNextStrategy, STRATEGY_META } from './solver'
import { solutionOf, unsound } from './testing'
import { TEST_BOARDS } from '../data/testBoards'

/** Solves a puzzle with the whole pipeline, checking every step against the solution. */
function solve(puzzle: string): { used: string[]; solved: boolean; problems: string[] } {
  const solution = solutionOf(puzzle)
  const used: string[] = []
  const problems: string[] = []
  let snapshot = loadPuzzle(puzzle).snapshot

  for (let step = 0; step < 729 && !isSolved(snapshot); step++) {
    const result = findNextStrategy(snapshot)
    if (!result) break
    problems.push(...unsound(snapshot, result, solution))
    used.push(result.name)
    snapshot = applyStratResult(snapshot, result)
  }

  return { used, solved: isSolved(snapshot), problems }
}

describe('the solver on the puzzle library', () => {
  for (const board of TEST_BOARDS) {
    it(`${board.name}: every step agrees with the solution`, () => {
      const { used, solved, problems } = solve(board.puzzle)
      expect(problems).toEqual([])
      expect(solved).toBe(true)
      // a puzzle named for a strategy is there to show it
      if (STRATEGY_META.some(meta => meta.name === board.name)) expect(used).toContain(board.name)
    })
  }
})
