import type { Snapshot, StratResult, StratInstance, CandidateAnnotation, CellIdx, UnitRef } from '../types'
import { CELL_UNITS, ROWS, COLS } from '../units'
import { cellLabel, proseList, unitDisplayName } from '../utils'

/**
 * Fireworks:
 * take a row and a column that cross in cell X, in box B. If outside B the
 * row has no place for a digit but one cell Y, and the column none but one
 * cell Z, the digit is in X, Y or Z: were it in neither Y nor Z, the row and
 * the column would both have to put it in B, which takes it once, so in the
 * one cell they share, X.
 *   Triple     three digits fire from the same X with the same Y and Z:
 *              three digits for three cells, which then hold nothing else.
 *   Quadruple  two digits fire from X1 and two others from X2, across a
 *              rectangle in four boxes whose other corners are the wings of
 *              both: four digits for four cells. X1 keeps its two, X2 its
 *              two, and the wings the four.
 * → Eliminate every other candidate from the cells of the pattern.
 */
export function fireworks(snapshot: Snapshot): StratResult | null {
  const { values, candidates } = snapshot
  const instances: StratInstance[] = []

  // Where each digit can go in each row and column, and whether it is placed there already
  const rowPlaces = placesBy(ROWS)
  const colPlaces = placesBy(COLS)

  /**
   * The digits that fire from a cell, each with the one place outside the
   * cell's box that its row has for it (or -1 for none), and the same for its column.
   */
  const fire = (x: CellIdx): Array<{ digit: number; row: CellIdx; col: CellIdx }> => {
    const { row, col, box } = CELL_UNITS[x]
    const found: Array<{ digit: number; row: CellIdx; col: CellIdx }> = []
    for (let digit = 1; digit <= 9; digit++) {
      const inRow = rowPlaces[row][digit]
      const inCol = colPlaces[col][digit]
      // a digit already placed in the row or column has nothing to prove
      if (inRow === null || inCol === null) continue
      const rowOut = inRow.filter(cell => CELL_UNITS[cell].box !== box)
      const colOut = inCol.filter(cell => CELL_UNITS[cell].box !== box)
      if (rowOut.length > 1 || colOut.length > 1) continue
      found.push({ digit, row: rowOut[0] ?? -1, col: colOut[0] ?? -1 })
    }
    return found
  }

  const fired: Array<ReturnType<typeof fire>> = []
  for (let cell = 0; cell < 81; cell++) fired.push(values[cell] === null ? fire(cell) : [])

  /** The firing digits of X whose wings fit Y (in X's row) and Z (in X's column), and that one of the three cells holds. */
  const firingWith = (x: CellIdx, y: CellIdx, z: CellIdx): number[] =>
    fired[x]
      .filter(f => (f.row === -1 || f.row === y) && (f.col === -1 || f.col === z))
      .map(f => f.digit)
      .filter(digit => [x, y, z].some(cell => candidates[cell].has(digit)))

  // Triple: one crossing, its two wings, three digits
  for (let x = 0; x < 81; x++) {
    if (fired[x].length < 3) continue
    const { row, col, box } = CELL_UNITS[x]
    const wingsInRow = ROWS[row].filter(c => values[c] === null && CELL_UNITS[c].box !== box)
    const wingsInCol = COLS[col].filter(c => values[c] === null && CELL_UNITS[c].box !== box)
    for (const y of wingsInRow) {
      for (const z of wingsInCol) {
        const digits = firingWith(x, y, z)
        // more than three digits for three cells is a broken board
        if (digits.length !== 3) continue
        const cells = [x, y, z]
        if (!matchable(cells.map(cell => digits.filter(d => candidates[cell].has(d))))) continue
        const instance = describe(snapshot, 'Triple', [{ x, digits }], cells, [y, z])
        if (instance) instances.push(instance)
      }
    }
  }

  // Quadruple: two crossings at opposite corners of a rectangle over four boxes
  for (let x1 = 0; x1 < 81; x1++) {
    if (fired[x1].length < 2) continue
    for (let x2 = x1 + 1; x2 < 81; x2++) {
      if (fired[x2].length < 2) continue
      const a = CELL_UNITS[x1]
      const b = CELL_UNITS[x2]
      if (((a.row / 3) | 0) === ((b.row / 3) | 0) || ((a.col / 3) | 0) === ((b.col / 3) | 0)) continue
      // the other two corners are the wings of both crossings
      const w1 = b.row * 9 + a.col
      const w2 = a.row * 9 + b.col
      if (values[w1] !== null || values[w2] !== null) continue
      const first = firingWith(x1, w2, w1)
      const second = firingWith(x2, w1, w2)
      // with three digits on one side, the triple says it all
      if (first.length !== 2 || second.length !== 2) continue
      if (first.some(d => second.includes(d))) continue
      const both = [...first, ...second]
      const cells = [x1, x2, w1, w2]
      const allowed = [first, second, both, both]
      if (!matchable(cells.map((cell, i) => allowed[i].filter(d => candidates[cell].has(d))))) continue
      const instance = describe(
        snapshot,
        'Quadruple',
        [{ x: x1, digits: first }, { x: x2, digits: second }],
        cells,
        [w1, w2],
      )
      if (instance) instances.push(instance)
    }
  }

  if (instances.length === 0) return null
  return { name: 'Fireworks', instances }

  /** For each unit and digit: the open cells that can take it, or null when it is placed. */
  function placesBy(units: ReadonlyArray<ReadonlyArray<CellIdx>>): Array<Array<CellIdx[] | null>> {
    return units.map(unit => {
      const byDigit: Array<CellIdx[] | null> = Array.from({ length: 10 }, () => [])
      for (const cell of unit) {
        if (values[cell] !== null) byDigit[values[cell]!] = null
        else for (const digit of candidates[cell]) byDigit[digit]?.push(cell)
      }
      return byDigit
    })
  }
}

