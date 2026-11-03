import type { Snapshot, StratResult, StratInstance, CellIdx, UnitRef } from '../types'
import { CELL_UNITS, commonPeers } from '../units'
import { cellLabel, proseList, unitsDisplayName, ROW_LABELS } from '../utils'
import { RECTANGLES } from './uniqueness'

/**
 * Avoidable Rectangles:
 * a rectangle in two rows, two columns and two boxes whose corners end up
 * as a b / b a, with none of the four a clue, lets the solver swap the as and
 * bs for a second solution. So when corners have been solved along the way
 * (not given), the rest of the rectangle must not finish that shape.
 *   Type 1  three corners solved, a b / b ?: the fourth is not a.
 *   Type 2  two corners in a line solved, a and b; the other two hold the
 *           digit that would complete the shape and one extra digit x, the
 *           same in both: one of them is x.
 * → Type 1 eliminates a from the fourth corner; Type 2 eliminates x from the
 *   cells that see both open corners.
 * Only a board that knows its clues (`snapshot.clues`) can tell them from
 * solved cells; without that the strategy finds nothing.
 */
export function avoidableRectangles(snapshot: Snapshot): StratResult | null {
  const { values, candidates, clues } = snapshot
  if (!clues) return null
  const instances: StratInstance[] = []

  for (const corners of RECTANGLES) {
    // A clue in the rectangle pins it: swapping would change a given digit
    if (corners.some(cell => clues[cell])) continue

    const open = corners.filter(cell => values[cell] === null)
    if (open.length === 1) {
      const instance = typeOne(corners, open[0])
      if (instance) instances.push(instance)
    } else if (open.length === 2) {
      const instance = typeTwo(corners, open as [CellIdx, CellIdx])
      if (instance) instances.push(instance)
    }
  }

  if (instances.length === 0) return null
  return { name: 'Avoidable Rectangles', instances }

  /** The corner across the rectangle from this one: the one it shares no line with. */
  function opposite(corners: ReadonlyArray<CellIdx>, cell: CellIdx): CellIdx {
    return corners[3 - corners.indexOf(cell)]
  }

  function typeOne(corners: ReadonlyArray<CellIdx>, gap: CellIdx): StratInstance | null {
    const across = opposite(corners, gap)
    const a = values[across]!
    if (!candidates[gap].has(a)) return null
    // the other two corners face each other and must hold the same digit
    const [p, q] = corners.filter(cell => cell !== gap && cell !== across)
    if (values[p] !== values[q]) return null
    const b = values[p]!

    const solved = corners.filter(cell => cell !== gap)
    const at = cellLabel(gap)
    return {
      patternCells: [...corners],
      solvedCells: [],
      candidateAnnotations: [{ cell: gap, digit: a, kind: 'eliminate' }],
      units: boxesOf(corners),
      links: outline(corners),
      label: `Type 1 on ${pairName(a, b)}: ${linesOf(corners)}, eliminates ${a} from ${at}`,
      narrative:
        `${proseList(solved.map(cellLabel))} were solved along the way; none of them is a clue. ` +
        `With ${at} they are the four corners of a rectangle that lies in just two boxes, and ` +
        `${cellLabel(p)} and ${cellLabel(q)} across from each other both hold ${b}. If ${at} ` +
        `were ${a}, like ${cellLabel(across)} across from it, the corners could swap their ` +
        `${a}s and ${b}s and every row, column and box would still hold the same digits, with ` +
        `no clue changed: the puzzle would have two solutions. It has one, so ${a} is removed ` +
        `from ${at}.`,
    }
  }

  function typeTwo(corners: ReadonlyArray<CellIdx>, gaps: [CellIdx, CellIdx]): StratInstance | null {
    const [u, v] = gaps
    // The two solved corners share a row or column, so the open ones do too.
    // Opposite open corners would leave the shape's second digit free.
    if (opposite(corners, u) === v) return null
    const wants = gaps.map(cell => values[opposite(corners, cell)]!)
    const extras = gaps.map((cell, i) => [...candidates[cell]].filter(d => d !== wants[i]))
    // each open corner holds its digit of the shape and one more, the same one
    if (!gaps.every((cell, i) => candidates[cell].has(wants[i]) && candidates[cell].size === 2)) return null
    if (extras[0][0] !== extras[1][0]) return null
    const x = extras[0][0]

    const targets = commonPeers(u, v)
      .filter(cell => values[cell] === null && candidates[cell].has(x))
      .sort((m, n) => m - n)
    if (targets.length === 0) return null

    const solved = corners.filter(cell => values[cell] !== null)
    const [a, b] = wants
    const units = sharedUnits(u, v)
    const [first, second] = gaps.map(cellLabel)
    return {
      patternCells: [...corners],
      solvedCells: [],
      candidateAnnotations: [
        // rings on the digits that would complete the shape, discs on the way out of it
        ...gaps.map((cell, i) => ({ cell, digit: wants[i], kind: 'alternate' as const })),
        ...gaps.map(cell => ({ cell, digit: x, kind: 'highlight' as const })),
        ...targets.map(cell => ({ cell, digit: x, kind: 'eliminate' as const })),
      ],
      units,
      links: outline(corners),
      label:
        `Type 2 on ${pairName(a, b)}: ${linesOf(corners)}, ${x} locked in ${first}/${second}` +
        `, eliminates ${x} from ${targets.map(cellLabel).join(', ')}`,
      narrative:
        `${proseList(solved.map(cellLabel))} were solved along the way; neither is a clue. ` +
        `With ${first} and ${second} they are the four corners of a rectangle that lies in just ` +
        `two boxes. Were ${first} ${a} and ${second} ${b}, the corners could swap their ` +
        `${a}s and ${b}s with no clue changed, and the puzzle would have two solutions. So ` +
        `${first} is not ${a} or ${second} is not ${b}, and since ${x} is all either has ` +
        `besides, one of the two is ${x}. They share ${unitsDisplayName(units)}, so ${x} is ` +
        `removed from ${proseList(targets.map(cellLabel))}, which ` +
        `${targets.length === 1 ? 'sees' : 'see'} both.`,
    }
  }
}

