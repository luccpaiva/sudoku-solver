import { describe, expect, it } from 'vitest'
import { applyStratResult, isSolved, loadPuzzle } from '../board'
import { findNextStrategy, STRATEGY_META } from '../solver'
import { fromWiki, removed, solutionOf, sweep, unsound } from '../testing'
import type { CandidateAnnotation, Snapshot, StratInstance, StratResult } from '../types'
import { cellLabel, ROW_LABELS } from '../utils'
import { alignedPairExclusion } from './alignedPairExclusion'

// The basic and tough strategies: what runs before the diabolical tier. These
// solves leave the other diabolical strategies out, so they show this one.
const BEFORE = new Set(STRATEGY_META.filter(meta => meta.category !== 'diabolical').map(meta => meta.name))

// The worked examples of sudokuwiki.org/Aligned_Pair_Exclusion: the position
// each "Load Example" link opens, and its puzzle from the start. Examples 1,
// 4, 5 and 6 open as values only (no candidates); see `settled`.
const EXAMPLE_1 = {
  at: '097103040030040700000670003273914586986007104154068007700091000009736050360000070',
  start: '090000040030040700000670003200900506006000100104008007700091000009030050060000070',
}
const EXAMPLE_2 = {
  at: 'S9B2b4r2y0r02038i8i5u06022e0509082f2f047v477y070r060502460509080n06022f042f020u017y0705087q060u0706080r7n7r05027z06027n4i070v4713080z2q060304022b099r0v9q024i7n3f6u2v',
  start: '000000000600598004000700520090002040201000806070800050062007000800634009000000000',
}
// Example 3's links open another board than the one pictured. The picture is
// example 2's puzzle further on, as the article says; these are its digits,
// read off the picture.
const EXAMPLE_3 =
  '000023000' + '620598004' + '000706520' + '598062040' + '201075806' + '076800052' + '062007000' + '800634209' + '000200000'
const EXAMPLE_4 = {
  at: '024053600005040002900602005700501030000367500350004001200035009500010003003200850',
  start: '004003600000040002900600005700500030000367000050004001200005009500010000003200800',
}
const EXAMPLE_5 = {
  at: '450900000006800900080020030000500000640000075501078000375080149002000607064701023',
  start: '450900000006000900080020030000500000640000075001008000070080040002000600000001023',
}
const EXAMPLE_6 = {
  at: '900000106002590000308040090080000070570204069090070040809050603000038900135000000',
  start: '000000106002590000308040000080000070000204000090070040000050603000038900105000000',
}
const EIGHT_CELLS = {
  at: 'S9B1307028308120604821b0906070l1c0814101a1208067o1ca0a0019u109u03ad1g7p08040608017u9o2c88889w9i0o047n05087p069g02012q080309042q0608049u02363m9u01039u0603162i019w9w08',
  start: '070000640090700800008000001000300084681000000000050060200009000040200003003001000',
}
// From the reader comments under the article (pie314271, 2019): the site
// solves it with Hidden Singles and one Aligned Pair Exclusion
const READER = '040000090600010002000903700005700400010000000007809200300406000000030000001000080'

const BASIC = new Set(STRATEGY_META.filter(meta => meta.category === 'basic').map(meta => meta.name))

/**
 * A values-only position with its candidates rebuilt and the basic
 * strategies run to a standstill: the nearest this repo gets to the
 * article's picture, which also carries what harder steps removed earlier.
 */
function settled(values: string): Snapshot {
  let s = fromWiki(values)
  for (let step = 0; step < 300; step++) {
    const result = findNextStrategy(s, BASIC)
    if (!result) break
    s = applyStratResult(s, result)
  }
  return s
}

/** The index of a cell from its label: 'A1' is 0, 'J9' is 80. */
function cellAt(label: string): number {
  return ROW_LABELS.indexOf(label[0]) * 9 + Number(label[1]) - 1
}

/** The one occurrence on this base pair, written 'G2/G3'. */
function pairAt(result: StratResult | null, base: string): StratInstance {
  const found = (result?.instances ?? []).filter(instance => instance.patternCells.map(cellLabel).join('/') === base)
  expect(found).toHaveLength(1)
  return found[0]
}

/** The candidates one occurrence marks in one way, as sorted `cell:digit` labels. */
function marks(instance: StratInstance, kind: CandidateAnnotation['kind']): string[] {
  return instance.candidateAnnotations
    .filter(a => a.kind === kind)
    .map(a => `${cellLabel(a.cell)}:${a.digit}`)
    .sort()
}

