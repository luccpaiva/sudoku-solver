import { describe, expect, it } from 'vitest'
import { applyStratResult, isSolved, loadPuzzle } from '../board'
import { findNextStrategy } from '../solver'
import { fromWiki, placed, removed, solutionOf, sweep, unsound } from '../testing'
import type { Strategy } from '../testing'
import type { CandidateAnnotation, Snapshot, StratInstance, StratResult } from '../types'
import { cellLabel, ROW_LABELS } from '../utils'
import { bugPlusOne, uniqueRectangles } from './uniqueness'

/** Cell index of a label: 'A1' is 0, 'J9' is 80. */
const at = (label: string) => ROW_LABELS.indexOf(label[0]) * 9 + Number(label[1]) - 1

/** The marks of one kind in an occurrence, as sorted `cell:digit` labels. */
function marks(instance: StratInstance, kind: CandidateAnnotation['kind']): string[] {
  return instance.candidateAnnotations
    .filter(a => a.kind === kind)
    .map(a => `${cellLabel(a.cell)}:${a.digit}`)
    .sort()
}

/** The same position with the candidates of some cells replaced: `{ D1: '1259' }`. */
function withCandidates(snapshot: Snapshot, cells: Record<string, string>): Snapshot {
  const candidates = snapshot.candidates.map(set => new Set(set))
  for (const [label, digits] of Object.entries(cells)) {
    candidates[at(label)] = new Set([...digits].map(Number))
  }
  return { values: snapshot.values, candidates }
}

/** A position written out, to see that a strategy left it alone. */
const written = (s: Snapshot) => JSON.stringify([s.values, s.candidates.map(set => [...set])])

/** The basic tier by name, so the walk below stays the same as the pipeline grows. */
const BASICS = new Set([
  'Naked Singles',
  'Hidden Singles',
  'Naked Pairs',
  'Naked Triples',
  'Hidden Pairs',
  'Hidden Triples',
  'Naked Quads',
  'Hidden Quads',
  'Pointing Pairs',
  'Box-Reduction',
])

/**
 * Solves a puzzle from the start with the basic strategies and, wherever
 * they stall, with the strategy under test. Returns what that one found,
 * in order, each result checked against the solution.
 */
function solveWith(puzzle: string, strategy: Strategy): { found: StratResult[]; problems: string[]; solved: boolean } {
  const solution = solutionOf(puzzle)
  const found: StratResult[] = []
  const problems: string[] = []
  let snapshot = loadPuzzle(puzzle).snapshot

  for (let step = 0; step < 729 && !isSolved(snapshot); step++) {
    let next = findNextStrategy(snapshot, BASICS)
    if (!next) {
      next = strategy(snapshot)
      if (!next) break
      found.push(next)
      problems.push(...unsound(snapshot, next, solution))
    }
    snapshot = applyStratResult(snapshot, next)
  }

  return { found, problems, solved: isSolved(snapshot) }
}

