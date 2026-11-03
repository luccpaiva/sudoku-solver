import type {
  Snapshot,
  StratResult,
  StratInstance,
  CandidateAnnotation,
  CellIdx,
  UnitRef,
} from '../types'
import { BOXES, CELL_UNITS, ROWS, COLS, sees } from '../units'
import { cellLabel, combinations, proseList, unitDisplayName } from '../utils'

/**
 * Tridagons (Thor's Hammer):
 * four boxes at the corners of a rectangle (two bands, two stacks), each with
 * three cells one to a row and one to a column of the box, all twelve able to
 * hold only three digits a, b and c. In a box such three cells run on a slant,
 * falling (the main diagonal or a shift of it) or rising (the other diagonal
 * or a shift of it). Two boxes in the same band hold a, b and c in rows that
 * can only be shifted round from one box to the other, never swapped, and the
 * same goes for columns in a stack. Going round the four boxes, that forces
 * the falling ones to pair up: with an odd number rising, the twelve cells
 * cannot be filled from a, b and c at all. So some other candidate in them,
 * a guardian, must be true.
 *   Type 1: one cell holds guardians: it is one of them, not a, b or c.
 *   Type 2: the guardians are all one digit: it goes from the cells that see
 *           every guardian.
 *   Type 3: the guardian cells share a unit, and k other cells there hold
 *           only digits that, with the guardians', make k + 1: a locked set
 *           whose digits go from the rest of the unit.
 */
export function tridagons(snapshot: Snapshot): StratResult | null {
  const { values, candidates } = snapshot
  const instances: StratInstance[] = []
  const seen = new Set<string>()
  // each cell's candidates as bits, 0 for a solved cell
  const bits = candidates.map((set, cell) => (values[cell] === null ? bitsOf(set) : 0))
  // the slants each box can take on each triple, few guardians first; a box
  // is in four rectangles, so they are worked out once
  const slants = BOXES.map((_, box) => MASKS.map(mask => slantsIn(box, mask, bits)))

  for (const [band1, band2] of PAIRS) {
    for (const [stack1, stack2] of PAIRS) {
      const boxes = [band1 * 3 + stack1, band1 * 3 + stack2, band2 * 3 + stack1, band2 * 3 + stack2]

      for (let t = 0; t < TRIPLES.length; t++) {
        const triple = TRIPLES[t]
        const mask = MASKS[t]
        const options = boxes.map(box => slants[box][t])
        if (options.some(list => list.length === 0)) continue

        const chosen: Slant[] = []
        const visit = (depth: number, guardians: number, rising: number): void => {
          if (depth === 4) {
            if (rising % 2 === 1) {
              const instance = settle(snapshot, boxes, triple, mask, chosen)
              const key = instance && changes(instance)
              if (instance && !seen.has(key!)) {
                seen.add(key!)
                instances.push(instance)
              }
            }
            return
          }
          for (const slant of options[depth]) {
            if (guardians + slant.guardians > MAX_GUARDIAN_CELLS) continue
            chosen[depth] = slant
            visit(depth + 1, guardians + slant.guardians, rising + (slant.rising ? 1 : 0))
          }
        }
        visit(0, 0, 0)
      }
    }
  }

  if (instances.length === 0) return null
  return { name: 'Tridagons', instances }
}

/**
 * More guardian cells than this leave nothing to remove in practice: they
 * neither share a unit nor have a cell in sight of them all.
 */
const MAX_GUARDIAN_CELLS = 4

/** Two bands, or two stacks, of the three. */
const PAIRS: Array<[number, number]> = [[0, 1], [0, 2], [1, 2]]

const TRIPLES = combinations([1, 2, 3, 4, 5, 6, 7, 8, 9], 3)
const MASKS = TRIPLES.map(triple => triple.reduce((m, d) => m | (1 << d), 0))

/**
 * The six ways three cells take one row and one column each of a box: the
 * column of the cell in each row of the box, and whether the slant rises
 * (an odd permutation: the other diagonal or a shift of it).
 */
const PERMUTATIONS: Array<{ cols: number[]; rising: boolean }> = [
  { cols: [0, 1, 2], rising: false },
  { cols: [1, 2, 0], rising: false },
  { cols: [2, 0, 1], rising: false },
  { cols: [2, 1, 0], rising: true },
  { cols: [0, 2, 1], rising: true },
  { cols: [1, 0, 2], rising: true },
]

type Slant = {
  /** Top to bottom: one cell in each row of the box. */
  cells: CellIdx[]
  rising: boolean
  /** How many of the cells hold a candidate besides the three digits. */
  guardians: number
}

/**
 * The slants of a box whose three cells are empty, each able to take one of
 * the digits at least, and between them able to take all three.
 */
function slantsIn(box: number, mask: number, bits: number[]): Slant[] {
  const found: Slant[] = []
  for (const { cells, rising } of SLANTS[box]) {
    let union = 0
    let guardians = 0
    let fits = true
    for (const cell of cells) {
      // a solved cell has no bits, so it fails here too
      if ((bits[cell] & mask) === 0) { fits = false; break }
      union |= bits[cell] & mask
      if (bits[cell] & ~mask) guardians++
    }
    if (fits && union === mask) found.push({ cells, rising, guardians })
  }
  return found.sort((a, b) => a.guardians - b.guardians)
}

