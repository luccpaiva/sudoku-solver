import { describe, expect, it } from 'vitest'
import type { CandidateAnnotation, Snapshot, StratInstance, StratResult, UnitRef } from '../types'
import { applyStratResult, isSolved, loadPuzzle } from '../board'
import { findNextStrategy } from '../solver'
import { fromWiki, removed, solutionOf, sweep, unsound } from '../testing'
import { sees } from '../units'
import { cellLabel } from '../utils'
import { chuteRemotePairs } from './chuteRemotePairs'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** 'A8' → 7 */
const at = (label: string) => 'ABCDEFGHJ'.indexOf(label[0]) * 9 + Number(label[1]) - 1

/** The one occurrence built on a pair of cells, named like 'A8/C1'. */
function occurrence(result: StratResult | null, pair: string): StratInstance {
  const found = (result?.instances ?? []).filter(i => i.patternCells.map(cellLabel).join('/') === pair)
  expect(found).toHaveLength(1)
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

/** The same position with rows and columns swapped, and a mark or a cell moved the same way. */
const swap = (cell: number) => (cell % 9) * 9 + ((cell / 9) | 0)
function transposed(s: Snapshot): Snapshot {
  return {
    values: s.values.map((_, i) => s.values[swap(i)]),
    candidates: s.candidates.map((_, i) => s.candidates[swap(i)]),
  }
}
const flipped = (mark: string) => cellLabel(swap(at(mark))) + mark.slice(2)

/** What a position looks like written out, to tell whether it changed. */
const written = (s: Snapshot) => JSON.stringify([s.values, s.candidates.map(c => [...c])])

// ── The worked examples of sudokuwiki.org/Chute_Remote_Pairs ──────────────────

const PUZZLE_1 = '000905000000000012060000050390050060000300004040060085030000090850010000000207000'
const PUZZLE_3 = '050000010000573000028001300600200000010000050000068004005800790000096000030000080'
const PUZZLE_DOUBLE = '000306000360000190008100000020009080900000005070400060000002600049000072000803000'

type Example = {
  title: string
  /** The pictured position ('Load Example'). */
  bd: string
  /** The puzzle it comes from ('From the Start'), where the article gives one. */
  start: string | null
  pair: string
  /** The three cells of the third box. */
  third: string[]
  /** What the article says comes off. */
  removes: string[]
  /** The pair's digit where the three cells can still take it. */
  rings: string[]
  units: UnitRef[]
  label: string
}

const EXAMPLES: Example[] = [
  {
    title: 'example 1: 4/7 in A8 and C1, B4 B5 B6 have no 7',
    bd: 'S9B2j0b5v0962050f2i0c0i5u0e560c566201022i060c0a644c62050i03095u4a054c2d062b0e5u0f03440a0i2c040l040l0g060i0c08052c032c0e4a560r091f08050i1m010c2k2k360f0a0d020i070e0c0h',
    start: PUZZLE_1,
    pair: 'A8/C1',
    third: ['B4', 'B5', 'B6'],
    removes: ['A1:4', 'C7:4'],
    rings: ['B4:4', 'B6:4'],
    units: [{ kind: 'box', index: 1 }],
    label: 'A8/C1 remote pair 4/7, no 7 in B4/B5/B6, eliminates 4 from A1, C7',
  },
  {
    // down a stack, and the 2 of the three cells is a clue (J4)
    title: 'example 2: 2/8 in C6 and E5, G4 H4 J4 have no 8',
    bd: 'S9B2b0b5v0962050f2i0c0i5u0e560c566201020d060c0a5w445u050i03095u4a054c2d062b0e5u0f03440a0i2c040l040l0g060i0c08052c032c0e4a560r091f08050i1m010c2k2k360f0a0d020i070e0c0h',
    start: PUZZLE_1,
    pair: 'C6/E5',
    third: ['G4', 'H4', 'J4'],
    removes: ['C5:2', 'D6:2'],
    rings: [],
    units: [{ kind: 'box', index: 7 }],
    label: 'C6/E5 remote pair 2/8, no 8 in G4/H4/J4, eliminates 2 from C5, D6',
  },
  {
    title: 'example 3: 7/9 in D6 and F2, E7 E8 E9 have no 7',
    bd: 'S9B0c057u0f0h0b7u010g0a7u0f050703bg0sb80g02080i0d01030f0e06d69q020e9eb72eb7b6019g0d0c9ec405c40e9e9k0a06087o2e040b0f05080a0d07090c4a5u2b0c09060e0s0l7u037n0g0b0e1n081f',
    start: PUZZLE_3,
    pair: 'D6/F2',
    third: ['E7', 'E8', 'E9'],
    removes: ['D2:9', 'D3:9'],
    rings: ['E7:9', 'E9:9'],
    units: [{ kind: 'box', index: 5 }],
    label: 'D6/F2 remote pair 7/9, no 7 in E7/E8/E9, eliminates 9 from D2, D3',
  },
  {
    title: 'double elimination: 4/7 in B9 and C1, A4 A5 A6 have neither',
    bd: 'S9B310z31030i060h102i0306302s4i6i01092i2i0i0801102i100c0f2302273m1z092i080n090h1r381j2b2i0l050z0713044p4j7o067r2r0c2r0i0d02060z0h0h04091u1v0z0c07021g0z1g080g03820d7n',
    start: PUZZLE_DOUBLE,
    pair: 'B9/C1',
    third: ['A4', 'A5', 'A6'],
    removes: ['B3:4', 'B3:7'],
    rings: [],
    units: [{ kind: 'box', index: 1 }, { kind: 'row', index: 1 }, { kind: 'row', index: 2 }],
    label: 'B9/C1 remote pair 4/7, no 4/7 in A4/A5/A6, eliminates 4/7 from B3',
  },
  {
    // J7 sees both ends; G8 sees G9 alone and goes by the 'either end' rule
    title: 'bonus eliminations: 7/9 in G9 and J5, H1 H2 H3 have neither',
    bd: 'S9B8i058i0801070304020207030405090108060108040206039e9e05050308aa0401acac9eaa8i02030805aa01040401aaaa9g1g050308du8i0105035004ac9e030405aa9g50dwac01du02aa019e04du0503',
    start: null,
    pair: 'G9/J5',
    third: ['H1', 'H2', 'H3'],
    removes: ['G8:7', 'G8:9', 'J7:7', 'J7:9'],
    rings: [],
    units: [{ kind: 'box', index: 6 }, { kind: 'row', index: 6 }, { kind: 'row', index: 8 }],
    label: 'G9/J5 remote pair 7/9, no 7/9 in H1/H2/H3, eliminates 7/9 from G8, J7',
  },
]

describe('chuteRemotePairs on the worked examples of the article', () => {
  for (const example of EXAMPLES) {
    it(example.title, () => {
      const s = fromWiki(example.bd)
      const result = chuteRemotePairs(s)
      expect(result?.name).toBe('Chute Remote Pairs')
      expect(removed(result)).toEqual(expect.arrayContaining(example.removes))

      // the pictured pattern, mark for mark
      const own = occurrence(result, example.pair)
      const [p, q] = example.pair.split('/')
      const digits = [...s.candidates[at(p)]].sort()
      expect(own.patternCells).toEqual([at(p), at(q)])
      expect(own.links).toEqual([[at(p), at(q)]])
      expect(own.solvedCells).toEqual([])
      expect(marks(own, 'eliminate')).toEqual(example.removes)
      expect(marks(own, 'highlight')).toEqual([p, q].flatMap(cell => digits.map(d => `${cell}:${d}`)))
      expect(marks(own, 'alternate')).toEqual(example.rings)
      expect(own.units).toEqual(example.units)
      expect(own.label).toBe(example.label)
      for (const cell of [p, q, ...example.third]) expect(own.narrative).toContain(cell)

      const solution = example.start ? solutionOf(example.start) : solutionOf(s)
      expect(unsound(s, result!, solution)).toEqual([])
    })
  }

  it("takes the 'either end' removals from a cell that sees one end only", () => {
    const s = fromWiki(EXAMPLES[4].bd)
    const own = occurrence(chuteRemotePairs(s), 'G9/J5')
    expect(sees(at('J7'), at('G9')) && sees(at('J7'), at('J5'))).toBe(true)
    expect(sees(at('G8'), at('G9'))).toBe(true)
    expect(sees(at('G8'), at('J5'))).toBe(false)
    expect(marks(own, 'eliminate')).toEqual(expect.arrayContaining(['G8:7', 'G8:9']))
    // H7 and H8 hold 7 and 9 too, in the pair's chute, and keep them
    expect(removed(chuteRemotePairs(s)).filter(mark => mark.startsWith('H'))).toEqual([])
  })

  it('finds the same thing along columns as along rows', () => {
    for (const example of EXAMPLES) {
      const s = fromWiki(example.bd)
      const turned = chuteRemotePairs(transposed(s))
      expect(removed(turned)).toEqual(removed(chuteRemotePairs(s)).map(flipped).sort())
    }
    // the bonus example on its side: the pair's rows G and J are columns 7 and 9
    const own = occurrence(chuteRemotePairs(transposed(fromWiki(EXAMPLES[4].bd))), 'E9/J7')
    expect(marks(own, 'eliminate')).toEqual(['G9:7', 'G9:9', 'H7:7', 'H7:9'])
    expect(own.units).toEqual([{ kind: 'box', index: 2 }, { kind: 'col', index: 6 }, { kind: 'col', index: 8 }])
    for (const cell of ['A8', 'B8', 'C8', 'columns 7 and 9']) expect(own.narrative).toContain(cell)
  })

  it('leaves the snapshot alone and answers the same every time', () => {
    for (const example of EXAMPLES) {
      const s = fromWiki(example.bd)
      const before = written(s)
      const first = chuteRemotePairs(s)
      expect(written(s)).toBe(before)
      expect(chuteRemotePairs(s)).toEqual(first)
    }
  })
})

// ── The rule on a bare board ──────────────────────────────────────────────────

describe('chuteRemotePairs, case by case', () => {
  const ALL = [1, 2, 3, 4, 5, 6, 7, 8, 9]
  const NO_7 = ALL.filter(d => d !== 7)
  const NEITHER = ALL.filter(d => d !== 4 && d !== 7)

  // Nothing placed, every candidate open, but for a 4/7 in A1 and one in B5.
  // The third box is box 3 and its three cells are C7, C8, C9: they have no 7.
  const open: Snapshot = {
    values: Array.from({ length: 81 }, () => null),
    candidates: Array.from({ length: 81 }, () => new Set(ALL)),
  }
  const bare = withCells(open, { C7: NO_7, C8: NO_7, C9: NO_7 })
  const single = withCells(bare, { A1: [4, 7], B5: [4, 7] })

  it('removes the digit the three cells do have from the cells that see both', () => {
    expect(removed(chuteRemotePairs(single))).toEqual(['A4:4', 'A5:4', 'A6:4', 'B1:4', 'B2:4', 'B3:4'])
    expect(marks(occurrence(chuteRemotePairs(single), 'A1/B5'), 'alternate')).toEqual(['C7:4', 'C8:4', 'C9:4'])
  })

  it('removes both digits from the rest of the two rows when the three cells have neither', () => {
    const double = withCells(single, { C7: NEITHER, C8: NEITHER, C9: NEITHER })
    const rest = ['A2', 'A3', 'A4', 'A5', 'A6', 'B1', 'B2', 'B3', 'B4', 'B6']
    expect(removed(chuteRemotePairs(double))).toEqual(rest.flatMap(cell => [`${cell}:4`, `${cell}:7`]))
  })

  it('counts a solved cell among the three as holding its digit', () => {
    // 4 placed in C8 and open nowhere else in the three: still a single on 4
    const placed = withCells(single, { C7: NEITHER, C8: 4, C9: NEITHER })
    expect(removed(chuteRemotePairs(placed))).toEqual(['A4:4', 'A5:4', 'A6:4', 'B1:4', 'B2:4', 'B3:4'])
    expect(marks(occurrence(chuteRemotePairs(placed), 'A1/B5'), 'alternate')).toEqual([])
  })

  it('does not fire when the two cells see each other', () => {
    expect(chuteRemotePairs(withCells(bare, { A1: [4, 7], A5: [4, 7] }))).toBeNull() // one row
    expect(chuteRemotePairs(withCells(bare, { A1: [4, 7], B2: [4, 7] }))).toBeNull() // one box
    expect(chuteRemotePairs(transposed(withCells(bare, { A1: [4, 7], A5: [4, 7] })))).toBeNull() // one column
  })

  it('does not fire when both digits are in the three cells', () => {
    expect(chuteRemotePairs(withCells(single, { C8: ALL }))).toBeNull() // as a candidate
    expect(chuteRemotePairs(withCells(single, { C8: 7 }))).toBeNull() // as a solved cell
    expect(chuteRemotePairs(withCells(open, { A1: [4, 7], B5: [4, 7] }))).toBeNull()
    // example 1 again, with a 7 back in B4
    expect(chuteRemotePairs(withCells(fromWiki(EXAMPLES[0].bd), { B4: [4, 6, 7, 8] }))).toBeNull()
  })

  it('does not fire on cells that are not the same pair in one chute', () => {
    expect(chuteRemotePairs(withCells(bare, { A1: [4, 7], B5: [4, 8] }))).toBeNull()
    expect(chuteRemotePairs(withCells(bare, { A1: [4, 7], B5: [4, 7, 9] }))).toBeNull()
    expect(chuteRemotePairs(withCells(bare, { A1: [4, 7], E5: [4, 7] }))).toBeNull() // no chute in common
  })

  it('does not fire when there is nothing to remove', () => {
    const spent = withCells(single, { A4: NEITHER, A5: NEITHER, A6: NEITHER, B1: NEITHER, B2: NEITHER, B3: NEITHER })
    expect(chuteRemotePairs(spent)).toBeNull()
  })
})

// ── Soundness ─────────────────────────────────────────────────────────────────

describe('chuteRemotePairs against the solution', () => {
  it('never removes a solution digit over 300 generated puzzles', () => {
    const started = performance.now()
    const { fired, problems } = sweep(chuteRemotePairs, { puzzles: 300 })
    console.log(`chute remote pairs fired ${fired} times over 300 puzzles in ${Math.round(performance.now() - started)} ms`)
    expect(problems).toEqual([])
    expect(fired).toBeGreaterThan(0)
  }, 120_000)

  it("gets to the double and its 'either end' removals in a sweep, and is quick", () => {
    let calls = 0
    let spent = 0
    let doubles = 0
    let eitherEnd = 0
    const watched = (s: Snapshot) => {
      const started = performance.now()
      const result = chuteRemotePairs(s)
      spent += performance.now() - started
      calls++
      const pairs = (result?.instances ?? []).map(i => i.patternCells.join('/'))
      expect(new Set(pairs).size).toBe(pairs.length)
      for (const { patternCells: [p, q], candidateAnnotations, units } of result?.instances ?? []) {
        expect(sees(p, q)).toBe(false)
        if (units.length > 1) doubles++
        eitherEnd += candidateAnnotations.filter(
          a => a.kind === 'eliminate' && !(sees(a.cell, p) && sees(a.cell, q)),
        ).length
      }
      return result
    }
    const { problems } = sweep(watched, { puzzles: 100, seed: 2 })
    console.log(
      `chute remote pairs: ${doubles} doubles and ${eitherEnd} 'either end' removals over 100 more puzzles, ` +
      `${((spent / calls) * 1000).toFixed(1)} µs a call`,
    )
    expect(problems).toEqual([])
    expect(doubles).toBeGreaterThan(0)
    expect(eitherEnd).toBeGreaterThan(0)
    expect(spent / calls).toBeLessThan(1)
  }, 120_000)

  // "These puzzles require the CRP strategy at some point"
  const EXEMPLARS = [
    '060000200000401073800000004400700100008903700001005000200000000310209000005000030',
    '008400200070000050230000094060390000009050300000062070340000067080000010001007900',
    '010000306000208007400706000000000014100070003590000000000309000200604000304000050',
    '003000800000060053200100000050000097007208300060000000000006005590010000001000908',
    '800007004040259007000080000508000000720000035000000906000020000200438070100700002',
    '005000000003720400070500030900080007300000084100030002060007010001006900000000500',
    '000408000004060000080200605028006500700000004009300170205004090000090700000102000',
    '006007900410000080000604000005030007001709500800050100000306000020000064004200800',
    '000209000203000908900005010002000100100926004005000700060500009408000605000307000',
    '500698001090100800000000000780000605000060000301000079000000000007009050100845006',
  ]

  it('stays sound through the ten exemplar puzzles and is a step in most of them', () => {
    let seenIn = 0
    let stepIn = 0
    let solved = 0

    for (const puzzle of EXEMPLARS) {
      const solution = solutionOf(puzzle)
      let snapshot = loadPuzzle(puzzle).snapshot
      let seen = false
      let step = false

      for (let n = 0; n < 729 && !isSolved(snapshot); n++) {
        const mine = chuteRemotePairs(snapshot)
        if (mine) {
          seen = true
          expect(unsound(snapshot, mine, solution)).toEqual([])
        }
        const next = findNextStrategy(snapshot) ?? mine
        if (!next) break
        if (next.name === 'Chute Remote Pairs') step = true
        snapshot = applyStratResult(snapshot, next)
      }

      if (seen) seenIn++
      if (step) stepIn++
      if (isSolved(snapshot)) solved++
    }

    console.log(
      `chute remote pairs: found in ${seenIn} of the 10 exemplars, a step of the solve in ${stepIn}, ` +
      `${solved} solved to the end`,
    )
    expect(stepIn).toBeGreaterThanOrEqual(6)
  })
})
