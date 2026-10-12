import { describe, expect, it } from 'vitest'
import type { CandidateAnnotation, Snapshot, StratInstance, StratResult } from '../types'
import { applyStratResult } from '../board'
import { fromWiki, removed, solutionOf, sweep, unsound } from '../testing'
import { COLS } from '../units'
import { cellLabel, unitDisplayName } from '../utils'
import { wWing } from './wWing'

// The worked examples of https://www.sudokuwiki.org/W_Wing_Strategy: each
// "Load Example" position, and the puzzle it comes from.
const REMOTE_PAIR_PUZZLE = '010200870050000001000076000800027006000000000100480003000850700700000030001000020'
const REMOTE_PAIR_1 = 'S9B0f017u020c0e08077u0b050g0i0d0h0c0f017ybibi0a07060e7u0b087u121202070a7u068e807w120f0a7u0h0g010g0f04080i0b0e037y0f8008050w070a7u07bgbw0f0a0s7u034i1a4e010g0i0u0f024i'
const REMOTE_PAIR_2 = 'S9B0f017u020c0e08077u0b050g0i0d0h0c0f017ybibi0a07060e7u0b087u121202070a7u068e807w120f0a7u0h0g010g0f04080i0b0e037y0f8008050w070a7u07bg4k0f0a0s7u034i1a4e010g0i0u0f024i'

const SINGLE_PUZZLE = '000020007000507800057090030008900010700040008020001900090050740002109000600080000'
const SINGLE_1 = 'S9B7n0h1m1q021i0z82077o1m0c050a07088k8s0l05071m090h1p031p121m08090g20280128070a0i1k0420201w0812021m0h1i01090g260h090a1k051k07041i0d0g02011i091y0h1y060c0e0g080d0l7o7p'
const SINGLE_2 = 'S9B7n0h1m1q021i0z82077o1m0c050a07088k8s0l05071m090h1p031p121m08090g1w280128070a0i1k041w201w0812021m0h1i01090g260h090a1k051k07041i0d0g02011i091y0h1y060c0e0g080d0l7o7p'

const SPLIT_PUZZLE = '000010600000709005080050930050130090000090000020067080093080020200306000005040000'
const SPLIT = 'S9B0e2i0i0h010c062i0b0c1n1m070b090h0r052b080b0f050d09032b1m053e01030h0b093e0h0c3e0b090e2j373f0i020a0d06070e080c3e09030e080a2i023e020r0h030g060r0e0i3737050i040b0c370h'

// The split double the article draws and talks through is not the position
// its link loads, so this one is read off the picture: a lone digit is a
// solved cell, several are the candidates left.
const SPLIT_PICTURED = [
  '3    567  578  2  1  9  67     4   678',
  '67   2    78   3  4  5  167    9   1678',
  '9    4    1    7  8  6  2      5   3',
  '8    1    3    6  5  7  4      2   9',
  '457  57   457  8  9  2  136    36  16',
  '2    9    6    1  3  4  8      7   5',
  '57   8    2    9  6  3  57     1   4',
  '46   3    49   5  7  1  69     8   2',
  '1    567  579  4  2  8  35679  36  67',
]

// "A diabolical puzzle with two split double W-Wings", and where the solver
// stands when the basic strategies have run out on it.
const DIABOLICAL_PUZZLE = '080000070100600003006200000030080010001409700040070090600001400800004009090000050'
const DIABOLICAL_STUCK = 'S9B7y08807q7z0e8l071h012sa4067u5ubo4c039q2q06027z5ubn4a4j9e039e0e081g1g010d100f01040o0907484k10040h0a071k20091w062s2wd2880104485w080a2w2e14040o0f092m092o5y0f0o49055x'

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

/** The index of a cell by its label: A1 → 0, J9 → 80. */
const at = (label: string) => 'ABCDEFGHJ'.indexOf(label[0]) * 9 + Number(label[1]) - 1

function fromRows(rows: string[]): Snapshot {
  const cells = rows.flatMap(row => row.trim().split(/\s+/))
  return {
    values: cells.map(cell => (cell.length === 1 ? Number(cell) : null)),
    candidates: cells.map(cell => new Set(cell.length === 1 ? [] : [...cell].map(Number))),
  }
}

/** A board with nothing solved and every candidate in place, but for the cells named. */
function sketch(cells: Record<string, string>): Snapshot {
  const candidates = Array.from({ length: 81 }, () => new Set(DIGITS))
  for (const [label, digits] of Object.entries(cells)) {
    candidates[at(label)] = new Set([...digits].map(Number))
  }
  return { values: Array.from({ length: 81 }, () => null), candidates }
}

