import { describe, expect, it } from 'vitest'
import type { CandidateAnnotation, Snapshot, StratInstance, StratResult } from '../types'
import { applyStratResult } from '../board'
import { fromWiki, removed, solutionOf, sweep, unsound } from '../testing'
import { cellLabel, ROW_LABELS } from '../utils'
import { rectangleElimination } from './rectangleElimination'

// The worked examples of https://www.sudokuwiki.org/Rectangle_Elimination,
// as the positions its "Load Example" links open.
const KEN_REEK = 'S9B027y070n828y8r081m05010804028i8m071i7y067q0n0807057v027y027q060108077y05088e060716027y7q01071601828a03020608017q0508067u0u02070607040203010805097q080282078a1r0n1q'
const KEN_REEK_EARLIER = 'S9B027y070n828y8r081m05010804028i8m071i7y067q0n0807057v027y027q060108077y05088e06078a027y7q01078a01828a03020608017q0508067u0u02070607040203010805097q080282078a1r0n1q'
const MULTIPLE = 'S9B020u1a074u094r430601093y4y5q5e6i5u022q083u1f2302a2039m0f0745054503b904b60d0l0i516t4z0c5x0e0c0545095x045x065u2q0631034l4j640962080t2j1h0i1f3e0503090o14045g07504401'
const MULTIPLE_START = '200709006190000002080002030070503040000000000050904060060300090800000053900407001'
const DOUBLE = 'S9B0t080e2eaa7q8l1p7p070l0t0ec2b68l1p030i0f0c0201040g0h050l0e09080c06040l0g08040l090e070l03060f0c07040b01050i0h030g43060402b70e7n057p512fcyba551h040t7p590nb60e55070l'
const DOUBLE_START = '080000000700000003000214005009806400840907036007401500300642000500000004000000070'
const TWO_STRONG = 'S9B011m821g2e0u2c82080g1u0h1h091f100c040b037u052i080f019e0h02160i160703060a8i160a1i0226deb69u8i0703080a1u82040b0c010f044i02bm078205b62c2b067n0d440c04b62c2e4m860a4k06'
const TWO_STRONG_START = '100000008000090004030508010020007360000020000073800040010402070500060000400000006'
const EXTENDED = 'S9B0b0n0g0d08090f0e0n0i0h0n0e0f0n04070b060e0d0l0o0g0i0h0n2b020h030i0f0e0r2i0n040f0h0g0e0n0b092e0i0e0l0s0r2e0608080n090f050b2b0v2i0d0f0n070n0h020i0e050g0b0i0v0u0h0n0f'
const EXTENDED_START = '000089000000000470600000000020300000040000009000000068809050000000700200500000000'

const cellOf = (label: string) => ROW_LABELS.indexOf(label[0]) * 9 + Number(label[1]) - 1

/** The one occurrence on these cells (hinge, strong wing, other wing) for a digit. */
function occurrence(result: StratResult | null, digit: number, cells: string): StratInstance {
  const found = (result?.instances ?? []).filter(
    instance =>
      instance.patternCells.map(cellLabel).join(' ') === cells &&
      instance.candidateAnnotations.every(mark => mark.digit === digit),
  )
  expect(found).toHaveLength(1)
  return found[0]
}

/** An occurrence's marks of one kind, as sorted `cell:digit` labels. */
function marks(instance: StratInstance, kind: CandidateAnnotation['kind']): string[] {
  return instance.candidateAnnotations
    .filter(mark => mark.kind === kind)
    .map(mark => `${cellLabel(mark.cell)}:${mark.digit}`)
    .sort()
}

/** The same position with one more candidate pencilled in. */
function withCandidate(snapshot: Snapshot, label: string, digit: number): Snapshot {
  const cell = cellOf(label)
  return {
    values: snapshot.values,
    candidates: snapshot.candidates.map((set, i) => (i === cell ? new Set([...set, digit]) : set)),
  }
}

