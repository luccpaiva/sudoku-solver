import { describe, expect, it } from 'vitest'
import { applyStratResult, isSolved, loadPuzzle } from '../board'
import { findNextStrategy } from '../solver'
import { fromWiki, placed, removed, solutionOf, sweep, unsound } from '../testing'
import type { CandidateAnnotation, Snapshot, StratInstance, StratResult } from '../types'
import { sees } from '../units'
import { cellLabel, ROW_LABELS } from '../utils'
import { xCycles } from './xCycles'

// The worked examples of sudokuwiki.org/X_Cycles and X_Cycles_Part_2: the
// position each "Load Example" link opens, and its puzzle from the start.
const PART_1_FIGURE_4 = {
  at: 'S9B4a0f030e0b4a010i0g054b0i06074f0b4a0u074b0b434e094e0e060a0304070i05060b0h0f0i0e0b46462i2i0a0b0g08040a0609030e090e36035663626z020u4a36430502663f094e0b010i5662056y0u',
  start: '003000100500670000700009006034705600000000000008406930900300002000052009001000500',
}
const PART_1_BERTHIER = {
  at: 'S9B014m82dad27y029u0fdw5g90cyd17p039v049k047o059l06cy9f5v1k071x8m93088204141k2008ae0486019k2w0u0917022v136a066e8s1g8s012007220814055107cec8801m0p0p585103565g183u2d09',
  start: '100000200000000304040506000070008040008040100090200060000107080507000000003000009',
}
const PART_2_FIGURE_1 = {
  at: 'S9B09070u0a0e0u06020h0a0b050u0h06077u7y0h0u0f02090g0n050v1q0u0g051i0b7n087n1i010b0i040h0e071i0e080i0g1i010b0u1q0u090u0f02050h0a0g0b0f01080g7q047q0e0g05080u0a7y7q0602',
  start: '970000620005006700000290050000500080010040070080001000090025000001800400058000062',
}
const PART_2_FIGURE_2 = {
  at: 'S9B0b0a0f0309040g0h0e0i080c2q0z3n1h0l0d050d071f020h1f03090r03022y0h2r0i062b0r0i0e2i062e450l5z0g060h0i0n0b04050n08050i1f071f030d020f0g0d0b12124309430c0b0a0804090e0g0f',
  start: '000394000080000000507020039032000060000060000060000450850070302000000090000849000',
}
const PART_2_FIGURE_3 = {
  at: 'S9B01054a44090g0s030f0f070u15120p090h0s0i0b46460604010g0e0304020i0g0h060e0a0h0i0a1u121k0g0d0o0e0f070p0d0p0o09080d0c0607020e0h0a0i0g0a091q0h1i0e020u0b080e0u010i0u0607',
  start: '150090030070000900000064100342000600000000000007000098006720000009000020080010067',
}

// The exemplars of part 2: puzzles that need an X-Cycle at some point
const EXEMPLARS = [
  '028309040000080002006000300700031200000000000002490001009000700100060000070104930',
  '250000000080060000000809004000000026003701500410000000700306000000050008000000073',
  '000005000040700200200000703000820005080000040600013000908000006003004070400607000',
  '007420800008009000000030460400000005070000040900050008050090000000700600003085900',
  '086007000000801600900000001807690050000000000030025804300000006009406000000200340',
  '963700400050400080000106500000000300800000002006000000004607000090002060007001853',
  '000020003020700860900804000040000108005030900308000040000901006096002080800070000',
  '008040000000000003009307020900020060050009080010080002090704300500000009000050800',
  '000048900010090003300100050050000090001080500030000020080009002200050060006410000',
  '060090504070800090500401000007600100000000000001005200000703005090006030203000010',
  '900080006030000080000052000003006009601000802200900700000560000082000010100070005',
]

// ── Helpers ───────────────────────────────────────────────────────────────────

/** The occurrence whose label holds this piece of loop notation. */
function loopOf(result: StratResult | null, notation: string): StratInstance {
  const found = (result?.instances ?? []).filter(instance => instance.label.includes(notation))
  expect(found).toHaveLength(1)
  return found[0]
}

