import { describe, expect, it } from 'vitest'
import type { CandidateAnnotation, Snapshot, StratInstance, StratResult } from '../types'
import { applyStratResult, isSolved, loadPuzzle } from '../board'
import { findNextStrategy } from '../solver'
import { fromWiki, removed, solutionOf, sweep, unsound } from '../testing'
import { cellLabel } from '../utils'
import { skLoops } from './skLoops'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** 'A8' → 7 */
const at = (label: string) => 'ABCDEFGHJ'.indexOf(label[0]) * 9 + Number(label[1]) - 1

/** The one occurrence on four corners, named like 'B2/B8/H2/H8'. */
function occurrence(result: StratResult | null, corners: string): StratInstance {
  const found = (result?.instances ?? []).filter(i => i.label.includes(` on ${corners},`))
  expect(found, `no loop on ${corners} in ${result?.instances.map(i => i.label).join(' | ')}`).toHaveLength(1)
  return found[0]
}

/** The marks of one kind in an occurrence, as sorted `cell:digit` labels. */
function marks(instance: StratInstance, kind: CandidateAnnotation['kind']): string[] {
  return instance.candidateAnnotations
    .filter(a => a.kind === kind)
    .map(a => `${cellLabel(a.cell)}:${a.digit}`)
    .sort()
}

/** A copy of a position with some cells rewritten: a digit solves the cell, a list is its candidates. */
function withCells(s: Snapshot, changes: Record<string, number | number[]>): Snapshot {
  const values = [...s.values]
  const candidates = [...s.candidates]
  for (const [label, to] of Object.entries(changes)) {
    values[at(label)] = typeof to === 'number' ? to : null
    candidates[at(label)] = new Set(typeof to === 'number' ? [] : to)
  }
  return { values, candidates }
}

// ── The examples of sudokuwiki.org/SK_Loops ───────────────────────────────────
//
// The article gives them From the Start only. Each position here is where this
// app's solver stalls on that puzzle (with the strategies it had when the test
// was written: none apply to the Easter Monster, Swordfish and Hidden Pairs to
// the second, three Hidden Singles and Pointing Pairs to the third), packed as
// the site packs a position into a link.

type Example = {
  name: string
  start: string
  bd: string
  corners: string
  /** The article's notation: the digits each unit counts, round the loop from the top left box. */
  type: string
  /** The sets in the words, box 1 first. */
  sets: string
  /** What the article says goes, at least. */
  removes: string[]
  /** Everything this finds, all checked against the solution. */
  all: string[]
}

const EXAMPLES: Example[] = [
  {
    name: 'the Easter Monster: double links all round',
    start: '100000002090400050006000700050903000000070000000850040700000600030009080002000001',
    bd: 'S9B01626m3qc676bi8m0248095y04556t4705524w4c0615bd4l077rbi580563091p0345396qcg59bj1h071pbt8pcm8o399j08051h7t04ae074bbv154h4t067s8e2203173p1p0918082ycq56023q5a7e8e9i01',
    corners: 'B2/B8/H2/H8',
    type: '2-2-2-2-2-2-2-2',
    sets: '2 and 7 in box 1, 3 and 8 in row B, 1 and 6 in box 3, 3 and 9 in column 8, 2 and 7 in box 9, 4 and 5 in row H, 1 and 6 in box 7, 4 and 8 in column 2',
    // "we can remove 3 and 8 from B5 and B6" (B6 has no 3)
    removes: ['B5:3', 'B5:8', 'B6:8'],
    all: ['A3:7', 'B5:3', 'B5:8', 'B6:8', 'C1:2', 'E2:4', 'E2:8', 'E8:3', 'E8:9', 'G3:1', 'H4:5', 'H5:4', 'J1:6'],
  },
  {
    name: 'triple and single links in turn',
    start: '100020003040000050006000700000506000800090001000300000007000600050000090200030008',
    bd: 'S9B01cybme202dmbe56039i04bccz6rd3b9058k86bc06bf4rbj074d7w9q9l81056306bk689o083c1c2k092k1c3k011u9h7x036365bg641u7ybb07bh4rbh060x181q054f656z650x092k028j7vaj03a3172j08',
    corners: 'A1/A9/J1/J9',
    type: '3-1-3-1-3-1-3-1',
    sets: '5, 7 and 9 in box 1, 8 in row A, 4, 6 and 9 in box 3, 2 in column 9, 4, 5 and 7 in box 9, 1 in row J, 4, 6 and 9 in box 7, 3 in column 1',
    removes: [],
    all: ['A4:8', 'A6:8', 'B3:9', 'B7:9', 'C2:9', 'C8:4', 'D1:3', 'D9:2', 'G2:9', 'G8:4', 'H3:4', 'H7:4', 'J4:1', 'J6:1'],
  },
  {
    name: 'two solved cells in the pairs: 14 digits for 14 cells',
    start: '200000004080500070001020300000700090000060000070008000003000100090007050400001002',
    bd: 'S9B021y8yc70g8m5e4z048m088q057z8u0b078j0g2201ca028q034yci5i295o071b1c5m095jbq1dbw81068g0g4h4n920798818f08221t1z5e1w038sbu9801560g0a09501s4e07560552041u0g1i4m010i5202',
    corners: 'B2/B8/H2/H8',
    type: '2-2-1-2-2-2-1-2',
    sets: '3 and 4 in box 1, 6 and 9 in row B, 1 in box 3, 6 and 8 in column 8, 3 and 4 in box 9, 6 and 8 in row H, 2 in box 7, 5 and 6 in column 2',
    removes: [],
    // 6 can be counted in the lines or in the boxes: it goes from the rest of all eight
    all: ['A3:6', 'A7:6', 'B5:9', 'B6:6', 'B6:9', 'C9:6', 'D2:5', 'D2:6', 'E2:5', 'E8:8', 'F8:6', 'G1:6', 'H4:6', 'H5:8'],
  },
]

