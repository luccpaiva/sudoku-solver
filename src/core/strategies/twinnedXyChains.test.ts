import { describe, expect, it } from 'vitest'
import { applyStratResult, isSolved, loadPuzzle } from '../board'
import { findNextStrategy, STRATEGY_META } from '../solver'
import { fromWiki, removed, solutionOf, sweep, unsound } from '../testing'
import type { Snapshot, StratInstance, StratResult } from '../types'
import { sees } from '../units'
import { cellLabel, ROW_LABELS } from '../utils'
import { twinnedXyChains } from './twinnedXyChains'

// The worked examples of sudokuwiki.org/Twinned_XY_Chains: the position each
// "Load Example" link opens, and its puzzle from the start.
const EXAMPLE_1 = {
  at: 'S9B9f0887049i021u923m9o80805y060544800106808g01d2ba4k8g6i7x078t1ubucb03234a0r0508020u1r09071m038r8r5udmcb5f23020h8sak1u011m3o1w03051s3k464g5a391h090l1l1l09140704081u',
  start: '080402000000065001600100000070000300058200970300000002800010003500000009000907480',
}
const EXAMPLE_2 = {
  at: 'S9B08050t091g3g2d0c37807y7w7g017g5w90767p06074k034k04844j2y024r034y3e4316099nd7032k059o060s4b06bebu0sb80148074u9kd2064404b805012e89bbbp4l07bo7q1m1ma39n8b1v8i039e0802',
  start: '850900000000010000067030400020300009003050600600001070006040510000070000000003082',
}
const EXAMPLE_3 = {
  at: 'S9B02070h0f1212040i0a0d1u0901020h03362q131y130g0d091g08105u0a2i034y1g053g09di86324c011w6s3k6806021abebm07430v4e9j7q02058m1j5v2n667r080f7o07040l050o2v042v44460p092h06',
  start: '270000400009120300000009080000300509000010000620007000002500000080074050040000906',
}
// A reader's position from the comments below the article (Jan Bouwman)
const COMMENT = 'S9B36083m1v1o033g090t048m01078k0h201w143a02au1v8q1708370v4z1n4y03050b0i1n07091i1k0d010g201w08052n2g0i08060w0t0x6tab045f360z2s0384602e5y4i2m090130063b05ae023i0r2i087u'

/** The one occurrence on exactly these six cells. */
function on(result: StratResult | null, cells: string): StratInstance {
  const found = (result?.instances ?? []).filter(i => i.patternCells.map(cellLabel).join(',') === cells)
  expect(found).toHaveLength(1)
  return found[0]
}

const cellAt = (label: string) => ROW_LABELS.indexOf(label[0]) * 9 + Number(label[1]) - 1

/** A position with one more candidate pencilled into a cell. */
function pencilled(s: Snapshot, label: string, digit: number): Snapshot {
  return { ...s, candidates: s.candidates.map((set, cell) => (cell === cellAt(label) ? new Set([...set, digit]) : set)) }
}

