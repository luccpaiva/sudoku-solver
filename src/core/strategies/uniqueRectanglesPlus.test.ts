import { describe, expect, it } from 'vitest'
import { applyStratResult, isSolved, loadPuzzle } from '../board'
import { findNextStrategy, STRATEGY_META } from '../solver'
import { fromWiki, removed, solutionOf, sweep, unsound } from '../testing'
import type { CandidateAnnotation, Snapshot, StratInstance, StratResult, UnitRef } from '../types'
import { unitCells } from '../units'
import { cellLabel, ROW_LABELS } from '../utils'
import { uniqueRectangleGuardians } from './uniqueRectanglesPlus'

// The worked examples of sudokuwiki.org/Unique_Rectangles: the position each
// "Load Example" link opens, and its puzzle from the start.
const EXAMPLES = {
  type1: {
    at: 'S9B7n030z0d082c9g2q0f7u02070f0a0e7u0h0c0f160h090c2c2c16010e0a090h0g0403060b0c2i06020i0a082i0e2i0802050f0c010i2i082q0u2e0b062y0a092b0i0u0n0e0h06022i0b0f0z2b040i2q030h',
    start: '030080000027000000000900001009004360006200800082500100800006009000000620000040030',
  },
  type2: {
    at: 'S9B0d022r0i2r2r0c0h0f1306130b4n4j070904082e090u062i020e0a070r4z56be037n0b0e09164i0162020f2i030b0v1j059mai7n2i080n7r044602b6050f070608020g0z0z0d030i129u2q1q7y8q0h010b',
    start: '020000000060000794809060200700003000900102003000500008004020507682000030000000010',
  },
  type2Second: {
    at: 'S9B17071n091v032208024vcm8v5f024zb29y2m02cm8m045e07928601060u055u4602012m090n027r2q86045y065y077y081f7q1f020u0509462m024b05662f064u1y024z074zby874e4q013e0356096i0262',
    start: '070903080000020000200407001605000109020000060708000205900205006000070000010309020',
  },
  type2b: {
    at: 'S9B2c0d0a080f050c0i2c5w092s0n040n6a065w4y031u0g090b0d4i011i0b08132u2f0i041u050a0i060b045u5u031q071m0i120h020a1u010e2m0u082e0f0b092k062k16010i6a03620i0h2m022u060a2q2i',
    start: '000805000090040060030090001008000040500604003070000200100080009060010030000206000',
  },
  type2C: {
    at: 'S9B0h2k090w1n1g2e053b0e031f081n078k1p7o1n0s371c091w081n3b0b090d062q0h01032q070h1i0914011w1g041i01052c2g0438090h7z2i022y088y121f937u0e0h011m037o078k7r062f2s2c84040h87',
    start: '009000050030807000000090800090600130700901004015004090002080000000103070060000400',
  },
  type2D: {
    at: 'S9B2i0h10391p1o2s030i060a102c09032y0h2y032i0i08050s2c0a060h060a140o070904100i0c041w1g0h012q2s0b0507090r0r0h060c017u1i1k07051q7o082q9e1i04088k3q9w012y020h1j1j8j3y9u2y',
    start: '000000030600093000300850006060007940004000100057900060100075008000480001020000000',
  },
  type2DSecond: {
    at: 'S9B1f0b1v43030d6q8ydu08090d0e0f070o0o0103071v430i020d1u4y2c045u030e0f0a7ob80l060n0g080i0e040o0i0e460b0d01520752360c0i040b0h360105050a02060g0c0i08040d0h360i010e3c1k3c',
    start: '000030000890007001370002000040300000060080040000001070000400015502600084000010000',
  },
  type3: {
    at: 'S9B8i8i45050l03040743052e0l082d047r067q042e432b09064705020805070p0n09060l040302040643070509437n7n060s4a054403070208052e06019i047q371f092m2m082h0l052b04030905022b0806',
    start: '000503470500800000000090002850000600024607590006000037200060000000008005043902000',
  },
  type3b: {
    at: 'S9B9e2b83020z06080d030u43020i470v3605360u064i074m1a0b0a09380d034z092d374y05aa05c253372f3b020d015w4y5i042w095236050i0d1j1l081i070l1g031f0z2t2r040i0h080l070d1i090e1i0l',
    start: '000206803002000050060700009003090005050000020100040900500008070030000400807009000',
  },
  type3bTriple: {
    at: 'S9B4o04014k1y5e070i484o0f0i6c126a0d48014846077n047n0f05482e09102y082y010o0f0d5v1006830382445w5z5z069v029v82045y0f050d0c070b080a0i09020h0r1f1n0c0g052b2b03bm82bm02060d',
    start: '800900000020070050019500600200000970100000008054000002001009720090050060000006004',
  },
  type3bTripleSecond: {
    at: 'S9B7u060c0e2i0h01029e7u070b031m01cic2820e0h0a09381g3a043a0g0a161o0390968i080h03091m0a1u020722060b160g08828e7q0a0a054y5009075a521s0c0i4y011g046q05380b04074y0e0cc2018i',
    start: '060000120070301000000900040000030008039000270600080000050097000000104050047000010',
  },
  type4: {
    at: 'S9B0d032s3o0937435u5x10432s462s47060i04094306642c6303052d14061001087o070d7q46090a3604360e0246440g047o0305b6010f0a04087q367q023605071003181w4c7n4y7n0f100i6c015w0d035u',
    start: '030090000000000604906000350060180700090040020004035010048000205703000000000010030',
  },
  type4b: {
    at: 'S9B0g0d0h030e09010b0686820a070b0f0h047q7q0b060d4343077q05021u7q8j040z8608071u0g0dc20c4k848j7n01087q8i0710108m04047q020z7n0g06870h8i010g4ic2030d820b088m05028j047q0g7r',
    start: '000309106000700040006000705200040087000000000180070004402000600010003000805204000',
  },
  type5: {
    at: 'S9B07bmbq0484064448017u028m089f2b3e3a05015m5e0c2s2c70093g038j049g2d056s6s38b8071u7o034422011m440z11062l65032s097w039h0e3g2k7n380805b7d12c6s037n0438064a5w0164092s2s03',
    start: '700406001020800005100000090304005000070030010000600309030000008500003040600109003',
  },
  type5Second: {
    at: 'S9B1m091g0t080e0l070c034c051p071m8lb74z440g011k0i1i1w4i04070604090c0b0z4j4j050a0i5u0f5u0d0c0244440c0e0d010706090918383i0a3i08161u1n164y5602ca038b071n036q6y05e28j021f',
    start: '090080070305070000001000004764900000500000002000001769900000800000020307030050020',
  },
}

