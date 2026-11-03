import type { Snapshot, StratResult, StratInstance, CandidateAnnotation, CellIdx, UnitRef } from '../types'
import { CELL_UNITS, unitCells } from '../units'
import { cellLabel, proseList, unitDisplayName, ROW_LABELS } from '../utils'
import { RECTANGLES } from './uniqueness'

/**
 * Hidden Rectangles (Hidden Unique Rectangles):
 * four corners of a rectangle in two boxes all hold the digits a and b, and
 * at least one corner holds nothing else. A digit with only two places in a
 * unit (a strong link) can then force the corners into the deadly pattern
 * of a Unique Rectangle, which a puzzle with one solution never reaches.
 *   Type 1: a corner holds only a and b, and the opposite corner shares a
 *           strong link on a with each of its two neighbours. That corner
 *           being b would make the first corner b and the other two a.
 *           → eliminate b from the opposite corner.
 *   Type 2: two corners in a line (the floor) hold only a and b, and one of
 *           them shares a strong link on a with the corner across from it.
 *           The other roof corner being b would close the pattern.
 *           → eliminate b from the other roof corner. Type 2b is the same
 *           with the floor across the two boxes.
 * Corners are kept in the order of RECTANGLES: 0 top left, 1 top right,
 * 2 bottom left, 3 bottom right. So i ^ 1 shares a row with i, i ^ 2 a
 * column, and i ^ 3 is the opposite corner.
 */
export function hiddenRectangles(snapshot: Snapshot): StratResult | null {
  const { values, candidates } = snapshot
  const instances: StratInstance[] = []
  // `cell:digit` already removed by an earlier occurrence
  const removed = new Set<string>()

  const keep = (instance: StratInstance | null) => {
    if (!instance) return
    const gone = instance.candidateAnnotations.filter(a => a.kind === 'eliminate')
    if (gone.every(a => removed.has(`${a.cell}:${a.digit}`))) return
    for (const a of gone) removed.add(`${a.cell}:${a.digit}`)
    instances.push(instance)
  }

  for (const corners of RECTANGLES) {
    if (corners.some(cell => values[cell] !== null)) continue

    for (let p = 0; p < 4; p++) {
      if (candidates[corners[p]].size !== 2) continue
      const pair = [...candidates[corners[p]]].sort((x, y) => x - y)
      // the deadly pair is in every corner
      if (!corners.every(cell => pair.every(d => candidates[cell].has(d)))) continue

      for (const [d, e] of [pair, [pair[1], pair[0]]]) {
        keep(typeOne(snapshot, corners, p, d, e))
      }

      // A floor: p and a corner in line with it holding the same pair alone
      for (const q of [p ^ 1, p ^ 2]) {
        if (q < p || candidates[corners[q]].size !== 2) continue
        if (!pair.every(d => candidates[corners[q]].has(d))) continue
        for (const [g, h] of [[p, q], [q, p]]) {
          for (const [d, e] of [pair, [pair[1], pair[0]]]) {
            keep(typeTwo(snapshot, corners, g, h, d, e))
          }
        }
      }
    }
  }

  if (instances.length === 0) return null
  return { name: 'Hidden Rectangles', instances }
}

/**
 * A unit holding both cells in which the digit has no other place: the
 * cells' line first, then their box. Null when there is none.
 */
function strongLink(snapshot: Snapshot, a: CellIdx, b: CellIdx, digit: number): UnitRef | null {
  const { values, candidates } = snapshot
  const ua = CELL_UNITS[a]
  const ub = CELL_UNITS[b]
  const shared: UnitRef[] = []
  if (ua.row === ub.row) shared.push({ kind: 'row', index: ua.row })
  if (ua.col === ub.col) shared.push({ kind: 'col', index: ua.col })
  if (ua.box === ub.box) shared.push({ kind: 'box', index: ua.box })

  for (const unit of shared) {
    const places = unitCells(unit).filter(c => values[c] === null && candidates[c].has(digit))
    if (places.length === 2 && places.includes(a) && places.includes(b)) return unit
  }
  return null
}

/** The row or column two corners of a rectangle share. */
function lineOf(a: CellIdx, b: CellIdx): UnitRef {
  return CELL_UNITS[a].row === CELL_UNITS[b].row
    ? { kind: 'row', index: CELL_UNITS[a].row }
    : { kind: 'col', index: CELL_UNITS[a].col }
}

/** "rows F&H, columns 1&3" */
function where(corners: ReadonlyArray<CellIdx>): string {
  const rows = [corners[0], corners[2]].map(c => ROW_LABELS[CELL_UNITS[c].row])
  const cols = [corners[0], corners[1]].map(c => CELL_UNITS[c].col + 1)
  return `rows ${rows.join('&')}, columns ${cols.join('&')}`
}

/** The opening every occurrence shares: the rectangle and why it must not close. */
function deadly(floor: CellIdx[], others: CellIdx[], pair: number[]): string {
  const floorNames = proseList(floor.map(cellLabel))
  const either = proseList(pair, 'or')
  const [a, b] = pair
  return (
    `${floorNames} can ${floor.length === 1 ? '' : 'each '}only be ${either}, and with ` +
    `${proseList(others.map(cellLabel))} ${floor.length === 1 ? 'it makes' : 'they make'} the ` +
    `corners of a rectangle in two boxes, all of which hold ${a} and ${b}. Were the four left ` +
    `with only ${either}, the ${a}s and ${b}s could swap places and the puzzle would have two ` +
    `solutions. `
  )
}