describe('BUG+1', () => {
  // sudokuwiki.org/BUG, "BUG Example": every cell has two candidates but F8, which has 3/4/6
  const EXAMPLE = 'S9B0b080i070d060e010c0d0c06050i0a0b0g080a0g050c0b0h04090f0h0e070r0f7q7n0u0b8i0d0n0208077n1i0e8i0b0n0r0e7q081q0g0e09080f0g0d030b0a030f0d0h0a02070e0i0g010b090c050f080d'
  const EXAMPLE_START = '080706010006500008005000490007000000000287000000000800098000300300002700010905080'

  it('finds the example of the article: 3 is the solution of F8', () => {
    const s = fromWiki(EXAMPLE)
    const before = written(s)
    const result = bugPlusOne(s)!
    expect(written(s)).toBe(before)
    expect(result.name).toBe('BUG+1')

    // the site's solver takes the other two candidates out rather than writing the 3 in
    expect(removed(result)).toEqual(['F8:4', 'F8:6'])
    expect(placed(result)).toEqual([])
    expect(unsound(s, result, solutionOf(EXAMPLE_START))).toEqual([])
    expect([...applyStratResult(s, result).candidates[at('F8')]]).toEqual([3])
    expect(solutionOf(EXAMPLE_START)[at('F8')]).toBe(3)

    expect(result.instances).toHaveLength(1)
    const [instance] = result.instances
    expect(instance.patternCells.map(cellLabel)).toEqual(['F8'])
    expect(instance.solvedCells).toEqual([])
    expect(marks(instance, 'highlight')).toEqual(['F8:3'])
    // the other 3s of row F, column 8 and box 6: with F8 that is three in each
    expect(marks(instance, 'alternate')).toEqual(['D8:3', 'E8:3', 'F3:3', 'F6:3'])
    expect(marks(instance, 'eliminate')).toEqual(['F8:4', 'F8:6'])
    expect(instance.units).toEqual([
      { kind: 'row', index: 5 },
      { kind: 'col', index: 7 },
      { kind: 'box', index: 5 },
    ])
    expect(instance.label).toBe('BUG+1 in F8: must be 3, eliminates 4/6')
    expect(instance.narrative).toContain('exactly one solution')
    expect(instance.narrative).toContain('row F, column 8 and box 6')
  })

  // Every puzzle the page gives from the start. Its second picture shows E2
  // losing 1 and 7; of the exemplars it says only that they need a BUG, so
  // their cells are where a solve by the basic strategies meets it.
  const FROM_THE_START: Array<[name: string, puzzle: string, removes: string[]]> = [
    ['the example', EXAMPLE_START, ['F8:4', 'F8:6']],
    ['the 27-clue minimal BUG', '001000706736000005500000082000078000000520000000139000392000500600000137050000400', ['E2:1', 'E2:7']],
    ['exemplar 1', '200400501001038090030000708070002003060090005040000009004000060620300800810047000', ['F3:2', 'F3:5']],
    ['exemplar 2', '000009004000000015832000070100703060900080003060102009010000647490000000700800000', ['A4:3', 'A4:6']],
    ['exemplar 3', '560904000002003000100070080000302500090000020000106000040030009000600700000709056', ['E3:1', 'E3:6']],
    ['exemplar 4', '200039005107500042000000000004008200050000000006400900000000000620004108700950004', ['D9:3', 'D9:6']],
    ['exemplar 5', '000001007040007093700200005005020604000080000308010700400002009510600020200900000', ['J7:1', 'J7:5']],
    ['exemplar 6', '002090003000000010000600002007029000001000800000530600600001000030000000400080500', ['H5:5', 'H5:6']],
  ]

  it.each(FROM_THE_START)('solves %s of the article from the start', (_name, puzzle, removes) => {
    const { found, problems, solved } = solveWith(puzzle, bugPlusOne)
    expect(problems).toEqual([])
    // one BUG, and the basic strategies finish the puzzle from there
    expect(found.map(removed)).toEqual([removes])
    expect(solved).toBe(true)
  })

  it('is sound on every position of 200 generated solves', () => {
    const { fired, problems } = sweep(bugPlusOne, { puzzles: 200 })
    expect(problems).toEqual([])
    // rare: a handful of positions in 200 puzzles
    expect(fired).toBeGreaterThan(0)
  }, 60_000)

  it('needs every cell but one to have two candidates', () => {
    const s = fromWiki(EXAMPLE)
    // a second cell of three
    expect(bugPlusOne(withCandidates(s, { E8: '346' }))).toBeNull()
    // none of three: the grave itself, with nothing to tell the two ways apart
    expect(bugPlusOne(withCandidates(s, { F8: '46' }))).toBeNull()
    // a cell of four, and a cell of one
    expect(bugPlusOne(withCandidates(s, { F8: '3469' }))).toBeNull()
    expect(bugPlusOne(withCandidates(s, { D4: '1' }))).toBeNull()
    // nothing like it at the start of the solve
    expect(bugPlusOne(fromWiki(EXAMPLE_START))).toBeNull()
  })

  it('needs the digits to pair up everywhere once the extra one is gone', () => {
    const s = fromWiki(EXAMPLE)
    // D4 is 1/4: as 1/9 the counts of each cell still fit, but 4 and 9 no longer come in twos
    expect(bugPlusOne(withCandidates(s, { D4: '19' }))).toBeNull()
    // the same away from F8's own row, column and box
    expect(bugPlusOne(withCandidates(s, { E1: '39', E3: '16' }))).toBeNull()
  })
})