/** The cells an occurrence marks one way, in board order. */
function marked(instance: StratInstance, kind: CandidateAnnotation['kind']): string[] {
  return instance.candidateAnnotations
    .filter(a => a.kind === kind)
    .map(a => a.cell)
    .sort((a, b) => a - b)
    .map(cellLabel)
}

const tie = ([a, b]: [number, number]) => [cellLabel(a), cellLabel(b)].sort().join('-')
const strongTies = (instance: StratInstance) => (instance.links ?? []).map(tie).sort()
const weakTies = (instance: StratInstance) => (instance.weakLinks ?? []).map(tie).sort()

/** The index of a cell from its label. */
function cellAt(label: string): number {
  return ROW_LABELS.indexOf(label[0]) * 9 + Number(label[1]) - 1
}

/**
 * A board with nothing solved where 1 is a candidate only in the cells
 * listed. Every other digit can go anywhere, so it has no strong links and
 * no loops: only the 1s can make one.
 */
function onesAt(...labels: string[]): Snapshot {
  const ones = new Set(labels.map(cellAt))
  return {
    values: Array(81).fill(null),
    candidates: Array.from({ length: 81 }, (_, cell) => new Set(ones.has(cell) ? [1, 2, 3, 4, 5, 6, 7, 8, 9] : [2, 3, 4, 5, 6, 7, 8, 9])),
  }
}