// Klaus Brenner's Exemplar 6 from the same article, at the step where the
// solver (singles and Unique Rectangles only) stalls: it holds a Type 3b
// pseudo-cell in a triple and in a quad. The article's two triple examples
// fall to the simpler Type 2D first, so this position covers the triples.
const EXEMPLAR_6 = {
  at: 'S9B06050d070b087n7r7q0c020a0i060d4i0g4i0i0g0h030a0e0f0402080u0g0f0e027u7q01011i1w04090g4k1k4m18091w0h030a301g2y2k080c0l2i092l050f2k1n8k052i0c9p089m300r840l0h0f037p9m',
  start: '650708000020060000000300042800002001100490000090030000080009050000500080000000300',
}

/** Run on an example: unchanged input, sound output, and the result. */
function solve(example: { at: string; start: string }): StratResult {
  const snapshot = fromWiki(example.at)
  const before = structuredClone(snapshot)
  const result = uniqueRectangleGuardians(snapshot)
  expect(snapshot).toEqual(before)
  expect(result).not.toBeNull()
  expect(unsound(snapshot, result!, solutionOf(example.start))).toEqual([])
  return result!
}

/** The one occurrence whose label starts so. */
function occurrence(result: StratResult, label: string): StratInstance {
  const found = result.instances.filter(instance => instance.label.startsWith(label))
  expect(found).toHaveLength(1)
  return found[0]
}

