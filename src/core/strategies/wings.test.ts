import { describe, expect, it } from 'vitest'
import type { CandidateAnnotation, Snapshot, StratInstance, StratResult } from '../types'
import { applyStratResult, isSolved } from '../board'
import { fromWiki, removed, solutionOf, sweep, unsound, type Strategy } from '../testing'
import { cellLabel, ROW_LABELS } from '../utils'
import {
  nakedSingles,
  hiddenSingles,
  nakedPairs,
  nakedTriples,
  nakedQuads,
  hiddenPairs,
  hiddenTriples,
  hiddenQuads,
  pointingPairs,
  boxReduction,
} from './index'
import { yWing, xyzWing } from './wings'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** The index of a cell from its label: 'A1' is 0, 'J9' is 80. */
function cellAt(label: string): number {
  return ROW_LABELS.indexOf(label[0]) * 9 + Number(label[1]) - 1
}

/** The one occurrence on these cells, hinge first then the pincers: 'A1 A7 E1'. */
function wingAt(result: StratResult | null, cells: string): StratInstance {
  const found = (result?.instances ?? []).filter(
    instance => instance.patternCells.map(cellLabel).join(' ') === cells,
  )
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
 * cells named. Any wing on it has something to remove, so where a strategy
 * finds nothing it is the shape that is wrong.
 */
function open(cells: Record<string, number[]>): Snapshot {
  const candidates = Array.from({ length: 81 }, () => new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]))
  for (const [label, digits] of Object.entries(cells)) candidates[cellAt(label)] = new Set(digits)
  return { values: new Array<number | null>(81).fill(null), candidates }
}

const BASICS: Strategy[] = [
  nakedSingles,
  hiddenSingles,
  nakedPairs,
  nakedTriples,
  hiddenPairs,
  hiddenTriples,
  nakedQuads,
  hiddenQuads,
  pointingPairs,
  boxReduction,
]

/**
 * Solves a puzzle with the basic strategies, turning to the wing only where
 * they have nothing. `uses` is how many times it had to.
 */
function solveWith(puzzle: string, wing: Strategy): { solved: boolean; uses: number; problems: string[] } {
  const solution = solutionOf(puzzle)
  const problems: string[] = []
  let snapshot = fromWiki(puzzle)
  let uses = 0

  for (let step = 0; step < 729 && !isSolved(snapshot); step++) {
    let next: StratResult | null = null
    for (const basic of BASICS) {
      next = basic(snapshot)
      if (next) break
    }
    if (!next) {
      next = wing(snapshot)
      if (!next) break
      uses++
      problems.push(...unsound(snapshot, next, solution))
    }
    snapshot = applyStratResult(snapshot, next)
  }
  return { solved: isSolved(snapshot), uses, problems }
}

// ── Y-Wing ────────────────────────────────────────────────────────────────────

