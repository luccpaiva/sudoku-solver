import type { Snapshot, StratResult, StratInstance, CandidateAnnotation, CellIdx, UnitRef } from '../types'
import { CELL_UNITS, unitCells, sees } from '../units'
import { cellLabel, proseList, unitDisplayName, unitsDisplayName, ROW_LABELS } from '../utils'

/**
 * Extended Rectangles (Extended Unique Rectangles):
 * six unsolved cells, two to a box in three boxes, laid out as two lines of
 * three: two columns of one stack crossing a row of each band, or two rows
 * of one band crossing a column of each stack. Were the six left with only
 * three digits a, b and c, each line of three would hold all three, and the
 * two cells in every box could swap their digits: every row, column and box
 * would still hold the same digits, a second solution. A puzzle with one
 * solution never comes to that, so an extra candidate must be true.
 *   Type 1: one cell holds extras → it is one of them
 *           → eliminate a, b and c from it.
 *   Type 2: the extras are one digit x, in two or three cells → one of them is x
 *           → eliminate x from every cell that sees them all.
 *   Type 4: two cells hold extras and share a unit in which one of the three,
 *           u, has no other place. One of the two is u, so the other must
 *           take an extra → eliminate the other two of the three from both.
 * The three digits are what the cells without extras hold between them,
 * which must be exactly three.
 */
export function extendedRectangles(snapshot: Snapshot): StratResult | null {
  const { values, candidates } = snapshot
  const masks = new Uint16Array(81)
  for (let cell = 0; cell < 81; cell++) {
    if (values[cell] !== null) continue
    for (const digit of candidates[cell]) masks[cell] |= 1 << digit
  }

  const byType: StratInstance[][] = [[], [], []]

  for (const block of BLOCKS) {
    let all = 0
    let open = true
    for (const cell of block.cells) {
      if (masks[cell] === 0) open = false
      all |= masks[cell]
    }
    if (!open) continue

    for (const trio of TRIOS) {
      if ((all & trio.mask) !== trio.mask) continue

      // The cells with extras, and what the rest hold between them
      const extras: CellIdx[] = []
      let floor = 0
      for (const cell of block.cells) {
        if (masks[cell] & ~trio.mask) extras.push(cell)
        else floor |= masks[cell]
      }
      if (extras.length === 0 || extras.length > 3 || floor !== trio.mask) continue
      // every cell takes part: it could be one of the three
      if (extras.some(cell => (masks[cell] & trio.mask) === 0)) continue

      const shape: Shape = { block, trio: trio.digits, extras }
      if (extras.length === 1) byType[0].push(typeOne(shape, masks))
      else {
        const two = typeTwo(shape, masks)
        if (two) byType[1].push(two)
        if (extras.length === 2) byType[2].push(...typeFour(shape, snapshot, masks))
      }
    }
  }

  // One occurrence per new set of removals, Type 1 first
  const instances: StratInstance[] = []
  const removed = new Set<string>()
  for (const instance of byType.flat()) {
    const gone = instance.candidateAnnotations.filter(a => a.kind === 'eliminate').map(a => `${a.cell}:${a.digit}`)
    if (gone.every(key => removed.has(key))) continue
    for (const key of gone) removed.add(key)
    instances.push(instance)
    if (instances.length === MAX_INSTANCES) break
  }

  if (instances.length === 0) return null
  return { name: 'Extended Rectangles', instances }
}

const MAX_INSTANCES = 12

/**
 * Six cells in three pairs, one pair to a box. `cells` holds the pairs in
 * turn: [first line, second line] of the first box, then the second box,
 * then the third. `lines` are the two lines of three.
 */
type Block = {
  cells: CellIdx[]
  lines: [UnitRef, UnitRef]
  boxes: UnitRef[]
}

/** Every block: two columns of a stack over a row of each band, then two rows of a band over a column of each stack. */
const BLOCKS: ReadonlyArray<Block> = (() => {
  const all: Block[] = []
  const pairsIn = (third: number) => [
    [third * 3, third * 3 + 1],
    [third * 3, third * 3 + 2],
    [third * 3 + 1, third * 3 + 2],
  ]
  for (const vertical of [true, false]) {
    for (let third = 0; third < 3; third++) {
      for (const [a, b] of pairsIn(third)) {
        for (let x = 0; x < 3; x++) {
          for (let y = 3; y < 6; y++) {
            for (let z = 6; z < 9; z++) {
              // vertical: a and b are columns, x, y and z rows; else the other way round
              const at = (line: number, cross: number) => (vertical ? cross * 9 + line : line * 9 + cross)
              const cells = [x, y, z].flatMap(cross => [at(a, cross), at(b, cross)])
              const kind = vertical ? 'col' : 'row'
              all.push({
                cells,
                lines: [
                  { kind, index: a },
                  { kind, index: b },
                ],
                boxes: [0, 2, 4].map(i => ({ kind: 'box', index: CELL_UNITS[cells[i]].box })),
              })
            }
          }
        }
      }
    }
  }
  return all
})()

