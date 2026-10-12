import type { Snapshot, StratResult, StratInstance, CellIdx, UnitRef } from '../types'
import { CELL_UNITS, unitCells } from '../units'
import { cellLabel, proseList, unitDisplayName, ROW_LABELS } from '../utils'

// Both rules lean on the puzzle having exactly one solution: a pattern that
// could be filled in two ways cannot be what the grid comes down to.

/**
 * BUG+1 (Bi-value Universal Grave with one extra candidate):
 * every unsolved cell holds two candidates except one that holds three, and
 * without one of those three every digit would sit exactly twice in each
 * row, column and box. Such a grid has no solution or several, so the cell
 * is that digit → eliminate its other two candidates.
 */
export function bugPlusOne(snapshot: Snapshot): StratResult | null {
  const { values, candidates } = snapshot

  // The one cell with three candidates; any other count ends the search
  let odd = -1
  for (let cell = 0; cell < 81; cell++) {
    if (values[cell] !== null) continue
    const size = candidates[cell].size
    if (size === 2) continue
    if (size !== 3 || odd !== -1) return null
    odd = cell
  }
  if (odd === -1) return null

  // How many cells of each unit hold each digit: rows, then columns, then boxes
  const counts = new Uint8Array(27 * 10)
  for (let cell = 0; cell < 81; cell++) {
    if (values[cell] !== null) continue
    const { row, col, box } = CELL_UNITS[cell]
    for (const digit of candidates[cell]) {
      counts[row * 10 + digit]++
      counts[(9 + col) * 10 + digit]++
      counts[(18 + box) * 10 + digit]++
    }
  }

  // The extra digit is the one held three times; without it every count is 0 or 2
  const { row, col, box } = CELL_UNITS[odd]
  const extra = [...candidates[odd]].find(digit => counts[row * 10 + digit] === 3)
  if (extra === undefined) return null
  counts[row * 10 + extra]--
  counts[(9 + col) * 10 + extra]--
  counts[(18 + box) * 10 + extra]--
  if (counts.some(count => count !== 0 && count !== 2)) return null

  const units: UnitRef[] = [
    { kind: 'row', index: row },
    { kind: 'col', index: col },
    { kind: 'box', index: box },
  ]
  // The cells that pair up on the extra digit around the odd cell
  const partners = [...new Set(units.flatMap(unitCells))].filter(
    cell => cell !== odd && values[cell] === null && candidates[cell].has(extra),
  )
  const others = [...candidates[odd]].filter(digit => digit !== extra).sort()
  const at = cellLabel(odd)

  const instance: StratInstance = {
    patternCells: [odd],
    solvedCells: [],
    candidateAnnotations: [
      { cell: odd, digit: extra, kind: 'highlight' },
      ...partners.map(cell => ({ cell, digit: extra, kind: 'alternate' as const })),
      ...others.map(digit => ({ cell: odd, digit, kind: 'eliminate' as const })),
    ],
    units,
    label: `BUG+1 in ${at}: must be ${extra}, eliminates ${others.join('/')}`,
    narrative:
      `Every unsolved cell is down to two candidates except ${at}, which has three. ` +
      `Without the ${extra} in ${at}, every digit would be a candidate exactly twice in each row, ` +
      `column and box, and a grid like that can be finished in two ways or not at all, never in ` +
      `just one. Assuming the puzzle has exactly one solution, ${at} must be the ${extra}, the ` +
      `digit that appears three times in ${proseList(units.map(unitDisplayName))}, so ` +
      `${proseList(others)} are removed from it.`,
  }
  return { name: 'BUG+1', instances: [instance] }
}

/**
 * Every rectangle a deadly pattern can sit on: four cells in two rows, two
 * columns and two boxes, listed top-left, top-right, bottom-left, bottom-right.
 * Over four boxes a swap of the two digits would change what the boxes hold.
 */
const RECTANGLES: ReadonlyArray<ReadonlyArray<CellIdx>> = (() => {
  const all: CellIdx[][] = []
  for (let r1 = 0; r1 < 8; r1++) {
    for (let r2 = r1 + 1; r2 < 9; r2++) {
      for (let c1 = 0; c1 < 8; c1++) {
        for (let c2 = c1 + 1; c2 < 9; c2++) {
          const sameBand = ((r1 / 3) | 0) === ((r2 / 3) | 0)
          const sameStack = ((c1 / 3) | 0) === ((c2 / 3) | 0)
          // both is one box, neither is four
          if (sameBand === sameStack) continue
          all.push([r1 * 9 + c1, r1 * 9 + c2, r2 * 9 + c1, r2 * 9 + c2])
        }
      }
    }
  }
  return all
})()

/**
 * Unique Rectangles, Type 1:
 * three corners of a rectangle in two boxes hold the same two candidates and
 * nothing else, and the fourth holds them plus others. Were the fourth one of
 * the two, the corners could swap them for a second solution
 * → eliminate both digits from the fourth corner.
 */
export function uniqueRectangles(snapshot: Snapshot): StratResult | null {
  const { values, candidates } = snapshot
  const instances: StratInstance[] = []

  for (const corners of RECTANGLES) {
    // Three corners with two candidates and one with more
    let odd = -1
    let bare = 0
    for (const cell of corners) {
      const size = values[cell] === null ? candidates[cell].size : 0
      if (size === 2) bare++
      else if (size > 2 && odd === -1) odd = cell
      else break
    }
    if (bare !== 3 || odd === -1) continue

    // The same two digits in all four
    const floor = corners.filter(cell => cell !== odd)
    const pair = [...candidates[floor[0]]].sort()
    if (!corners.every(cell => pair.every(digit => candidates[cell].has(digit)))) continue

    const boxes = [...new Set(corners.map(cell => CELL_UNITS[cell].box))]
    const [topLeft, topRight, bottomLeft, bottomRight] = corners
    const rows = [topLeft, bottomLeft].map(cell => ROW_LABELS[CELL_UNITS[cell].row])
    const cols = [topLeft, topRight].map(cell => CELL_UNITS[cell].col + 1)
    const at = cellLabel(odd)

    instances.push({
      patternCells: [...corners],
      solvedCells: [],
      candidateAnnotations: [
        ...floor.flatMap(cell => pair.map(digit => ({ cell, digit, kind: 'highlight' as const }))),
        ...pair.map(digit => ({ cell: odd, digit, kind: 'eliminate' as const })),
      ],
      units: boxes.map((index): UnitRef => ({ kind: 'box', index })),
      links: [
        [topLeft, topRight],
        [topRight, bottomRight],
        [bottomRight, bottomLeft],
        [bottomLeft, topLeft],
      ],
      label:
        `Type 1 on ${pair.join('/')}: rows ${rows.join('&')}, columns ${cols.join('&')}` +
        `, eliminates ${pair.join('/')} from ${at}`,
      narrative:
        `${proseList(floor.map(cellLabel))} can each only be ${proseList(pair, 'or')}, and with ` +
        `${at} they are the four corners of a rectangle that lies in just two boxes. If ${at} ` +
        `were ${proseList(pair, 'or')} too, the corners could swap their ${pair[0]}s and ` +
        `${pair[1]}s and every row, column and box would still hold the same digits, giving the ` +
        `puzzle two solutions. Assuming it has exactly one, ${at} is neither, so ` +
        `${proseList(pair)} are removed from it.`,
    })
  }

  if (instances.length === 0) return null
  return { name: 'Unique Rectangles', instances }
}