describe('Y-Wing', () => {
  // sudokuwiki.org's own puzzle for the page, "a sequence of five Y-Wings"
  const tough = '034500000802060400600008000003900004050000090900005800000300008001040605000007120'

  it('finds example 1 of sudokuwiki.org: a rectangle, hinge A1', () => {
    const s = fromWiki('S9B2b0304050i0l2c0h0f089f022b060c040e9f069f0e0d2c082g0n9h2d2b03090h0l0e0f040l050h0f2g0d2g092d090d0f2b2g05080n2d0e0b0g030a0f0i0d080c0h010b040i060g050d0f0i0h0e0701020c')
    const result = yWing(s)

    expect(result?.name).toBe('Y-Wing')
    expect(removed(result)).toContain('E7:2')
    expect(unsound(s, result!, solutionOf(tough))).toEqual([])

    // A1 is 1/7, A7 is 2/7, E1 is 1/2: the 2 goes from the fourth corner
    const wing = wingAt(result, 'A1 A7 E1')
    expect(marks(wing, 'eliminate')).toEqual(['E7:2'])
    expect(marks(wing, 'highlight')).toEqual(['A7:2', 'E1:2'])
    expect(marks(wing, 'alternate')).toEqual(['A1:1', 'A1:7', 'A7:7', 'E1:1'])
    expect(wing.units).toEqual([{ kind: 'row', index: 0 }, { kind: 'col', index: 0 }])
    expect(wing.links).toEqual([[0, 6], [0, 36]])
    expect(wing.solvedCells).toEqual([])
    expect(wing.label).toBe('Y-Wing on 2: hinge A1, pincers A7 & E1, eliminates 2 from E7')
    expect(wing.narrative).toBe(
      'A1 can only be 1 or 7. It shares row A with A7 (2 or 7) and column 1 with E1 (1 or 2), ' +
      'so if A1 is 7 then A7 is 2, and if A1 is 1 then E1 is 2. Either way one of A7 and E1 is 2, ' +
      'so 2 is removed from E7, which sees both of them.',
    )

    // the position already holds the wings of examples 2 and 3, and no other
    expect(removed(result)).toEqual(['B9:7', 'C2:7', 'E7:2'])
    expect(result!.instances).toHaveLength(3)
  })

  it('finds example 2: hinge A6, one pincer in its row and one in its box', () => {
    const s = fromWiki('S9B2b0304050i0l2c0h0f089f022b060c040e9f069f0e0d2c082g0n9f2d2b03090h0l0e0f040l050h0f2g0d2e092d090d0f2b2g05080n2d0e0b0g030a0f0i0d080c0h010b040i060g050d0f0i0h0e0701020c')
    const result = yWing(s)

    expect(removed(result)).toContain('C2:7')
    expect(unsound(s, result!, solutionOf(tough))).toEqual([])

    // of the cells that see both A1 and C5, only C2 still has a 7
    const wing = wingAt(result, 'A6 A1 C5')
    expect(marks(wing, 'eliminate')).toEqual(['C2:7'])
    expect(marks(wing, 'highlight')).toEqual(['A1:7', 'C5:7'])
    expect(wing.units).toEqual([{ kind: 'row', index: 0 }, { kind: 'box', index: 1 }])
  })

  it('finds example 3: hinge A6 again, removing along row B', () => {
    const s = fromWiki('S9B2b0304050i0l2c0h0f089f022b060c040e9f067n0e0d2c082g0n9f2d2b03090h0l0e0f040l050h0f2g0d2e092d090d0f2b2g05080n2d0e0b0g030a0f0i0d080c0h010b040i060g050d0f0i0h0e0701020c')
    const result = yWing(s)

    expect(removed(result)).toContain('B9:7')
    expect(unsound(s, result!, solutionOf(tough))).toEqual([])

    const wing = wingAt(result, 'A6 A7 B4')
    expect(marks(wing, 'eliminate')).toEqual(['B9:7'])
    expect(marks(wing, 'highlight')).toEqual(['A7:7', 'B4:7'])
    expect(wing.label).toBe('Y-Wing on 7: hinge A6, pincers A7 & B4, eliminates 7 from B9')
  })

  it('finds both wings of the "Double Y-Wing"', () => {
    const puzzle = '607945023395062000402037569743516298569283741821000635970650312136020050250301006'
    // the article's picture is the position once the naked pairs are done
    let s = fromWiki(puzzle)
    for (let pairs = nakedPairs(s); pairs; pairs = nakedPairs(s)) s = applyStratResult(s, pairs)
    expect([...s.candidates[cellAt('H6')]].sort()).toEqual([8, 9])
    expect([...s.candidates[cellAt('H7')]].sort()).toEqual([8, 9])

    const result = yWing(s)
    expect(unsound(s, result!, solutionOf(puzzle))).toEqual([])

    // the one the site's solver returns, through H6 …
    expect(marks(wingAt(result, 'J5 H6 J8'), 'eliminate')).toEqual(['H7:8'])
    // … and its mirror: "a hinge on J8 and a common candidate 9"
    expect(marks(wingAt(result, 'J8 H7 J5'), 'eliminate')).toEqual(['H6:9', 'J7:9'])
    expect(removed(result)).toEqual(expect.arrayContaining(['H6:9', 'H7:8']))
  })

  it('solves the exemplars that need nothing else', () => {
    // exemplars 1 to 6 of the page
    const exemplars = [
      '050000080000086000000201070009020601280000054703060900090605000000170000030000010',
      '009600000000025090400001078901040800000000000002070906370800002020510000000002400',
      '009765000600400007070000500090024000500000003000910070005000090100007004000156800',
      '100007600008010020306020000020000075000385000450000080000040203010030800009700004',
      '000000001004060208070320400900018000005000600000540009008037040609080300100000000',
      '306709405070030000000000070130080002000010000200070049020000000000050060403806207',
    ]
    for (const puzzle of exemplars) {
      const { solved, uses, problems } = solveWith(puzzle, yWing)
      expect(problems).toEqual([])
      expect(solved, puzzle).toBe(true)
      expect(uses, puzzle).toBeGreaterThan(0)
    }
  })

  it('removes from every cell that sees both pincers', () => {
    // one pincer in the hinge's box, one in its row: three cells at each end
    const s = open({ B2: [1, 2], A1: [1, 3], B7: [2, 3] })
    const result = yWing(s)
    expect(result!.instances).toHaveLength(1)
    expect(marks(wingAt(result, 'B2 A1 B7'), 'eliminate')).toEqual(['A7:3', 'A8:3', 'A9:3', 'B1:3', 'B3:3'])
    expect(result!.instances[0].units).toEqual([{ kind: 'box', index: 0 }, { kind: 'row', index: 1 }])
  })

  it('finds nothing when a pincer does not see the hinge', () => {
    expect(yWing(open({ A1: [1, 2], A5: [1, 3], E1: [2, 3] }))).not.toBeNull()
    // E6 sees neither A1 nor A5, so no cell of the three sees both others
    expect(yWing(open({ A1: [1, 2], A5: [1, 3], E6: [2, 3] }))).toBeNull()
    // no two of them see each other
    expect(yWing(open({ A1: [1, 2], B4: [1, 3], C7: [2, 3] }))).toBeNull()
  })

  it('finds nothing when the three cells are not a Y-Wing', () => {
    // all in one row, or one box: a naked triple
    expect(yWing(open({ A1: [1, 2], A5: [1, 3], A9: [2, 3] }))).toBeNull()
    expect(yWing(open({ A1: [1, 2], B2: [1, 3], C3: [2, 3] }))).toBeNull()
    // a hinge with a third candidate
    expect(yWing(open({ A1: [1, 2, 4], A5: [1, 3], E1: [2, 3] }))).toBeNull()
    // pincers with the same digit of the hinge
    expect(yWing(open({ A1: [1, 2], A5: [1, 3], E1: [1, 3] }))).toBeNull()
    // pincers with nothing in common
    expect(yWing(open({ A1: [1, 2], A5: [1, 3], E1: [2, 4] }))).toBeNull()
    // pincers whose common digit is the hinge's
    expect(yWing(open({ A1: [1, 2], A5: [1, 3], E1: [1, 4] }))).toBeNull()
  })

  it('finds nothing when no cell that sees both pincers has the digit', () => {
    expect(yWing(open({ A1: [1, 2], A5: [1, 3], E1: [2, 3], E5: [1, 2, 4] }))).toBeNull()
  })

  it('leaves the position as it was and answers the same again', () => {
    const s = fromWiki('S9B2b0304050i0l2c0h0f089f022b060c040e9f069f0e0d2c082g0n9h2d2b03090h0l0e0f040l050h0f2g0d2g092d090d0f2b2g05080n2d0e0b0g030a0f0i0d080c0h010b040i060g050d0f0i0h0e0701020c')
    const before = JSON.stringify([s.values, s.candidates.map(set => [...set])])
    const result = yWing(s)
    expect(JSON.stringify([s.values, s.candidates.map(set => [...set])])).toBe(before)
    expect(yWing(s)).toEqual(result)
  })

  it('is sound on every position of 200 solves', () => {
    const started = performance.now()
    const { fired, problems } = sweep(yWing, { puzzles: 200 })
    console.log(`y-wing fired ${fired} times over 200 puzzles in ${Math.round(performance.now() - started)} ms`)
    expect(problems).toEqual([])
    expect(fired).toBeGreaterThan(0)
  }, 120_000)
})