/**
 * A board with nothing solved and every candidate still in, except in the
 * cells named. No other cell can be part of an Almost Locked Set.
 */
function open(cells: Record<string, number[]>): Snapshot {
  const candidates = Array.from({ length: 81 }, () => new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]))
  for (const [label, digits] of Object.entries(cells)) candidates[cellAt(label)] = new Set(digits)
  return { values: new Array<number | null>(81).fill(null), candidates }
}

describe('Aligned Pair Exclusion, a base pair that sees each other', () => {
  it('example 1: two bi-value cells rule out every partner of 8 in G3', () => {
    const s = settled(EXAMPLE_1.at)
    const before = structuredClone(s)
    const result = alignedPairExclusion(s)
    expect(s).toEqual(before)
    expect(result?.name).toBe('Aligned Pair Exclusion')
    expect(removed(result)).toEqual(expect.arrayContaining(['G3:8']))
    expect(unsound(s, result!, solutionOf(EXAMPLE_1.start))).toEqual([])

    // G2 holds 2/4, G3 2/5/8; G9 (2/8) and H1 (4/8) see both
    const pair = pairAt(result, 'G2/G3')
    expect(marks(pair, 'highlight')).toEqual(['G9:2', 'G9:8', 'H1:4', 'H1:8'])
    expect(marks(pair, 'eliminate')).toEqual(['G3:8'])
    expect(pair.units).toEqual([{ kind: 'row', index: 6 }])
    expect(pair.solvedCells).toEqual([])
    expect(pair.label).toBe('Aligned pair G2/G3 with G9, H1: eliminates 8 from G3')
    expect(pair.narrative).toContain('If G3 were 8, G2 could be neither 2 nor 4')
    expect(pair.narrative).toContain('G9, which can only be 2 or 8, would be left empty')
  })

  it('example 2: two-cell sets rule out pairs as well', () => {
    const s = fromWiki(EXAMPLE_2.at)
    const result = alignedPairExclusion(s)
    expect(removed(result)).toEqual(['A2:4', 'B3:7', 'B7:3', 'B8:3', 'C2:1', 'C2:3', 'C3:3', 'J3:3'])
    expect(unsound(s, result!, solutionOf(EXAMPLE_2.start))).toEqual([])

    // The article's pairs for C2/C3: 1 and 3 by A1+B3, 1 and 4 and 1 and 9
    // by C1+C5, 8 and 3 by C9. So 3 goes from C3, and (the article stops
    // short of it) 1 from C2, which pairs with nothing either.
    const pair = pairAt(result, 'C2/C3')
    expect(marks(pair, 'eliminate')).toEqual(['C2:1', 'C3:3'])
    expect(pair.label).toBe('Aligned pair C2/C3 with C1+C5, C5, C9, A1+B3: eliminates 1 from C2, 3 from C3')
    expect(pair.narrative).toContain('as A1 and B3, which between them can only be 1, 3 or 7, would be left with only 7 for two cells')
  })

  it('example 3: the picture, example 2 further on', () => {
    const solution = solutionOf(EXAMPLE_2.start)
    // the digits read off the picture are that puzzle's
    EXAMPLE_3.split('').forEach((digit, cell) => {
      if (digit !== '0') expect(Number(digit)).toBe(solution[cell])
    })

    // The picture's base pair: B3 cannot be 7, as A3 would have no partner.
    // With the candidates rebuilt, A1+A4 does the work of the picture's
    // A1+C1+C3 (A1 and C1 keep a 4 the picture lacks).
    const s = settled(EXAMPLE_3)
    const result = alignedPairExclusion(s)
    expect(unsound(s, result!, solution)).toEqual([])
    const pair = pairAt(result, 'A3/B3')
    expect(marks(pair, 'eliminate')).toEqual(['B3:7'])
    expect(pair.label).toBe('Aligned pair A3/B3 with A1+A4, H3: eliminates 7 from B3')
  })

  it("example 3's three-cell set, on its own", () => {
    // The picture's cells: A1+C1+C3 hold 1/4/7/9 and see A3 and B3. With A3
    // as 4 and B3 as 7 they would have only 1 and 9 for three cells.
    const result = alignedPairExclusion(
      open({ A3: [4, 5, 7], B3: [3, 7], A1: [1, 7], C1: [1, 4, 9], C3: [4, 9], H3: [5, 7] }),
    )
    const pair = pairAt(result, 'A3/B3')
    expect(pair.label).toBe('Aligned pair A3/B3 with H3, A1+C1+C3: eliminates 7 from B3')
    expect(marks(pair, 'highlight')).toEqual(['A1:7', 'C1:4', 'C3:4', 'H3:5', 'H3:7'])
    expect(pair.units).toEqual([{ kind: 'col', index: 2 }, { kind: 'box', index: 0 }])
    expect(pair.narrative).toContain('would be left with only 1 and 9 for three cells')
  })

  it('the eight-cell example: four bi-value cells are enough for 2 in E5', () => {
    // The site uses eight cells; four of them already rule out every digit
    // of D5 beside a 2 in E5
    const s = fromWiki(EIGHT_CELLS.at)
    const result = alignedPairExclusion(s)
    expect(removed(result)).toEqual(expect.arrayContaining(['E5:2']))
    expect(unsound(s, result!, solutionOf(EIGHT_CELLS.start))).toEqual([])

    const pair = pairAt(result, 'D5/E5')
    expect(marks(pair, 'eliminate')).toEqual(['E5:2'])
    expect(pair.label).toBe('Aligned pair D5/E5 with B5, C5, D6, E6: eliminates 2 from E5')
    expect(pair.narrative).toContain('D5 could be none of 1, 2, 6, 7 and 9')
  })
})

