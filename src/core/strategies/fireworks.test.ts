import { describe, expect, it } from 'vitest'
import { applyStratResult, isSolved, loadPuzzle } from '../board'
import { findNextStrategy, STRATEGY_META } from '../solver'
import { fromWiki, removed, solutionOf, sweep, unsound } from '../testing'
import type { CandidateAnnotation, Snapshot, StratInstance, StratResult } from '../types'
import { cellLabel, ROW_LABELS } from '../utils'
import { fireworks } from './fireworks'

// The worked examples of sudokuwiki.org/Fireworks
const TRIPLE = {
  at: 'S9B02037v1n1n080g8i059u067n022v2v0h7q0d2q5u4a3y093y011i0bb60a064q168a03020g049e03360baa050h015u02055y2f2f090d0f1i82072208220b0a7q1ibmb61v1v020d077q010d0b092e2e0f0508',
  start: '230008005060200000000090100006000320403000501025000900007080000000002070100900058',
}
// "Triple Laser" by Qinlux and "Cobra Roll" by jovi_al: From the Start only
const TRIPLE_LASER = '045000000000100070800023000000907100000000300080406020003000005070800006000000900'
const COBRA_ROLL = '002300500010040090000500006076000000800020040900000803000005002000006010000870000'

// "These puzzles require Fireworks strategies at some point" (Klaus Brenner)
const EXEMPLARS = [
  '609000015000050000030000080000007000207004600100800003000080034900020000400105070',
  '000902300507600000600807005000300600070000010800010000400080000002000094905400000',
  '000400300060907005080201000004000010000700000190005006000000803000006001740000060',
  '100000400000010000098000006000420000700005300002086700900000005300002000470600000',
  '500007038000908002070000150340100000000000800200060000003600009000009040706000000',
  '001036850009005000000000000000050900600000023120900000000080004410000700036090010',
  '004008007000060000500100028000400096000070080300000210100003470027000000050010000',
]

// The basic and tough strategies only, so that what comes before Fireworks
// in these solves does not move as later strategies join the pipeline
const EARLIER = new Set(STRATEGY_META.filter(m => m.category !== 'diabolical').map(m => m.name))

/** Solve from the start with the earlier strategies until Fireworks is called on. */
function firstFirework(puzzle: string): { s: Snapshot; result: StratResult } {
  let s = loadPuzzle(puzzle).snapshot
  for (let step = 0; step < 729 && !isSolved(s); step++) {
    const earlier = findNextStrategy(s, EARLIER)
    if (!earlier) return { s, result: fireworks(s)! }
    s = applyStratResult(s, earlier)
  }
  throw new Error('solved without Fireworks')
}

/** The one occurrence whose label starts like this. */
function occurrence(result: StratResult | null, start: string): StratInstance {
  const found = (result?.instances ?? []).filter(i => i.label.startsWith(start))
  expect(found).toHaveLength(1)
  return found[0]
}

const marked = (instance: StratInstance, kind: CandidateAnnotation['kind']) =>
  instance.candidateAnnotations
    .filter(a => a.kind === kind)
    .map(a => `${cellLabel(a.cell)}:${a.digit}`)
    .sort()

const cellAt = (label: string) => ROW_LABELS.indexOf(label[0]) * 9 + Number(label[1]) - 1