/**
 * Whether the cells can take different digits, one each, from the lists
 * given for them (each list the digits of the pattern that cell holds).
 * Three or four cells, so trying every order is cheap.
 */
function matchable(options: number[][], taken: number[] = []): boolean {
  const at = taken.length
  if (at === options.length) return true
  return options[at].some(digit => !taken.includes(digit) && matchable(options, [...taken, digit]))
}

type Crossing = { x: CellIdx; digits: number[] }

function describe(
  snapshot: Snapshot,
  kind: 'Triple' | 'Quadruple',
  crossings: Crossing[],
  cells: CellIdx[],
  wings: CellIdx[],
): StratInstance | null {
  const { candidates } = snapshot
  const all = crossings.flatMap(c => c.digits).sort((m, n) => m - n)

  // What each cell may keep: a crossing its own digits, a wing all of them
  const keeps = (cell: CellIdx) => crossings.find(c => c.x === cell)?.digits ?? all
  const marks: CandidateAnnotation[] = []
  const gone: Array<{ cell: CellIdx; digits: number[] }> = []
  for (const cell of cells) {
    const out: number[] = []
    for (const digit of [...candidates[cell]].sort((m, n) => m - n)) {
      if (!keeps(cell).includes(digit)) {
        out.push(digit)
        marks.push({ cell, digit, kind: 'eliminate' })
      } else {
        // discs for the first crossing's digits, rings for the second's
        const side = crossings.findIndex(c => c.digits.includes(digit))
        marks.push({ cell, digit, kind: side === 0 ? 'highlight' : 'alternate' })
      }
    }
    if (out.length > 0) gone.push({ cell, digits: out })
  }
  if (gone.length === 0) return null

  const units: UnitRef[] = []
  for (const { x } of crossings) {
    const { row, col, box } = CELL_UNITS[x]
    units.push({ kind: 'row', index: row }, { kind: 'col', index: col }, { kind: 'box', index: box })
  }

  const removals = gone.map(g => `${g.digits.join('/')} from ${cellLabel(g.cell)}`).join(', ')
  const lists = (digits: number[]) => digits.join('/')
  const label =
    kind === 'Triple'
      ? `Triple Firework on ${lists(all)}: ${cellLabel(cells[0])} with ${wings.map(cellLabel).join(' & ')}, eliminates ${removals}`
      : `Quadruple Firework on ${lists(crossings[0].digits)} and ${lists(crossings[1].digits)}: ` +
        `${crossings.map(c => cellLabel(c.x)).join(' & ')} with ${wings.map(cellLabel).join(' & ')}, eliminates ${removals}`

  return {
    patternCells: [...cells].sort((m, n) => m - n),
    solvedCells: [],
    candidateAnnotations: marks,
    units,
    links: crossings.flatMap(({ x }) => wings.map((w): [CellIdx, CellIdx] => [x, w])),
    label,
    narrative: narrate(kind, crossings, cells, gone),
  }
}

