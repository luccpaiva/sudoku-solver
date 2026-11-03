import { describe, expect, it } from 'vitest'
import type { CandidateAnnotation, Snapshot, StratInstance, StratResult } from '../types'
import { applyStratResult, isSolved, loadPuzzle } from '../board'
import { findNextStrategy } from '../solver'
import { fromWiki, removed, solutionOf, sweep, unsound } from '../testing'
import { PEERS } from '../units'
import { cellLabel } from '../utils'
import { tridagons } from './tridagons'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** 'A8' → 7 */
const at = (label: string) => 'ABCDEFGHJ'.indexOf(label[0]) * 9 + Number(label[1]) - 1

/** The one occurrence whose label starts with the given words. */
function occurrence(result: StratResult | null, label: string): StratInstance {
  const found = (result?.instances ?? []).filter(i => i.label.startsWith(label))
  expect(found, `no occurrence "${label}" in ${result?.instances.map(i => i.label).join(' | ')}`).toHaveLength(1)
  return found[0]
}

/** The marks of one kind in an occurrence, as sorted `cell:digit` labels. */
function marks(instance: StratInstance, kind: CandidateAnnotation['kind']): string[] {
  return instance.candidateAnnotations
    .filter(a => a.kind === kind)
    .map(a => `${cellLabel(a.cell)}:${a.digit}`)
    .sort()
}

/**
 * Every solution of a position that keeps to its candidates, up to a few.
 * The article's first example is not a minimal puzzle: its position has two.
 */
function solutionsWithin(s: Snapshot, most = 4): number[][] {
  const grid = s.values.map(v => v ?? 0)
  const found: number[][] = []
  const search = (): void => {
    let cell = -1
    let options: number[] = []
    for (let i = 0; i < 81; i++) {
      if (grid[i] !== 0) continue
      const open = [...s.candidates[i]].filter(d => PEERS[i].every(peer => grid[peer] !== d))
      if (cell === -1 || open.length < options.length) {
        cell = i
        options = open
      }
      if (open.length <= 1) break
    }
    if (cell === -1) {
      found.push([...grid])
      return
    }
    for (const d of options) {
      grid[cell] = d
      search()
      grid[cell] = 0
      if (found.length >= most) return
    }
  }
  search()
  return found
}

/**
 * A made up position: the given cells hold the given candidates and every
 * other cell is solved (with a 9, which no pattern here uses), so nothing
 * but the pattern can be found in it.
 */
function only(cells: Record<string, number[]>): Snapshot {
  const values: Array<number | null> = Array(81).fill(9)
  const candidates: Array<Set<number>> = Array.from({ length: 81 }, () => new Set<number>())
  for (const [label, digits] of Object.entries(cells)) {
    values[at(label)] = null
    candidates[at(label)] = new Set(digits)
  }
  return { values, candidates }
}

// ── The worked examples of sudokuwiki.org/Tridagons ──────────────────────────

type Example = {
  name: string
  bd: string
  /** The article's From the Start puzzle, when it is this position's puzzle. */
  start?: string
  label: string
  /** The twelve cells, plus those the guardians lock with. */
  pattern: string
  /** What the article removes. */
  removes: string[]
  /** Whether this finds exactly that, or more. */
  exact: boolean
}

