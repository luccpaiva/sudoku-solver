import { describe, expect, it } from 'vitest'
import { fromWiki, removed, solutionOf, sweep, unsound } from './testing'
import { xWing } from './strategies'

describe('testing helpers', () => {
  it('reads a packed position from sudokuwiki.org', () => {
    // Chute Remote Pairs, example 1: A8 and C1 both hold 4/7
    const s = fromWiki('S9B2j0b5v0962050f2i0c0i5u0e560c566201022i060c0a644c62050i03095u4a054c2d062b0e5u0f03440a0i2c040l040l0g060i0c08052c032c0e4a560r091f08050i1m010c2k2k360f0a0d020i070e0c0h')
    expect(s.values[3]).toBe(9)
    expect([...s.candidates[7]].sort()).toEqual([4, 7])
    expect([...s.candidates[18]].sort()).toEqual([4, 7])
    // every candidate of the position is consistent with the solution
    const solution = solutionOf('000905000000000012060000050390050060000300004040060085030000090850010000000207000')
    for (let i = 0; i < 81; i++) {
      if (s.values[i] !== null) expect(s.values[i]).toBe(solution[i])
      else expect(s.candidates[i].has(solution[i])).toBe(true)
    }
  })

  it('sweeps a strategy over generated puzzles', () => {
    const started = performance.now()
    const { fired, problems } = sweep(xWing, { puzzles: 60 })
    console.log(`x-wing fired ${fired} times over 60 puzzles in ${Math.round(performance.now() - started)} ms`)
    expect(problems).toEqual([])
  })

  it('checks a result against the solution', () => {
    const puzzle = '1.....569492.561.8.561.924...964.8.1.64.1....218.356.4.4.5...169.5.614.2621.....5'
    const s = fromWiki(puzzle)
    // the X-Wing of sudokuwiki.org's own example: 7 in rows B and F, columns 4 and 8
    expect(removed(xWing(s))).toEqual(['A4:7', 'D8:7', 'E4:7', 'E8:7', 'H4:7', 'H8:7', 'J4:7', 'J8:7'])
    expect(unsound(s, xWing(s)!, solutionOf(puzzle))).toEqual([])
    expect(unsound(s, { name: 'Wrong', instances: [{ patternCells: [1], solvedCells: [{ cell: 1, digit: 9 }], candidateAnnotations: [], units: [], label: 'x', narrative: 'x' }] }, solutionOf(puzzle))).toHaveLength(1)
  })
})
