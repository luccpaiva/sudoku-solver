import { describe, expect, it } from 'vitest'
import type { CandidateAnnotation, Snapshot, StratInstance, StratResult } from '../types'
import { applyStratResult, isSolved, loadPuzzle } from '../board'
import { findNextStrategy, STRATEGY_META } from '../solver'
import { fromWiki, removed, solutionOf, sweep, unsound } from '../testing'
import { cellLabel } from '../utils'
import { extendedRectangles } from './extendedRectangles'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** 'A8' → 7 */
const at = (label: string) => 'ABCDEFGHJ'.indexOf(label[0]) * 9 + Number(label[1]) - 1

const BASIC = new Set(STRATEGY_META.filter(meta => meta.category === 'basic').map(meta => meta.name))

/**
 * A values-only article position, its candidates rebuilt from the values
 * and then `steps` steps of the basic strategies taken: what the site had
 * removed by the time of its picture.
 */
function afterBasics(puzzle: string, steps: number): Snapshot {
  let s = loadPuzzle(puzzle).snapshot
  for (let step = 0; step < steps; step++) {
    const next = findNextStrategy(s, BASIC)
    expect(next).not.toBeNull()
    s = applyStratResult(s, next!)
  }
  return s
}

/** The one occurrence on these six cells, named like 'C1/C3/E1/E3/G1/G3'. */
function occurrence(result: StratResult | null, cells: string): StratInstance[] {
  return (result?.instances ?? []).filter(
    instance => instance.patternCells.map(cellLabel).sort().join('/') === cells,
  )
}

/** The marks of one kind in an occurrence, as sorted `cell:digit` labels. */
function marks(instance: StratInstance, kind: CandidateAnnotation['kind']): string[] {
  return instance.candidateAnnotations
    .filter(a => a.kind === kind)
    .map(a => `${cellLabel(a.cell)}:${a.digit}`)
    .sort()
}

/** A made-up position: every cell unsolved with all nine candidates, except the ones given. */
function board(cells: Record<string, number | number[]>): Snapshot {
  const values: Array<number | null> = Array(81).fill(null)
  const candidates = Array.from({ length: 81 }, () => new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]))
  for (const [label, to] of Object.entries(cells)) {
    values[at(label)] = typeof to === 'number' ? to : null
    candidates[at(label)] = new Set(typeof to === 'number' ? [] : to)
  }
  return { values, candidates }
}

/** A copy of a position with some candidates added. */
function withExtra(s: Snapshot, add: Record<string, number[]>): Snapshot {
  const candidates = s.candidates.map(c => new Set(c))
  for (const [label, digits] of Object.entries(add)) for (const d of digits) candidates[at(label)].add(d)
  return { ...s, candidates }
}

// ── The worked examples of sudokuwiki.org/Extended_Unique_Rectangles ──────────

// Type 1, the three pictures. They are values-only positions: rebuilt from
// the values, the candidates still hold some the site had removed, so a few
// basic steps are taken first (the pictures' candidates then match the
// cells that matter).
const TYPE_1_VERTICAL = {
  at: '907024305842365917030907400004009600000246009009000040000492876796050234428673591',
  start: '007020305802060910030900000000000600000246000009000000000002070096050204408070500',
  steps: 0,
}
const TYPE_1_SECOND = {
  at: '063820000700009206219007380032090800900000002001002539124978653856200007397040128',
  start: '063020000700009206010007000032000800900000002001000530000900050806200007000040120',
  // a naked triple first
  steps: 1,
}
const TYPE_1_HORIZONTAL = {
  at: '090801520851092604020005918009650040400000006060084100070006480006478205048509060',
  start: '090801020801092600020000010009650040000000000060084100070000080006470205040509060',
  // a naked pair, then the pointing pair that takes the 1 out of E2
  steps: 2,
}
const TYPE_2 = {
  at: 'S9B010h167u070f7o84030w0w0g8e138206087v091q26020n082b2r0r4y054y0g0b04037n7n0u0u02080901050f0g0g0i010612124404441s1s5a014y07bg7s055c0709124y140r0p44050a467q047s5w2g06',
  start: '100070003000000680900208000050004300002891500001600040000107005079000000500040006',
}
const TYPE_4 = {
  at: '017060200240103076506027001790602080152000764860705020470006012620901437001274600',
  start: '007060200040103070500000001090602080100000004060705020400000002020901030001070600',
  // a naked pair and a naked triple
  steps: 2,
}