const EXAMPLES: Example[] = [
  {
    name: 'Type 1, example 1: a lone 5 guards F6',
    bd: 'S9B0102cycy03040eb60f05cy0302b6069nbfd7cy06040105cy9g0cb8cy0102cy040c0605cy04cy0506b60103b8d00603b6de02de9nbfd7bcbmb70407bo7p06899ga2ab031f84087x8dbcbuc3bm1fbo7x078h',
    // the article's From the Start puzzle is another one (see its comments)
    label: 'Type 1 on 7/8/9: boxes 1/2/4/5, guardian F6',
    pattern: 'A3 A4 B2 B5 C1 C6 D1 D4 E2 E5 F3 F6',
    removes: ['F6:7', 'F6:8', 'F6:9'],
    exact: true,
  },
  {
    name: 'Type 1, example 2: slants that are not diagonals',
    bd: 'S9B09080711111z150d1x06050d5xd147d5bb5x0b0n0n04de5edebm76070i4j034j0d06024j04024j4j060i4j07030n064n2c2c4j044j094n070f4j0d02brbr4j4n0n02094j074n0f044j0d0i06034j2c4j2c',
    start: '987000000650000000000400000700300620420060073060000409070002000002907004000630000',
    label: 'Type 1 on 1/5/8: boxes 5/6/8/9, guardian H7',
    pattern: 'D5 D9 E4 E7 F6 F8 G4 G9 H5 H7 J6 J8',
    removes: ['H7:1', 'H7:5', 'H7:8'],
    exact: true,
  },
  {
    name: 'Type 1, example 3: triples spread thin, 4 is the solution in C4',
    bd: 'S9B8uee1y1ud69ecy01028kec5g1ucy01039e047ucy01d602030506cy8kc450cy0104cy05030e01070306b60402b67q044602cy05019e06011k1sd6d6d08k0u05071w247v037o8k087n080o090r05062c0u2b',
    start: '000000012000001304001023560000014053017360420040205106100000005700030080809056000',
    label: 'Type 1 on 7/8/9: boxes 2/3/5/6, guardian C4',
    pattern: 'A6 A7 B5 B8 C4 C9 D4 D7 E6 E9 F5 F8',
    removes: ['C4:7', 'C4:8', 'C4:9'],
    exact: true,
  },
  {
    name: 'Type 2: a pointing pair of 3s guards the pattern',
    bd: 'S9B0102034q4q5m074y09228a220g438i0203436qb66q020n8m1f04050b0c4q4q0701bubm064q010906024u4q074e364q36094u4u4r4l4h0c4q014q092c5m5g644q070203064qbvbn4b09064q0a4q2c034k64',
    start: '123000709000000230000200045000071006019620070000900000001090000072360000960000300',
    label: 'Type 2 on 4/5/8: boxes 4/5/7/8, guardians 3 in E6/F5',
    pattern: 'D3 D4 E1 E6 F2 F5 G2 G4 H1 H6 J3 J5',
    removes: ['F6:3'],
    exact: true,
  },
  {
    name: 'Type 3A in a row: 8 in E5, 3 in E8 and E6 lock 3 and 8',
    bd: 'S9B09080706050t0s0u0v04101v03cyd19gaaab1h0o1j9m9m9p0805aj039m0205069m01089m6q9mc201d646059q0b6ba24j9m02da9m3aam5u06be02019m039m052q018a9m030f9m020h2c9k7y089m0e06019m',
    start: '987650000400300000000000850302560180000100500000020000060210305010030020000800610',
    label: 'Type 3 on 4/7/9: boxes 5/6/8/9, guardians E5/E8 lock 3/8 with E6',
    pattern: 'D6 D9 E5 E6 E8 F4 F7 G6 G8 H4 H7 J5 J9',
    removes: ['E1:8', 'E3:8'],
    exact: true,
  },
  {
    name: 'Type 3A in a box: 5 in G9, 7 in H8 and H9 lock 5 and 7',
    bd: 'S9B090807060e0x0x0v0v06050l7z0v0x082m9i0l04037n070h110f83071j5705090v0v024y0x7r7x080v0607050v4u1j4r0v020g090v4y1b0217070v0906081b4v8n8r024y0v1b2n2q4f0g570v4y050v0902',
    start: '987600000650000800043070000700590020000806750000020900020709680000200000000005092',
    label: 'Type 3 on 1/3/4: boxes 5/6/8/9, guardians G9/H8 lock 5/7 with H9',
    pattern: 'D6 D7 E5 E9 F4 F8 G5 G9 H6 H8 H9 J4 J7',
    removes: ['H7:5'],
    exact: true,
  },
  {
    name: 'Type 3B: 5 in C1, 8 in F1, G1 and J1 lock 1, 5 and 8',
    bd: 'S9B09080p07060p050x0v070p04050pb6067tbb151l210p04b65x7td3060pbd0p0g0e4d81bj04050p08090p2d1l3b4907bd0f0p044505bb4j095f0r0z07031n02150x150i08060r07170z1n0g0x150p090823',
    start: '980760500704500600000040000600000000450890000070004050090007302000086070000000980',
    label: 'Type 3 on 1/2/3: boxes 1/2/4/5, guardians C1/F1 lock 1/5/8 with G1/J1',
    pattern: 'A3 A6 B2 B5 C1 C4 D2 D4 E3 E6 F1 F5 G1 J1',
    // the article removes 5 from H1; the locked triple takes its 1 too
    removes: ['H1:5'],
    exact: false,
  },
]