/** "Outside box 5, row F has no room for 3, 7 or 8 except F1, and column 4 none except C4" */
function why(crossing: Crossing, rowWing: CellIdx, colWing: CellIdx): string {
  const { row, col, box } = CELL_UNITS[crossing.x]
  return (
    `outside ${unitDisplayName({ kind: 'box', index: box })}, ` +
    `${unitDisplayName({ kind: 'row', index: row })} has no room for ${proseList(crossing.digits, 'or')} ` +
    `except ${cellLabel(rowWing)}, and ${unitDisplayName({ kind: 'col', index: col })} none except ${cellLabel(colWing)}`
  )
}

function narrate(
  kind: 'Triple' | 'Quadruple',
  crossings: Crossing[],
  cells: CellIdx[],
  gone: Array<{ cell: CellIdx; digits: number[] }>,
): string {
  // "4, 5 and 6 are removed from C4, 1 from F1"
  const removals = gone
    .map((g, i) => `${proseList(g.digits)} ${i > 0 ? '' : g.digits.length === 1 ? 'is removed ' : 'are removed '}from ${cellLabel(g.cell)}`)
    .join(', ')

  if (kind === 'Triple') {
    const [{ x, digits }] = crossings
    const [, y, z] = cells
    const { row, col, box } = CELL_UNITS[x]
    const where = unitDisplayName({ kind: 'box', index: box })
    const reason = why(crossings[0], y, z)
    return (
      `${reason[0].toUpperCase()}${reason.slice(1)}. Take any of the three: if it is in neither ` +
      `${cellLabel(y)} nor ${cellLabel(z)}, ${unitDisplayName({ kind: 'row', index: row })} and ` +
      `${unitDisplayName({ kind: 'col', index: col })} must both place it inside ${where}, which ` +
      `takes it once, so it goes where they cross, in ${cellLabel(x)}. Each of ${proseList(digits)} ` +
      `is therefore in ${cellLabel(x)}, ${cellLabel(y)} or ${cellLabel(z)}: three digits for three ` +
      `cells, so the cells hold those digits and nothing else, and ${removals}.`
    )
  }

  const [first, second] = crossings
  const [x1, x2, w1, w2] = cells
  const all = [...first.digits, ...second.digits].sort((m, n) => m - n)
  const reason = why(first, w2, w1)
  return (
    `${reason[0].toUpperCase()}${reason.slice(1)}. A digit in neither of those two cells would have ` +
    `to sit where its row and column cross inside the box, so each of ${proseList(first.digits)} ` +
    `is in ${cellLabel(x1)}, ${cellLabel(w2)} or ${cellLabel(w1)}. In the same way, ${why(second, w1, w2)}, ` +
    `so each of ${proseList(second.digits)} is in ${cellLabel(x2)}, ${cellLabel(w1)} or ${cellLabel(w2)}. ` +
    `That is four digits, each at least once in the four cells ${proseList([x1, x2, w1, w2].map(cellLabel))}, ` +
    `so each is there exactly once: ${cellLabel(x1)} can only be ${proseList(first.digits, 'or')}, ` +
    `${cellLabel(x2)} only ${proseList(second.digits, 'or')}, and ${cellLabel(w1)} and ${cellLabel(w2)} ` +
    `hold nothing but ${proseList(all)}. So ${removals}.`
  )
}