describe('rectangleElimination', () => {
  describe('the examples of sudokuwiki.org', () => {
    it('example 1: hinge G2, a strong link along the row', () => {
      const s = fromWiki(KEN_REEK)
      const result = rectangleElimination(s)
      expect(result?.name).toBe('Rectangle Elimination')
      expect(removed(result)).toEqual(['A2:9'])

      // 9 in row G is G2 or G6; A2 with G6 would take A5, A6 and B6 out of box 2
      const pictured = occurrence(result, 9, 'G2 G6 A2')
      expect(marks(pictured, 'highlight')).toEqual(['G2:9', 'G6:9'])
      expect(marks(pictured, 'alternate')).toEqual(['A5:9', 'A6:9', 'B6:9'])
      expect(marks(pictured, 'eliminate')).toEqual(['A2:9'])
      expect(pictured.units).toEqual([{ kind: 'row', index: 6 }, { kind: 'box', index: 1 }])
      expect(pictured.links).toEqual([[cellOf('G2'), cellOf('G6')], [cellOf('G2'), cellOf('A2')]])
      expect(pictured.solvedCells).toEqual([])
      expect(pictured.label).toBe('Rectangle on 9: hinge G2, wings G6 and A2, box 2, eliminates 9 from A2')

      // the page has no "From the Start" for this puzzle: every filled cell of
      // the position is a clue
      expect(unsound(s, result!, solutionOf(s))).toEqual([])
    })

    it('example 2: hinge F4, a strong link along the column', () => {
      const s = fromWiki(KEN_REEK_EARLIER)
      const result = rectangleElimination(s)
      // example 1 is in this earlier position too, found second as on the site
      expect(removed(result)).toEqual(['A2:9', 'F2:9'])
      expect(result!.instances.map(instance => instance.patternCells.map(cellLabel).join(' '))).toEqual([
        'F4 J4 F2',
        'G2 G6 A2',
      ])

      // 9 in column 4 is F4 or J4; F2 with J4 would take G2 and J1 out of box 7
      const pictured = occurrence(result, 9, 'F4 J4 F2')
      expect(marks(pictured, 'highlight')).toEqual(['F4:9', 'J4:9'])
      expect(marks(pictured, 'alternate')).toEqual(['G2:9', 'J1:9'])
      expect(marks(pictured, 'eliminate')).toEqual(['F2:9'])
      expect(pictured.units).toEqual([{ kind: 'col', index: 3 }, { kind: 'box', index: 6 }])
      expect(pictured.links).toEqual([[cellOf('F4'), cellOf('J4')], [cellOf('F4'), cellOf('F2')]])

      expect(unsound(s, result!, solutionOf(s))).toEqual([])
    })

    it('multiple eliminations: two wings off one hinge and its strong link', () => {
      const s = fromWiki(MULTIPLE)
      const result = rectangleElimination(s)
      expect(removed(result)).toEqual(expect.arrayContaining(['J3:2', 'J5:2']))

      // 2 in column 8 is J8 or E8; each wing in row J has its own box to empty
      const left = occurrence(result, 2, 'J8 E8 J3')
      expect(marks(left, 'highlight')).toEqual(['E8:2', 'J8:2'])
      expect(marks(left, 'alternate')).toEqual(['D3:2', 'E2:2', 'F3:2'])
      expect(marks(left, 'eliminate')).toEqual(['J3:2'])
      expect(left.units).toEqual([{ kind: 'col', index: 7 }, { kind: 'box', index: 3 }])

      const middle = occurrence(result, 2, 'J8 E8 J5')
      expect(marks(middle, 'highlight')).toEqual(['E8:2', 'J8:2'])
      expect(marks(middle, 'alternate')).toEqual(['D5:2', 'E4:2', 'E5:2', 'F5:2'])
      expect(marks(middle, 'eliminate')).toEqual(['J5:2'])
      expect(middle.units).toEqual([{ kind: 'col', index: 7 }, { kind: 'box', index: 4 }])

      expect(unsound(s, result!, solutionOf(MULTIPLE_START))).toEqual([])
    })

    it('double: the same three cells work for two digits', () => {
      const s = fromWiki(DOUBLE)
      const result = rectangleElimination(s)
      expect(removed(result)).toEqual(['B8:1', 'B8:2'])

      for (const digit of [1, 2]) {
        const pictured = occurrence(result, digit, 'D8 D1 B8')
        expect(marks(pictured, 'highlight')).toEqual([`D1:${digit}`, `D8:${digit}`])
        expect(marks(pictured, 'alternate')).toEqual([`A1:${digit}`, `B2:${digit}`, `B3:${digit}`])
        expect(marks(pictured, 'eliminate')).toEqual([`B8:${digit}`])
        expect(pictured.units).toEqual([{ kind: 'row', index: 3 }, { kind: 'box', index: 0 }])
      }

      expect(unsound(s, result!, solutionOf(DOUBLE_START))).toEqual([])
    })

    it('two strong links: the digit goes from both wings', () => {
      const s = fromWiki(TWO_STRONG)
      const result = rectangleElimination(s)
      expect(removed(result)).toEqual(['B7:5', 'E2:5'])
      // one occurrence, not one for each way round
      expect(result!.instances).toHaveLength(1)

      // 5 is B2 or B7 in row B and B2 or E2 in column 2; B7 with E2 would take
      // E7, E9 and F7 out of box 6
      const pictured = occurrence(result, 5, 'B2 B7 E2')
      expect(marks(pictured, 'highlight')).toEqual(['B2:5'])
      expect(marks(pictured, 'alternate')).toEqual(['E7:5', 'E9:5', 'F7:5'])
      expect(marks(pictured, 'eliminate')).toEqual(['B7:5', 'E2:5'])
      expect(pictured.units).toEqual([
        { kind: 'row', index: 1 },
        { kind: 'col', index: 1 },
        { kind: 'box', index: 5 },
      ])
      expect(pictured.links).toEqual([[cellOf('B2'), cellOf('B7')], [cellOf('B2'), cellOf('E2')]])

      expect(unsound(s, result!, solutionOf(TWO_STRONG_START))).toEqual([])
    })

    it('extended: the chain variant is not this rule', () => {
      // The page takes 3 off J6 by a chain round the board (J6, H5=H3, B3=A2,
      // A9=C9) in place of the hinge, and says its own solver does not do it.
      // Nor does this: what it finds here is a plain rectangle on H3.
      const s = fromWiki(EXTENDED)
      const result = rectangleElimination(s)
      expect(removed(result)).toEqual(['B3:3', 'H5:3'])
      expect(marks(occurrence(result, 3, 'H3 H5 B3'), 'alternate')).toEqual(['B6:3', 'C5:3'])
      expect(unsound(s, result!, solutionOf(EXTENDED_START))).toEqual([])
    })
  })

  it('stays sound over generated puzzles', () => {
    const { fired, problems } = sweep(rectangleElimination, { puzzles: 200 })
    expect(problems).toEqual([])
    expect(fired).toBeGreaterThan(0)
  }, 120_000)

  describe('does not fire', () => {
    it('when the hinge has a third place for the digit along its line', () => {
      // a 9 in A4 leaves column 4 with F4, J4 and A4: no either/or for hinge F4
      const s = withCandidate(fromWiki(KEN_REEK_EARLIER), 'A4', 9)
      expect(removed(rectangleElimination(s))).toEqual(['A2:9'])
    })

    it('when a place in the fourth box is out of sight of both wings', () => {
      // a 9 in C4 survives in box 2 whatever A2 and G6 are
      const s = withCandidate(fromWiki(KEN_REEK), 'C4', 9)
      expect(rectangleElimination(s)).toBeNull()
    })

    it('on a wing in the hinge box, or one that leaves the fourth box standing', () => {
      // off hinge J8 and its strong link to E8: J7 shares the hinge's box, and
      // J2 with E8 would leave D3 and F3 for the 2 of box 4
      const taken = removed(rectangleElimination(fromWiki(MULTIPLE)))
      expect(taken).not.toContain('J7:2')
      expect(taken).not.toContain('J2:2')
    })

    it('once its eliminations are made', () => {
      const s = fromWiki(KEN_REEK)
      expect(rectangleElimination(applyStratResult(s, rectangleElimination(s)!))).toBeNull()
    })
  })
})
