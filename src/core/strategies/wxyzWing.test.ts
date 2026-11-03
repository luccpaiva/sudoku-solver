import { describe, expect, it } from 'vitest'
import { applyStratResult, isSolved, loadPuzzle } from '../board'
import { findNextStrategy, STRATEGY_META } from '../solver'
import { fromWiki, removed, solutionOf, sweep, unsound } from '../testing'
import type { CandidateAnnotation, Snapshot, StratInstance, StratResult } from '../types'
import { CELL_UNITS } from '../units'
import { cellLabel, ROW_LABELS } from '../utils'
import { wxyzWing } from './wxyzWing'

// The basic and tough strategies: what runs before the diabolical tier. These
// solves leave the other diabolical strategies out, so they show this one.
const BEFORE = new Set(STRATEGY_META.filter(meta => meta.category !== 'diabolical').map(meta => meta.name))

// The worked examples of sudokuwiki.org/WXYZ_Wing: the position each "Load
// Example" link opens, and its puzzle from the start.
const EXAMPLE_1 = {
  at: 'S9Bc38jb7bn0b04070c4j050db70307b60b064302030g5f0z5e83b70407918582038408041v8i900c040h01829g3m7n08049u069w830l03030l456r0r6q1m05094b074j5e09031m4302bf830602174i0c5v5v',
  start: '000004700500370060230000004700030840000401000084060003300000059070093002006200000',
}
const EXAMPLE_2 = {
  at: 'S9B0804021u1u0307010936aa0301cy045e4k1g05aa012cd0b84y03048i03081g018k0407057u0216038207010608011u07224q5e020903034i062k3010094q012i6a160903015e4k1g02010908221u031607',
  start: '802003709000104000500000004008000405020307060107000200300000001000901000209800307',
}
const EXAMPLE_3 = {
  at: 'S9B30132t3i3c2k0826099o7q08amag050n1q1j8a068201babe071a02bmbm90aaar03859g048407948i047n89081301048602decy069i2u03bm04cy9g0684016acy029f059j9f04ae6u06bn9vda9l9p889g6e',
  start: '000000009008005000060100702000003004070040080100200600304006010020500400600000000',
}
// The article gives no start for this one; its values alone have one solution
const EXAMPLE_4 = {
  at: 'S9B091o034q380162186c081o1m1a3c1u9q199h0705014e0o094e0644010807121i1u020904120u16070902010806028i8i01040805070306074i0901034a184k127q020608049e0z9v0401b60205070603b6',
}
// Two consecutive steps of one solve. The second example's start link in
// the article is a blank grid; it is the first one's puzzle.
const TYPE_2 = {
  at: 'S9B9e019m5w6s0e4a4y03060e080r0r0c020i072i0b03096q4y05560adecy0b06cy040c014ib7030f5v057ncy020dbn049e03cz02cy6a0fbeb6014q0c07064q0b036q054c584y016209026q2i4jc37n62034i',
  next: 'S9B9e019m5w6s0e4a4y03060e080r0r0c020i072i0b03096q4y05560adecy0b069e040c014i43030f5v057ncy020d4j049e03cz02cy6a0fbeb6014q0c07064q0b036q054c584y016209026q2i4jc37n62034i',
  start: '010000003608000207003900500000604010030050020040302000001007600305000109200000030',
}
// Two boards from the reader comments under the article (Eric Bryant's ALS
// examples), where the site's solver finds a WXYZ-Wing too
const READERS = [
  'S9B03060z0282077n040807090801060402030511160s0803827n070608160306011007090s06010s2e9e7q08050s100709044i4k06010304462b2e02470506090z462r094a060u022b090206052i0n0u082b',
  'S9B1y22071i08012209028i0108028q05071m0394221o078u0u0108221w08091f220s0323073m031f8j3u08220297043m1h8n3q2g081v8z363e03080209222323010905042e06022e0808021m05012e092e1m',
]

/** The index of a cell from its label: 'A1' is 0, 'J9' is 80. */
function cellAt(label: string): number {
  return ROW_LABELS.indexOf(label[0]) * 9 + Number(label[1]) - 1
}

/** The one occurrence on these cells, in board order: 'D3 D4 D6 F1'. */
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
 * cells named. No other cell can be part of a set of four digits, and any
 * wing on the named cells has something to remove.
 */
function open(cells: Record<string, number[]>): Snapshot {
  const candidates = Array.from({ length: 81 }, () => new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]))
  for (const [label, digits] of Object.entries(cells)) candidates[cellAt(label)] = new Set(digits)
  return { values: new Array<number | null>(81).fill(null), candidates }
}

