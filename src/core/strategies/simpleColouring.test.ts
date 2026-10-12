import { describe, expect, it } from 'vitest'
import { applyStratResult } from '../board'
import { fromWiki, removed, solutionOf, sweep, unsound } from '../testing'
import type { CandidateAnnotation, Snapshot, StratInstance, StratResult } from '../types'
import { cellLabel, ROW_LABELS } from '../utils'
import { boxReduction } from './intersections'
import { simpleColouring } from './simpleColouring'

// The worked examples of sudokuwiki.org/Simple_Colouring: the position each
// "Load Example" link opens, and its puzzle from the start.
const RULE_2 = {
  at: 'S9B2b0i0f0e0d0b5v035v2j0r020h090c050f2b0e080c070a060b0i04090g430b05040c43064a030e0a0f0i4a070b060b0r03080g0r0e090316be060g01b6024i430z070i024i060d0c0b06b60d0c4icz436b',
  start: '000000030002090500080706004900054006030000070600380009300601020007020600060000000',
}
const RULE_4 = {
  at: 'S9B360a0d0c5w2c0i054y3a052g045u09440n4z0o0i080e060a040o0g08062e0i012e050d0b0e0o010h040o070f0i0d2c092c050f0a08030a0h062c090d032c0e2g2e0e012g080f090d0i042g0f2e0e442b43',
  // the same solve one step on, after the first example's removals
  next: 'S9B360a0d0c5w2c0i054y3a052g045u09440n4z0o0i080e060a040o0g08062e0i012e050d0b0e0o010h040o070f0i0d2c092c050f0a08030a0h062c090d032c0e2g2e0e010o080f090d0i040o0f2e0e442b43',
  start: '000000050050409000008060400860010500001040700009050083006090300000108090040000000',
}
const RULE_7 = {
  at: 'S9Bccbgc4077qc605bd7p03b8ck50820104b8070g01bo4c8ebaba067o8s9s8o01080eaa9o8s055u4z090b0d6r5v03bhbgb90c0607b7bh0eb706bb4a0gba02057v7p7s07057z8m8n7z08b70e044y7r02af9j8j',
  start: '000700500300001407010000060000180000500900003000067000060000250007500008004002000',
}
const RULE_7_WHOLE_UNIT = {
  at: 'S9B1k0o1g0e010d0h090g050a0i5y2e46060d0b08040g090f020a0c05807s0s0f0h077s050a010g080o0e7q041g8m7s060e047s0a0g0h7q077o1o017y057s1g088k0h032c9g8i0e0a048s050a4880c67s0g8m',
  start: '000010090500000600840902005000007050108000400060400000700105008003000004050000000',
}

/** The occurrence whose chain is on this digit and runs through this cell. */
function chainThrough(result: StratResult | null, digit: number, cell: string): StratInstance {
  const found = (result?.instances ?? []).filter(
    instance =>
      instance.candidateAnnotations[0].digit === digit &&
      instance.patternCells.map(cellLabel).includes(cell),
  )
  expect(found).toHaveLength(1)
  return found[0]
}

/** The cells an occurrence marks one way, in board order. */
function marked(instance: StratInstance, kind: CandidateAnnotation['kind']): string[] {
  return instance.candidateAnnotations.filter(a => a.kind === kind).map(a => cellLabel(a.cell))
}

function links(instance: StratInstance): string[] {
  return (instance.links ?? []).map(([a, b]) => `${cellLabel(a)}-${cellLabel(b)}`).sort()
}

/** The index of a cell from its label. */
function cellAt(label: string): number {
  return ROW_LABELS.indexOf(label[0]) * 9 + Number(label[1]) - 1
}