/** "in row H, H1 and H3": a strong link, where it is and between which cells. */
function inUnit(unit: UnitRef, a: CellIdx, b: CellIdx): string {
  const [first, second] = [a, b].sort((x, y) => x - y).map(cellLabel)
  return `in ${unitDisplayName(unit)}, ${first} and ${second}`
}

/** Type 1: corner p holds only the pair; the opposite corner x would close the pattern as e. */
function typeOne(
  snapshot: Snapshot,
  corners: ReadonlyArray<CellIdx>,
  p: number,
  d: number,
  e: number,
): StratInstance | null {
  const x = corners[p ^ 3]
  const across = corners[(p ^ 3) ^ 1]
  const down = corners[(p ^ 3) ^ 2]
  const floor = corners[p]

  const acrossLink = strongLink(snapshot, x, across, d)
  const downLink = strongLink(snapshot, x, down, d)
  if (!acrossLink || !downLink) return null

  const pair = [d, e].sort((a, b) => a - b)
  const at = cellLabel(x)
  const marks: CandidateAnnotation[] = [
    ...pair.map(digit => ({ cell: floor, digit, kind: 'highlight' as const })),
    ...[x, across, down].map(cell => ({ cell, digit: d, kind: 'alternate' as const })),
    { cell: x, digit: e, kind: 'eliminate' },
  ]

  return {
    patternCells: [...corners],
    solvedCells: [],
    candidateAnnotations: marks,
    units: [acrossLink, downLink],
    links: [[x, across], [x, down]],
    weakLinks: [[across, floor], [down, floor]],
    label:
      `Type 1 on ${pair.join('/')}: ${where(corners)}, strong ${d}s in ` +
      `${unitDisplayName(acrossLink)} and ${unitDisplayName(downLink)}, eliminates ${e} from ${at}`,
    narrative:
      deadly([floor], corners.filter(c => c !== floor), pair) +
      `There are only two places for ${d} ${inUnit(acrossLink, x, across)}, and only two ` +
      `${inUnit(downLink, x, down)}. ` +
      `Suppose ${at} were ${e}: the ${d}s would go to ${cellLabel(across)} and ${cellLabel(down)}, ` +
      `and ${cellLabel(floor)}, which sees both, would be ${e}. The four corners would then hold ` +
      `${proseList(pair)} alone, in the pattern that can swap. Assuming the puzzle has exactly ` +
      `one solution, ${at} is not ${e}, so ${e} is removed from it.`,
  }
}

/**
 * Type 2 and 2b: corners g and h are the floor. g shares a strong link on d
 * with the roof corner across from it; the roof corner across from h would
 * close the pattern as e.
 */
function typeTwo(
  snapshot: Snapshot,
  corners: ReadonlyArray<CellIdx>,
  g: number,
  h: number,
  d: number,
  e: number,
): StratInstance | null {
  // the floor runs along one side; the roof is the side across from it
  const flip = 3 ^ (g ^ h)
  const linked = corners[g]
  const other = corners[h]
  const roof = corners[g ^ flip]
  const target = corners[h ^ flip]

  const link = strongLink(snapshot, linked, roof, d)
  if (!link) return null

  const pair = [d, e].sort((a, b) => a - b)
  const floor = [linked, other].sort((a, b) => a - b)
  const roofCells = [roof, target].sort((a, b) => a - b)
  const sameBox = CELL_UNITS[linked].box === CELL_UNITS[other].box
  const at = cellLabel(target)
  const marks: CandidateAnnotation[] = [
    ...floor.flatMap(cell => pair.map(digit => ({ cell, digit, kind: 'highlight' as const }))),
    { cell: roof, digit: d, kind: 'alternate' },
    { cell: target, digit: e, kind: 'eliminate' },
  ]

  return {
    patternCells: [...corners],
    solvedCells: [],
    candidateAnnotations: marks,
    units: [link],
    links: [[linked, roof]],
    weakLinks: [[target, other], [other, linked]],
    label:
      `Type ${sameBox ? '2' : '2b'} on ${pair.join('/')}: floor ${floor.map(cellLabel).join('/')}, ` +
      `roof ${roofCells.map(cellLabel).join('/')}, strong ${d}s in ${unitDisplayName(link)}, ` +
      `eliminates ${e} from ${at}`,
    narrative:
      deadly(floor, roofCells, pair) +
      `There are only two places for ${d} ${inUnit(link, linked, roof)}. Suppose ${at} were ${e}: ` +
      `${cellLabel(other)}, in ` +
      `${unitDisplayName(lineOf(target, other))} with it, would be ${d}, so ${cellLabel(linked)} ` +
      `would be ${e}, and the ${d} of ${unitDisplayName(link)} would go to ${cellLabel(roof)}. ` +
      `The four corners would then hold ${proseList(pair)} alone, in the pattern that can swap. ` +
      `Assuming the puzzle has exactly one solution, ${at} is not ${e}, so ${e} is removed from it.`,
  }
}