describe('Twinned XY-Chains', () => {
  it("removes what sees every place of a digit in Nils Leder's six cells (example 1)", () => {
    const s = fromWiki(EXAMPLE_1.at)
    const before = structuredClone(s)
    const result = twinnedXyChains(s)
    expect(s).toEqual(before)
    expect(result?.name).toBe('Twinned XY-Chains')
    // every yellow candidate of the article's picture, and nothing else
    expect(removed(result)).toEqual(['A1:1', 'A5:3', 'A9:6', 'C5:3', 'D1:1', 'E6:4', 'H5:3', 'J2:2', 'J3:2'])
    expect(unsound(s, result!, solutionOf(EXAMPLE_1.start))).toEqual([])

    const six = on(result, 'E1,E5,E9,J1,J5,J9')
    expect(six.label).toBe(
      'Twinned XY-Chains on 1/2/3/4/5/6: rows E&J, columns 1&5&9, ' +
        'eliminates 1 from A1, D1; 2 from J2, J3; 3 from A5, C5, H5; 4 from E6; 6 from A9',
    )
    // where each digit's places lie: 1 down column 1, 2 along row J, 3 down column 5, 4 along row E, ...
    expect(six.units).toEqual([
      { kind: 'col', index: 0 },
      { kind: 'row', index: 8 },
      { kind: 'col', index: 4 },
      { kind: 'row', index: 4 },
      { kind: 'col', index: 8 },
    ])
    expect(six.narrative).toContain('4 in E1, E5 and E9 (row E)')
    expect(six.narrative).toContain('each digit is in exactly one of its places here')
  })

  it('example 2: the triple of 6s runs down column 5', () => {
    const s = fromWiki(EXAMPLE_2.at)
    const result = twinnedXyChains(s)
    expect(removed(result)).toEqual(['A3:2', 'A6:2', 'B7:7', 'D3:8', 'J1:9', 'J2:9', 'J3:9'])
    expect(unsound(s, result!, solutionOf(EXAMPLE_2.start))).toEqual([])
    on(result, 'A5,A7,D5,D7,J5,J7')
  })

  it('example 3: three digits along the rows and three down the columns', () => {
    const s = fromWiki(EXAMPLE_3.at)
    const result = twinnedXyChains(s)
    expect(removed(result)).toEqual(['E9:3', 'F3:4', 'F5:8', 'F8:4', 'G7:1', 'G9:3'])
    expect(unsound(s, result!, solutionOf(EXAMPLE_3.start))).toEqual([])
    const six = on(result, 'F4,F7,F9,H4,H7,H9')
    expect(six.label.startsWith('Twinned XY-Chains on 1/2/3/4/8/9: rows F&H, columns 4&7&9')).toBe(true)
  })

  it("stays sound on a reader's position, where it finds another formation", () => {
    // the comment's own group, D1, D2, D3, E2, F2 and H2, is not two lines by three and is left out
    const s = fromWiki(COMMENT)
    const result = twinnedXyChains(s)
    expect(unsound(s, result!, solutionOf(s))).toEqual([])
    on(result, 'G6,G7,G9,J6,J7,J9')
  })

  it('does not fire when two places of a digit do not see each other', () => {
    // a 4 pencilled into J9: 4 could then be in both E1 and J9
    const s = pencilled(fromWiki(EXAMPLE_1.at), 'J9', 4)
    for (const instance of twinnedXyChains(s)?.instances ?? []) {
      expect(instance.patternCells.map(cellLabel).join(',')).not.toBe('E1,E5,E9,J1,J5,J9')
    }
  })

  it('does not fire on seven digits in six cells', () => {
    // a 7 pencilled into J5: seven digits for six cells, so one may be left out
    const s = pencilled(fromWiki(EXAMPLE_1.at), 'J5', 7)
    for (const instance of twinnedXyChains(s)?.instances ?? []) {
      expect(instance.patternCells.map(cellLabel).join(',')).not.toBe('E1,E5,E9,J1,J5,J9')
    }
  })

  it('takes two of the three article puzzles to the end, with its step in each', () => {
    const earlier = new Set(STRATEGY_META.filter(m => m.category !== 'diabolical').map(m => m.name))
    let solved = 0
    for (const { start } of [EXAMPLE_1, EXAMPLE_2, EXAMPLE_3]) {
      const solution = solutionOf(start)
      let s = loadPuzzle(start).snapshot
      let used = 0
      for (let step = 0; step < 729 && !isSolved(s); step++) {
        const result = findNextStrategy(s, earlier) ?? twinnedXyChains(s)
        if (!result) break
        expect(unsound(s, result, solution), start).toEqual([])
        if (result.name === 'Twinned XY-Chains') used++
        s = applyStratResult(s, result)
      }
      expect(used, start).toBeGreaterThan(0)
      if (isSolved(s)) solved++
    }
    expect(solved).toBeGreaterThanOrEqual(2)
  }, 60_000)

  it('is sound on every position of 200 solves, and quick', () => {
    let calls = 0
    let spent = 0
    let worst = 0
    const timed = (snapshot: Snapshot) => {
      const started = performance.now()
      const result = twinnedXyChains(snapshot)
      const took = performance.now() - started
      calls++
      spent += took
      worst = Math.max(worst, took)
      return result
    }
    const { fired, problems } = sweep(timed, { puzzles: 200 })
    expect(problems).toEqual([])
    expect(fired).toBeGreaterThan(0)
    console.log(
      `twinned xy-chains fired at ${fired} positions of 200 solves, ` +
        `${Math.round((spent / calls) * 1000)} µs a call, worst ${worst.toFixed(2)} ms`,
    )
    expect(spent / calls).toBeLessThan(1)
  }, 120_000)

  it('builds every occurrence on six open cells in two lines by three, each digit confined', () => {
    const found: StratInstance[] = []
    sweep(snapshot => {
      const result = twinnedXyChains(snapshot)
      if (result) found.push(...result.instances)
      return result
    }, { puzzles: 40, seed: 2 })
    expect(found.length).toBeGreaterThan(0)
    for (const instance of found) {
      const cells = instance.patternCells
      expect(cells, instance.label).toHaveLength(6)
      const rows = new Set(cells.map(c => (c / 9) | 0))
      const cols = new Set(cells.map(c => c % 9))
      expect([rows.size, cols.size].sort(), instance.label).toEqual([2, 3])
      // every tie joins two cells that see each other
      for (const [a, b] of instance.links ?? []) expect(sees(a, b), instance.label).toBe(true)
      // nothing in the six cells is removed
      for (const a of instance.candidateAnnotations) {
        if (a.kind === 'eliminate') expect(cells, instance.label).not.toContain(a.cell)
      }
    }
  }, 60_000)
})
