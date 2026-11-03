import { describe, expect, it } from 'vitest'
import { applyStratResult, isSolved, loadPuzzle } from '../board'
import { findNextStrategy } from '../solver'
import { fromWiki, removed, solutionOf, sweep, unsound } from '../testing'
import type { CandidateAnnotation, Snapshot, StratInstance, StratResult } from '../types'
import { sees } from '../units'
import { cellLabel, ROW_LABELS } from '../utils'
import { xyChain } from './xyChain'

// The worked examples of sudokuwiki.org/XY_Chains: the position each
// "Load Example" link opens, and its puzzle from the start.
const EXAMPLE_1 = {
  at: 'S9B1g0818017o038207222e0i0s0e2c0f430r4e2e1u01049e0886021y05070h0b0d010f03090a0d0c060e090g0h0b09020f080c0g0d05014y030g091f05020r4a501u100c1f0d430i0g0d010i070h02120612',
  start: '080103070000000000001408020570001039000609000920800051030905200000000000010702060',
}
const EXAMPLE_2 = {
  at: 'S9B0f46040g4609020a0e0b07b646010e067q04057q0a1m1m0b0g7q0h0g010b050i0u0u080f4a06460102070u050i7u057q4a4e060a070b7n7u0e1q1q0v0h0b07030b060i070h0e040a434a07020e0r090f0c',
  start: '004009200070010604500000000010500080060127050050006070000000007306070040007200900',
}
const CLOSED_1 = {
  at: 'S9B022y0i1a3q3q08011i0f012i4e66092e050b082q030z3n02360d090z095w4o6g041j0o1i0d2g060p9l2f057s080z0o4406bs4m7n070d030f0r09170z020h070i0s0l074f470u060e0g08050w1s1i7y7q01',
  start: '200000810010009050803002009090004000006000508000600070300900207000700060085000001',
}
const CLOSED_2 = {
  at: 'S9B4a0i0217434j03070662014yak03c405444c0c3m5e3g6s440a094c090c1m08051g0g0s015u3m5f031h04c24kb8021u5n1f09074y4q030f080i2s2c0c0d0a2q0e0b039f04b7b606cy0104078y4yci020cbm',
  start: '002000376010030500000000090900850001000304000200097003080000000003040060147000200',
}

// The article's exemplars: puzzles that need an XY-Chain at some point
const EXEMPLARS = [
  '001005004060080057072900000004000060009060400030000700000007840610050030300200100',
  '020080600000500007078000340000290006050000090600037000042000570300009000009050030',
  '000007001790006085500800000020063000009000600000740030000005008350900074100300000',
  '010027050020600400800000007000004070006708900070300000700000009005009010030160020',
  '090060000310000702050000080900007008003000900200500001080000020105080004000020060',
  '080309050005000300009072000300800060200090005060005001000780400002000600090204070',
]

/** The occurrence whose chain runs through exactly these cells, in this order or the reverse. */
function chainOf(result: StratResult | null, cells: string[]): StratInstance {
  const found = (result?.instances ?? []).filter(instance => {
    const through = instance.patternCells.map(cellLabel)
    return through.join() === cells.join() || through.reverse().join() === cells.join()
  })
  expect(found).toHaveLength(1)
  return found[0]
}

/** The `cell:digit` labels an occurrence marks one way, sorted. */
function marked(instance: StratInstance, kind: CandidateAnnotation['kind']): string[] {
  return instance.candidateAnnotations
    .filter(a => a.kind === kind)
    .map(a => `${cellLabel(a.cell)}:${a.digit}`)
    .sort()
}

function links(instance: StratInstance): string[] {
  return (instance.links ?? []).map(([a, b]) => `${cellLabel(a)}-${cellLabel(b)}`)
}

/** The index of a cell from its label. */
function cellAt(label: string): number {
  return ROW_LABELS.indexOf(label[0]) * 9 + Number(label[1]) - 1
}

/** A position with one more candidate pencilled into a cell. */
function pencilled(s: Snapshot, label: string, digit: number): Snapshot {
  return {
    ...s,
    candidates: s.candidates.map((set, cell) => (cell === cellAt(label) ? new Set([...set, digit]) : set)),
  }
}