describe('Aligned Pair Exclusion, a base pair that does not see each other', () => {
  it('example 4: the same digit twice is allowed, the Y-Wing logic still removes 8', () => {
    // The picture's A4 holds 1/9; rebuilt from the values it also keeps 7
    // and 8, which steps beyond the basic ones removed in the article's solve
    const s0 = settled(EXAMPLE_4.at)
    const s: Snapshot = { ...s0, candidates: s0.candidates.map((c, cell) => (cell === cellAt('A4') ? new Set([1, 9]) : c)) }
    const solution = solutionOf(EXAMPLE_4.start)
    expect([1, 9]).toContain(solution[cellAt('A4')])

    const result = alignedPairExclusion(s)
    expect(unsound(s, result!, solution)).toEqual([])
    const pair = pairAt(result, 'A4/B1')
    expect(marks(pair, 'eliminate')).toEqual(['B1:8'])
    expect(marks(pair, 'highlight')).toEqual(['A1:1', 'A1:8', 'B6:8', 'B6:9'])
    expect(pair.label).toBe('Unaligned pair A4/B1 with A1, B6: eliminates 8 from B1')
    expect(pair.narrative).toContain('do not see each other, so they could even hold the same digit')
    // the article's other way round: A4 with B2
    expect(pairAt(result, 'A4/B2').label).toBe('Unaligned pair A4/B2 with A1, B6: eliminates 8 from B2')
  })

  it('example 5: two bi-value cells and a two-cell set, no wing to do it instead', () => {
    const s = settled(EXAMPLE_5.at)
    const result = alignedPairExclusion(s)
    // the same formation takes 1 from B2, which the site leaves to its next step
    expect(removed(result)).toEqual(expect.arrayContaining(['B1:1', 'B2:1']))
    expect(unsound(s, result!, solutionOf(EXAMPLE_5.start))).toEqual([])

    const pair = pairAt(result, 'B1/C7')
    expect(marks(pair, 'eliminate')).toEqual(['B1:1'])
    expect(marks(pair, 'highlight')).toEqual(['B8:1', 'B8:5', 'B9:1', 'B9:4', 'C1:1', 'C1:7', 'C3:7'])
    expect(pair.label).toBe('Unaligned pair B1/C7 with B8, B9, C1+C3: eliminates 1 from B1')
    expect(pair.narrative).toContain('If B1 were 1, C7 could be none of 4, 5 and 7')
  })

  it('example 6: a bi-value cell and a three-cell set take 6 from D1', () => {
    const s = settled(EXAMPLE_6.at)
    const result = alignedPairExclusion(s)
    expect(removed(result)).toEqual(expect.arrayContaining(['D1:6']))
    expect(unsound(s, result!, solutionOf(EXAMPLE_6.start))).toEqual([])

    // The picture's six cells, read the other way round. The site takes A3
    // and D1 as the pair, attacked by B1 (6/7) and D3+E3+F3 (1/3/4/6). Here
    // B1 and D1 are the pair and A3 joins the column: with D1 as 6, B1 can
    // only be 7, and A3+D3+E3+F3 would be left with 1, 3 and 4 for four
    // cells. That reading uses fewer cells, so it comes first; the site's
    // removes nothing more and is dropped.
    const pair = pairAt(result, 'B1/D1')
    expect(pair.label).toBe('Aligned pair B1/D1 with A3+D3+E3+F3: eliminates 6 from D1')
    expect(pair.narrative).toContain('would be left with only 1, 3 and 4 for four cells')
  })
})