describe('WXYZ-Wing, type 1', () => {
  it('example 1: a hinge with all four digits, the 9 not restricted', () => {
    const s = fromWiki(EXAMPLE_1.at)
    const before = structuredClone(s)
    const result = wxyzWing(s)
    expect(s).toEqual(before)
    expect(result?.name).toBe('WXYZ-Wing')
    expect(removed(result)).toEqual(expect.arrayContaining(['D2:9']))
    expect(unsound(s, result!, solutionOf(EXAMPLE_1.start))).toEqual([])

    // D3 holds 1/2/5/9; F1 (1/9) sees it in box 4, D4 (5/9) and D6 (2/5/9) along row D
    const wing = wingAt(result, 'D3 D4 D6 F1')
    expect(marks(wing, 'highlight')).toEqual(['D3:9', 'D4:9', 'D6:9', 'F1:9'])
    expect(marks(wing, 'alternate')).toEqual(['D3:1', 'D3:2', 'D3:5', 'D4:5', 'D6:2', 'D6:5', 'F1:1'])
    expect(marks(wing, 'eliminate')).toEqual(['D2:9'])
    expect(wing.units).toEqual([{ kind: 'row', index: 3 }, { kind: 'box', index: 3 }])
    expect(wing.solvedCells).toEqual([])
    expect(wing.label).toBe('WXYZ-Wing on 9: D3/D4/D6/F1 hold 1/2/5/9, eliminates 9 from D2')
    expect(wing.narrative).toContain('at least one of D3, D4, D6 or F1 is 9')
  })

  it('example 2: a hinge without the digit it removes', () => {
    const s = fromWiki(EXAMPLE_2.at)
    const result = wxyzWing(s)
    expect(removed(result)).toEqual(['F6:5', 'G5:5', 'J5:5'])
    expect(unsound(s, result!, solutionOf(EXAMPLE_2.start))).toEqual([])

    // D6 holds 2/6/9; the 5 is in E5, G6 and J6, which do not all see each other
    const wing = wingAt(result, 'D6 E5 G6 J6')
    expect(marks(wing, 'highlight')).toEqual(['E5:5', 'G6:5', 'J6:5'])
    expect(marks(wing, 'eliminate')).toEqual(['F6:5', 'G5:5', 'J5:5'])
    expect(wing.units).toEqual([{ kind: 'col', index: 5 }, { kind: 'box', index: 4 }])
  })

  it('example 3: the digit removed is in two of the cells only', () => {
    const s = fromWiki(EXAMPLE_3.at)
    const result = wxyzWing(s)
    expect(removed(result)).toEqual(['B7:3', 'B8:3', 'B9:3'])
    expect(unsound(s, result!, solutionOf(EXAMPLE_3.start))).toEqual([])

    const wing = wingAt(result, 'B2 C1 C3 C8')
    expect(marks(wing, 'highlight')).toEqual(['B2:3', 'C8:3'])
    expect(marks(wing, 'eliminate')).toEqual(['B7:3', 'B8:3', 'B9:3'])
    expect(wing.units).toEqual([{ kind: 'row', index: 2 }, { kind: 'box', index: 0 }])
  })

  it('example 4: a row and a column', () => {
    const s = fromWiki(EXAMPLE_4.at)
    const result = wxyzWing(s)
    expect(removed(result)).toEqual(expect.arrayContaining(['A4:5']))
    expect(unsound(s, result!, solutionOf(s))).toEqual([])

    // B4 holds 3/4/5/6 with B3 and B6 along row B and D4 down column 4; B3 has no 5
    const wing = wingAt(result, 'B3 B4 B6 D4')
    expect(marks(wing, 'highlight')).toEqual(['B4:5', 'B6:5', 'D4:5'])
    expect(marks(wing, 'eliminate')).toEqual(['A4:5'])
    expect(wing.units).toEqual([{ kind: 'row', index: 1 }, { kind: 'col', index: 3 }])
  })

  it('the boards from the reader comments', () => {
    for (const at of READERS) {
      const s = fromWiki(at)
      const result = wxyzWing(s)
      expect(result).not.toBeNull()
      expect(unsound(s, result!, solutionOf(s))).toEqual([])
    }
  })
})