describe('Fireworks', () => {
  it('Triple: three digits fire from F4 with the wings F1 and C4 (the Load Example)', () => {
    const s = fromWiki(TRIPLE.at)
    const before = structuredClone(s)
    const result = fireworks(s)
    expect(s).toEqual(before)
    expect(result?.name).toBe('Fireworks')
    // "4/5/6 removed from C4"
    expect(removed(result)).toEqual(['C4:4', 'C4:5', 'C4:6'])
    expect(unsound(s, result!, solutionOf(TRIPLE.start))).toEqual([])

    const triple = occurrence(result, 'Triple Firework on 3/7/8')
    expect(triple.label).toBe('Triple Firework on 3/7/8: F4 with F1 & C4, eliminates 4/5/6 from C4')
    expect(triple.patternCells.map(cellLabel)).toEqual(['C4', 'F1', 'F4'])
    expect(marked(triple, 'highlight')).toEqual(['C4:3', 'C4:7', 'F1:7', 'F1:8', 'F4:3', 'F4:7', 'F4:8'])
    expect(marked(triple, 'eliminate')).toEqual(['C4:4', 'C4:5', 'C4:6'])
    expect(triple.units).toEqual([
      { kind: 'row', index: 5 },
      { kind: 'col', index: 3 },
      { kind: 'box', index: 4 },
    ])
    // ties from the crossing to each wing
    expect((triple.links ?? []).map(([a, b]) => `${cellLabel(a)}-${cellLabel(b)}`)).toEqual(['F4-F1', 'F4-C4'])
    expect(triple.narrative).toContain('row F has no room for 3, 7 or 8 except F1, and column 4 none except C4')
  })

  it("Triple: the 'Triple Laser' on 1, 2 and 3 at A9, with the wings A1 and J9", () => {
    const { s, result } = firstFirework(TRIPLE_LASER)
    expect(unsound(s, result, solutionOf(TRIPLE_LASER))).toEqual([])
    const laser = occurrence(result, 'Triple Firework on 1/2/3: A9 with A1 & J9')
    // the article's picture strikes 7 and 9 in A1, 8 and 9 in A9 and 7 in J9;
    // reached by other steps here, the position holds a few more
    expect(marked(laser, 'eliminate')).toEqual(expect.arrayContaining(['A1:7', 'A1:9', 'A9:8', 'A9:9', 'J9:7']))
    expect(laser.patternCells.map(cellLabel)).toEqual(['A1', 'A9', 'J9'])
  })

  it("Quadruple: two double fireworks, on 3/4 from D6 and on 1/2 from J1, share the wings D1 and J6 ('Cobra Roll')", () => {
    const { s, result } = firstFirework(COBRA_ROLL)
    expect(unsound(s, result, solutionOf(COBRA_ROLL))).toEqual([])
    const quad = occurrence(result, 'Quadruple Firework')
    expect(quad.label).toBe(
      'Quadruple Firework on 3/4 and 1/2: D6 & J1 with J6 & D1, eliminates 1/8/9 from D6, 3/4/5/6 from J1, 9 from J6, 5 from D1',
    )
    // J1 keeps 1 and 2, D6 keeps 3 and 4, and the wings keep all four, as the picture shows
    expect(marked(quad, 'eliminate')).toEqual(['D1:5', 'D6:1', 'D6:8', 'D6:9', 'J1:3', 'J1:4', 'J1:5', 'J1:6', 'J6:9'])
    expect(marked(quad, 'highlight')).toEqual(['D1:3', 'D1:4', 'D6:3', 'D6:4', 'J6:3', 'J6:4'])
    expect(marked(quad, 'alternate')).toEqual(['D1:1', 'D1:2', 'J1:1', 'J1:2', 'J6:1', 'J6:2'])
    expect(quad.patternCells.map(cellLabel)).toEqual(['D1', 'D6', 'J1', 'J6'])
  })

  it('does not fire when a digit has a second place outside the box', () => {
    // 7 pencilled into A4: column 4 now has two places for 7 outside box 5, so only 3 and 8 fire from F4
    const s = fromWiki(TRIPLE.at)
    const candidates = s.candidates.map((set, cell) => (cell === cellAt('A4') ? new Set([...set, 7]) : set))
    const result = fireworks({ ...s, candidates })
    for (const instance of result?.instances ?? []) {
      expect(instance.patternCells.map(cellLabel)).not.toContain('F4')
    }
  })

  it('stays sound through the exemplar puzzles, and is a step of every one', () => {
    for (const puzzle of EXEMPLARS) {
      const solution = solutionOf(puzzle)
      let s = loadPuzzle(puzzle).snapshot
      let used = 0
      for (let step = 0; step < 729 && !isSolved(s); step++) {
        const result = findNextStrategy(s, EARLIER) ?? fireworks(s)
        if (!result) break
        expect(unsound(s, result, solution), puzzle).toEqual([])
        if (result.name === 'Fireworks') used++
        s = applyStratResult(s, result)
      }
      expect(used, puzzle).toBeGreaterThan(0)
      expect(isSolved(s), puzzle).toBe(true)
    }
  }, 60_000)

  it('is sound on every position of 200 solves, and quick', () => {
    let calls = 0
    let spent = 0
    let worst = 0
    let quads = 0
    const timed = (snapshot: Snapshot) => {
      const started = performance.now()
      const result = fireworks(snapshot)
      const took = performance.now() - started
      calls++
      spent += took
      worst = Math.max(worst, took)
      quads += (result?.instances ?? []).filter(i => i.label.startsWith('Quadruple')).length
      return result
    }
    const { fired, problems } = sweep(timed, { puzzles: 200 })
    expect(problems).toEqual([])
    expect(fired).toBeGreaterThan(0)
    console.log(
      `fireworks fired at ${fired} positions of 200 solves (${quads} quadruples), ` +
        `${Math.round((spent / calls) * 1000)} µs a call, worst ${worst.toFixed(2)} ms`,
    )
    expect(spent / calls).toBeLessThan(1)
  }, 120_000)

  it('gives every candidate one mark, and keeps a crossing to its own digits', () => {
    const found: StratInstance[] = []
    sweep(snapshot => {
      const result = fireworks(snapshot)
      if (result) found.push(...result.instances)
      return result
    }, { puzzles: 40, seed: 2 })
    expect(found.length).toBeGreaterThan(0)
    for (const instance of found) {
      const marks = new Set(instance.candidateAnnotations.map(a => `${a.cell}:${a.digit}`))
      expect(marks.size, instance.label).toBe(instance.candidateAnnotations.length)
      // a pattern of three or four cells, each left with at least one digit
      expect([3, 4], instance.label).toContain(instance.patternCells.length)
      for (const cell of instance.patternCells) {
        const kept = instance.candidateAnnotations.filter(a => a.cell === cell && a.kind !== 'eliminate')
        expect(kept.length, instance.label).toBeGreaterThan(0)
      }
    }
  }, 60_000)
})
