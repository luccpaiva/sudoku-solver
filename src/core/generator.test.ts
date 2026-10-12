import { describe, expect, it } from 'vitest'
import { loadPuzzle } from './board'
import { generatePuzzle } from './generator'
import { ratePuzzle } from './rating'
import { seeded, solutionOf } from './testing'

describe('the expert generator', () => {
  it('gives puzzles with one solution that the strategies finish, and not without the tough ones', () => {
    const started = performance.now()
    const count = 12
    let twoOrMore = 0

    for (let seed = 1; seed <= count; seed++) {
      const puzzle = seeded(seed, () => generatePuzzle('expert'))
      // throws unless there is exactly one solution
      solutionOf(puzzle)

      const rating = ratePuzzle(loadPuzzle(puzzle).snapshot)
      expect(rating.solved).toBe(true)
      expect(rating.tough).toBeGreaterThan(0)
      if (rating.tough >= 2) twoOrMore++
    }

    // settling for a single tough step is the exception
    expect(twoOrMore).toBeGreaterThanOrEqual(count - 1)
    console.log(`${count} expert puzzles in ${Math.round(performance.now() - started)} ms, ${twoOrMore} with two tough steps or more`)
  }, 120_000)

  it('gives the same puzzle for the same seed', () => {
    expect(seeded(7, () => generatePuzzle('expert'))).toBe(seeded(7, () => generatePuzzle('expert')))
  }, 60_000)
})
