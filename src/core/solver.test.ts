import { describe, expect, it } from 'vitest'
import { applyStratResult, isSolved, loadPuzzle } from './board'
import { findNextStrategy, stepsBefore, STRATEGY_META } from './solver'
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

describe('the steps before a strategy', () => {
  const named = TEST_BOARDS.filter(board => STRATEGY_META.some(meta => meta.name === board.name))

  it('lead every puzzle of the library to the strategy it is named for', () => {
    for (const board of named) {
      const lead = stepsBefore(loadPuzzle(board.puzzle).snapshot, board.name)
      expect(lead, board.name).not.toBeNull()
      expect(lead!.map(step => step.name), board.name).not.toContain(board.name)

      const opened = lead!.reduce(applyStratResult, loadPuzzle(board.puzzle).snapshot)
      expect(findNextStrategy(opened)?.name).toBe(board.name)
    }
  })

  it('are none when the strategy is the first to apply', () => {
    const pairs = named.find(board => board.name === 'Naked Pairs')!
    expect(stepsBefore(loadPuzzle(pairs.puzzle).snapshot, 'Naked Pairs')).toEqual([])
  })

  it('are not there for a strategy the solve never calls on', () => {
    const pairs = named.find(board => board.name === 'Naked Pairs')!
    expect(stepsBefore(loadPuzzle(pairs.puzzle).snapshot, 'Jellyfish')).toBeNull()
    expect(stepsBefore(loadPuzzle(pairs.puzzle).snapshot, 'NYT Challenge')).toBeNull()
  })
})