/** The same candidates for several cells: `all('B8 C8', '13456789')`. */
const all = (labels: string, digits: string) =>
  Object.fromEntries(labels.split(' ').map(label => [label, digits]))

/** The occurrences whose two matching cells are the ones named. */
function joining(result: StratResult | null, p: string, q: string): StratInstance[] {
  return (result?.instances ?? []).filter(
    ({ patternCells }) => patternCells[0] === at(p) && patternCells[1] === at(q),
  )
}

/** An occurrence spelled out, to compare whole. */
function picture(instance: StratInstance) {
  const marks = (kind: CandidateAnnotation['kind']) =>
    instance.candidateAnnotations
      .filter(mark => mark.kind === kind)
      .map(({ cell, digit }) => `${cellLabel(cell)}:${digit}`)
      .join(' ')
  return {
    cells: instance.patternCells.map(cellLabel).join(' '),
    discs: marks('highlight'),
    rings: marks('alternate'),
    removes: marks('eliminate'),
    units: instance.units.map(unitDisplayName).join(', '),
    links: (instance.links ?? []).map(([a, b]) => `${cellLabel(a)}-${cellLabel(b)}`).join(' '),
    label: instance.label,
  }
}

describe('W-Wing', () => {
  describe('the double: a Remote Pair chain of four', () => {
    it('takes 4 and 9 from H3, between A3 and H7 (example 1)', () => {
      const s = fromWiki(REMOTE_PAIR_1)
      const result = wWing(s)

      expect(result?.name).toBe('W-Wing')
      expect(removed(result)).toEqual(expect.arrayContaining(['H3:4', 'H3:9']))
      expect(joining(result, 'A3', 'H7').map(picture)).toEqual([
        {
          cells: 'A3 H7 A9 G9',
          discs: 'A3:4 A3:9 H7:4 H7:9',
          rings: 'A9:4 A9:9 G9:4 G9:9',
          removes: 'H3:4 H3:9',
          units: 'column 9',
          links: 'A3-A9 A9-G9 G9-H7',
          label: 'W-Wing on 4/9: A3/H7 linked by the pair A9/G9, eliminates 4/9 from H3',
        },
      ])
      expect(unsound(s, result!, solutionOf(REMOTE_PAIR_PUZZLE))).toEqual([])
    })

    it('takes 4 and 9 from H2, between D2 and H7 (example 2)', () => {
      const s = fromWiki(REMOTE_PAIR_2)
      const result = wWing(s)

      expect(removed(result)).toEqual(expect.arrayContaining(['H2:4', 'H2:9']))
      expect(joining(result, 'D2', 'H7').map(picture)).toEqual([
        {
          cells: 'D2 H7 D8 E7',
          discs: 'D2:4 D2:9 H7:4 H7:9',
          rings: 'D8:4 D8:9 E7:4 E7:9',
          removes: 'H2:4 H2:9',
          units: 'box 6',
          links: 'D2-D8 D8-E7 E7-H7',
          label: 'W-Wing on 4/9: D2/H7 linked by the pair D8/E7, eliminates 4/9 from H2',
        },
      ])
      expect(unsound(s, result!, solutionOf(REMOTE_PAIR_PUZZLE))).toEqual([])
    })

    it('needs no tidying up first: the pair in the middle is a link as it stands', () => {
      // A8 and F8 are not the only places for 1 or 2 in column 8, or anywhere
      const s = sketch(all('A1 A8 F8 F5', '12'))
      const result = wWing(s)

      expect(result?.instances.map(i => i.label)).toEqual([
        'W-Wing on 1/2: A1/F5 linked by the pair A8/F8, eliminates 1/2 from A5, F1',
      ])
      expect(removed(result)).toEqual(['A5:1', 'A5:2', 'F1:1', 'F1:2'])
    })
  })

  describe('the single: one strong link', () => {
    it('takes 3 from D6 and E6, A6 and F5 linked by 6 in column 3 (example 1)', () => {
      const s = fromWiki(SINGLE_1)
      const result = wWing(s)

      expect(removed(result)).toEqual(expect.arrayContaining(['D6:3', 'E6:3']))
      expect(joining(result, 'A6', 'F5').map(picture)).toEqual([
        {
          cells: 'A6 F5 A3 F3',
          discs: 'A6:3 A6:6 F5:3 F5:6',
          rings: 'A3:6 F3:6',
          removes: 'D6:3 E6:3',
          units: 'column 3',
          links: 'A6-A3 A3-F3 F3-F5',
          label: 'W-Wing on 3/6: A6/F5 linked by 6 in A3/F3, eliminates 3 from D6, E6',
        },
      ])
      // the two the article leaves for the steps after are there already
      expect(result?.instances.map(i => i.label)).toEqual([
        'W-Wing on 3/6: A6/F5 linked by 6 in A3/F3, eliminates 3 from D6, E6',
        'W-Wing on 2/9: B1/J8 linked by 9 in A1/A8, eliminates 2 from B8',
        'W-Wing on 1/2: C1/J7 linked by 1 in A1/A7, eliminates 2 from C7',
      ])
      expect(unsound(s, result!, solutionOf(SINGLE_PUZZLE))).toEqual([])
    })

    it('takes 2 from B8, B1 and J8 linked by 9 in row A (example 2)', () => {
      const s = fromWiki(SINGLE_2)
      const result = wWing(s)

      expect(removed(result)).toEqual(expect.arrayContaining(['B8:2']))
      // B9 and J9 in column 9 link the same two cells as well: still one occurrence
      expect(COLS[8].filter(cell => s.candidates[cell].has(9)).map(cellLabel)).toEqual(['B9', 'J9'])
      expect(joining(result, 'B1', 'J8').map(picture)).toEqual([
        {
          cells: 'B1 J8 A1 A8',
          discs: 'B1:2 B1:9 J8:2 J8:9',
          rings: 'A1:9 A8:9',
          removes: 'B8:2',
          units: 'row A',
          links: 'B1-A1 A1-A8 A8-J8',
          label: 'W-Wing on 2/9: B1/J8 linked by 9 in A1/A8, eliminates 2 from B8',
        },
      ])
      expect(unsound(s, result!, solutionOf(SINGLE_PUZZLE))).toEqual([])
    })

    it('reaches a third cell of the same two digits that sees both ends', () => {
      // D2, D8 and E7 are all 4/9; H2 and H7 are the only 9s of row H
      const s = fromWiki(REMOTE_PAIR_2)
      const [instance] = joining(wWing(s), 'D2', 'E7')

      expect(instance.label).toBe('W-Wing on 4/9: D2/E7 linked by 9 in H2/H7, eliminates 4 from D8, E1, E2, E3')
    })
  })

  describe('the split double: a link for each digit', () => {
    it('takes 1 and 4 from B2, between B8 and H2 (the example the article links)', () => {
      const s = fromWiki(SPLIT)
      const result = wWing(s)

      expect(removed(result)).toEqual(['B2:1', 'B2:4'])
      expect(result?.instances.map(picture)).toEqual([
        {
          cells: 'B8 H2 A8 A2 J8 H7',
          discs: 'B8:1 B8:4 H2:1 H2:4',
          rings: 'A8:4 A2:4 J8:1 H7:1',
          removes: 'B2:1 B2:4',
          units: 'row A, box 9',
          links: 'B8-A8 A8-A2 A2-H2 B8-J8 J8-H7 H7-H2',
          label: 'W-Wing on 1/4: B8/H2 linked by 4 in A8/A2 and 1 in J8/H7, eliminates 1/4 from B2',
        },
      ])
      expect(unsound(s, result!, solutionOf(SPLIT_PUZZLE))).toEqual([])
    })

    it('takes 6 and 7 from the cells that see B1 and A7 (the example the article pictures)', () => {
      const s = fromRows(SPLIT_PICTURED)
      const result = wWing(s)

      expect(removed(result)).toEqual(
        expect.arrayContaining(['A2:6', 'A2:7', 'A3:7', 'B7:6', 'B7:7', 'B9:6', 'B9:7']),
      )
      expect(joining(result, 'A7', 'B1').map(picture)).toEqual([
        {
          cells: 'A7 B1 G7 G1 H7 H1',
          discs: 'A7:6 A7:7 B1:6 B1:7',
          rings: 'G7:7 G1:7 H7:6 H1:6',
          removes: 'A2:6 B7:6 B9:6 A2:7 A3:7 B7:7 B9:7',
          units: 'row G, row H',
          links: 'A7-G7 G7-G1 G1-B1 A7-H7 H7-H1 H1-B1',
          label:
            'W-Wing on 6/7: A7/B1 linked by 7 in G7/G1 and 6 in H7/H1, ' +
            'eliminates 6 from A2, B7, B9; 7 from A2, A3, B7, B9',
        },
      ])
      expect(unsound(s, result!, solutionOf(s))).toEqual([])
    })

    it('finds the two of the diabolical puzzle', () => {
      const s = fromWiki(DIABOLICAL_STUCK)
      const result = wWing(s)

      expect(result?.instances.map(i => i.label)).toEqual([
        'W-Wing on 2/3: E5/H7 linked by 3 in F6/F7 and 2 in D6/D7, eliminates 2/3 from H5',
        'W-Wing on 2/3: H7/J6 linked by 3 in F7/F6 and 2 in D7/D6, eliminates 2 from H5, J7, J9; 3 from H4, H5, J7',
      ])
      expect(unsound(s, result!, solutionOf(DIABOLICAL_PUZZLE))).toEqual([])
    })
  })

  it('explains each kind in plain words', () => {
    const [double] = joining(wWing(fromWiki(REMOTE_PAIR_1)), 'A3', 'H7')
    expect(double.narrative).toBe(
      'A3, A9, G9 and H7 can each only be 4 or 9, and each sees the next. Cells that see each ' +
        'other cannot hold the same digit, so the two digits alternate along the chain and A3 and ' +
        'H7 end up different: one is 4, the other 9. A cell that sees both of them can be ' +
        'neither: 4 and 9 are removed from H3.',
    )

    const [single] = joining(wWing(fromWiki(SINGLE_1)), 'A6', 'F5')
    expect(single.narrative).toBe(
      'A6 and F5 can each only be 3 or 6. They cannot both be 6: the only places for 6 in ' +
        'column 3 are A3 and F3, and A3 sees A6 while F3 sees F5, so column 3 would be left ' +
        'without a 6. One of them is therefore 3, so 3 is removed from D6 and E6, which see ' +
        'both of them.',
    )

    const [split] = joining(wWing(fromRows(SPLIT_PICTURED)), 'A7', 'B1')
    expect(split.narrative).toBe(
      'A7 and B1 can each only be 6 or 7. They cannot both be 7: the only places for 7 in ' +
        'row G are G7 and G1, and G7 sees A7 while G1 sees B1, so row G would be left without ' +
        'a 7. They cannot both be 6 either: the only places for 6 in row H are H7 and H1, and ' +
        'H7 sees A7 while H1 sees B1. So one is 6 and the other 7, and a cell that sees both of ' +
        'them can be neither: 6 is removed from A2, B7 and B9 and 7 from A2, A3, B7 and B9.',
    )
  })

  it('is sound on every position of 200 solves', () => {
    const { fired, problems } = sweep(wWing, { puzzles: 200 })
    expect(problems).toEqual([])
    expect(fired).toBeGreaterThan(0)
  }, 120_000)

  describe('does not fire', () => {
    // A1 and F5 are 1/2; column 8 holds 2 in A8 and F8 alone, one in sight of each
    const rest = 'B8 C8 D8 E8 G8 H8 J8'
    const pattern = { ...all('A1 F5', '12'), ...all(rest, '13456789') }

    it('(it does fire on the pattern the cases below take apart)', () => {
      expect(removed(wWing(sketch(pattern)))).toEqual(['A5:1', 'F1:1'])
    })

    it('when the link is not strong: a third place for the digit in its unit', () => {
      expect(wWing(sketch({ ...pattern, D8: '123456789' }))).toBeNull()
    })

    it('when an end of the link sees neither of the two cells', () => {
      // the two places for 2 in column 8 are now A8 and G8
      expect(wWing(sketch({ ...pattern, F8: '13456789', G8: '123456789' }))).toBeNull()
    })

    it('when no cell that sees both holds the digit', () => {
      expect(wWing(sketch({ ...pattern, ...all('A5 F1', '23456789') }))).toBeNull()
    })

    it('when the two cells see each other', () => {
      // A1 and A5 share row A; F1 and F5, the only 2s of row F, would link them
      const s = sketch({ ...all('A1 A5', '12'), ...all('F2 F3 F4 F6 F7 F8 F9', '13456789') })
      expect(wWing(s)).toBeNull()
    })

    it('a second time, once its removals are made', () => {
      const s = fromWiki(SINGLE_1)
      const after = applyStratResult(s, wWing(s)!)
      for (const [p, q] of [['A6', 'F5'], ['B1', 'J8'], ['C1', 'J7']]) {
        expect(joining(wWing(after), p, q)).toEqual([])
      }
    })
  })

  it('gives each pair of cells one occurrence and leaves the position alone', () => {
    for (const s of [REMOTE_PAIR_1, REMOTE_PAIR_2, SINGLE_1, SINGLE_2, SPLIT, DIABOLICAL_STUCK].map(fromWiki)) {
      const before = s.candidates.map(set => [...set].join(''))
      const result = wWing(s)!
      const ends = result.instances.map(({ patternCells: [p, q] }) => `${cellLabel(p)}/${cellLabel(q)}`)

      expect(new Set(ends).size).toBe(ends.length)
      expect(s.candidates.map(set => [...set].join(''))).toEqual(before)
      expect(wWing(s)).toEqual(result)
    }
  })
})