describe('Aligned Pair Exclusion, what it leaves alone', () => {
  const PAIR = { G2: [2, 4], G3: [2, 5, 8], G9: [2, 8], H1: [4, 8] }

  it('finds the bare pattern on an open board', () => {
    // G2 with G3 or G1 in row G, or with any of row H's cells H7 to H9
    // (which see G9 and H1, but not G2: the same digit would be allowed)
    expect(removed(alignedPairExclusion(open(PAIR)))).toEqual(['G1:8', 'G3:8', 'H7:8', 'H8:8', 'H9:8'])
  })

  it('needs every set to see both base cells', () => {
    // A3 sees G3 down column 3, but not G2: a 4 in G2 leaves it alone
    const { H1: _, ...rest } = PAIR
    expect(alignedPairExclusion(open({ ...rest, A3: [4, 8] }))).toBeNull()
  })

  it('lets a pair that does not see each other share a digit', () => {
    // A4 (1/9) and B1 (1/8): a 9 in A4 beside a 1 in B1 would empty B6, but
    // 1 and 1 is allowed, so B1 keeps its 1
    const unaligned = removed(alignedPairExclusion(open({ A4: [1, 9], B1: [1, 8], B6: [1, 9] })))
    expect(unaligned).not.toContain('B1:1')
    // In one row the same digit is out, and A7 rules out the 9: A1 loses its 1
    const aligned = alignedPairExclusion(open({ A4: [1, 9], A1: [1, 8], A7: [1, 9] }))
    expect(pairAt(aligned, 'A1/A4').label).toBe('Aligned pair A1/A4 with A7: eliminates 1 from A1')
  })
})

describe('Aligned Pair Exclusion against the solution', () => {
  it('is sound on every position of 200 solves, and quick', () => {
    let calls = 0
    let spent = 0
    let worst = 0
    // where the strategies before it have nothing: the positions it is there for
    let stalls = 0
    let taken = 0
    const timed = (s: Snapshot) => {
      const started = performance.now()
      const result = alignedPairExclusion(s)
      const took = performance.now() - started
      calls++
      spent += took
      worst = Math.max(worst, took)
      if (findNextStrategy(s, BEFORE) === null) {
        stalls++
        if (result) taken++
      }
      return result
    }
    const { fired, problems } = sweep(timed, { puzzles: 200 })
    expect(problems).toEqual([])
    expect(fired).toBeGreaterThan(0)
    expect(taken).toBeGreaterThan(0)
    console.log(
      `aligned pair exclusion: fired at ${fired} of ${calls} positions over 200 puzzles, and at ${taken} of ` +
        `the ${stalls} where the solver had nothing; ${Math.round((spent / calls) * 1000)} µs a call, ` +
        `worst ${worst.toFixed(1)} ms`,
    )
  }, 180_000)

  it('takes the article puzzles from start to finish', () => {
    // the basic and tough strategies, then Aligned Pair Exclusion, every step checked
    for (const start of [EXAMPLE_2.start, EXAMPLE_5.start, EXAMPLE_6.start, READER]) {
      const solution = solutionOf(start)
      let s = loadPuzzle(start).snapshot
      const used: string[] = []
      for (let step = 0; step < 729 && !isSolved(s); step++) {
        const result = findNextStrategy(s, BEFORE) ?? alignedPairExclusion(s)
        if (!result) break
        expect(unsound(s, result, solution), start).toEqual([])
        used.push(result.name)
        s = applyStratResult(s, result)
      }
      expect(isSolved(s), start).toBe(true)
      expect(used, start).toContain('Aligned Pair Exclusion')
    }
  })

  it('removes only from the base pair, and marks each candidate once', () => {
    const found: StratInstance[] = []
    sweep(s => {
      const result = alignedPairExclusion(s)
      if (result) found.push(...result.instances)
      return result
    }, { puzzles: 40, seed: 2 })
    expect(found.length).toBeGreaterThan(0)

    for (const instance of found) {
      expect(instance.patternCells, instance.label).toHaveLength(2)
      const keys = instance.candidateAnnotations.map(a => `${a.cell}:${a.digit}`)
      expect(new Set(keys).size, instance.label).toBe(keys.length)
      for (const { cell, kind } of instance.candidateAnnotations) {
        if (kind === 'eliminate') expect(instance.patternCells, instance.label).toContain(cell)
        else expect(instance.patternCells, instance.label).not.toContain(cell)
      }
    }
  }, 120_000)
})
