import { describe, expect, it } from 'vitest'
import { applyStratResult, isSolved, loadPuzzle } from '../board'
import { findNextStrategy, STRATEGY_META } from '../solver'
import { fromWiki, removed, solutionOf, sweep, unsound } from '../testing'
import type { CandidateAnnotation, Snapshot, StratInstance, StratResult } from '../types'
import { cellLabel, ROW_LABELS } from '../utils'
import { medusa } from './medusa'

// The basic and tough strategies: what runs before the diabolical tier. These
// solves leave the other diabolical strategies out, so they show this one.
const BEFORE = new Set(STRATEGY_META.filter(meta => meta.category !== 'diabolical').map(meta => meta.name))

// The worked examples of sudokuwiki.org/3D_Medusa: the position each "Load
// Example" link opens, and its puzzle from the start.
const RULE_1 = {
  at: 'S9B2b0903080b04050f2b2j0h05067q0n7u2f0b020r067r070e7u0n0h0c020a0g060i0h040e8i1m7u020e080c2b2b0e070h0n040n0b090f0h0e7u7u010f070b030r0v0g7y0h02060e7u8i1q02057q0701087u',
  start: '093804500005600000206070000020060040000208000070040090000010703000002600002507180',
}
const RULE_2 = {
  at: 'S9B034zabb7050b1m9mcy0205aa03be7u3601cy7n430406b707050b0c1f090c023e0r082i050e071hb6c27v7x037n040l089e0c059f062dab1h05049f08039e9h9f037p0e9f069h08040h0d7n9f020c9f0e06',
  start: '300050000250300010004607500090200805070000030408005060005408300030006084000020006',
}
const RULE_3 = {
  at: 'S9B02093f1u2q1m0h030z1743575i025a0i071v2u5y6q016a09041u02080d0e07060a020i0c060p0lbcb6480e0d072e2g090o04051f1f08094503044j071f101u0r064d4k03440g110i2b052d8k7n1g0c0804',
  start: '290000030000020070000109402800760200600000007009045008903407000060030000050000084',
}
const RULE_4_START = '100056000043090000800003002000000010950421037020000000300900005000010970000670001'
const RULE_4 =
  'S9B019e7o5w050662be0c1w04035x095u6b5e4y08aa8y2b0d032r8y022i0c4a0e0fcy0b017u09054y0402014y03073e020a5u0ccy5m5m8q030a0g090h0s1m1o05244y180c011809074a18b68c0607180c4c01'
// a few steps later in the same solve
const RULE_4_LATER =
  'S9B019e7o5w050662be0c1004035x095u6b5e4y08aa8y2b0d032r82022i0c4a0e0fcy0b017u09054y0402014y03073e020a5u0ccy5m5m8q030a0g090h0s1m1o05244y180c011809074a18b68c0607180c4c01'
