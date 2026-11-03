import { describe, expect, it } from 'vitest'
import { fromWiki, removed, solutionOf, sweep, unsound } from '../testing'
import type { Snapshot, StratInstance, StratResult } from '../types'
import { cellLabel, ROW_LABELS, serializeValues } from '../utils'
import { avoidableRectangles } from './avoidableRectangles'

// The example of sudokuwiki.org/Avoidable_Rectangles ("if you turn off 3D
// Medusa this Avoidable Rectangle example now shows up"). The article gives
// no puzzle for it, so the solution comes from the clues of the position.
const EXAMPLE =
  'S9B1u2b040i2q021v03084i2b02066e2e17170903095e044i0a071w10900301082c9e1u1w04901g3m130d7q4j5h2t04446a0z0l0603092t444c090n0n054a0706011m1i0g0i08021612070546020f0d09430n'

/** The puzzle a position came from: its clues, the rest empty. */
const cluesOf = (s: Snapshot) => serializeValues(s.values.map((v, i) => (s.clues![i] ? v : null)))

/** The index of a cell from its label. */
const cellAt = (label: string) => ROW_LABELS.indexOf(label[0]) * 9 + Number(label[1]) - 1

/** A copy of a position with some cells rewritten: a digit solves the cell (not as a clue), a list is its candidates. */
function withCells(s: Snapshot, changes: Record<string, number | number[]>): Snapshot {
  const values = [...s.values]
  const candidates = [...s.candidates]
  const clues = [...(s.clues ?? values.map(v => v !== null))]
  for (const [label, to] of Object.entries(changes)) {
    const cell = cellAt(label)
    values[cell] = typeof to === 'number' ? to : null
    candidates[cell] = new Set(typeof to === 'number' ? [] : to)
    clues[cell] = false
  }
  return { values, candidates, clues }
}

/** The one occurrence on these four corners. */
function on(result: StratResult | null, corners: string): StratInstance {
  const found = (result?.instances ?? []).filter(i => i.patternCells.map(cellLabel).join(',') === corners)
  expect(found).toHaveLength(1)
  return found[0]
}

const marked = (instance: StratInstance, kind: string) =>
  instance.candidateAnnotations
    .filter(a => a.kind === kind)
    .map(a => `${cellLabel(a.cell)}:${a.digit}`)
    .sort()