describe('simple colouring', () => {
  it('rule 2: removes the side that is twice in a unit', () => {
    const s = fromWiki(RULE_2.at)
    const before = structuredClone(s)
    const result = simpleColouring(s)
    expect(s).toEqual(before)
    expect(result?.name).toBe('Simple Colouring')
    expect(removed(result)).toEqual(expect.arrayContaining(['D3:8', 'E7:8', 'H1:8', 'J6:8', 'J8:8']))
    expect(unsound(s, result!, solutionOf(RULE_2.start))).toEqual([])

    // the pictured chain of 8s: J6 and J8 are on the same side, both in row J
    const chain = chainThrough(result, 8, 'J6')
    expect(chain.patternCells.map(cellLabel)).toEqual(['D3', 'D8', 'E1', 'E7', 'H1', 'H6', 'J6', 'J8'])
    expect(marked(chain, 'eliminate')).toEqual(['D3', 'E7', 'H1', 'J6', 'J8'])
    expect(marked(chain, 'highlight')).toEqual(['D8', 'E1', 'H6'])
    expect(marked(chain, 'alternate')).toEqual([])
    expect(chain.units).toEqual([{ kind: 'row', index: 8 }])
    expect(links(chain)).toEqual(['D3-D8', 'D3-E1', 'D8-E7', 'D8-J8', 'E1-E7', 'E1-H1', 'H1-H6', 'H6-J6'])
    expect(chain.solvedCells).toEqual([])
  })

  it('rule 4: removes what sees both sides', () => {
    const s = fromWiki(RULE_4.at)
    const result = simpleColouring(s)
    expect(removed(result)).toEqual(expect.arrayContaining(['H5:7', 'J3:7']))
    expect(unsound(s, result!, solutionOf(RULE_4.start))).toEqual([])

    // the pictured chain of 7s: J3 sees H2 and J8, H5 sees H2 and G4
    const chain = chainThrough(result, 7, 'H2')
    expect(marked(chain, 'highlight')).toEqual(['A6', 'D3', 'F4', 'G8', 'H2'])
    expect(marked(chain, 'alternate')).toEqual(['D6', 'F2', 'G4', 'J8'])
    expect(marked(chain, 'eliminate')).toEqual(['H5', 'J3'])
    expect(chain.patternCells.map(cellLabel)).toEqual(['A6', 'D3', 'D6', 'F2', 'F4', 'G4', 'G8', 'H2', 'J8'])
    expect(chain.units).toEqual([])
    expect(links(chain)).toEqual(
      ['A6-D6', 'D3-D6', 'D3-F2', 'D6-F4', 'F2-F4', 'F2-H2', 'F4-G4', 'G4-G8', 'G8-J8'],
    )

    // the article's next example is this very position with those two 7s gone
    expect(applyStratResult(s, result!)).toEqual(fromWiki(RULE_4.next))
  })

  it('rule 4: follows the chain as it grows', () => {
    const s = fromWiki(RULE_4.next)
    const result = simpleColouring(s)
    expect(removed(result)).toEqual(expect.arrayContaining(['A1:7', 'B5:7']))
    expect(unsound(s, result!, solutionOf(RULE_4.start))).toEqual([])

    // the same chain, now reaching B3, H1 and J5: A1 sees A6 and H1, B5 sees A6 and B3
    const chain = chainThrough(result, 7, 'H2')
    expect(marked(chain, 'highlight')).toEqual(['A6', 'D3', 'F4', 'G8', 'H2', 'J5'])
    expect(marked(chain, 'alternate')).toEqual(['B3', 'D6', 'F2', 'G4', 'H1', 'J8'])
    expect(marked(chain, 'eliminate')).toEqual(['A1', 'B5'])
    expect(chain.units).toEqual([])
    expect(links(chain)).toHaveLength(13)
  })

  it('rule 7: removes the side that would empty a unit', () => {
    const s = fromWiki(RULE_7.at)
    const result = simpleColouring(s)
    expect(removed(result)).toEqual(expect.arrayContaining(['A6:6', 'B3:6', 'H7:6', 'J4:6']))
    expect(unsound(s, result!, solutionOf(RULE_7.start))).toEqual([])

    // the pictured chain of 6s: B3 sees E3 and H7 sees E7, the only 6s of row E
    const chain = chainThrough(result, 6, 'B3')
    expect(chain.patternCells.map(cellLabel)).toEqual(['A6', 'B3', 'B4', 'H6', 'H7', 'J4'])
    expect(marked(chain, 'eliminate')).toEqual(['A6', 'B3', 'H7', 'J4'])
    expect(marked(chain, 'highlight')).toEqual(['B4', 'H6'])
    expect(marked(chain, 'alternate')).toEqual([])
    expect(chain.units).toEqual([{ kind: 'row', index: 4 }])
    expect(links(chain)).toEqual(['A6-B4', 'A6-H6', 'B3-B4', 'B4-J4', 'H6-H7', 'H6-J4'])
  })

  it('rule 7: a unit of more than two places', () => {
    const s = fromWiki(RULE_7_WHOLE_UNIT.at)
    const result = simpleColouring(s)
    expect(removed(result)).toEqual(expect.arrayContaining(['D7:2', 'E4:2', 'F1:2', 'G8:2']))
    expect(unsound(s, result!, solutionOf(RULE_7_WHOLE_UNIT.start))).toEqual([])

    // the pictured chain of 2s: F1 sees H1 and J1, G8 sees G2 and G3, all the 2s of box 7
    const chain = chainThrough(result, 2, 'F1')
    expect(chain.patternCells.map(cellLabel)).toEqual(['D7', 'E4', 'E8', 'F1', 'F5', 'G8'])
    expect(marked(chain, 'eliminate')).toEqual(['D7', 'E4', 'F1', 'G8'])
    expect(marked(chain, 'highlight')).toEqual(['E8', 'F5'])
    expect(chain.units).toEqual([{ kind: 'box', index: 6 }])
    expect(links(chain)).toEqual(['D7-E8', 'E4-E8', 'E4-F5', 'E8-G8', 'F1-F5'])
  })

  it('is sound on every position of 200 solves', () => {
    const { fired, problems } = sweep(simpleColouring, { puzzles: 200 })
    expect(problems).toEqual([])
    expect(fired).toBeGreaterThan(0)
  }, 120_000)

  it('gives every candidate one mark, and each link an end on either side', () => {
    const found: StratInstance[] = []
    sweep(snapshot => {
      const result = simpleColouring(snapshot)
      if (result) found.push(...result.instances)
      return result
    }, { puzzles: 40, seed: 2 })
    expect(found.length).toBeGreaterThan(0)

    for (const instance of found) {
      // one digit throughout, so a cell stands for its candidate
      expect(new Set(instance.candidateAnnotations.map(a => a.digit)).size, instance.label).toBe(1)
      const marks = new Map(instance.candidateAnnotations.map(a => [a.cell, a.kind]))
      expect(marks.size, instance.label).toBe(instance.candidateAnnotations.length)
      expect(instance.patternCells.every(cell => marks.has(cell)), instance.label).toBe(true)
      for (const [a, b] of instance.links ?? []) {
        expect(marks.get(a), instance.label).not.toBe(marks.get(b))
      }
      // a side is crossed out only where a unit shows it to be false
      const sideRemoved = instance.patternCells.some(cell => marks.get(cell) === 'eliminate')
      expect(instance.units.length, instance.label).toBe(sideRemoved ? 1 : 0)
    }
  }, 120_000)

  it('leaves a chain alone when nothing sees both of its sides', () => {
    // the second rule 4 example with its removals made: the chain of 7s still stands
    const s = fromWiki(RULE_4.next)
    const after = applyStratResult(s, simpleColouring(s)!)
    expect(after.candidates[cellAt('F2')].has(7)).toBe(true)
    expect(simpleColouring(after)).toBeNull()
  })

  it('does not take a pair on its own for a chain', () => {
    // one step on from the whole-unit example, H4 and J4 are the last 2s of
    // column 4 and H5 and J5 see both: Box-Reduction's work, not a chain's
    const s = fromWiki(RULE_7_WHOLE_UNIT.at)
    const after = applyStratResult(s, simpleColouring(s)!)
    expect(removed(boxReduction(after))).toEqual(expect.arrayContaining(['H5:2', 'J5:2']))
    expect(simpleColouring(after)).toBeNull()
  })

  it('needs every place of the unit in sight for rule 7', () => {
    // a third 6 pencilled into row E, at E8, where neither B3 nor H7 sees it
    const s = fromWiki(RULE_7.at)
    const pencilled: Snapshot = {
      values: s.values,
      candidates: s.candidates.map((set, cell) => (cell === cellAt('E8') ? new Set([...set, 6]) : set)),
    }
    expect(simpleColouring(pencilled)).toBeNull()
  })
})