describe('SK Loops', () => {
  describe('the examples of sudokuwiki.org/SK_Loops', () => {
    for (const example of EXAMPLES) {
      it(example.name, () => {
        const s = fromWiki(example.bd)
        const result = skLoops(s)
        expect(result?.name).toBe('SK Loops')

        const instance = occurrence(result, example.corners)
        expect(instance.label.startsWith(`SK Loop ${example.type} on ${example.corners}`)).toBe(true)
        expect(instance.narrative).toContain(example.sets)
        expect(marks(instance, 'eliminate')).toEqual(expect.arrayContaining(example.removes))
        expect(marks(instance, 'eliminate')).toEqual(example.all)
        expect(unsound(s, result!, solutionOf(example.start))).toEqual([])
      })
    }

    it('starts the Easter Monster from its clues, untouched', () => {
      const start = loadPuzzle(EXAMPLES[0].start).snapshot
      const packed = fromWiki(EXAMPLES[0].bd)
      expect(packed.values).toEqual(start.values)
      expect(packed.candidates).toEqual(start.candidates)
    })

    it('draws the loop: corners and pairs as pattern cells, the four lines washed, both sides marked', () => {
      const instance = occurrence(skLoops(fromWiki(EXAMPLES[0].bd)), 'B2/B8/H2/H8')
      expect(instance.patternCells.map(cellLabel).join(' ')).toBe(
        'A2 A8 B1 B2 B3 B7 B8 B9 C2 C8 G2 G8 H1 H2 H3 H7 H8 H9 J2 J8',
      )
      expect(instance.units).toEqual([
        { kind: 'row', index: 1 },
        { kind: 'row', index: 7 },
        { kind: 'col', index: 1 },
        { kind: 'col', index: 7 },
      ])
      // B1 and B3 sit between box 1 (2, 7) and row B (3, 8): one side a disc, the other a ring
      const discs = marks(instance, 'highlight').filter(mark => mark.startsWith('B1') || mark.startsWith('B3'))
      const rings = marks(instance, 'alternate').filter(mark => mark.startsWith('B1') || mark.startsWith('B3'))
      expect(discs.every(mark => ['3', '8'].includes(mark.slice(-1)))).toBe(true)
      expect(rings.every(mark => ['2', '7'].includes(mark.slice(-1)))).toBe(true)
      expect(discs.length).toBeGreaterThan(0)
      expect(rings.length).toBeGreaterThan(0)
    })

    it('says which digit could be counted either way (third example)', () => {
      const instance = occurrence(skLoops(fromWiki(EXAMPLES[2].bd)), 'B2/B8/H2/H8')
      expect(instance.narrative).toContain('(B7 and H1 are solved already)')
      expect(instance.narrative).toContain('6 could as well be counted in boxes 1, 3, 7 and 9')
    })
  })

  describe('near misses', () => {
    it('does not fire on a loop with one digit too many', () => {
      // a 5 in B1 (row B has its 5 already, but the count does not know that)
      // lets 5 fill two pairs: 17 digits for 16 cells proves nothing
      const s = withCells(fromWiki(EXAMPLES[0].bd), { B1: [2, 3, 5, 8] })
      expect(skLoops(s)).toBeNull()
    })

    it('does not fire without four solved corners', () => {
      const s = withCells(fromWiki(EXAMPLES[0].bd), { B2: [9] })
      expect(skLoops(s)).toBeNull()
    })
  })

  describe('in play', () => {
    it('is sound on every position of 200 solves, and quick', () => {
      let calls = 0
      let spent = 0
      let worst = 0
      const timed = (snapshot: Snapshot) => {
        const started = performance.now()
        const result = skLoops(snapshot)
        const took = performance.now() - started
        calls++
        spent += took
        worst = Math.max(worst, took)
        return result
      }
      const { fired, problems } = sweep(timed, { puzzles: 200 })
      expect(problems).toEqual([])
      // generated puzzles almost never hold the pattern: the article puzzles below do
      console.log(
        `sk loops fired at ${fired} positions of 200 solves, ` +
          `${Math.round((spent / calls) * 1000)} µs a call, worst ${worst.toFixed(1)} ms`,
      )
    }, 300_000)

    it('stays sound through the article puzzles, and is a step of each', () => {
      for (const { start } of EXAMPLES) {
        const solution = solutionOf(start)
        let s = loadPuzzle(start).snapshot
        let steps = 0
        for (let step = 0; step < 729 && !isSolved(s); step++) {
          const result = findNextStrategy(s) ?? skLoops(s)
          if (!result) break
          expect(unsound(s, result, solution), start).toEqual([])
          if (result.name === 'SK Loops') steps++
          s = applyStratResult(s, result)
        }
        expect(steps, start).toBeGreaterThan(0)
      }
    }, 60_000)

    it('finds the loop wherever the board is turned', () => {
      // the same position with rows and columns swapped: the loop is the same, mirrored
      const swap = (cell: number) => (cell % 9) * 9 + ((cell / 9) | 0)
      const s = fromWiki(EXAMPLES[0].bd)
      const turned: Snapshot = {
        values: s.values.map((_, i) => s.values[swap(i)]),
        candidates: s.candidates.map((_, i) => s.candidates[swap(i)]),
      }
      const flip = (mark: string) => cellLabel(swap(at(mark))) + mark.slice(2)
      expect(removed(skLoops(turned))).toEqual(EXAMPLES[0].all.map(flip).sort())
    })
  })
})