describe('WXYZ-Wing, type 2', () => {
  it('example 1: every digit restricted, each removed where all of its places are seen', () => {
    const s = fromWiki(TYPE_2.at)
    const result = wxyzWing(s)
    expect(removed(result)).toEqual(expect.arrayContaining(['D5:8', 'E1:9', 'F1:9']))
    expect(unsound(s, result!, solutionOf(TYPE_2.start))).toEqual([])

    // D1 (5/7/8/9) and D2 (7/8/9); D9 (5/8) along row D, F3 (7/9) in box 4
    const wing = wingAt(result, 'D1 D2 D9 F3')
    expect(marks(wing, 'alternate')).toEqual([])
    expect(marks(wing, 'highlight')).toEqual(['D1:5', 'D1:7', 'D1:8', 'D1:9', 'D2:7', 'D2:8', 'D2:9', 'D9:5', 'D9:8', 'F3:7', 'F3:9'])
    expect(marks(wing, 'eliminate')).toEqual(['D5:8', 'E1:9', 'F1:9'])
    expect(wing.units).toEqual([{ kind: 'row', index: 3 }, { kind: 'box', index: 3 }])
    expect(wing.label).toBe('WXYZ-Wing (Type 2): D1/D2/D9/F3 hold 5/7/8/9, eliminates 8 from D5; 9 from E1, F1')
  })

  it('example 2: the next step of the same solve', () => {
    const s = fromWiki(TYPE_2.next)
    const result = wxyzWing(s)
    expect(removed(result)).toEqual(expect.arrayContaining(['F5:9']))
    expect(unsound(s, result!, solutionOf(TYPE_2.start))).toEqual([])

    // F5 sees the 9s of D5 and E6, the only 9s of the four
    const wing = wingAt(result, 'D5 E1 E4 E6')
    expect(marks(wing, 'eliminate')).toEqual(expect.arrayContaining(['F5:9']))
    expect(wing.units).toEqual([{ kind: 'row', index: 4 }, { kind: 'box', index: 4 }])
  })
})

describe('WXYZ-Wing, what it leaves alone', () => {
  const WING = { D3: [1, 2, 5, 9], D4: [5, 9], D6: [2, 5, 9], F1: [1, 9] }

  it('finds the bare wing on an open board', () => {
    const result = wxyzWing(open(WING))
    expect(removed(result)).toEqual(['D1:9', 'D2:9'])
  })

  it('needs all but one digit restricted', () => {
    // a 1 in D6 as well: F1 does not see it, so 1 and 9 are both loose
    expect(wxyzWing(open({ ...WING, D6: [1, 2, 5, 9] }))).toBeNull()
  })

  it('needs four digits in the four cells, not five', () => {
    expect(wxyzWing(open({ ...WING, D4: [5, 7, 9] }))).toBeNull()
  })

  it('leaves a set in one unit to Naked Quads', () => {
    expect(wxyzWing(open({ D1: [1, 2], D2: [2, 5], D4: [5, 9], D6: [1, 9] }))).toBeNull()
  })

  it('needs the cells in two crossing units', () => {
    // rows A and E do not cross, and no row or column with a box holds all
    // four: this is an XY-Chain on 1 (A1 or E9), not a wing
    expect(wxyzWing(open({ A1: [1, 2], A5: [2, 3], E5: [3, 4], E9: [4, 1] }))).toBeNull()
  })
})

describe('WXYZ-Wing against the solution', () => {
  it('is sound on every position of 200 solves, and quick', () => {
    let calls = 0
    let spent = 0
    let worst = 0
    // where the strategies before it have nothing: the positions it is there for
    let stalls = 0
    let taken = 0
    const timed = (s: Snapshot) => {
      const started = performance.now()
      const result = wxyzWing(s)
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
      `wxyz-wing: fired at ${fired} of ${calls} positions over 200 puzzles, and at ${taken} of the ` +
        `${stalls} where the solver had nothing; ${Math.round((spent / calls) * 1000)} µs a call, ` +
        `worst ${worst.toFixed(1)} ms`,
    )
  }, 120_000)

  it('takes the article puzzle of example 3 from start to finish', () => {
    // the solver with WXYZ-Wing tried last, every step checked
    const solution = solutionOf(EXAMPLE_3.start)
    let s = loadPuzzle(EXAMPLE_3.start).snapshot
    const used: string[] = []
    for (let step = 0; step < 729 && !isSolved(s); step++) {
      const result = findNextStrategy(s, BEFORE) ?? wxyzWing(s)
      if (!result) break
      expect(unsound(s, result, solution)).toEqual([])
      used.push(result.name)
      s = applyStratResult(s, result)
    }
    expect(isSolved(s)).toBe(true)
    expect(used).toContain('WXYZ-Wing')
  })

  it('gives every pattern candidate one mark and keeps the four cells in its two units', () => {
    const found: StratInstance[] = []
    sweep(s => {
      const result = wxyzWing(s)
      if (result) found.push(...result.instances)
      return result
    }, { puzzles: 40, seed: 2 })
    expect(found.length).toBeGreaterThan(0)

    for (const instance of found) {
      expect(instance.patternCells, instance.label).toHaveLength(4)
      expect(instance.units, instance.label).toHaveLength(2)
      const keys = instance.candidateAnnotations.map(a => `${a.cell}:${a.digit}`)
      expect(new Set(keys).size, instance.label).toBe(keys.length)
      for (const cell of instance.patternCells) {
        const inUnits = instance.units.some(ref => CELL_UNITS[cell][ref.kind] === ref.index)
        expect(inUnits, instance.label).toBe(true)
      }
    }
  }, 120_000)
})