/** An occurrence's marks of one kind, as `cell:digit` in board order. */
function marked(instance: StratInstance, kind: CandidateAnnotation['kind']): string[] {
  return instance.candidateAnnotations
    .filter(a => a.kind === kind)
    .sort((p, q) => p.cell - q.cell || p.digit - q.digit)
    .map(a => `${cellLabel(a.cell)}:${a.digit}`)
}

function cells(instance: StratInstance): string[] {
  return instance.patternCells.map(cellLabel)
}

function unitNames(instance: StratInstance): string[] {
  return instance.units.map(({ kind, index }) => `${kind} ${kind === 'row' ? ROW_LABELS[index] : index + 1}`)
}

/** The index of a cell from its label. */
function cellAt(label: string): number {
  return ROW_LABELS.indexOf(label[0]) * 9 + Number(label[1]) - 1
}

/**
 * A made-up position: every cell empty with all nine candidates, but for the
 * planted ones, and with a digit taken out of a unit except where kept. Too
 * open for any rectangle but a planted one to come to anything.
 */
function board(planted: Record<string, string>, cleared: Array<[number, UnitRef, string[]]> = []): Snapshot {
  const candidates = Array.from({ length: 81 }, () => new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]))
  for (const [cell, digits] of Object.entries(planted)) candidates[cellAt(cell)] = new Set([...digits].map(Number))
  for (const [digit, unit, kept] of cleared) {
    for (const cell of unitCells(unit)) if (!kept.includes(cellLabel(cell))) candidates[cell].delete(digit)
  }
  return { values: Array(81).fill(null), candidates }
}