// ── XYZ-Wing ──────────────────────────────────────────────────────────────────

describe('XYZ-Wing', () => {
  it('finds example 1 of sudokuwiki.org: hinge F9', () => {
    const s = fromWiki('S9B46090b1m4a01070e1q050v3f022iaa1q7n081n4b3f9603ea027n1m46070e0n450409060l02460r7r06b64b0g050r060907114k4b030t1n170823093m1z0b3b07191n2319031v0h090i1103082t3o1v0437')
    const result = xyzWing(s)

    expect(result?.name).toBe('XYZ-Wing')
    expect(removed(result)).toEqual(['F7:1'])
    expect(unsound(s, result!, solutionOf('090001700500200008000030200070004960200060005069700030008090000700003009003800040'))).toEqual([])

    // F9 is 1/2/4, D9 is 1/2, F1 is 1/4: F7 sees all three
    const wing = wingAt(result, 'F9 D9 F1')
    expect(marks(wing, 'eliminate')).toEqual(['F7:1'])
    expect(marks(wing, 'highlight')).toEqual(['D9:1', 'F1:1', 'F9:1'])
    expect(marks(wing, 'alternate')).toEqual(['D9:2', 'F1:4', 'F9:2', 'F9:4'])
    expect(wing.units).toEqual([{ kind: 'box', index: 5 }, { kind: 'row', index: 5 }])
    expect(wing.links).toEqual([[53, 35], [53, 45]])
    expect(wing.solvedCells).toEqual([])
    expect(wing.label).toBe('XYZ-Wing on 1: hinge F9, pincers D9 & F1, eliminates 1 from F7')
    expect(wing.narrative).toBe(
      'F9 can only be 1, 2 or 4. It shares box 6 with D9 (1 or 2) and row F with F1 (1 or 4), ' +
      'so if F9 is 2 then D9 is 1, and if F9 is 4 then F1 is 1; otherwise F9 is 1 itself. ' +
      'Either way one of the three cells is 1, so 1 is removed from F7, which sees all three.',
    )
  })

  it('finds example 2: hinge E8, a row and a box', () => {
    const s = fromWiki('S9B069e9r2q340w11170h050n0v091s0h1p1n0708022i3m3u0196038i03043m020z0936081f0b9eaq0z081m0c3e8j0a088i031m078q02050g0547041j1i4z0902091j496r3d056r37040d1f456r0i1g773n03')
    const result = xyzWing(s)

    expect(removed(result)).toEqual(['E9:6'])
    expect(unsound(s, result!, solutionOf('600000000500900007820001030340209080000080000080307025050400092900005004000000003'))).toEqual([])

    const wing = wingAt(result, 'E8 D7 E6')
    expect(marks(wing, 'eliminate')).toEqual(['E9:6'])
    expect(marks(wing, 'highlight')).toEqual(['D7:6', 'E6:6', 'E8:6'])
    expect(wing.units).toEqual([{ kind: 'box', index: 5 }, { kind: 'row', index: 4 }])
  })

  it('solves the exemplars that need nothing else', () => {
    // exemplars 1, 2, 3, 6 and 8 of the page
    const exemplars = [
      '000900300005821000190600000016000290000070000043000670000008069000213800004009000',
      '000400600050030000309100200180605004000000000700901053001009408000060010002007000',
      '075000148002000000003070000000760209000108000109045000000010400000000600967000530',
      '080003740090020000006500200023000000700908004000000860009005400000070030012800000',
      '900000701034005200000006400000050080800904002010080000009000000006100570508000003',
    ]
    for (const puzzle of exemplars) {
      const { solved, uses, problems } = solveWith(puzzle, xyzWing)
      expect(problems).toEqual([])
      expect(solved, puzzle).toBe(true)
      expect(uses, puzzle).toBeGreaterThan(0)
    }
  })

  it('removes from both cells that see all three', () => {
    // "there can only be two of them": the rest of the hinge's row inside its box
    const s = open({ E5: [1, 2, 3], D4: [1, 3], E9: [2, 3] })
    const result = xyzWing(s)
    expect(result!.instances).toHaveLength(1)
    expect(marks(wingAt(result, 'E5 D4 E9'), 'eliminate')).toEqual(['E4:3', 'E6:3'])
    // a pincer in the hinge's box and in its row too still works through the box
    const tight = xyzWing(open({ B2: [1, 2, 3], B3: [1, 3], H2: [2, 3] }))
    expect(marks(wingAt(tight, 'B2 B3 H2'), 'eliminate')).toEqual(['A2:3', 'C2:3'])
    expect(tight!.instances[0].units).toEqual([{ kind: 'box', index: 0 }, { kind: 'col', index: 1 }])
  })

  it('finds nothing when a pincer does not see the hinge', () => {
    // F9 sees neither E5 nor D4
    expect(xyzWing(open({ E5: [1, 2, 3], D4: [1, 3], F9: [2, 3] }))).toBeNull()
  })

  it('finds nothing when no cell sees all three', () => {
    // one pincer along the row and one along the column, both outside the box
    expect(xyzWing(open({ E5: [1, 2, 3], E1: [1, 3], A5: [2, 3] }))).toBeNull()
    // the cells that do are without the digit
    expect(xyzWing(open({ E5: [1, 2, 3], D4: [1, 3], E9: [2, 3], E4: [1, 2], E6: [1, 2, 4] }))).toBeNull()
  })

  it('finds nothing when the three cells are not an XYZ-Wing', () => {
    // all in one row, or one box: a naked triple
    expect(xyzWing(open({ E5: [1, 2, 3], E1: [1, 3], E9: [2, 3] }))).toBeNull()
    expect(xyzWing(open({ E5: [1, 2, 3], D4: [1, 3], F6: [2, 3] }))).toBeNull()
    // a hinge without the digit the pincers share
    expect(xyzWing(open({ E5: [1, 2, 4], D4: [1, 3], E9: [2, 3] }))).toBeNull()
    // a hinge with a fourth candidate
    expect(xyzWing(open({ E5: [1, 2, 3, 4], D4: [1, 3], E9: [2, 3] }))).toBeNull()
    // pincers with the same two digits
    expect(xyzWing(open({ E5: [1, 2, 3], D4: [1, 3], E9: [1, 3] }))).toBeNull()
  })

  it('is not a Y-Wing, nor a Y-Wing an XYZ-Wing', () => {
    expect(yWing(open({ E5: [1, 2, 3], D4: [1, 3], E9: [2, 3] }))).toBeNull()
    expect(xyzWing(open({ A1: [1, 2], A5: [1, 3], E1: [2, 3] }))).toBeNull()
  })

  it('leaves the position as it was and answers the same again', () => {
    const s = fromWiki('S9B46090b1m4a01070e1q050v3f022iaa1q7n081n4b3f9603ea027n1m46070e0n450409060l02460r7r06b64b0g050r060907114k4b030t1n170823093m1z0b3b07191n2319031v0h090i1103082t3o1v0437')
    const before = JSON.stringify([s.values, s.candidates.map(set => [...set])])
    const result = xyzWing(s)
    expect(JSON.stringify([s.values, s.candidates.map(set => [...set])])).toBe(before)
    expect(xyzWing(s)).toEqual(result)
  })

  it('is sound on every position of 200 solves', () => {
    const started = performance.now()
    const { fired, problems } = sweep(xyzWing, { puzzles: 200 })
    console.log(`xyz-wing fired ${fired} times over 200 puzzles in ${Math.round(performance.now() - started)} ms`)
    expect(problems).toEqual([])
    expect(fired).toBeGreaterThan(0)
  }, 120_000)
})