/** The six slants of each box, with their cells. */
const SLANTS: ReadonlyArray<ReadonlyArray<{ cells: CellIdx[]; rising: boolean }>> = BOXES.map(box =>
  PERMUTATIONS.map(({ cols, rising }) => ({ cells: cols.map((col, row) => box[0] + row * 9 + col), rising })),
)

function bitsOf(set: ReadonlySet<number>): number {
  let bits = 0
  for (const d of set) bits |= 1 << d
  return bits
}

/** What an occurrence removes and writes, as one string to tell repeats apart. */
function changes(instance: StratInstance): string {
  return instance.candidateAnnotations
    .filter(a => a.kind === 'eliminate')
    .map(a => `${a.cell}:${a.digit}`)
    .sort()
    .join(',')
}

const UNIT_KINDS = ['row', 'col', 'box'] as const

/** The units all of the cells share. */
function sharedUnits(cells: CellIdx[]): UnitRef[] {
  return UNIT_KINDS.filter(kind => cells.every(cell => CELL_UNITS[cell][kind] === CELL_UNITS[cells[0]][kind]))
    .map(kind => ({ kind, index: CELL_UNITS[cells[0]][kind] }))
}

function cellsOf(unit: UnitRef): ReadonlyArray<CellIdx> {
  return unit.kind === 'row' ? ROWS[unit.index] : unit.kind === 'col' ? COLS[unit.index] : BOXES[unit.index]
}

/** What one pattern removes, by the first type that applies, or null. */
function settle(
  snapshot: Snapshot,
  boxes: number[],
  triple: number[],
  mask: number,
  slants: Slant[],
): StratInstance | null {
  const { values, candidates } = snapshot
  const cells = slants.flatMap(s => s.cells)
  const guardianCells = cells.filter(cell => [...candidates[cell]].some(d => !triple.includes(d)))
  if (guardianCells.length === 0) return null // no way out: the board is broken
  const guardianDigits = [...new Set(guardianCells.flatMap(cell => [...candidates[cell]].filter(d => !triple.includes(d))))]
    .sort((a, b) => a - b)

  const parts = { snapshot, boxes, triple, mask, slants, cells, guardianCells, guardianDigits }

  // Type 1: the one guardian cell is one of its guardians
  if (guardianCells.length === 1) {
    const [cell] = guardianCells
    const gone = triple.filter(d => candidates[cell].has(d)).map(digit => ({ cell, digit }))
    return gone.length > 0 ? describe(parts, 1, gone, [], null) : null
  }

  // Type 2: one guardian digit, in every guardian cell's sight
  if (guardianDigits.length === 1) {
    const [digit] = guardianDigits
    const gone: Array<{ cell: CellIdx; digit: number }> = []
    for (let cell = 0; cell < 81; cell++) {
      if (values[cell] !== null || !candidates[cell].has(digit) || guardianCells.includes(cell)) continue
      if (guardianCells.every(g => sees(cell, g))) gone.push({ cell, digit })
    }
    return gone.length > 0 ? describe(parts, 2, gone, [], null) : null
  }

  // Type 3: the guardians as one cell of a locked set in a unit they share
  const guardianMask = guardianDigits.reduce((m, d) => m | (1 << d), 0)
  for (const unit of sharedUnits(guardianCells)) {
    const others = cellsOf(unit).filter(cell => values[cell] === null && !guardianCells.includes(cell))
    for (let size = 1; size <= 3; size++) {
      for (const locked of combinations(others, size)) {
        const union = locked.reduce((m, cell) => m | bitsOf(candidates[cell]), guardianMask)
        if (popcount(union) !== size + 1) continue
        const gone: Array<{ cell: CellIdx; digit: number }> = []
        for (const cell of others) {
          if (locked.includes(cell)) continue
          for (const digit of candidates[cell]) if (union & (1 << digit)) gone.push({ cell, digit })
        }
        if (gone.length > 0) return describe(parts, 3, gone, locked, unit)
      }
    }
  }
  return null
}

function popcount(bits: number): number {
  let n = 0
  for (; bits; bits &= bits - 1) n++
  return n
}

type Parts = {
  snapshot: Snapshot
  boxes: number[]
  triple: number[]
  mask: number
  slants: Slant[]
  cells: CellIdx[]
  guardianCells: CellIdx[]
  guardianDigits: number[]
}