/** "9/7" in the order the digits appear: the solved one first. */
function pairName(a: number, b: number): string {
  return `${a}/${b}`
}

/** "rows A&H, columns 4&5" for a rectangle listed top-left, top-right, bottom-left, bottom-right. */
function linesOf(corners: ReadonlyArray<CellIdx>): string {
  const [topLeft, topRight, bottomLeft] = corners
  const rows = [topLeft, bottomLeft].map(cell => ROW_LABELS[CELL_UNITS[cell].row])
  const cols = [topLeft, topRight].map(cell => CELL_UNITS[cell].col + 1)
  return `rows ${rows.join('&')}, columns ${cols.join('&')}`
}

function boxesOf(corners: ReadonlyArray<CellIdx>): UnitRef[] {
  return [...new Set(corners.map(cell => CELL_UNITS[cell].box))]
    .sort((m, n) => m - n)
    .map(index => ({ kind: 'box', index }))
}

/** The four sides of the rectangle, corner to corner. */
function outline(corners: ReadonlyArray<CellIdx>): Array<[CellIdx, CellIdx]> {
  const [topLeft, topRight, bottomLeft, bottomRight] = corners
  return [
    [topLeft, topRight],
    [topRight, bottomRight],
    [bottomRight, bottomLeft],
    [bottomLeft, topLeft],
  ]
}

/** The units two cells have in common: their row or column, and their box if they share it. */
function sharedUnits(a: CellIdx, b: CellIdx): UnitRef[] {
  const units: UnitRef[] = []
  if (CELL_UNITS[a].row === CELL_UNITS[b].row) units.push({ kind: 'row', index: CELL_UNITS[a].row })
  if (CELL_UNITS[a].col === CELL_UNITS[b].col) units.push({ kind: 'col', index: CELL_UNITS[a].col })
  if (CELL_UNITS[a].box === CELL_UNITS[b].box) units.push({ kind: 'box', index: CELL_UNITS[a].box })
  return units
}