describe('extendedRectangles: the worked examples of sudokuwiki.org', () => {
  it('Type 1, vertical: the 6 in C1 saves the pattern on 1/3/5, so 1 and 5 go', () => {
    const s = afterBasics(TYPE_1_VERTICAL.at, TYPE_1_VERTICAL.steps)
    const result = extendedRectangles(s)
    expect(removed(result)).toEqual(['C1:1', 'C1:5'])
    expect(unsound(s, result!, solutionOf(TYPE_1_VERTICAL.start))).toEqual([])

    const [instance] = occurrence(result, 'C1/C3/E1/E3/G1/G3')
    expect(instance.label).toMatch(/^Type 1 on 1\/3\/5: rows C&E&G, columns 1&3/)
    expect(marks(instance, 'eliminate')).toEqual(['C1:1', 'C1:5'])
    expect(marks(instance, 'alternate')).toEqual(['C1:6'])
    // E3 keeps a 5 here that the picture no longer has
    expect(marks(instance, 'highlight')).toEqual(
      ['C3:1', 'C3:5', 'E1:1', 'E1:3', 'E1:5', 'E3:1', 'E3:3', 'E3:5', 'G1:1', 'G1:3', 'G1:5', 'G3:1', 'G3:3', 'G3:5'],
    )
    expect(instance.units.map(u => `${u.kind}${u.index}`)).toEqual(['box0', 'box3', 'box6'])
    expect(instance.narrative).toContain('exactly one solution')
    expect(instance.narrative).toContain('C1 must be its other candidate, 6')
  })

  it('Type 1: AEH78 on 4/7/9, the extras 1 and 6 in E8', () => {
    const s = afterBasics(TYPE_1_SECOND.at, TYPE_1_SECOND.steps)
    const result = extendedRectangles(s)
    expect(removed(result)).toEqual(['E8:4', 'E8:7'])
    expect(unsound(s, result!, solutionOf(TYPE_1_SECOND.start))).toEqual([])
    const [instance] = occurrence(result, 'A7/A8/E7/E8/H7/H8')
    expect(marks(instance, 'alternate')).toEqual(['E8:1', 'E8:6'])
    expect(instance.narrative).toContain('E8 must be 1 or 6')
  })

  it('Type 1, horizontal: rows D and E on 3/7/8, the lone 1 in D2', () => {
    const s = afterBasics(TYPE_1_HORIZONTAL.at, TYPE_1_HORIZONTAL.steps)
    const result = extendedRectangles(s)
    expect(removed(result)).toEqual(['D2:3', 'D2:8'])
    expect(unsound(s, result!, solutionOf(TYPE_1_HORIZONTAL.start))).toEqual([])
    const [instance] = occurrence(result, 'D2/D6/D7/E2/E6/E7')
    expect(instance.label).toMatch(/^Type 1 on 3\/7\/8: rows D&E, columns 2&6&7/)
    expect(instance.units.map(u => `${u.kind}${u.index}`)).toEqual(['box3', 'box4', 'box5'])
  })

  it('one step earlier, with a 1 in E2 as well, the same six cells give a Type 2 and a Type 4', () => {
    const s = afterBasics(TYPE_1_HORIZONTAL.at, 1)
    const result = extendedRectangles(s)
    expect(removed(result)).toEqual(['D1:1', 'D2:3', 'E2:3', 'H2:1'])
    expect(unsound(s, result!, solutionOf(TYPE_1_HORIZONTAL.start))).toEqual([])
    expect(result!.instances.map(i => i.label.slice(0, 6))).toEqual(['Type 2', 'Type 4'])
  })

  it('Type 2: the roof G1/G2 shares the one extra 6, so 6 goes from row G and box 7', () => {
    const s = fromWiki(TYPE_2.at)
    const result = extendedRectangles(s)
    expect(removed(result)).toEqual(['G3:6', 'G5:6', 'H1:6'])
    expect(unsound(s, result!, solutionOf(TYPE_2.start))).toEqual([])

    const [instance] = occurrence(result, 'B1/B2/E1/E2/G1/G2')
    expect(instance.label).toBe('Type 2 on 2/3/4: rows B&E&G, columns 1&2, eliminates 6 from G3, G5, H1')
    expect(marks(instance, 'alternate')).toEqual(['G1:6', 'G2:6'])
    expect(instance.units.map(u => `${u.kind}${u.index}`)).toEqual(['box0', 'box3', 'box6', 'row6'])
  })

  it("Type 4 (Pieter's): the 1s of column 7 are only in D7 and F7, so neither can be 3", () => {
    const s = afterBasics(TYPE_4.at, TYPE_4.steps)
    const result = extendedRectangles(s)
    expect(removed(result)).toEqual(['D7:3', 'F7:3'])
    expect(unsound(s, result!, solutionOf(TYPE_4.start))).toEqual([])

    const [instance] = occurrence(result, 'D3/D5/D7/F3/F5/F7')
    expect(instance.label).toMatch(/^Type 4 on 1\/3\/4: rows D&F, columns 3&5&7, strong 1s in column 7/)
    expect(marks(instance, 'alternate')).toEqual(['D7:1', 'F7:1'])
    expect(marks(instance, 'highlight')).toEqual(['D3:3', 'D3:4', 'D5:1', 'D5:4', 'F3:3', 'F3:4', 'F5:1', 'F5:4'])
    expect(instance.units.map(u => `${u.kind}${u.index}`)).toContain('col6')
  })
})