describe('XY-Chain', () => {
  it('removes the digit both ends hold from what sees both (example 1)', () => {
    const s = fromWiki(EXAMPLE_1.at)
    const before = structuredClone(s)
    const result = xyChain(s)
    expect(s).toEqual(before)
    expect(result?.name).toBe('XY-Chain')
    expect(removed(result)).toEqual(expect.arrayContaining(['A3:5', 'C7:5', 'C9:5']))
    expect(unsound(s, result!, solutionOf(EXAMPLE_1.start))).toEqual([])

    // the pictured chain: if A7 is not 5 it is 9, A5 is 2, A1 is 6 and C2 is 5
    const chain = chainOf(result, ['A7', 'A5', 'A1', 'C2'])
    expect(chain.label).toBe('XY-Chain on 5: (5=9)A7-(9=2)A5-(2=6)A1-(6=5)C2, eliminates 5 from A3, C7, C9')
    expect(marked(chain, 'eliminate')).toEqual(['A3:5', 'C7:5', 'C9:5'])
    expect(marked(chain, 'highlight')).toEqual(['A1:6', 'A5:2', 'A7:9', 'C2:5'])
    expect(marked(chain, 'alternate')).toEqual(['A1:2', 'A5:9', 'A7:5', 'C2:6'])
    expect(links(chain)).toEqual(['A7-A5', 'A5-A1', 'A1-C2'])
    expect(chain.units).toEqual([])
    expect(chain.solvedCells).toEqual([])
    // the first occurrence shown is the one that removes most
    expect(result!.instances[0]).toBe(chain)
  })

  it('finds the chain whose ends are E1 and D7 (example 2)', () => {
    const s = fromWiki(EXAMPLE_2.at)
    const result = xyChain(s)
    expect(removed(result)).toEqual(expect.arrayContaining(['E7:4']))
    expect(unsound(s, result!, solutionOf(EXAMPLE_2.start))).toEqual([])

    const ends = result!.instances.filter(instance => marked(instance, 'eliminate').includes('E7:4'))
    expect(ends).toHaveLength(1)
    const cells = ends[0].patternCells.map(cellLabel)
    expect([cells[0], cells[cells.length - 1]].sort()).toEqual(['D7', 'E1'])
  })

  it('closed: removes along every link of the loop (closed example 1)', () => {
    const s = fromWiki(CLOSED_1.at)
    const result = xyChain(s)
    expect(removed(result)).toEqual(expect.arrayContaining(['B5:7', 'D7:3', 'H5:4', 'J7:3']))
    expect(unsound(s, result!, solutionOf(CLOSED_1.start))).toEqual([])

    // B3 and B7 are the ends, and they see each other along row B
    const loop = chainOf(result, ['B3', 'B7', 'H7', 'H2', 'H3', 'G3'])
    expect(loop.label.startsWith('XY-Chain loop: (4=7)B3-(7=3)B7-')).toBe(true)
    expect(marked(loop, 'eliminate')).toEqual(['B5:7', 'D7:3', 'H5:4', 'J7:3'])
    expect(links(loop)).toEqual(['B3-B7', 'B7-H7', 'H7-H2', 'H2-H3', 'H3-G3', 'G3-B3'])
    // where the links take their digits: row B, column 7, row H
    expect(loop.units).toEqual([
      { kind: 'row', index: 1 },
      { kind: 'col', index: 6 },
      { kind: 'row', index: 7 },
    ])
    expect(loop.narrative).toContain('3 is removed from D7 and J7, which see B7 and H7')
  })

  it('closed: a loop of four cells (closed example 2)', () => {
    const s = fromWiki(CLOSED_2.at)
    const result = xyChain(s)
    expect(unsound(s, result!, solutionOf(CLOSED_2.start))).toEqual([])

    // B3 is 6 or 8, and the loop goes round through B8, D8 and D3 either way
    const loop = chainOf(result, ['B3', 'B8', 'D8', 'D3'])
    expect(loop.label).toBe(
      'XY-Chain loop: (6=8)B3-(8=2)B8-(2=4)D8-(4=6)D3-B3, eliminates 8 from B1, B6, B9, 6 from C3, E3, F3, 2 from E8',
    )
    // three of the four links remove something; D8 and D3 share only row D
    expect(marked(loop, 'eliminate')).toEqual(['B1:8', 'B6:8', 'B9:8', 'C3:6', 'E3:6', 'E8:2', 'F3:6'])
    expect(marked(loop, 'highlight')).toEqual(['B3:8', 'B8:2', 'D3:6', 'D8:4'])
    expect(marked(loop, 'alternate')).toEqual(['B3:6', 'B8:8', 'D3:4', 'D8:2'])
    expect(result!.instances[0]).toBe(loop)
  })

  it('does not take a chain through a cell with a third candidate', () => {
    // a 7 pencilled into A5 breaks the chain of example 1
    const s = pencilled(fromWiki(EXAMPLE_1.at), 'A5', 7)
    const result = xyChain(s)
    for (const instance of result?.instances ?? []) {
      expect(instance.patternCells.map(cellLabel)).not.toContain('A5')
    }
    expect(removed(result)).not.toContain('C7:5')
  })

  it('leaves three cells to Y-Wing and two to Naked Pairs', () => {
    // the Y-Wing hidden in example 1's chain, A5-A1-C2 on 6 and 9, is not reported here
    const found: StratInstance[] = []
    sweep(snapshot => {
      const result = xyChain(snapshot)
      if (result) found.push(...result.instances)
      return result
    }, { puzzles: 40, seed: 3 })
    expect(found.length).toBeGreaterThan(0)
    for (const instance of found) {
      expect(instance.patternCells.length, instance.label).toBeGreaterThanOrEqual(4)
      expect(instance.patternCells.length, instance.label).toBeLessThanOrEqual(12)
    }
  }, 60_000)

  it('is sound on every position of 200 solves, and quick', () => {
    let calls = 0
    let spent = 0
    let worst = 0
    const timed = (snapshot: Snapshot) => {
      const started = performance.now()
      const result = xyChain(snapshot)
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
      `xy-chain fired at ${fired} positions of 200 solves, ` +
        `${Math.round((spent / calls) * 1000)} µs a call, worst ${worst.toFixed(1)} ms`,
    )
  }, 120_000)

  it('stays sound through the exemplar puzzles, and is a step of their solves', () => {
    let used = 0
    for (const puzzle of EXEMPLARS) {
      const solution = solutionOf(puzzle)
      let s = loadPuzzle(puzzle).snapshot
      let steps = 0
      for (let step = 0; step < 729 && !isSolved(s); step++) {
        const result = findNextStrategy(s) ?? xyChain(s)
        if (!result) break
        expect(unsound(s, result, solution), puzzle).toEqual([])
        if (result.name === 'XY-Chain') steps++
        s = applyStratResult(s, result)
      }
      if (steps > 0) used++
    }
    expect(used).toBeGreaterThanOrEqual(4)
  }, 60_000)

  it('gives every candidate one mark, and each link two cells in sight of each other', () => {
    const found: StratInstance[] = []
    sweep(snapshot => {
      const result = xyChain(snapshot)
      if (result) found.push(...result.instances)
      return result
    }, { puzzles: 40, seed: 2 })
    expect(found.length).toBeGreaterThan(0)

    for (const instance of found) {
      const marks = new Map(instance.candidateAnnotations.map(a => [`${a.cell}:${a.digit}`, a.kind]))
      expect(marks.size, instance.label).toBe(instance.candidateAnnotations.length)
      // each chain cell has a disc and a ring, and loses nothing
      for (const cell of instance.patternCells) {
        const kinds = instance.candidateAnnotations.filter(a => a.cell === cell).map(a => a.kind).sort()
        expect(kinds, instance.label).toEqual(['alternate', 'highlight'])
      }
      for (const [a, b] of instance.links ?? []) expect(sees(a, b), instance.label).toBe(true)
      // every two neighbours share a digit, ringed in one and a disc in the other
      for (const [a, b] of instance.links ?? []) {
        const disc = (cell: number) => instance.candidateAnnotations.find(m => m.cell === cell && m.kind === 'highlight')!.digit
        const ring = (cell: number) => instance.candidateAnnotations.find(m => m.cell === cell && m.kind === 'alternate')!.digit
        expect(disc(a) === ring(b) || ring(a) === disc(b), instance.label).toBe(true)
      }
    }
  }, 60_000)
})
