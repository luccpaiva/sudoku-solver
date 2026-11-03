import type { Snapshot, StratResult } from './types'
import { applyStratResult, isSolved, loadPuzzle } from './board'
import { digPuzzle } from './generator'
import { findNextStrategy } from './solver'
import { PEERS } from './units'
import { cellLabel } from './utils'

/**
 * What the strategy tests share. Nothing in the app imports this.
 */

export type Strategy = (snapshot: Snapshot) => StratResult | null

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

/**
 * A board as sudokuwiki.org writes it into a link (`sudoku.htm?bd=…`).
 * Either 81 digits, which are the clues alone, or a position part-way
 * through a solve: `S9B`, then two base-36 characters a cell, where 1 to 9 is
 * a clue, 10 to 18 a solved cell, and anything above the candidates as bits
 * (1 for the digit 1, 2 for 2, 4 for 3 …) offset by 18.
 */
export function fromWiki(bd: string): Snapshot {
  if (!bd.startsWith('S9B')) return loadPuzzle(bd).snapshot

  const cells = bd.slice(3).match(/.{2}/g) ?? []
  if (cells.length !== 81) throw new Error(`A packed board has 81 cells, this one has ${cells.length}`)

  const values: Array<number | null> = []
  const candidates: Array<Set<number>> = []
  const clues: boolean[] = []
  for (const pair of cells) {
    const n = parseInt(pair, 36) & 1023
    clues.push(n <= 9)
    if (n <= 18) {
      values.push(n <= 9 ? n : n - 9)
      candidates.push(new Set())
    } else {
      values.push(null)
      candidates.push(new Set(DIGITS.filter(d => (n - 18) & (1 << (d - 1)))))
    }
  }
  return { values, candidates, clues }
}

/**
 * The one solution of a board, by trial and error on its values alone.
 * Throws when there is none, or more than one.
 */
export function solutionOf(start: Snapshot | string): number[] {
  const { values } = typeof start === 'string' ? loadPuzzle(start).snapshot : start
  const grid = values.map(v => v ?? 0)
  const found: number[][] = []

  const fits = (cell: number, d: number) => PEERS[cell].every(peer => grid[peer] !== d)

  const search = (): void => {
    // the empty cell with the fewest digits that still fit
    let cell = -1
    let options: number[] = []
    for (let i = 0; i < 81; i++) {
      if (grid[i] !== 0) continue
      const open = DIGITS.filter(d => fits(i, d))
      if (cell === -1 || open.length < options.length) {
        cell = i
        options = open
      }
      if (open.length <= 1) break
    }
    if (cell === -1) {
      found.push([...grid])
      return
    }
    for (const d of options) {
      grid[cell] = d
      search()
      grid[cell] = 0
      if (found.length > 1) return
    }
  }

  search()
  if (found.length !== 1) {
    throw new Error(found.length === 0 ? 'The board has no solution' : 'The board has more than one solution')
  }
  return found[0]
}

/** What a result removes, as sorted `cell:digit` labels: `['D2:9', 'D3:9']`. */
export function removed(result: StratResult | null): string[] {
  const all = new Set<string>()
  for (const instance of result?.instances ?? []) {
    for (const { cell, digit, kind } of instance.candidateAnnotations) {
      if (kind === 'eliminate') all.add(`${cellLabel(cell)}:${digit}`)
    }
  }
  return [...all].sort()
}

/** What a result writes in, as sorted `cell:digit` labels. */
export function placed(result: StratResult | null): string[] {
  const all = new Set<string>()
  for (const instance of result?.instances ?? []) {
    for (const { cell, digit } of instance.solvedCells) all.add(`${cellLabel(cell)}:${digit}`)
  }
  return [...all].sort()
}

/**
 * Everything wrong with a result on the position it was found in: a step
 * that takes away the digit a cell ends up with, writes in a wrong one,
 * marks a candidate that is not there, or does nothing at all. Empty when
 * the result is sound.
 */
export function unsound(snapshot: Snapshot, result: StratResult, solution: ReadonlyArray<number>): string[] {
  const problems: string[] = []
  const say = (text: string) => problems.push(`${result.name}: ${text}`)

  if (result.instances.length === 0) say('found nothing but did not return null')

  for (const instance of result.instances) {
    let acts = instance.solvedCells.length > 0

    for (const { cell, digit, kind } of instance.candidateAnnotations) {
      const at = cellLabel(cell)
      if (snapshot.values[cell] !== null || !snapshot.candidates[cell].has(digit)) {
        say(`marks ${digit} in ${at} (${kind}), which is not a candidate there`)
        continue
      }
      if (kind !== 'eliminate') continue
      acts = true
      if (solution[cell] === digit) say(`removes ${digit} from ${at}, which is its solution (${instance.label})`)
    }

    for (const { cell, digit } of instance.solvedCells) {
      const at = cellLabel(cell)
      if (snapshot.values[cell] !== null) say(`writes into ${at}, which is solved already`)
      else if (solution[cell] !== digit) say(`writes ${digit} into ${at}, which is ${solution[cell]} (${instance.label})`)
    }

    if (!acts) say(`an occurrence that changes nothing (${instance.label})`)
    if (instance.patternCells.length === 0) say(`an occurrence with no pattern cells (${instance.label})`)
    if (!instance.narrative) say(`an occurrence with no explanation (${instance.label})`)
  }

  return problems
}

/** Math.random, for the length of one call, from a seed. */
export function seeded<T>(seed: number, make: () => T): T {
  const random = Math.random
  let state = seed >>> 0
  Math.random = () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  try {
    return make()
  } finally {
    Math.random = random
  }
}

/**
 * Tries a strategy on every position of many solves and checks each result
 * against the solution. The puzzles come from the generator, the same ones
 * for the same seed. A position moves on by the solver's own next step, or
 * by the strategy under test where the solver has none.
 *
 * `fired` is how many positions the strategy found something in: a sweep
 * that never fires has checked nothing.
 */
export function sweep(
  strategy: Strategy,
  { puzzles = 60, seed = 1 }: { puzzles?: number; seed?: number } = {},
): { fired: number; problems: string[] } {
  let fired = 0
  const problems: string[] = []

  for (let n = 0; n < puzzles; n++) {
    const puzzle = seeded(seed * 1000 + n, () => digPuzzle(22))
    const solution = solutionOf(puzzle)
    let snapshot = loadPuzzle(puzzle).snapshot

    for (let step = 0; step < 729 && !isSolved(snapshot); step++) {
      const mine = strategy(snapshot)
      if (mine) {
        fired++
        for (const problem of unsound(snapshot, mine, solution)) problems.push(`${puzzle} step ${step}: ${problem}`)
      }
      const next = findNextStrategy(snapshot) ?? mine
      if (!next) break
      snapshot = applyStratResult(snapshot, next)
    }
  }

  return { fired, problems }
}