const RULE_5 = {
  at: 'S9B8j03074y0443020eb6088a8y3m9e02010c7u7p8d844ib70c0f0gbe047o0a5u5u060e7o030g060c020e090d080a050h7o010c0d0g7o068i9u8y0d4y6a0c0a0b1h2d08031h2b0i0d050c11040i0l0z080607',
  start: '037040200800002100000000000400006003060209080500100006000000000008300005004000867',
}
const RULE_6 = {
  at: 'S9B0f4m4j04b77q4i0g02440d09440g0501030f4p4o0g45060o0d094i7t070l0f05087o0d7r4o4o067n7n0d074k4mbn4i0d03020gbm06bn4k094k4k040f0c0a0g0d010307b67o064k82070f4kbo0c01b84404',
  start: '000400002009005130000060090070058000006000700000320060090040000013700600700001004',
}
const RULE_6_THREE = {
  at: 'S9B0912080n020v16070606100sba8607014aba01070uc6968q8202ba5u4405041i1i2c09010309010708021m1m0504062c7n7n0508032c5u042e1l1j538i057o0546067s7y7y2c015u02010905074y034y04',
  start: '908020076000000100070000020005400091300702005460005800040000050006000000210070304',
}
const RULE_7 = {
  at: 'S9B069o9mcz050362430t0o2o080f2i2d090e0x010e9qcy9md062060w047q7q050a0f0b070844440e9i9i9e010d0f07010f0b0h040e0c09bm060rbb7qbn4a0b07bm6202cy06de03b70rba5y2f0402cz0fb605',
  start: '600053000008000900100000060400500078000000100710004009060000007002060300000420005',
}
const RULE_7_WHOLE_UNIT = {
  at: 'S9B041k1k0h0e1g0g01090h1g0701040i121w0o090a0e1g070c0d1g0h0g0h0l030i0e060d0l0p05042c0f2d0i080p1j1k090d0h0l1210070o0d0o3601360h0i051f0i1f0e0308020g0d05070h0i0b0d0a0c06',
  start: '400000019007140000900070000000300600054000080009000007000010005000038200570000006',
}
// Klaus Brenner's 37 removal Rule 1. The link gives values only; the
// candidates of its 43 open cells, in board order, are read off the picture.
const KLAUS = {
  values: '000908430004702680081054002005003129000520308000090560000079810017005006400106050',
  candidates:
    '567 267 26 16 15 59 359 13 15 36 36 79 79 78 47 68 46 169 469 69 17 47 12 23 38 48 17 47 256 56 36 24 34 38 23 48 29 49 29 289 38 27 37',
  start: '000900030004700600081054002005000000000020308000090060000070800017000000400106050',
}

// The article's exemplars: puzzles that need 3D Medusa somewhere in the solve.
const EXEMPLARS = [
  '007000103190000086000040000060302000510000090000905010000020000950000021802000500',
  '800100305002000800300608700001500000070000060000003100004307008006000200203009001',
  '000000009010503000003290700400001300900050008006300005008037400000108060700000000',
  '900008007000000060000710403005030006009802000100090800403059000050000000700600000',
  '001042000000309000790000080408000900009618200005000806050000031000403000000170600',
  '000502000000070021501006800104000000050708090000000604006400205410030000000601000',
  '190030005064000020500000000006007100907080604001400700000000009040000570700020068',
  '009010500040500090200003017000060008000209000700030000960100002030008070005020600',
  '006000510000007000200500068090020007160050082800090040670002005000400000024000600',
  '050300200090007004000006000007008501800070002205900700000400000300800050009003060',
  '005000761000100009000003000400012300120000094009870006000500000600001000973000400',
  '920080010060004000008030700530000002000308000800000045009060400000100030040020071',
]

/** The candidates an occurrence marks one way, as sorted `cell:digit` labels. */
function marked(instance: StratInstance, kind: CandidateAnnotation['kind']): string[] {
  return instance.candidateAnnotations
    .filter(a => a.kind === kind)
    .map(a => `${cellLabel(a.cell)}:${a.digit}`)
    .sort()
}

function links(instance: StratInstance): string[] {
  return (instance.links ?? []).map(([a, b]) => `${cellLabel(a)}-${cellLabel(b)}`).sort()
}

/** The index of a cell from its label. */
function cellAt(label: string): number {
  return ROW_LABELS.indexOf(label[0]) * 9 + Number(label[1]) - 1
}

/** The one occurrence of a result, checked sound against the puzzle's solution. */
function only(s: Snapshot, result: StratResult | null, start: string): StratInstance {
  expect(result?.name).toBe('3D Medusa')
  expect(unsound(s, result!, solutionOf(start))).toEqual([])
  expect(result!.instances).toHaveLength(1)
  return result!.instances[0]
}

