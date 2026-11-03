import { describe, expect, it } from 'vitest'
import type { CandidateAnnotation, Snapshot, StratInstance, StratResult } from '../types'
import { applyStratResult, isSolved, loadPuzzle } from '../board'
import { findNextStrategy } from '../solver'
import { fromWiki, removed, solutionOf, sweep, unsound } from '../testing'
import { cellLabel } from '../utils'
import { hiddenRectangles } from './hiddenRectangles'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** 'A8' → 7 */
const at = (label: string) => 'ABCDEFGHJ'.indexOf(label[0]) * 9 + Number(label[1]) - 1

/** The occurrences that remove this candidate, named like 'H1:8'. */
function removing(result: StratResult | null, mark: string): StratInstance[] {
  return (result?.instances ?? []).filter(instance =>
    instance.candidateAnnotations.some(a => a.kind === 'eliminate' && `${cellLabel(a.cell)}:${a.digit}` === mark),
  )
}

/** The marks of one kind in an occurrence, as sorted `cell:digit` labels. */
function marks(instance: StratInstance, kind: CandidateAnnotation['kind']): string[] {
  return instance.candidateAnnotations
    .filter(a => a.kind === kind)
    .map(a => `${cellLabel(a.cell)}:${a.digit}`)
    .sort()
}

const pairs = (list: ReadonlyArray<[number, number]> | undefined) =>
  (list ?? []).map(([a, b]) => `${cellLabel(a)}-${cellLabel(b)}`).sort()

/** A copy of a position with some candidates added. */
function withExtra(s: Snapshot, add: Record<string, number[]>): Snapshot {
  const candidates = s.candidates.map(c => new Set(c))
  for (const [label, digits] of Object.entries(add)) for (const d of digits) candidates[at(label)].add(d)
  return { ...s, candidates }
}

// ── The worked examples of sudokuwiki.org/Hidden_Unique_Rectangles ─────────────

const START_1 = '403080000070600040000290060100008070700000003040500009050006000090001020000000605'
const TYPE_1 = {
  at: 'S9B040f032b082q83830b0i070b060n124j04430e434302090d0c060g010o827u0w0818070f0744827v0f7o4t4j0354044y052h2g454309480563da2k06czbb4b52096y660e015u024a484963da2k9g06bb05',
  start: START_1,
}
// the same solve one step on
const TYPE_2 = {
  at: 'S9B040f032b082q83830b0i070b060n124j04430e434302090d0c060g010o827u0w0818070f0744827v0f7o4t4j0354044y052h2g454309480563da2k06czbb4b1i096y660e015u024a484963da2k9g06bb05',
  start: START_1,
}
// no From the Start link: the solution comes from the position itself
const DOUBLE = {
  at: 'S9B0l06d00405449f037p197n8c03071g8r85081c5y6o0109503e2s1w07058m0252048nb78j1k7q010752058mb80408041k091i013a2s1w12464m060r07027v7n1n2b3e050209081m0309021m080r03051n07',
}
// a values-only position: rebuilt from the values, the candidates already show it
const TYPE_2B = {
  at: '020580030350000084086700020048090156500608040963050278090065810600800092830000060',
  start: '020000030350000004086700000048090100000608040003050278000005810600000092830000060',
}
const TYPE_2B_KLAUS = {
  at: 'S9B0e0a0h0d0702060c0i0c2c0f080e0i2d2d040d2c0903010f2s4k5w09040e0f022b0c5v5u0h0f0a9e0c0d9g9g05070c027n0h0e7v7v0f06052i2d0i2b082k030b0i0c2q040h2q0f010a082i2s0f0ca4a42c',
  start: '000072600000800004009310000940020000000000005702000000650000803000040001080000000',
}