function describe(
  { snapshot, boxes, triple, slants, cells, guardianCells, guardianDigits }: Parts,
  type: 1 | 2 | 3,
  gone: Array<{ cell: CellIdx; digit: number }>,
  locked: CellIdx[],
  unit: UnitRef | null,
): StratInstance {
  const { candidates } = snapshot
  const struck = new Set(gone.map(g => `${g.cell}:${g.digit}`))
  const marks: CandidateAnnotation[] = []
  // discs on the three digits, rings on the guardians and on the cells they lock with
  for (const cell of [...cells, ...locked]) {
    for (const digit of [...candidates[cell]].sort((a, b) => a - b)) {
      if (struck.has(`${cell}:${digit}`)) continue
      const own = cells.includes(cell) && triple.includes(digit)
      marks.push({ cell, digit, kind: own ? 'highlight' : 'alternate' })
    }
  }
  for (const { cell, digit } of gone) marks.push({ cell, digit, kind: 'eliminate' })

  const sortedBoxes = [...boxes].sort((a, b) => a - b)
  const boxNames = sortedBoxes.map(b => b + 1)
  const digits = proseList(triple, 'or')
  const list = (xs: CellIdx[]) => proseList(xs.map(cellLabel))
  const goneCells = [...new Set(gone.map(g => g.cell))].sort((a, b) => a - b)
  const goneDigits = [...new Set(gone.map(g => g.digit))].sort((a, b) => a - b)

  const risingBoxes = slants.map((s, i) => (s.rising ? boxes[i] + 1 : 0)).filter(Boolean).sort()
  const fallingBoxes = slants.map((s, i) => (s.rising ? 0 : boxes[i] + 1)).filter(Boolean).sort()
  const [odd, oddWay, rest, restWay] =
    risingBoxes.length === 1
      ? [risingBoxes, 'rises', fallingBoxes, 'fall']
      : [fallingBoxes, 'falls', risingBoxes, 'rise']

  const guards =
    guardianCells.length === 1
      ? `${cellLabel(guardianCells[0])}`
      : list(guardianCells)
  const setting =
    `Twelve cells, three in each of boxes ${proseList(boxNames)}, can only hold ${digits}, ` +
    `apart from ${type === 1 ? 'the other candidates of' : 'the extra candidates in'} ${guards}. ` +
    `In each box the three cells take one row and one column each, on a slant: from left to right ` +
    `it ${oddWay} in box ${odd[0]} and the slants ${restWay} in boxes ${proseList(rest)}. Boxes side by ` +
    `side can only hold ${proseList(triple)} shifted round from one to the other, never with two of ` +
    `them swapped, and going round the four boxes that leaves no way to fit one slant against the ` +
    `other three: filled from ${proseList(triple)} alone, these cells have no solution. `

  let label: string
  let ending: string
  if (type === 1) {
    const cell = guardianCells[0]
    const keep = [...candidates[cell]].filter(d => !triple.includes(d)).sort((a, b) => a - b)
    label = `Type 1 on ${triple.join('/')}: boxes ${boxNames.join('/')}, guardian ${cellLabel(cell)}`
    ending =
      `So ${cellLabel(cell)} must be ${proseList(keep, 'or')}, and ${proseList(goneDigits)} ` +
      `${goneDigits.length === 1 ? 'is' : 'are'} removed from it.`
  } else if (type === 2) {
    const [digit] = guardianDigits
    label = `Type 2 on ${triple.join('/')}: boxes ${boxNames.join('/')}, guardians ${digit} in ${guardianCells.map(cellLabel).join('/')}`
    ending =
      `So one of ${list(guardianCells)} must be ${digit}, and ${digit} is removed from ` +
      `${list(goneCells)}, which ${goneCells.length === 1 ? 'sees' : 'see'} all of them.`
  } else {
    const where = unitDisplayName(unit!)
    const lockedDigits = [...new Set([...guardianDigits, ...locked.flatMap(c => [...candidates[c]])])].sort((a, b) => a - b)
    label =
      `Type 3 on ${triple.join('/')}: boxes ${boxNames.join('/')}, guardians ${guardianCells.map(cellLabel).join('/')} ` +
      `lock ${lockedDigits.join('/')} with ${locked.map(cellLabel).join('/')}`
    const extras = guardianCells.map(
      cell => `${proseList([...candidates[cell]].filter(d => !triple.includes(d)).sort((a, b) => a - b), 'or')} in ${cellLabel(cell)}`,
    )
    const lockedOwn = lockedDigits.filter(d => locked.some(c => candidates[c].has(d)))
    const count = locked.length + 1
    ending =
      `So one of the extra candidates must be true: ${proseList(extras, 'or')}. ` +
      `${list(locked)} can only be ${proseList(lockedOwn, 'or')}. With whichever guardian is true, that ` +
      `makes ${count} cells of ${where} for the ${count} digits ${proseList(lockedDigits)}, which they ` +
      `take between them, so ${proseList(goneDigits)} ${goneDigits.length === 1 ? 'is' : 'are'} ` +
      `removed from the rest of ${where} (${list(goneCells)}).`
  }

  const units: UnitRef[] = sortedBoxes.map(index => ({ kind: 'box', index }))
  if (unit && !(unit.kind === 'box' && sortedBoxes.includes(unit.index))) units.push(unit)

  return {
    patternCells: [...cells, ...locked].sort((a, b) => a - b),
    solvedCells: [],
    candidateAnnotations: marks,
    units,
    label: `${label}, eliminates ${goneDigits.join('/')} from ${goneCells.map(cellLabel).join(', ')}`,
    narrative: setting + ending,
  }
}