describe('Unique Rectangles, Type 1', () => {
  // sudokuwiki.org/Unique_Rectangles, Figure 2: D9, F1 and F9 hold 2/9, D1 holds 1/2/5/9
  const FIGURE_2 = 'S9B9e9e06030204080a0e08050o0f090a0s0g0u0s0w0a070h0e7o8m1i857p04820c0706087o030h82820f0b0a0d077o0607040a0h030e7o987w840a0g038a8i0h9u9i860h040f8202011n0r08020509071i1q'
  const FIGURE_2_START = '006324800850090000000700000004007680300000007067400300000003000000040021008259700'

  it('finds Figure 2 of the article: 2 and 9 leave D1', () => {
    const s = fromWiki(FIGURE_2)
    const before = written(s)
    const result = uniqueRectangles(s)!
    expect(written(s)).toBe(before)
    expect(result.name).toBe('Unique Rectangles')

    expect(removed(result)).toEqual(['D1:2', 'D1:9'])
    expect(placed(result)).toEqual([])
    expect(unsound(s, result, solutionOf(FIGURE_2_START))).toEqual([])
    // "it must be either 1 or 5"
    expect([...applyStratResult(s, result).candidates[at('D1')]].sort()).toEqual([1, 5])

    // the only rectangle of the position, as on the site
    expect(result.instances).toHaveLength(1)
    const [instance] = result.instances
    expect(instance.patternCells.map(cellLabel)).toEqual(['D1', 'D9', 'F1', 'F9'])
    expect(instance.solvedCells).toEqual([])
    expect(marks(instance, 'highlight')).toEqual(['D9:2', 'D9:9', 'F1:2', 'F1:9', 'F9:2', 'F9:9'])
    expect(marks(instance, 'alternate')).toEqual([])
    expect(marks(instance, 'eliminate')).toEqual(['D1:2', 'D1:9'])
    // the two boxes it lies in, and its four sides
    expect(instance.units).toEqual([
      { kind: 'box', index: 3 },
      { kind: 'box', index: 5 },
    ])
    expect(instance.links!.map(([a, b]) => `${cellLabel(a)}-${cellLabel(b)}`)).toEqual(['D1-D9', 'D9-F9', 'F9-F1', 'F1-D1'])
    expect(instance.label).toBe('Type 1 on 2/9: rows D&F, columns 1&9, eliminates 2/9 from D1')
    expect(instance.narrative).toContain('D9, F1 and F9 can each only be 2 or 9')
    expect(instance.narrative).toContain('exactly one')
  })

  // The puzzles the page gives from the start that have a Type 1 in them:
  // Figure 2 and exemplars 1 to 4 (each "Type 1 +" another type, which is
  // why the solve does not finish here). The page does not name the cells
  // of the exemplars: they are where the basic strategies first stall.
  const FROM_THE_START: Array<[name: string, puzzle: string, removes: string[]]> = [
    ['Figure 2', FIGURE_2_START, ['D1:2', 'D1:9']],
    ['exemplar 1', '000806000200010074009700010006000201300000600020000000030005000002000080810002953', ['H4:1', 'H4:4']],
    ['exemplar 2', '000000000074180060020004030080000000600009000200356000000203100000001640065000900', ['A7:2', 'A7:5']],
    ['exemplar 3', '080720013000000000100300000000006031030504060020910700200100908005008004000000000', ['D1:7', 'D1:8']],
    ['exemplar 4', '100000040060010000070900056000009000009005030510070090000000200806000307204000000', ['G5:6', 'G5:8']],
  ]

  it.each(FROM_THE_START)('meets the rectangle of %s from the start', (_name, puzzle, removes) => {
    const { found, problems } = solveWith(puzzle, uniqueRectangles)
    expect(problems).toEqual([])
    expect(found.length).toBeGreaterThan(0)
    expect(removed(found[0])).toEqual(removes)
  })

  it('is sound on every position of 200 generated solves', () => {
    const { fired, problems } = sweep(uniqueRectangles, { puzzles: 200 })
    expect(problems).toEqual([])
    expect(fired).toBeGreaterThan(0)
  }, 60_000)

  // an empty grid, every cell with all nine candidates
  const OPEN = fromWiki('0'.repeat(81))

  it('needs the rectangle to lie in two boxes', () => {
    // rows A and D, columns 1 and 4: four boxes, where a swap changes what each box holds
    expect(uniqueRectangles(withCandidates(OPEN, { A1: '29', A4: '29', D1: '29', D4: '1259' }))).toBeNull()
    // the same corners moved up into rows A and B: boxes 1 and 2
    expect(removed(uniqueRectangles(withCandidates(OPEN, { A1: '29', A4: '29', B1: '29', B4: '1259' })))).toEqual(['B4:2', 'B4:9'])
  })

  it('needs three corners of the bare pair and a fourth holding both digits', () => {
    const s = fromWiki(FIGURE_2)
    // a second corner with an extra candidate: another type, not this one
    expect(uniqueRectangles(withCandidates(s, { D9: '279' }))).toBeNull()
    // a corner on a different pair
    expect(uniqueRectangles(withCandidates(s, { F9: '28' }))).toBeNull()
    // the fourth corner without the 9
    expect(uniqueRectangles(withCandidates(s, { D1: '125' }))).toBeNull()
    // the deadly pattern itself: nothing left to take out
    expect(uniqueRectangles(withCandidates(s, { D1: '29' }))).toBeNull()
    // a solved corner
    const values = [...s.values]
    values[at('F9')] = 2
    expect(uniqueRectangles({ values, candidates: withCandidates(s, { F9: '' }).candidates })).toBeNull()
  })

  it('returns every rectangle once, in board order', () => {
    const s = withCandidates(OPEN, {
      // columns 7 and 8 share a stack, rows D and G do not: boxes 6 and 9
      D7: '38', D8: '3458', G7: '38', G8: '38',
      // one extra candidate is enough
      A1: '29', A4: '29', B1: '29', B4: '259',
    })
    const result = uniqueRectangles(s)!
    expect(result.instances.map(i => i.label)).toEqual([
      'Type 1 on 2/9: rows A&B, columns 1&4, eliminates 2/9 from B4',
      'Type 1 on 3/8: rows D&G, columns 7&8, eliminates 3/8 from D8',
    ])
    expect(removed(result)).toEqual(['B4:2', 'B4:9', 'D8:3', 'D8:8'])
  })
})