// ── Near misses ───────────────────────────────────────────────────────────────

describe('extendedRectangles: what must not fire', () => {
  // A made-up Type 1: C1 has the extra 6, the rest hold 1, 3 and 5
  const PATTERN = { C1: [1, 5, 6], C3: [1, 5], E1: [1, 3, 5], E3: [1, 3], G1: [1, 3, 5], G3: [1, 3, 5] }

  it('fires on the made-up pattern, two to a box in boxes 1, 4 and 7', () => {
    expect(removed(extendedRectangles(board(PATTERN)))).toEqual(['C1:1', 'C1:5'])
  })

  it('not when the six cells lie in two boxes (two of the rows share a band)', () => {
    const twoBoxes = { A1: [1, 5, 6], A3: [1, 5], B1: [1, 3, 5], B3: [1, 3], D1: [1, 3, 5], D3: [1, 3, 5] }
    expect(extendedRectangles(board(twoBoxes))).toBeNull()
  })

  it('not when a cell of the six is solved', () => {
    expect(extendedRectangles(board({ ...PATTERN, G3: 5 }))).toBeNull()
  })

  it('not when the cells without extras hold four digits between them', () => {
    expect(extendedRectangles(board({ ...PATTERN, G3: [3, 7] }))).toBeNull()
  })

  it('not Type 2 when the two cells with extras hold different extras', () => {
    const s = fromWiki(TYPE_2.at)
    const changed = withExtra(s, { G2: [8] })
    expect(changed.candidates[at('G2')].has(8)).toBe(true)
    expect(removed(extendedRectangles(changed))).not.toContain('G3:6')
  })

  it('not Type 4 when the linking digit has a third place in each unit the two cells share', () => {
    const s = afterBasics(TYPE_4.at, TYPE_4.steps)
    // a third 1 in column 7 and in box 6
    const changed = withExtra(s, { G7: [1], D9: [1] })
    const result = extendedRectangles(changed)
    expect(removed(result)).not.toContain('D7:3')
    expect(removed(result)).not.toContain('F7:3')
  })
})

// ── Sweeps ────────────────────────────────────────────────────────────────────

describe('extendedRectangles: soundness and speed', () => {
  it('never removes a solution digit over 200 generated solves', () => {
    let calls = 0
    let spent = 0
    let worst = 0
    const timed = (s: Snapshot) => {
      const started = performance.now()
      const result = extendedRectangles(s)
      const took = performance.now() - started
      spent += took
      worst = Math.max(worst, took)
      calls++
      return result
    }
    const { fired, problems } = sweep(timed, { puzzles: 200 })
    console.log(
      `extended rectangles fired ${fired} times over 200 puzzles, ` +
        `${((spent / calls) * 1000).toFixed(1)} µs a call, worst ${(worst * 1000).toFixed(0)} µs`,
    )
    expect(problems).toEqual([])
    expect(fired).toBeGreaterThan(0)
  }, 120_000)

  it("solves the article's puzzles with it as a step, every step sound", () => {
    const report: string[] = []
    for (const { start } of [TYPE_1_VERTICAL, TYPE_1_SECOND, TYPE_1_HORIZONTAL, TYPE_2, TYPE_4]) {
      const solution = solutionOf(start)
      let s = loadPuzzle(start).snapshot
      let used = 0
      let steps = 0
      for (; steps < 729 && !isSolved(s); steps++) {
        const next = findNextStrategy(s) ?? extendedRectangles(s)
        if (!next) break
        expect(unsound(s, next, solution)).toEqual([])
        if (next.name === 'Extended Rectangles') used++
        s = applyStratResult(s, next)
      }
      report.push(`${isSolved(s) ? 'solved' : 'stalled'} in ${steps} steps, ${used} of them this one`)
    }
    console.log(`extended rectangles on the article puzzles: ${report.join('; ')}`)
  })
})