describe('3D Medusa', () => {
  it('rule 1: removes the side that holds two digits of one cell', () => {
    const s = fromWiki(RULE_1.at)
    const before = structuredClone(s)
    const result = medusa(s)
    expect(s).toEqual(before)
    const web = only(s, result, RULE_1.start)

    // the article's yellow side, with 1 and 3 both in H2
    const article = ['B5:9', 'B7:4', 'C2:4', 'C7:9', 'H2:1', 'H2:3', 'J5:3']
    expect(removed(result)).toEqual(expect.arrayContaining(article))
    // H1 holds only 1 and 4 in the position the link opens (the picture shows a
    // 9 there too), so its 4 joins the web on the false side; and the 4s of H4
    // and J2 see a false 4 and hold a true 3 (rule 5)
    expect(removed(result)).toEqual([...article, 'H1:4', 'H4:4', 'J2:4'].sort())
    expect(web.label).toMatch(/^3D Medusa, rules 1 and 5: 1&3 on one side in H2/)
    expect(marked(web, 'highlight')).toEqual(
      ['B1:4', 'B5:3', 'B7:9', 'C2:1', 'C4:9', 'C7:4', 'H1:1', 'H4:3', 'J2:3', 'J5:9'],
    )
    expect(marked(web, 'alternate')).toEqual([])
    expect(web.patternCells.map(cellLabel)).toEqual(
      ['B1', 'B5', 'B7', 'C2', 'C4', 'C7', 'H1', 'H2', 'H4', 'J2', 'J5'],
    )
    expect(web.units).toEqual([])
    expect(links(web)).toContain('C2-H2')
    expect(web.solvedCells).toEqual([])
  })

  it('rule 1: Klaus Brenner\'s web that leaves only singles', () => {
    const values = KLAUS.values.split('').map(Number)
    const sets = KLAUS.candidates.split(' ')
    let open = 0
    const s: Snapshot = {
      values: values.map(v => (v === 0 ? null : v)),
      candidates: values.map(v => (v === 0 ? new Set(sets[open++].split('').map(Number)) : new Set<number>())),
    }
    expect(open).toBe(sets.length)

    const result = medusa(s)
    const web = only(s, result, KLAUS.start)
    expect(web.label).toMatch(/^3D Medusa, rules 1 and 5: 5&7 on one side in A1/)
    // the article's 37, and three more the true side's cells rule out (rule 5)
    expect(removed(result)).toHaveLength(40)

    let after = applyStratResult(s, result!)
    const singles = new Set(['Naked Singles', 'Hidden Singles'])
    for (let step = 0; step < 81 && !isSolved(after); step++) {
      const next = findNextStrategy(after, singles)
      if (!next) break
      after = applyStratResult(after, next)
    }
    expect(isSolved(after)).toBe(true)
  })

  it('rule 2: removes the side with a digit twice in a unit', () => {
    const s = fromWiki(RULE_2.at)
    const result = medusa(s)
    const web = only(s, result, RULE_2.start)

    // the 7s of B7 and J7, both in column 7: exactly the article's yellow side
    expect(removed(result)).toEqual(['A7:6', 'A8:4', 'B3:6', 'B7:7', 'D8:7', 'E7:4', 'F4:7', 'F7:9', 'J7:7'])
    expect(web.label).toMatch(/^3D Medusa, rule 2: 7 twice on one side in column 7/)
    expect(marked(web, 'highlight')).toEqual(['A7:4', 'B7:6', 'D5:7', 'D8:4', 'E6:4', 'F4:9', 'J4:7'])
    expect(web.units).toEqual([{ kind: 'col', index: 6 }])
    expect(links(web)).toEqual(
      ['A7-A8', 'A7-B7', 'A7-E7', 'A8-D8', 'B3-B7', 'D5-D8', 'D5-F4', 'D8-E7', 'E6-E7', 'F4-F7', 'F4-J4', 'J4-J7'],
    )
  })

  it('rule 3: clears a cell that holds both sides', () => {
    const s = fromWiki(RULE_3.at)
    const result = medusa(s)
    const web = only(s, result, RULE_3.start)

    // the loop of 3s and 7s through C1, C2, F1, F2: C2 is 3 or 7, never 8
    expect(removed(result)).toEqual(['C2:8'])
    expect(web.label).toBe('3D Medusa, rule 3: a candidate ruled out by both sides, eliminates 8 from C2')
    expect(marked(web, 'highlight')).toEqual(['C1:3', 'C2:7', 'F1:7'])
    expect(marked(web, 'alternate')).toEqual(['C2:3', 'F1:3', 'F2:7'])
    expect(web.patternCells.map(cellLabel)).toEqual(['C1', 'C2', 'F1', 'F2'])
    expect(links(web)).toEqual(['C1-C2', 'C1-F1', 'C2-F2', 'F1-F2'])
    expect(web.units).toEqual([])
    expect(web.narrative).toContain('C2 holds both sides (7 and 3), so it cannot be 8')
  })

  it('rule 4: removes what sees its digit on both sides', () => {
    const s = fromWiki(RULE_4)
    const result = medusa(s)
    const web = only(s, result, RULE_4_START)

    // the 6 in B1 sees B9 and C2; the 6 in C8 sees C2 and B9
    expect(removed(result)).toEqual(['B1:6', 'C8:6'])
    expect(marked(web, 'highlight')).toEqual(['B9:6', 'H2:6', 'H9:8', 'J2:8', 'J3:9'])
    expect(marked(web, 'alternate')).toEqual(['B9:8', 'C2:6', 'F9:6', 'H1:6', 'H2:8', 'H9:4', 'J2:9', 'J8:8'])
    expect(web.narrative).toContain('The 6 in B1 sees a disc 6 (B9) and a ring 6 (C2)')
  })

  it('rule 4: a later web of 4s, 6s and 8s in the same solve', () => {
    const s = fromWiki(RULE_4_LATER)
    const result = medusa(s)
    const web = only(s, result, RULE_4_START)
    expect(removed(result)).toEqual(['B6:8', 'D9:4', 'F7:6', 'F8:6', 'H3:4'])
    expect(web.patternCells).toHaveLength(16)
    expect(web.label).toMatch(/^3D Medusa, rule 4: 5 candidates ruled out by both sides/)
  })

  it('rule 5: removes what sees one side and holds the other', () => {
    const s = fromWiki(RULE_5.at)
    const result = medusa(s)
    const web = only(s, result, RULE_5.start)

    // the 1 in H1 sees the 1 of A1 and holds the 6 of the other side, and the
    // 6 in A1 the reverse (the article's text says four removals, its picture two)
    expect(removed(result)).toEqual(['A1:6', 'H1:1'])
    expect(marked(web, 'highlight')).toEqual(['A1:1', 'A6:8', 'C5:1', 'G5:8', 'H5:6'])
    expect(marked(web, 'alternate')).toEqual(['A6:1', 'G5:6', 'G6:8', 'H1:6'])
    expect(links(web)).toEqual(['A1-A6', 'A6-C5', 'A6-G6', 'G5-G6', 'G5-H5', 'H1-H5'])
    expect(web.narrative).toContain('the 1 in H1 sees a disc 1 (A1) and has a ring in its own cell (the 6)')
  })

  it('rule 6: removes the side that would empty a cell off the web', () => {
    const s = fromWiki(RULE_6.at)
    const result = medusa(s)
    const web = only(s, result, RULE_6.start)

    // the 2 and 9 of D7 see the 2 of D3 and the 9 of J7, on one side
    expect(removed(result)).toEqual(['A3:1', 'C4:1', 'D3:2', 'E4:9', 'E5:1', 'E8:5', 'H9:5', 'J7:9'])
    expect(web.label).toMatch(/^3D Medusa, rule 6: one side empties D7/)
    // D7 is off the web, but outlined with it: it is the cell the rule is about
    expect(web.patternCells.map(cellLabel)).toContain('D7')
    expect(web.candidateAnnotations.some(mark => cellLabel(mark.cell) === 'D7')).toBe(false)
    expect(marked(web, 'highlight')).toEqual(['A5:1', 'C1:1', 'D3:1', 'E4:1', 'E5:9', 'H8:5', 'H9:9', 'J4:9'])
    expect(web.narrative).toContain('its 2 sees the 2 in D3 and its 9 sees the 9 in J7')
  })

  it('rule 6: a cell of three candidates', () => {
    const s = fromWiki(RULE_6_THREE.at)
    const result = medusa(s)
    const web = only(s, result, RULE_6_THREE.start)

    // the 4, 6 and 9 of C6 see A6, J6 and C7
    expect(web.label).toMatch(/^3D Medusa, rule 6: one side empties C6/)
    expect(removed(result)).toHaveLength(27)
    expect(removed(result)).toEqual(expect.arrayContaining(['A6:4', 'J6:6', 'C7:9']))
    expect(web.narrative).toContain('its 4 sees the 4 in A6, its 6 sees the 6 in J6 and its 9 sees the 9 in C7')
  })

  it('rule 7: removes the side that would empty a unit of a digit', () => {
    const s = fromWiki(RULE_7.at)
    const result = medusa(s)
    const web = only(s, result, RULE_7.start)

    // the false side: the article's yellow candidates
    expect(removed(result)).toEqual(['A8:1', 'G3:1', 'G7:4', 'H2:4', 'H9:1', 'J6:1'])
    // The article points at box 2, whose only 1s, A4 and B6, see A8 and J6.
    // Row B is emptied as well (its 1s are B6 and B9, in sight of J6 and A8)
    // and rows are looked at first, as Simple Colouring does.
    expect(web.units).toEqual([{ kind: 'row', index: 1 }])
    expect(web.narrative).toContain('B6 and B9 are the only places for 1 in row B')
    expect(marked(web, 'highlight')).toEqual(['A8:8', 'G3:4', 'G7:8', 'H8:1', 'H9:4', 'J3:1'])
    expect(links(web)).toEqual(['A8-H8', 'G3-G7', 'G3-H2', 'G3-J3', 'G7-H9', 'H2-H9', 'H8-H9', 'J3-J6'])
  })

  it('rule 7: a unit of three places', () => {
    const s = fromWiki(RULE_7_WHOLE_UNIT.at)
    const result = medusa(s)
    const web = only(s, result, RULE_7_WHOLE_UNIT.start)

    // the 2s of row F, F2, F6 and F8, are seen from B2, A6 and C8
    expect(removed(result)).toEqual(['A6:2', 'B2:2', 'B8:6', 'C4:6', 'C8:2', 'E4:2', 'E6:7', 'G4:7', 'G6:6'])
    expect(web.units).toEqual([{ kind: 'row', index: 5 }])
    expect(web.narrative).toContain('F2, F6 and F8 are the only places for 2 in row F')
    expect(marked(web, 'highlight')).toEqual(['A6:6', 'B2:6', 'C4:2', 'C8:6', 'E4:7', 'G4:6', 'G6:7'])
  })

  it('is sound on the article\'s exemplars, and brings most of them home', () => {
    let calls = 0
    let solved = 0
    for (const puzzle of EXEMPLARS) {
      const solution = solutionOf(puzzle)
      let s = loadPuzzle(puzzle).snapshot
      for (let step = 0; step < 729 && !isSolved(s); step++) {
        let next = findNextStrategy(s, BEFORE)
        if (!next) {
          next = medusa(s)
          if (!next) break
          calls++
          expect(unsound(s, next, solution), puzzle).toEqual([])
        }
        s = applyStratResult(s, next)
      }
      if (isSolved(s)) solved++
    }
    // 2 and 12 need strategies past this one; 3 is solved by the tough tier alone
    expect(calls).toBeGreaterThanOrEqual(9)
    expect(solved).toBeGreaterThanOrEqual(10)
  }, 60_000)

  it('is sound on every position of 200 solves', () => {
    const { fired, problems } = sweep(medusa, { puzzles: 200 })
    expect(problems).toEqual([])
    expect(fired).toBeGreaterThan(0)
  }, 180_000)

  it('draws a web that crosses digits, each link between the two sides, and is quick', () => {
    let calls = 0
    let spent = 0
    let worst = 0
    const found: StratInstance[] = []
    const watched = (snapshot: Snapshot) => {
      const started = performance.now()
      const result = medusa(snapshot)
      const took = performance.now() - started
      calls++
      spent += took
      worst = Math.max(worst, took)
      if (result) found.push(...result.instances)
      return result
    }
    const { problems } = sweep(watched, { puzzles: 60, seed: 2 })
    expect(problems).toEqual([])
    expect(found.length).toBeGreaterThan(0)
    console.log(
      `3D Medusa: ${found.length} occurrences over ${calls} positions, ` +
        `${((spent / calls) * 1000).toFixed(1)} µs a call, worst ${worst.toFixed(2)} ms`,
    )

    for (const instance of found) {
      // a candidate is marked once
      const keys = instance.candidateAnnotations.map(a => `${a.cell}:${a.digit}`)
      expect(new Set(keys).size, instance.label).toBe(keys.length)
      // a web of one digit is Simple Colouring's
      const digits = new Set(
        instance.candidateAnnotations.filter(a => instance.patternCells.includes(a.cell)).map(a => a.digit),
      )
      expect(digits.size, instance.label).toBeGreaterThan(1)
      // the two ends of a link hold a digit on opposite sides
      const kind = new Map(instance.candidateAnnotations.map(a => [`${a.cell}:${a.digit}`, a.kind]))
      for (const [a, b] of instance.links ?? []) {
        const across = [1, 2, 3, 4, 5, 6, 7, 8, 9].some(d => {
          const [x, y] = [kind.get(`${a}:${d}`), kind.get(`${b}:${d}`)]
          return x !== undefined && y !== undefined && x !== y
        })
        expect(across, `${instance.label}: ${cellLabel(a)}-${cellLabel(b)}`).toBe(true)
      }
    }
  }, 120_000)

  it('needs every candidate of the cell in sight for rule 6', () => {
    const s = fromWiki(RULE_6.at)
    const withExtra = (digit: number): Snapshot => ({
      values: s.values,
      candidates: s.candidates.map((set, cell) => (cell === cellAt('D7') ? new Set([...set, digit]) : set)),
    })
    // a 4 pencilled into D7: row D, column 7 and box 6 have no other 4, so the
    // web is unchanged, but no 4 of it sees D7 and the cell keeps a candidate
    expect(medusa(withExtra(4))).toBeNull()
    // a 5 there is in sight of the false side's 5 in E8, so the cell still empties
    expect(medusa(withExtra(5))?.instances[0].label).toMatch(/^3D Medusa, rule 6: one side empties D7/)
  })

  it('needs every place of the unit in sight for rule 7', () => {
    // a third 2 pencilled into row F, at F1, where no 2 of the false side sees it
    const s = fromWiki(RULE_7_WHOLE_UNIT.at)
    const pencilled: Snapshot = {
      values: s.values,
      candidates: s.candidates.map((set, cell) => (cell === cellAt('F1') ? new Set([...set, 2]) : set)),
    }
    // row F keeps a 2 whichever side is true; what is left to find is the new
    // 2 itself, which sees the 2 of D3 on one side and holds the 6 of the other (rule 5)
    const result = medusa(pencilled)
    expect(result?.instances).toHaveLength(1)
    expect(result!.instances[0].label).not.toContain('row F of 2')
    expect(removed(result)).toEqual(['F1:2'])
    expect(unsound(pencilled, result!, solutionOf(RULE_7_WHOLE_UNIT.start))).toEqual([])
  })

  it('leaves a chain of one digit to Simple Colouring', () => {
    // Simple Colouring's rule 2 example: its chain of 8s through J6 and J8
    // would remove five 8s, and is no web here
    const s = fromWiki(
      'S9B2b0i0f0e0d0b5v035v2j0r020h090c050f2b0e080c070a060b0i04090g430b05040c43064a030e0a0f0i4a070b060b0r03080g0r0e090316be060g01b6024i430z070i024i060d0c0b06b60d0c4icz436b',
    )
    const result = medusa(s)
    for (const instance of result?.instances ?? []) {
      const digits = new Set(instance.candidateAnnotations.map(a => a.digit))
      expect([...digits], instance.label).not.toEqual([8])
    }
    if (result) {
      expect(unsound(s, result, solutionOf('000000030002090500080706004900054006030000070600380009300601020007020600060000000'))).toEqual([])
    }
  })

  it('finds nothing on an open board', () => {
    expect(medusa(loadPuzzle('0'.repeat(81)).snapshot)).toBeNull()
  })
})