describe('hiddenRectangles: the worked examples of sudokuwiki.org', () => {
  it('Type 1: F3 holds only 6/8 and the 6s of H1 are strong both ways, so H1 is not 8', () => {
    const s = fromWiki(TYPE_1.at)
    const result = hiddenRectangles(s)
    // the Type 2 the article shows next is already there as well
    expect(removed(result)).toEqual(['H1:8', 'J3:8'])
    expect(unsound(s, result!, solutionOf(TYPE_1.start))).toEqual([])

    const [instance] = removing(result, 'H1:8')
    expect(instance.label).toBe(
      'Type 1 on 6/8: rows F&H, columns 1&3, strong 6s in row H and column 1, eliminates 8 from H1',
    )
    expect(instance.patternCells.map(cellLabel).sort()).toEqual(['F1', 'F3', 'H1', 'H3'])
    expect(marks(instance, 'highlight')).toEqual(['F3:6', 'F3:8'])
    expect(marks(instance, 'alternate')).toEqual(['F1:6', 'H1:6', 'H3:6'])
    expect(marks(instance, 'eliminate')).toEqual(['H1:8'])
    expect(pairs(instance.links)).toEqual(['H1-F1', 'H1-H3'])
    expect(pairs(instance.weakLinks)).toEqual(['F1-F3', 'H3-F3'])
    expect(instance.narrative).toContain('exactly one solution')
  })

  it('Type 2: floor C2/C3 on 1/8, the 1s of column 2 strong to J2, so J3 is not 8', () => {
    const s = fromWiki(TYPE_2.at)
    const result = hiddenRectangles(s)
    expect(removed(result)).toEqual(['J3:8'])
    expect(unsound(s, result!, solutionOf(TYPE_2.start))).toEqual([])

    const [instance] = result!.instances
    expect(instance.label).toBe(
      'Type 2 on 1/8: floor C2/C3, roof J2/J3, strong 1s in column 2, eliminates 8 from J3',
    )
    expect(marks(instance, 'highlight')).toEqual(['C2:1', 'C2:8', 'C3:1', 'C3:8'])
    expect(marks(instance, 'alternate')).toEqual(['J2:1'])
    expect(instance.units).toEqual([{ kind: 'col', index: 1 }])
  })

  it('the double: strong links on both digits give two removals from one rectangle', () => {
    const s = fromWiki(DOUBLE.at)
    const result = hiddenRectangles(s)
    expect(removed(result)).toEqual(['G8:4', 'J8:1'])
    expect(unsound(s, result!, solutionOf(s))).toEqual([])
    expect(result!.instances.map(i => i.label)).toEqual([
      'Type 2 on 1/4: floor G5/J5, roof G8/J8, strong 4s in row G, eliminates 1 from J8',
      'Type 2 on 1/4: floor G5/J5, roof G8/J8, strong 1s in row J, eliminates 4 from G8',
    ])
  })

  it('Type 2b: floor E2/H2 across two boxes, the 1s of box 4 strong to E3, so H3 is not 7', () => {
    const s = fromWiki(TYPE_2B.at)
    const result = hiddenRectangles(s)
    expect(removed(result)).toEqual(['H3:7'])
    expect(unsound(s, result!, solutionOf(TYPE_2B.start))).toEqual([])
    expect(result!.instances[0].label).toBe(
      'Type 2b on 1/7: floor E2/H2, roof E3/H3, strong 1s in box 4, eliminates 7 from H3',
    )
  })

  it("Type 2b, Klaus Brenner's puzzle: floor H4/H7, the 5s of column 4, so J7 is not 7", () => {
    const s = fromWiki(TYPE_2B_KLAUS.at)
    const result = hiddenRectangles(s)
    // a Type 2 on 4/7 in the same position as well
    expect(removed(result)).toEqual(['J7:7', 'J8:7'])
    expect(unsound(s, result!, solutionOf(TYPE_2B_KLAUS.start))).toEqual([])
    const [instance] = removing(result, 'J7:7')
    expect(instance.label).toBe(
      'Type 2b on 5/7: floor H4/H7, roof J4/J7, strong 5s in column 4, eliminates 7 from J7',
    )
  })
})

// ── Near misses ───────────────────────────────────────────────────────────────

describe('hiddenRectangles: what must not fire', () => {
  it('not Type 1 when the 6s of column 1 have a third place', () => {
    const changed = withExtra(fromWiki(TYPE_1.at), { G1: [6] })
    expect(removed(hiddenRectangles(changed))).not.toContain('H1:8')
  })

  it('not Type 2 when a floor cell holds a third digit', () => {
    const changed = withExtra(fromWiki(TYPE_2.at), { C3: [4] })
    expect(removed(hiddenRectangles(changed))).not.toContain('J3:8')
  })

  it('not Type 2b when the 1s of box 4 have a third place', () => {
    const s = fromWiki(TYPE_2B.at)
    expect(s.values[at('D1')]).toBeNull()
    const changed = withExtra(s, { D1: [1] })
    expect(removed(hiddenRectangles(changed))).not.toContain('H3:7')
  })
})

// ── Sweeps ────────────────────────────────────────────────────────────────────

describe('hiddenRectangles: soundness and speed', () => {
  it('never removes a solution digit over 200 generated solves', () => {
    let calls = 0
    let spent = 0
    let worst = 0
    const timed = (s: Snapshot) => {
      const started = performance.now()
      const result = hiddenRectangles(s)
      const took = performance.now() - started
      spent += took
      worst = Math.max(worst, took)
      calls++
      return result
    }
    const { fired, problems } = sweep(timed, { puzzles: 200 })
    console.log(
      `hidden rectangles fired ${fired} times over 200 puzzles, ` +
        `${((spent / calls) * 1000).toFixed(1)} µs a call, worst ${(worst * 1000).toFixed(0)} µs`,
    )
    expect(problems).toEqual([])
    expect(fired).toBeGreaterThan(0)
  }, 120_000)

  it("solves the article's puzzles with it as a step, every step sound", () => {
    const report: string[] = []
    for (const start of [START_1, TYPE_2B.start, TYPE_2B_KLAUS.start]) {
      const solution = solutionOf(start)
      let s = loadPuzzle(start).snapshot
      let used = 0
      let steps = 0
      for (; steps < 729 && !isSolved(s); steps++) {
        const next = findNextStrategy(s) ?? hiddenRectangles(s)
        if (!next) break
        expect(unsound(s, next, solution)).toEqual([])
        if (next.name === 'Hidden Rectangles') used++
        s = applyStratResult(s, next)
      }
      report.push(`${isSolved(s) ? 'solved' : 'stalled'} in ${steps} steps, ${used} of them this one`)
    }
    console.log(`hidden rectangles on the article puzzles: ${report.join('; ')}`)
  })
})