describe('Tridagons', () => {
  describe('the worked examples of sudokuwiki.org/Tridagons', () => {
    for (const example of EXAMPLES) {
      it(example.name, () => {
        const s = fromWiki(example.bd)
        const result = tridagons(s)
        expect(result?.name).toBe('Tridagons')

        const instance = occurrence(result, example.label)
        expect(instance.patternCells.map(cellLabel).join(' ')).toBe(example.pattern)
        const gone = marks(instance, 'eliminate')
        if (example.exact) expect(gone).toEqual([...example.removes].sort())
        else expect(gone).toEqual(expect.arrayContaining(example.removes))

        // sound against every solution the position allows (example 1 allows two)
        const solutions = solutionsWithin(s)
        expect(solutions.length).toBeGreaterThan(0)
        if (example.start) {
          // the article's puzzle is this position's: its solution is one of them
          expect(solutions.map(sol => sol.join(''))).toContain(solutionOf(example.start).join(''))
        }
        for (const solution of solutions) expect(unsound(s, result!, solution)).toEqual([])
      })
    }

    it('rings the guardians and discs the three digits (example 1)', () => {
      const instance = occurrence(tridagons(fromWiki(EXAMPLES[0].bd)), EXAMPLES[0].label)
      expect(marks(instance, 'alternate')).toEqual(['F6:5'])
      const discs = marks(instance, 'highlight')
      expect(discs.every(mark => ['7', '8', '9'].includes(mark.slice(-1)))).toBe(true)
      // every pattern cell but the guardian keeps a disc
      expect(new Set(discs.map(mark => mark.slice(0, 2))).size).toBe(11)
      expect(instance.units.map(u => `${u.kind}${u.index + 1}`)).toEqual(['box1', 'box2', 'box4', 'box5'])
      expect(instance.narrative).toContain('rises in box 1')
      expect(instance.narrative).toContain('So F6 must be 5')
    })

    it('names the locked cells and their unit in Type 3 (row example)', () => {
      const instance = occurrence(tridagons(fromWiki(EXAMPLES[4].bd)), EXAMPLES[4].label)
      expect(marks(instance, 'alternate')).toEqual(['E5:8', 'E6:3', 'E6:8', 'E8:3'])
      expect(instance.units).toContainEqual({ kind: 'row', index: 4 })
      expect(instance.narrative).toContain('8 in E5 or 3 in E8')
      expect(instance.narrative).toContain('rest of row E (E1 and E3)')
    })
  })

  describe('the parity rule, on made up positions', () => {
    // boxes 1, 2 and 4 fall on their diagonals; box 5 decides
    const falling = { A1: [1, 2, 3], B2: [1, 2, 3], C3: [1, 2, 3], A4: [1, 2, 3], B5: [1, 2, 3], C6: [1, 2, 3], D1: [1, 2, 3], E2: [1, 2, 3], F3: [1, 2, 3] }

    it('fires on one rising slant against three falling ones', () => {
      const s = only({ ...falling, A1: [1, 2, 3, 4], D6: [1, 2, 3], E5: [1, 2, 3], F4: [1, 2, 3] })
      const result = tridagons(s)
      expect(result?.instances).toHaveLength(1)
      expect(result!.instances[0].label).toBe('Type 1 on 1/2/3: boxes 1/2/4/5, guardian A1, eliminates 1/2/3 from A1')
    })

    it('does not fire when all four fall: 1, 2 and 3 fit them then', () => {
      // A1 B2 C3 = 1 2 3, A4 B5 C6 = 2 3 1, D1 E2 F3 = 2 3 1, D4 E5 F6 = 1 2 3
      const s = only({ ...falling, A1: [1, 2, 3, 4], D4: [1, 2, 3], E5: [1, 2, 3], F6: [1, 2, 3] })
      expect(tridagons(s)).toBeNull()
    })

    it('does not fire on two guardians of different digits in no shared unit', () => {
      const s = only({ ...falling, A1: [1, 2, 3, 4], D6: [1, 2, 3], E5: [1, 2, 3], F4: [1, 2, 3, 5] })
      expect(tridagons(s)).toBeNull()
    })

    it('Type 2: guardians of one digit, removed where every guardian is seen', () => {
      // A1 and C6 both guard with 4; A6 sees A1 along row A and C6 in box 2
      const s = only({ ...falling, A1: [1, 2, 3, 4], C6: [1, 2, 3, 4], D6: [1, 2, 3], E5: [1, 2, 3], F4: [1, 2, 3], A6: [4, 7] })
      const result = tridagons(s)
      expect(removed(result)).toEqual(['A6:4'])
      expect(result!.instances[0].label).toBe('Type 2 on 1/2/3: boxes 1/2/4/5, guardians 4 in A1/C6, eliminates 4 from A6')
    })
  })

  describe('in play', () => {
    it('is sound on every position of 200 solves, and quick', () => {
      let calls = 0
      let spent = 0
      let worst = 0
      const timed = (snapshot: Snapshot) => {
        const started = performance.now()
        const result = tridagons(snapshot)
        const took = performance.now() - started
        calls++
        spent += took
        worst = Math.max(worst, took)
        return result
      }
      const { fired, problems } = sweep(timed, { puzzles: 200 })
      expect(problems).toEqual([])
      // generated puzzles almost never hold the pattern: the exemplars below do
      console.log(
        `tridagons fired at ${fired} positions of 200 solves, ` +
          `${Math.round((spent / calls) * 1000)} µs a call, worst ${worst.toFixed(1)} ms`,
      )
    }, 300_000)

    it('stays sound through the article puzzles, and is a step of their solves', () => {
      const puzzles = [
        ...EXAMPLES.flatMap(example => (example.start ? [example.start] : [])),
        // a Type 2 from Phil's Folly, from the article's comments: 1 in D3 and H3 guard
        '........1.....2.3...4.15.......346...47..8.1.6.31.78...78...1.63...8..744.67.138.',
      ]
      let used = 0
      for (const puzzle of puzzles) {
        const solution = solutionOf(puzzle)
        let s = loadPuzzle(puzzle).snapshot
        let steps = 0
        for (let step = 0; step < 729 && !isSolved(s); step++) {
          const result = findNextStrategy(s) ?? tridagons(s)
          if (!result) break
          expect(unsound(s, result, solution), puzzle).toEqual([])
          if (result.name === 'Tridagons') steps++
          s = applyStratResult(s, result)
        }
        if (steps > 0) used++
      }
      expect(used).toBeGreaterThanOrEqual(4)
    }, 60_000)
  })
})