/** Every set of three digits, as a bit mask (bit d for digit d). */
const TRIOS: ReadonlyArray<{ mask: number; digits: number[] }> = (() => {
  const all: Array<{ mask: number; digits: number[] }> = []
  for (let a = 1; a <= 7; a++) {
    for (let b = a + 1; b <= 8; b++) {
      for (let c = b + 1; c <= 9; c++) all.push({ mask: (1 << a) | (1 << b) | (1 << c), digits: [a, b, c] })
    }
  }
  return all
})()

type Shape = { block: Block; trio: number[]; extras: CellIdx[] }
type Removal = { cell: CellIdx; digit: number }

const digitsOf = (mask: number) => [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(digit => mask & (1 << digit))

/** Type 1: the one cell with extras must take one of them. */
function typeOne(shape: Shape, masks: Uint16Array): StratInstance {
  const { trio, extras } = shape
  const [cell] = extras
  const trioMask = trio.reduce((mask, digit) => mask | (1 << digit), 0)
  const own = digitsOf(masks[cell] & ~trioMask)
  const removals = digitsOf(masks[cell] & trioMask).map(digit => ({ cell, digit }))
  const at = cellLabel(cell)

  return {
    ...frame(shape, masks, 'Type 1', removals, own.map(digit => ({ cell, digit }))),
    units: shape.block.boxes,
    narrative:
      opening(shape) +
      `Assuming the puzzle has exactly one solution, ${at} must be ` +
      `${own.length === 1 ? `its other candidate, ${own[0]}` : proseList(own, 'or')}, so ` +
      `${proseList(removals.map(r => r.digit))} ${removals.length === 1 ? 'is' : 'are'} removed from it.`,
  }
}

/** Type 2: every extra is the same digit, so one of the cells holding it is that digit. */
function typeTwo(shape: Shape, masks: Uint16Array): StratInstance | null {
  const { block, trio, extras } = shape
  const trioMask = trio.reduce((mask, digit) => mask | (1 << digit), 0)
  const extra = masks[extras[0]] & ~trioMask
  // a single digit, the same in every cell with extras
  if (extra & (extra - 1)) return null
  if (extras.some(cell => (masks[cell] & ~trioMask) !== extra)) return null
  const [x] = digitsOf(extra)

  const removals: Removal[] = []
  for (let cell = 0; cell < 81; cell++) {
    if (!(masks[cell] & extra) || block.cells.includes(cell)) continue
    if (extras.every(e => sees(cell, e))) removals.push({ cell, digit: x })
  }
  if (removals.length === 0) return null

  const holders = proseList(extras.map(cellLabel))
  const both = extras.length === 2 ? 'both' : 'all of them'
  return {
    ...frame(shape, masks, 'Type 2', removals, extras.map(cell => ({ cell, digit: x }))),
    units: unique([...block.boxes, ...sharedUnits(extras)]),
    narrative:
      opening(shape) +
      `The only digit ${holders} hold besides the three is ${x}. Assuming the puzzle has exactly ` +
      `one solution, one of them must be ${x}, so ${x} is removed from every other cell that sees ` +
      `${both}: ${proseList(removals.map(r => cellLabel(r.cell)))}.`,
  }
}

/**
 * Type 4: the two cells with extras share a unit in which one of the three
 * digits has no other place. One of them is that digit; were the other one
 * of the three as well, the six would close the pattern.
 */
function typeFour(shape: Shape, snapshot: Snapshot, masks: Uint16Array): StratInstance[] {
  const { values } = snapshot
  const { block, trio, extras } = shape
  const [p, q] = extras
  const found: StratInstance[] = []

  for (const unit of sharedUnits(extras)) {
    for (const u of trio) {
      const bit = 1 << u
      if (!(masks[p] & bit) || !(masks[q] & bit)) continue
      const places = unitCells(unit).filter(cell => values[cell] === null && masks[cell] & bit)
      if (places.length !== 2) continue

      const others = trio.filter(digit => digit !== u)
      const removals: Removal[] = []
      for (const cell of [p, q]) {
        for (const digit of others) if (masks[cell] & (1 << digit)) removals.push({ cell, digit })
      }
      if (removals.length === 0) continue

      const gone = [...new Set(removals.map(r => r.digit))].sort((a, b) => a - b)
      const pq = `${cellLabel(p)} and ${cellLabel(q)}`
      found.push({
        ...frame(shape, masks, 'Type 4', removals, [p, q].map(cell => ({ cell, digit: u })), `strong ${u}s in ${unitDisplayName(unit)}`),
        units: unique([...block.boxes, unit]),
        narrative:
          opening(shape) +
          `There are only two places for ${u} in ${unitDisplayName(unit)}, ${pq}, so one of them is ` +
          `${u}. Were the other ${proseList(others, 'or')}, all six cells would hold only ` +
          `${proseList(trio, 'or')}. Assuming the puzzle has exactly one solution, the other one ` +
          `takes a digit outside the three, so neither can be ${proseList(others, 'or')}: ` +
          `${proseList(gone)} ${gone.length === 1 ? 'is' : 'are'} removed from ${pq}.`,
      })
    }
  }
  return found
}

/** The opening every occurrence shares: the six cells and why they must not close. */
function opening({ block, trio, extras }: Shape): string {
  const cells = block.cells.slice().sort((a, b) => a - b)
  return (
    `${proseList(cells.map(cellLabel))} sit two to a box in ${unitsDisplayName(block.boxes)}, along ` +
    `${unitsDisplayName(block.lines)}. Apart from ${proseList(extras.map(cellLabel))}, they can only ` +
    `be ${proseList(trio, 'or')}. Were all six left with only those three, ` +
    `${unitsDisplayName(block.lines)} would each hold ${proseList(trio)}, and the two cells in each ` +
    `box could swap their digits: every row, column and box would still hold the same digits, and ` +
    `the puzzle would have two solutions. `
  )
}

/** Marks, cells, ties and label: what every type shares. */
function frame(
  shape: Shape,
  masks: Uint16Array,
  type: string,
  removals: Removal[],
  rings: Removal[],
  note?: string,
): Pick<StratInstance, 'patternCells' | 'solvedCells' | 'candidateAnnotations' | 'links' | 'label'> {
  const { block, trio } = shape
  const gone = new Set(removals.map(({ cell, digit }) => `${cell}:${digit}`))
  const ringed = new Set(rings.map(({ cell, digit }) => `${cell}:${digit}`))

  // Discs on the three digits, rings on what saves the pattern, strikes on removals
  const marks: CandidateAnnotation[] = []
  for (const cell of block.cells) {
    for (const digit of trio) {
      const key = `${cell}:${digit}`
      if (masks[cell] & (1 << digit) && !gone.has(key) && !ringed.has(key)) {
        marks.push({ cell, digit, kind: 'highlight' })
      }
    }
  }
  for (const { cell, digit } of rings) {
    if (!gone.has(`${cell}:${digit}`)) marks.push({ cell, digit, kind: 'alternate' })
  }
  for (const { cell, digit } of removals) marks.push({ cell, digit, kind: 'eliminate' })

  return {
    patternCells: [...block.cells],
    solvedCells: [],
    candidateAnnotations: marks,
    links: ladder(block),
    label: `${type} on ${trio.join('/')}: ${where(block)}${note ? `, ${note}` : ''}, eliminates ${removalLabel(removals)}`,
  }
}

/** Ties along both lines of three and across each box. */
function ladder({ cells }: Block): Array<[CellIdx, CellIdx]> {
  return [
    [cells[0], cells[1]],
    [cells[2], cells[3]],
    [cells[4], cells[5]],
    [cells[0], cells[2]],
    [cells[2], cells[4]],
    [cells[1], cells[3]],
    [cells[3], cells[5]],
  ]
}

/** "rows C&E&G, columns 1&3" */
function where({ cells }: Block): string {
  const rows = [...new Set(cells.map(cell => CELL_UNITS[cell].row))].sort((a, b) => a - b)
  const cols = [...new Set(cells.map(cell => CELL_UNITS[cell].col))].sort((a, b) => a - b)
  return `rows ${rows.map(row => ROW_LABELS[row]).join('&')}, columns ${cols.map(col => col + 1).join('&')}`
}

/** "1/5 from C1", "6 from G3, G5, H1": cells grouped by the digits they lose. */
function removalLabel(removals: Removal[]): string {
  const byCell = new Map<CellIdx, number[]>()
  for (const { cell, digit } of removals) byCell.set(cell, [...(byCell.get(cell) ?? []), digit])
  const groups = new Map<string, CellIdx[]>()
  for (const [cell, digits] of [...byCell].sort((a, b) => a[0] - b[0])) {
    const key = digits.sort((a, b) => a - b).join('/')
    groups.set(key, [...(groups.get(key) ?? []), cell])
  }
  return [...groups].map(([digits, cells]) => `${digits} from ${cells.map(cellLabel).join(', ')}`).join('; ')
}

/** The rows, columns and boxes that hold every one of the cells. */
function sharedUnits(cells: CellIdx[]): UnitRef[] {
  const [first, ...rest] = cells
  const { row, col, box } = CELL_UNITS[first]
  const units: UnitRef[] = []
  if (rest.every(cell => CELL_UNITS[cell].row === row)) units.push({ kind: 'row', index: row })
  if (rest.every(cell => CELL_UNITS[cell].col === col)) units.push({ kind: 'col', index: col })
  if (rest.every(cell => CELL_UNITS[cell].box === box)) units.push({ kind: 'box', index: box })
  return units
}

function unique(units: UnitRef[]): UnitRef[] {
  const seen = new Set<string>()
  return units.filter(unit => {
    const key = `${unit.kind}${unit.index}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