describe('unique rectangle guardians', () => {
  it('type 2: the roof shares one extra digit, so cells seeing the whole roof lose it', () => {
    const result = solve(EXAMPLES.type2)
    // "So A3 and C6 can have 7 removed."
    expect(removed(result)).toEqual(['A3:7', 'C6:7'])
    const step = occurrence(result, 'Type 2 on 1/5: rows A&H, columns 5&6')
    expect(cells(step)).toEqual(['A5', 'A6', 'H5', 'H6'])
    expect(marked(step, 'alternate')).toEqual(['A5:7', 'A6:7'])
    expect(marked(step, 'highlight')).toEqual(['A5:1', 'A5:5', 'A6:1', 'A6:5', 'H5:1', 'H5:5', 'H6:1', 'H6:5'])
    expect(unitNames(step)).toEqual(['row A', 'box 2'])
    expect(step.links!.map(([p, q]) => `${cellLabel(p)}-${cellLabel(q)}`)).toEqual(['A5-A6', 'A6-H6', 'H6-H5', 'H5-A5'])
  })

  it("type 2, the article's second example: the second step after the Type 5", () => {
    const result = solve(EXAMPLES.type2Second)
    // "choose the second Unique Rectangle after the Type 5 which is found first"
    expect(result.instances[0].label).toMatch(/^Type 5 /)
    const step = result.instances[1]
    expect(step.label).toMatch(/^Type 2 on 1\/6: rows F&H, columns 4&6/)
    // "8's aligned with the brown cells are eliminated": row H and box 8
    expect(marked(step, 'eliminate')).toEqual(['G5:8', 'H1:8', 'H7:8', 'H9:8', 'J5:8'])
    expect(marked(step, 'alternate')).toEqual(['H4:8', 'H6:8'])
  })

  it('type 2b: a roof across two boxes only clears its row', () => {
    const result = solve(EXAMPLES.type2b)
    // "B7 cannot contain a 8"
    expect(removed(result)).toContain('B7:8')
    const step = occurrence(result, 'Type 2b on 2/7: rows A&B, columns 1&9')
    expect(marked(step, 'eliminate')).toEqual(['B7:8'])
    expect(marked(step, 'alternate')).toEqual(['B1:8', 'B9:8'])
    expect(unitNames(step)).toEqual(['row B'])
  })

  it('type 2C: guardians on a diagonal, removed from cells that see both', () => {
    const result = solve(EXAMPLES.type2C)
    // "6 Must exist in one of those two cells [B7 and H9]"
    expect(removed(result)).toEqual(['A9:6', 'C9:6'])
    const step = occurrence(result, 'Type 2C on 2/9: rows B&H, columns 7&9')
    expect(marked(step, 'alternate')).toEqual(['B7:6', 'H9:6'])
    expect(unitNames(step)).toEqual(['box 3'])
  })

  it('type 2D: the one cell outside the roof that holds 3 or 6 keeps only those', () => {
    const result = solve(EXAMPLES.type2D)
    // "allowing {4,5,7} to be removed from J7"
    expect(removed(result)).toEqual(['J7:4', 'J7:5', 'J7:7'])
    const step = occurrence(result, 'Type 2D on 3/6: rows G&H, columns 3&7')
    expect(cells(step)).toEqual(['G3', 'G7', 'H3', 'H7', 'J7'])
    expect(marked(step, 'alternate')).toEqual(['J7:3', 'J7:6'])
  })

  it("type 2D, the article's second example: 6 and 7 go from J9", () => {
    const result = solve(EXAMPLES.type2DSecond)
    // "2 and 3 only exist in J9 outside the roof tiles ... elimination of 6 and 7 there"
    expect(removed(result)).toEqual(['J9:6', 'J9:7'])
    expect(result.instances[0].label).toMatch(/^Type 2D on 2\/3: rows B&J, columns 7&8/)
  })

  it('type 3: the roof acts as one cell and makes a naked pair with J7', () => {
    const result = solve(EXAMPLES.type3)
    // "Choose the second after the Type 5"
    expect(result.instances[0].label).toMatch(/^Type 5 /)
    const step = result.instances[1]
    expect(step.label).toBe('Type 3 on 3/9: rows B&G, columns 7&9, set with J7, eliminates 1 from C7; 1/7 from H7')
    // "There are 1s and 7s in C7 and H7 which can be eliminated" (C7 has no 7)
    expect(marked(step, 'eliminate')).toEqual(['C7:1', 'H7:1', 'H7:7'])
    expect(marked(step, 'alternate')).toEqual(['B7:1', 'G7:7', 'J7:1', 'J7:7'])
    expect(cells(step)).toEqual(['B7', 'B9', 'G7', 'G9', 'J7'])
    expect(unitNames(step)).toEqual(['col 7'])
  })

  it('type 3b: a roof in one box pairs with A5 in that box', () => {
    const result = solve(EXAMPLES.type3b)
    const step = occurrence(result, 'Type 3b on 3/4: rows B&C, columns 1&6, set with A5')
    // "we remove 1 from B5 and 5 from C5"
    expect(marked(step, 'eliminate')).toEqual(['B5:1', 'C5:5'])
    expect(unitNames(step)).toEqual(['box 2'])
  })

  it("type 3b with a triple: the article's examples are reached by the simpler Type 2D", () => {
    // The article: "At least half the Type 3b below ... are reduced to this
    // pattern". Here E5 is the only cell of box 5 outside the roof with 1 or
    // 9, so it keeps only those; that is the triple's removal (E5 has no 7).
    const first = solve(EXAMPLES.type3bTriple)
    expect(removed(first)).toEqual(['E5:5'])
    expect(first.instances.map(i => i.label)).toEqual(['Type 2D on 1/9: rows C&F, columns 4&6, eliminates 5 from E5'])

    // "we can eliminate the 6 in E9"
    const second = solve(EXAMPLES.type3bTripleSecond)
    expect(removed(second)).toEqual(['E9:6'])
    expect(second.instances[0].label).toMatch(/^Type 2D on 4\/5: rows D&F, columns 3&7/)
  })

  it('type 3b with a triple and a quad: the roof with E8/F8, and with D8/E8/F8', () => {
    const result = solve(EXEMPLAR_6)
    const triple = occurrence(result, 'Type 3b on 5/8: rows B&E, columns 7&9, set with E8/F8')
    expect(marked(triple, 'eliminate')).toEqual(['D8:3', 'F7:2'])
    expect(marked(triple, 'alternate')).toEqual(['E7:2', 'E8:2', 'E8:3', 'E8:6', 'E9:3', 'F8:2', 'F8:6'])
    expect(unitNames(triple)).toEqual(['box 6'])

    const quad = occurrence(result, 'Type 3b on 5/8: rows B&E, columns 7&9, set with D8/E8/F8')
    expect(marked(quad, 'eliminate')).toEqual(['D7:9', 'F7:2'])
  })

  it('type 4: 6 is confined to the roof in row A and box 2, so the roof loses 7', () => {
    const result = solve(EXAMPLES.type4)
    // "So you can remove 7 from A4 and A6."
    expect(removed(result)).toEqual(['A4:7', 'A6:7'])
    const step = occurrence(result, 'Type 4 on 6/7: rows A&E, columns 4&6')
    expect(unitNames(step)).toEqual(['row A', 'box 2'])
    expect(marked(step, 'highlight')).toEqual(['A4:6', 'A6:6', 'E4:6', 'E4:7', 'E6:6', 'E6:7'])
  })

  it('type 4b: a roof across two boxes looks only along its row', () => {
    const result = solve(EXAMPLES.type4b)
    // "since 2 can only appear in row E in the roof squares, 5 can be removed from both of them"
    const step = occurrence(result, 'Type 4b on 2/5: rows E&F, columns 6&7')
    expect(marked(step, 'eliminate')).toEqual(['E6:5', 'E7:5'])
    expect(unitNames(step)).toEqual(['row E'])
  })

  it('type 5: a diagonal pair tied all round by 8 loses 2 from both corners, in one step', () => {
    const result = solve(EXAMPLES.type5)
    // "2 can be removed from the Naked Pair"
    expect(removed(result)).toEqual(['E6:2', 'F1:2'])
    expect(result.instances).toHaveLength(1)
    const [step] = result.instances
    expect(step.label).toBe('Type 5 on 2/8: rows E&F, columns 1&6, eliminates 2 from E6, F1')
    expect(unitNames(step).sort()).toEqual(['col 1', 'col 6', 'row E', 'row F'])
  })

  it('type 5 with two strong links: only the pivot loses the digit', () => {
    const result = solve(EXAMPLES.type5Second)
    // "Uniqueness Type 5: removing 4 from H2"
    const step = occurrence(result, 'Type 5 on 4/5: rows G&H, columns 2&8')
    expect(marked(step, 'eliminate')).toEqual(['H2:4'])
    expect(unitNames(step)).toEqual(['row H', 'col 2'])
  })

  it('leaves Type 1 to Unique Rectangles', () => {
    expect(uniqueRectangleGuardians(fromWiki(EXAMPLES.type1.at))).toBeNull()
  })

  it('needs the rectangle in two boxes', () => {
    // Floor A1/A5, roof E1/E5 with an extra 3: four boxes, no deadly pattern
    expect(uniqueRectangleGuardians(board({ A1: '12', A5: '12', E1: '123', E5: '123' }))).toBeNull()
    // The same in two boxes is a Type 2
    const result = uniqueRectangleGuardians(board({ A1: '12', A2: '12', E1: '123', E2: '123' }))
    expect(result?.instances.map(i => i.label.split(',')[0])).toEqual(['Type 2 on 1/2: rows A&E'])
  })

  it('needs the same single guardian in every roof cell for Type 2', () => {
    expect(uniqueRectangleGuardians(board({ A1: '12', A2: '12', E1: '123', E2: '124' }))).toBeNull()
  })

  it('needs both strong links for Type 5', () => {
    const corners = { A1: '12', D2: '12', A2: '125', D1: '126' }
    const down: [number, UnitRef, string[]] = [1, { kind: 'col', index: 0 }, ['A1', 'D1']]
    const across: [number, UnitRef, string[]] = [1, { kind: 'row', index: 0 }, ['A1', 'A2']]
    expect(uniqueRectangleGuardians(board(corners, [down]))).toBeNull()
    expect(removed(uniqueRectangleGuardians(board(corners, [down, across])))).toEqual(['A1:2'])
  })

  it('needs the digit confined to the roof for Type 4', () => {
    const corners = { A1: '12', A2: '12', E1: '123', E2: '124' }
    // 1 has one more place in row E, and is free in box 4
    const almost: [number, UnitRef, string[]] = [1, { kind: 'row', index: 4 }, ['E1', 'E2', 'E9']]
    expect(uniqueRectangleGuardians(board(corners, [almost]))).toBeNull()
    const locked: [number, UnitRef, string[]] = [1, { kind: 'row', index: 4 }, ['E1', 'E2']]
    expect(removed(uniqueRectangleGuardians(board(corners, [locked])))).toEqual(['E1:2', 'E2:2'])
  })

  it('stays sound over a sweep, finds every type there but 2C, and is quick', () => {
    let calls = 0
    let spent = 0
    let worst = 0
    const types = new Set<string>()
    const timed = (s: Snapshot) => {
      const started = performance.now()
      const result = uniqueRectangleGuardians(s)
      const took = performance.now() - started
      spent += took
      worst = Math.max(worst, took)
      calls++
      for (const instance of result?.instances ?? []) {
        types.add(instance.label.split(' ')[1])
        // nothing marked twice, and the rectangle is always drawn
        const keys = instance.candidateAnnotations.map(a => `${a.cell}:${a.digit}:${a.kind}`)
        expect(new Set(keys).size).toBe(keys.length)
        expect(instance.links).toHaveLength(4)
      }
      return result
    }
    const { fired, problems } = sweep(timed, { puzzles: 200 })
    console.log(
      `unique rectangle guardians fired ${fired} times over 200 puzzles, ` +
      `${((spent / calls) * 1000).toFixed(1)} µs a call, worst ${worst.toFixed(2)} ms; types ${[...types].sort().join(' ')}`,
    )
    expect(problems).toEqual([])
    expect(fired).toBeGreaterThan(0)
    expect([...types].sort()).toEqual(['2', '2D', '2b', '3', '3b', '4', '4b', '5'])
    expect(spent / calls).toBeLessThan(1)
  }, 120_000)

  // "These puzzles require two Unique Rectangle strategies at some point but
  // are otherwise trivial and only requires singles." (Klaus Brenner)
  const EXEMPLARS = [
    '000806000200010074009700010006000201300000600020000000030005000002000080810002953',
    '000000000074180060020004030080000000600009000200356000000203100000001640065000900',
    '080720013000000000100300000000006031030504060020910700200100908005008004000000000',
    '100000040060010000070900056000009000009005030510070090000000200806000307204000000',
    '009006002045003008000010030080001050004000080100760000000207500000090000000000023',
    '650708000020060000000300042800002001100490000090030000080009050000500080000000300',
    '910240000000080600000006700500004902030000070704800006005300000003020000000079043',
    '300200640005040000000050900002000090050000006090000051400863000060007800000400302',
    '000024000200005310800070020060000000000000095004090002001009000000600000007501064',
  ]
  // the basic and tough strategies, so later additions to the solver do not
  // change which steps these solves take
  const EARLIER = new Set(STRATEGY_META.filter(meta => meta.category !== 'diabolical').map(meta => meta.name))

  it('stays sound through the nine exemplar puzzles and is a step in each', () => {
    let stepIn = 0
    let solved = 0

    for (const puzzle of EXEMPLARS) {
      const solution = solutionOf(puzzle)
      let snapshot = loadPuzzle(puzzle).snapshot
      let step = false

      for (let n = 0; n < 729 && !isSolved(snapshot); n++) {
        const mine = uniqueRectangleGuardians(snapshot)
        if (mine) expect(unsound(snapshot, mine, solution)).toEqual([])
        const next = findNextStrategy(snapshot, EARLIER) ?? mine
        if (!next) break
        if (next === mine) step = true
        snapshot = applyStratResult(snapshot, next)
      }

      if (step) stepIn++
      if (isSolved(snapshot)) solved++
    }

    console.log(`unique rectangle guardians: a step in ${stepIn} of the 9 exemplars, ${solved} solved to the end`)
    expect(stepIn).toBe(9)
    // Exemplar 7 needs more than rectangles after its Type 3b step
    expect(solved).toBeGreaterThanOrEqual(8)
  }, 60_000)
})
