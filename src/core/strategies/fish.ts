import type { Snapshot, StratResult, StratInstance, UnitKind, UnitRef, CellIdx } from '../types'
import { ROWS, COLS, CELL_UNITS } from '../units'
import { combinations, cellLabel, proseList, ROW_LABELS } from '../utils'

/**
 * Generic fish (X-Wing / Swordfish / Jellyfish):
 * N base lines where a digit fits in at most N cells, all falling in exactly
 * N cover lines → eliminate the digit from the rest of those cover lines.
 */
type FishSize = 2 | 3 | 4

const FISH_NAMES: Record<FishSize, string> = { 2: 'X-Wing', 3: 'Swordfish', 4: 'Jellyfish' }
const COUNT_WORDS: Record<FishSize, string> = { 2: 'two', 3: 'three', 4: 'four' }

function fishForSize(snapshot: Snapshot, size: FishSize): StratResult | null {
  const instances: StratInstance[] = []

  for (let digit = 1; digit <= 9; digit++) {
    findFish(snapshot, size, digit, 'row', instances)
    findFish(snapshot, size, digit, 'col', instances)
  }

  if (instances.length === 0) return null
  return { name: FISH_NAMES[size], instances }
}

function findFish(
  snapshot: Snapshot,
  size: FishSize,
  digit: number,
  baseKind: 'row' | 'col',
  out: StratInstance[],
): void {
  const { values, candidates } = snapshot
  const baseUnits = baseKind === 'row' ? ROWS : COLS
  const coverUnits = baseKind === 'row' ? COLS : ROWS
  const coverKind: UnitKind = baseKind === 'row' ? 'col' : 'row'

  // Base lines where the digit appears in 2..size cells
  const baseMap = new Map<number, CellIdx[]>()
  for (let i = 0; i < 9; i++) {
    const cells = baseUnits[i].filter(c => values[c] === null && candidates[c].has(digit))
    if (cells.length >= 2 && cells.length <= size) baseMap.set(i, cells)
  }
  if (baseMap.size < size) return

  for (const baseCombo of combinations([...baseMap.keys()], size)) {
    const patternCells = baseCombo.flatMap(i => baseMap.get(i)!)
    const coverSet = new Set(
      patternCells.map(c => (baseKind === 'row' ? CELL_UNITS[c].col : CELL_UNITS[c].row)),
    )
    if (coverSet.size !== size) continue

    const toEliminate: CellIdx[] = []
    for (const cover of coverSet) {
      for (const c of coverUnits[cover]) {
        if (values[c] === null && candidates[c].has(digit) && !patternCells.includes(c)) {
          toEliminate.push(c)
        }
      }
    }
    if (toEliminate.length === 0) continue

    const coverSorted = [...coverSet].sort((a, b) => a - b)
    out.push({
      patternCells,
      solvedCells: [],
      candidateAnnotations: [
        ...patternCells.map(cell => ({ cell, digit, kind: 'highlight' as const })),
        ...toEliminate.map(cell => ({ cell, digit, kind: 'eliminate' as const })),
      ],
      units: [
        ...baseCombo.map((index): UnitRef => ({ kind: baseKind, index })),
        ...coverSorted.map((index): UnitRef => ({ kind: coverKind, index })),
      ],
      label:
        `${FISH_NAMES[size]} on ${digit}: ${lineWord(baseKind)} ${lineNames(baseKind, baseCombo).join('&')}, ` +
        `${lineWord(coverKind)} ${lineNames(coverKind, coverSorted).join('&')}` +
        `, eliminates ${digit} from ${toEliminate.map(cellLabel).join(', ')}`,
      narrative: narrate(size, digit, baseKind, baseCombo, coverKind, coverSorted),
    })
  }
}

function lineNames(kind: UnitKind, indices: number[]): string[] {
  return indices.map(i => (kind === 'row' ? ROW_LABELS[i] : String(i + 1)))
}

function lineWord(kind: UnitKind): string {
  return kind === 'row' ? 'rows' : 'columns'
}

function narrate(
  size: FishSize,
  digit: number,
  baseKind: UnitKind,
  base: number[],
  coverKind: UnitKind,
  cover: number[],
): string {
  const baseList = `${lineWord(baseKind)} ${proseList(lineNames(baseKind, base))}`
  const coverList = `${lineWord(coverKind)} ${proseList(lineNames(coverKind, cover))}`

  if (size === 2) {
    return (
      `The only places for ${digit} in ${baseList} are ${coverList}: four corners of ` +
      `a rectangle. The two ${digit}s must sit on opposite corners, so every other ` +
      `${digit} in those ${lineWord(coverKind)} is removed.`
    )
  }
  return (
    `In ${baseList}, every possible ${digit} falls inside ${coverList}. Those ` +
    `${COUNT_WORDS[size]} ${lineWord(coverKind)} must take their ${digit}s from these ` +
    `${lineWord(baseKind)}, so ${digit} is removed from the rest of those ${lineWord(coverKind)}.`
  )
}

export const xWing = (s: Snapshot) => fishForSize(s, 2)
export const swordfish = (s: Snapshot) => fishForSize(s, 3)
export const jellyfish = (s: Snapshot) => fishForSize(s, 4)