describe('Avoidable Rectangles', () => {
  it("removes the digit that would finish a swappable rectangle of solved cells (the article's example)", () => {
    const s = fromWiki(EXAMPLE)
    const before = structuredClone(s)
    const result = avoidableRectangles(s)
    expect(s).toEqual(before)
    expect(result?.name).toBe('Avoidable Rectangles')
    expect(removed(result)).toEqual(['A5:7'])
    expect(unsound(s, result!, solutionOf(cluesOf(s)))).toEqual([])

    // A4 = 9, H4 = 7 and H5 = 9 were solved along the way; A5 = 7 would make 9 7 / 7 9
    const rectangle = on(result, 'A4,A5,H4,H5')
    expect(rectangle.label).toBe('Type 1 on 7/9: rows A&H, columns 4&5, eliminates 7 from A5')
    expect(marked(rectangle, 'eliminate')).toEqual(['A5:7'])
    expect(rectangle.units).toEqual([
      { kind: 'box', index: 1 },
      { kind: 'box', index: 7 },
    ])
    expect(rectangle.links?.length).toBe(4)
    expect(rectangle.solvedCells).toEqual([])
    expect(rectangle.narrative).toContain('none of them is a clue')
    expect(rectangle.narrative).toContain('so 7 is removed from A5')
  })

  it('needs to know the clues: a board without them never fires', () => {
    const { values, candidates } = fromWiki(EXAMPLE)
    expect(avoidableRectangles({ values, candidates })).toBeNull()
  })

  it('leaves a rectangle alone when one of its corners is a clue', () => {
    const s = fromWiki(EXAMPLE)
    const clues = [...s.clues!]
    clues[cellAt('H5')] = true
    expect(avoidableRectangles({ ...s, clues })).toBeNull()
  })

  it('leaves a rectangle alone when the solved corners do not make the swap shape', () => {
    // H5 a 1 instead of a 9: A4 and H5 no longer match, so A5 = 7 is no threat
    const s = withCells(fromWiki(EXAMPLE), { H5: 1 })
    for (const instance of avoidableRectangles(s)?.instances ?? []) {
      expect(instance.patternCells.map(cellLabel)).not.toEqual(['A4', 'A5', 'H4', 'H5'])
    }
  })

  // Type 2 never came up in 600 generated solves, so the example is the
  // article's position with three cells set the way the solution has them:
  // B5 solved as 3 (E5 is already a solved 4), B6 down to 4 or 7 and E6 to
  // 3 or 7. B6 = 4 and E6 = 3 would give 3 4 / 4 3 in four non-clues, so
  // one of B6 and E6 is 7. The solution has B6 = 7, E6 = 3 and D6 = 9.
  const TYPE_2 = { B5: 3, B6: [4, 7], E6: [3, 7] }

  it('Type 2: two open corners with the same extra digit lock it between them', () => {
    const s = withCells(fromWiki(EXAMPLE), TYPE_2)
    const result = avoidableRectangles(s)
    expect(unsound(s, result!, solutionOf(cluesOf(fromWiki(EXAMPLE))))).toEqual([])

    const rectangle = on(result, 'B5,B6,E5,E6')
    expect(rectangle.label).toBe('Type 2 on 4/3: rows B&E, columns 5&6, 7 locked in B6/E6, eliminates 7 from D6')
    expect(marked(rectangle, 'eliminate')).toEqual(['D6:7'])
    expect(marked(rectangle, 'highlight')).toEqual(['B6:7', 'E6:7'])
    expect(marked(rectangle, 'alternate')).toEqual(['B6:4', 'E6:3'])
    expect(rectangle.units).toEqual([{ kind: 'col', index: 5 }])
    expect(rectangle.narrative).toContain('one of the two is 7')
  })

  it('Type 2 needs the same extra digit in both open corners, and corners in a line', () => {
    // E6 with 9 as its extra: one of B6 = 7 and E6 = 9 holds, but nothing is common to both
    const differ = withCells(fromWiki(EXAMPLE), { ...TYPE_2, E6: [3, 9] })
    for (const instance of avoidableRectangles(differ)?.instances ?? []) {
      expect(instance.patternCells.map(cellLabel)).not.toEqual(['B5', 'B6', 'E5', 'E6'])
    }
    // a third candidate in an open corner leaves it a way out of the shape
    const wide = withCells(fromWiki(EXAMPLE), { ...TYPE_2, B6: [4, 7, 9] })
    for (const instance of avoidableRectangles(wide)?.instances ?? []) {
      expect(instance.patternCells.map(cellLabel)).not.toEqual(['B5', 'B6', 'E5', 'E6'])
    }
    // open corners across from each other: B5 and E6 open, B6 and E5 solved
    const diagonal = withCells(fromWiki(EXAMPLE), { B5: [3, 7], B6: 7, E6: [3, 7] })
    for (const instance of avoidableRectangles(diagonal)?.instances ?? []) {
      expect(instance.patternCells.map(cellLabel)).not.toEqual(['B5', 'B6', 'E5', 'E6'])
    }
  })

  it('is sound on every position of 200 solves, and quick', () => {
    let calls = 0
    let spent = 0
    let worst = 0
    const timed = (snapshot: Snapshot) => {
      const started = performance.now()
      const result = avoidableRectangles(snapshot)
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
      `avoidable rectangles fired at ${fired} positions of 200 solves, ` +
        `${Math.round((spent / calls) * 1000)} µs a call, worst ${worst.toFixed(2)} ms`,
    )
    expect(spent / calls).toBeLessThan(1)
  }, 120_000)
})