// A skyscraper: the only 1s of column 1 are B1 and H1, of column 5 C5 and
// H5, and H1 and H5 share row H. So B1 or C5 is 1, and C2, which sees both,
// is not. A3, C8 and H9 are there so that box 1, row C and row H keep three
// places each and make no strong links of their own.
const SKYSCRAPER = ['B1', 'H1', 'C5', 'H5', 'H9', 'A3', 'C8']

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('x-cycles', () => {
  it('rule 1: the loop on 8 of part 1, Figure 4, clears the units of its weak links', () => {
    const s = fromWiki(PART_1_FIGURE_4.at)
    const before = structuredClone(s)
    const result = xCycles(s)
    expect(s).toEqual(before)
    expect(result?.name).toBe('X-Cycles')
    expect(removed(result)).toEqual(expect.arrayContaining(['B6:8', 'C5:8', 'H7:8']))
    expect(unsound(s, result!, solutionOf(PART_1_FIGURE_4.start))).toEqual([])

    // -8[A1]+8[A6]-8[C4]+8[H4]-8[H2]+8[J1]-8[A1], as the solver writes it
    const loop = loopOf(result, 'A1=A6-C4=H4-H2=J1-A1')
    expect(loop.label).toContain('(rule 1)')
    expect(loop.patternCells.map(cellLabel)).toEqual(['A1', 'A6', 'C4', 'H2', 'H4', 'J1'])
    expect(marked(loop, 'highlight')).toEqual(['A1', 'C4', 'H2'])
    expect(marked(loop, 'alternate')).toEqual(['A6', 'H4', 'J1'])
    expect(marked(loop, 'eliminate')).toEqual(['B6', 'C5', 'H7'])
    expect(strongTies(loop)).toEqual(['A1-A6', 'C4-H4', 'H2-J1'])
    expect(weakTies(loop)).toEqual(['A1-J1', 'A6-C4', 'H2-H4'])
    expect(loop.solvedCells).toEqual([])
    expect(loop.narrative).toContain('B6 and C5 see both A6 and C4, and H7 sees both H4 and H2')
  })

  it("rule 1: Berthier's loop on 3 of part 1 makes all nine of the picture's removals", () => {
    const s = fromWiki(PART_1_BERTHIER.at)
    const result = xCycles(s)
    expect(unsound(s, result!, solutionOf(PART_1_BERTHIER.start))).toEqual([])

    // the eight cell loop, the article's fifth chain
    const loop = loopOf(result, 'A2=E2-E8=H8-G9=G5-C5=C1-A2')
    expect(marked(loop, 'eliminate')).toEqual(['A5', 'D5', 'E1', 'E4', 'E6', 'E9', 'F5', 'H5', 'H9'])
    expect(weakTies(loop)).toEqual(['A2-C1', 'C5-G5', 'E2-E8', 'G9-H8'])
    expect(removed(result)).toEqual(['A5:3', 'D5:3', 'E1:3', 'E4:3', 'E6:3', 'E9:3', 'F5:3', 'H5:3', 'H9:3'])
  })

  it('rule 2: two strong links meet at B4 in part 2, Figure 1, so B4 is 3', () => {
    const s = fromWiki(PART_2_FIGURE_1.at)
    const result = xCycles(s)
    expect(placed(result)).toEqual(expect.arrayContaining(['B4:3']))
    expect(unsound(s, result!, solutionOf(PART_2_FIGURE_1.start))).toEqual([])

    // -3[B4]+3[B9]-3[C7]+3[J7]-3[J4]+3[B4]
    const loop = loopOf(result, 'B4=B9-C7=J7-J4=B4')
    expect(result!.instances[0]).toBe(loop)
    expect(loop.label).toContain('(rule 2)')
    expect(loop.solvedCells.map(({ cell, digit }) => `${cellLabel(cell)}:${digit}`)).toEqual(['B4:3'])
    expect(marked(loop, 'highlight')).toEqual(['B4'])
    expect(marked(loop, 'alternate')).toEqual(['B9', 'C7', 'J4', 'J7'])
    expect(marked(loop, 'eliminate')).toEqual([])
    expect(strongTies(loop)).toEqual(['B4-B9', 'B4-J4', 'C7-J7'])
    expect(weakTies(loop)).toEqual(['B9-C7', 'J4-J7'])
    expect(loop.narrative).toContain('Two solid links meet at B4')
  })

  it('rule 2 for rule 3: on the loop of part 2, Figure 2, F5 takes the 1, which clears B5', () => {
    // The article reads the loop +1[B5]-1[B8]+1[E8]-1[F9]+1[F5]-1[B5] as two
    // weak links meeting at B5. B5 and F5 are the only 1s of column 5, so
    // that link is strong too, and the same loop has two strong links
    // meeting at F5: F5 is 1, which takes the 1 out of B5 as well.
    const s = fromWiki(PART_2_FIGURE_2.at)
    const result = xCycles(s)
    expect(unsound(s, result!, solutionOf(PART_2_FIGURE_2.start))).toEqual([])
    expect(result!.instances).toHaveLength(1)
    const loop = loopOf(result, 'F5=F9-E8=B8-B5=F5')
    expect(placed(result)).toEqual(['F5:1'])
    expect(loop.patternCells.map(cellLabel)).toEqual(['B5', 'B8', 'E8', 'F5', 'F9'])

    const after = applyStratResult(s, result!)
    expect(after.candidates[cellAt('B5')].has(1)).toBe(false)
  })

  it('rule 3: in part 2, Figure 3, the weak links meet at B4 and at C4 alike', () => {
    const s = fromWiki(PART_2_FIGURE_3.at)
    const result = xCycles(s)
    expect(removed(result)).toEqual(expect.arrayContaining(['B4:3', 'C4:3']))
    expect(unsound(s, result!, solutionOf(PART_2_FIGURE_3.start))).toEqual([])

    // the grouped elimination the article points out: one loop, two cells
    const loop = loopOf(result, 'B4|C4-B5=E5-E9=H9-J7=J4-B4|C4')
    expect(result!.instances[0]).toBe(loop)
    expect(loop.label).toContain('(rule 3)')
    expect(marked(loop, 'eliminate')).toEqual(['B4', 'C4'])
    expect(marked(loop, 'alternate')).toEqual(['B5', 'E5', 'E9', 'H9', 'J4', 'J7'])
    expect(strongTies(loop)).toEqual(['B5-E5', 'E9-H9', 'J4-J7'])
    expect(weakTies(loop)).toEqual(['B4-B5', 'B4-J4', 'B5-C4', 'C4-J4', 'E5-E9', 'H9-J7'])
    expect(loop.narrative).toContain('C4 sees both B5 and J4 as well')
  })

  it('stays sound through the eleven exemplars of part 2 and is a step in five of them', () => {
    let used = 0
    for (const puzzle of EXEMPLARS) {
      const solution = solutionOf(puzzle)
      let s = loadPuzzle(puzzle).snapshot
      let steps = 0
      for (let step = 0; step < 729 && !isSolved(s); step++) {
        const result = findNextStrategy(s) ?? xCycles(s)
        if (!result) break
        expect(unsound(s, result, solution), puzzle).toEqual([])
        if (result.name === 'X-Cycles') steps++
        s = applyStratResult(s, result)
      }
      expect(isSolved(s), puzzle).toBe(true)
      if (steps > 0) used++
    }
    // the others fall to W-Wing and Simple Colouring, which come earlier here
    expect(used).toBeGreaterThanOrEqual(5)
  }, 60_000)

  it('removes 1 from the cell that sees both ends of a skyscraper', () => {
    const result = xCycles(onesAt(...SKYSCRAPER, 'C2'))
    expect(removed(result)).toEqual(['C2:1'])
    expect(placed(result)).toEqual([])
    const loop = result!.instances[0]
    expect(loop.label).toBe('X-Cycle on 1 (rule 3): C2-B1=H1-H5=C5-C2, eliminates 1 from C2')
    expect(weakTies(loop)).toEqual(['B1-C2', 'C2-C5', 'H1-H5'])
  })

  it('leaves a cell that sees only one end of the chain alone', () => {
    // A2 shares box 1 with B1 but nothing with C5
    expect(xCycles(onesAt(...SKYSCRAPER, 'A2'))).toBeNull()
  })

  it('makes no loop when a link has a third place', () => {
    // E5 is a third 1 in column 5: C5 and H5 are no longer a strong link
    expect(xCycles(onesAt(...SKYSCRAPER, 'C2', 'E5'))).toBeNull()
  })

  it('never removes a solution digit over 200 generated puzzles, and is quick', () => {
    let calls = 0
    let spent = 0
    let worst = 0
    const rules = { 1: 0, 2: 0, 3: 0 }
    const watched = (s: Snapshot) => {
      const started = performance.now()
      const result = xCycles(s)
      const took = performance.now() - started
      calls++
      spent += took
      worst = Math.max(worst, took)
      for (const instance of result?.instances ?? []) {
        rules[Number(instance.label.match(/\(rule (\d)\)/)![1]) as 1 | 2 | 3]++
        // every link joins two cells in sight of each other
        for (const [a, b] of [...(instance.links ?? []), ...(instance.weakLinks ?? [])]) expect(sees(a, b)).toBe(true)
      }
      if (result) {
        expect(result.instances.length).toBeLessThanOrEqual(12)
        expect(new Set(result.instances.map(i => i.label)).size).toBe(result.instances.length)
      }
      return result
    }
    const { fired, problems } = sweep(watched, { puzzles: 200 })
    console.log(
      `x-cycles fired ${fired} times over 200 puzzles (rule 1: ${rules[1]}, rule 2: ${rules[2]}, rule 3: ${rules[3]} loops), ` +
        `${((spent / calls) * 1000).toFixed(0)} µs a call, worst ${worst.toFixed(2)} ms`,
    )
    expect(problems).toEqual([])
    expect(fired).toBeGreaterThan(0)
    expect(rules[1]).toBeGreaterThan(0)
    expect(rules[2]).toBeGreaterThan(0)
    expect(rules[3]).toBeGreaterThan(0)
  }, 120_000)

  it('answers the same every time', () => {
    const s = fromWiki(PART_2_FIGURE_1.at)
    expect(xCycles(s)).toEqual(xCycles(s))
  })
})
