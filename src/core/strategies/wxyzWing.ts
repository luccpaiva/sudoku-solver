import type { Snapshot, StratResult, StratInstance, CandidateAnnotation, CellIdx, UnitKind, UnitRef } from '../types'
import { CELL_UNITS, PEERS, sees, unitCells } from '../units'
import { cellLabel, proseList, unitDisplayName } from '../utils'

/**
 * WXYZ-Wing (a bent quad):
 * Four cells that hold only four digits between them, all of them in two
 * crossing units (a row or column with a box, or a row with a column).
 * A digit is restricted when its places among the four all see each other:
 * it can then be used at most once in them.
 *   Type 1: every digit but one (Z) is restricted. Without a Z the four
 *           cells would have three digits for four cells, so one of them
 *           is Z → eliminate Z from every cell that sees all of its places.
 *   Type 2: every digit is restricted, so each is used exactly once, as in
 *           a naked quad → eliminate each digit from every cell that sees
 *           all of its places.
 */
export function wxyzWing(snapshot: Snapshot): StratResult | null {
  const { values, candidates } = snapshot

  // Candidates as bits (1 << digit); a cell with two to four of them can be in a set
  const masks = new Uint16Array(81)
  const small = new Uint8Array(81)
  for (let cell = 0; cell < 81; cell++) {
    if (values[cell] !== null) continue
    for (const digit of candidates[cell]) masks[cell] |= 1 << digit
    small[cell] = candidates[cell].size >= 2 && candidates[cell].size <= 4 ? 1 : 0
  }

  // Sets of four cells with four digits, inside each pair of crossing units.
  // A set in more than one pair is found more than once; it counts once.
  const sets = new Map<number, CellIdx[]>()
  const picked: CellIdx[] = []
  const grow = (region: CellIdx[], from: number, bits: number): void => {
    if (picked.length === 4) {
      if (bitCount(bits) === 4) {
        const key = ((picked[0] * 81 + picked[1]) * 81 + picked[2]) * 81 + picked[3]
        if (!sets.has(key)) sets.set(key, [...picked])
      }
      return
    }
    for (let i = from; i <= region.length - (4 - picked.length); i++) {
      // given up on as soon as the cells hold more than four digits
      const next = bits | masks[region[i]]
      if (bitCount(next) > 4) continue
      picked.push(region[i])
      grow(region, i + 1, next)
      picked.pop()
    }
  }
  for (const { cells } of COVERS) {
    const region = cells.filter(cell => small[cell])
    if (region.length >= 4) grow(region, 0, 0)
  }

  const instances: StratInstance[] = []
  const seen = new Set<string>()

  const settle = (cells: CellIdx[]): void => {
    // all in one unit: a naked quad, which comes earlier
    if (KINDS.some(kind => cells.every(cell => CELL_UNITS[cell][kind] === CELL_UNITS[cells[0]][kind]))) return

    // Where each digit sits among the four, and the one digit (if any) whose places do not all see each other
    const bits = masks[cells[0]] | masks[cells[1]] | masks[cells[2]] | masks[cells[3]]
    const digits: number[] = []
    const places: CellIdx[][] = []
    let loose = -1
    for (let d = 1; d <= 9; d++) {
      if (!((bits >> d) & 1)) continue
      const here = cells.filter(cell => (masks[cell] >> d) & 1)
      if (!allSee(here)) {
        if (loose !== -1) return
        loose = d
      }
      digits.push(d)
      places.push(here)
    }

    // The digits that remove something, each with the cells it is removed from
    const removals: Array<{ digit: number; targets: CellIdx[] }> = []
    digits.forEach((digit, i) => {
      if (loose !== -1 && digit !== loose) return
      const targets = inSightOfAll(places[i], digit, masks, cells)
      if (targets.length > 0) removals.push({ digit, targets })
    })
    if (removals.length === 0) return

    // Several sets can make the same removals; the first one found tells it
    const key = removals.map(r => `${r.digit}:${r.targets.join(',')}`).join(' ')
    if (seen.has(key)) return
    seen.add(key)

    instances.push(describe(snapshot, cells, digits, places, loose === -1 ? null : loose, removals, coverOf(cells)!))
  }

  // in board order of the sets' cells
  for (const key of [...sets.keys()].sort((a, b) => a - b)) settle(sets.get(key)!)

  if (instances.length === 0) return null
  return { name: 'WXYZ-Wing', instances }
}

/**
 * Every pair of units that cross (share a cell): a row or a column with a
 * box of its band or stack, and a row with a column. The cells are both
 * units' together, in board order.
 */
const COVERS: ReadonlyArray<{ cells: CellIdx[] }> = (() => {
  const all: Array<{ cells: CellIdx[] }> = []
  const refs: UnitRef[] = (['row', 'col', 'box'] as const).flatMap(kind =>
    Array.from({ length: 9 }, (_, index) => ({ kind, index })),
  )
  for (let a = 0; a < refs.length; a++) {
    for (let b = a + 1; b < refs.length; b++) {
      if (refs[a].kind === refs[b].kind) continue
      const first = unitCells(refs[a])
      const second = unitCells(refs[b])
      if (!first.some(cell => second.includes(cell))) continue
      all.push({ cells: [...new Set([...first, ...second])].sort((x, y) => x - y) })
    }
  }
  return all
})()

function bitCount(bits: number): number {
  let count = 0
  for (let b = bits; b !== 0; b &= b - 1) count++
  return count
}

const KINDS: UnitKind[] = ['row', 'col', 'box']

function unitOf(cell: CellIdx, kind: UnitKind): UnitRef {
  return { kind, index: CELL_UNITS[cell][kind] }
}

function inUnit(cell: CellIdx, ref: UnitRef): boolean {
  return CELL_UNITS[cell][ref.kind] === ref.index
}

/**
 * Two crossing units that hold the four cells between them, or null. Cells
 * that all fit in one unit are a naked quad, so they are not taken.
 */
function coverOf(cells: CellIdx[]): [UnitRef, UnitRef] | null {
  if (KINDS.some(kind => cells.every(cell => inUnit(cell, unitOf(cells[0], kind))))) return null

  // A lone cell outside the first unit fits several; the cover kept is the
  // one whose units each hold the most of the four (row D and box 4 rather
  // than row D and column 1 for D3, D4, D6 and F1)
  let best: [UnitRef, UnitRef] | null = null
  let bestShare = 0
  for (const kind of KINDS) {
    // one of the two units holds the first cell
    const first = unitOf(cells[0], kind)
    const rest = cells.filter(cell => !inUnit(cell, first))

    for (const other of KINDS) {
      if (other === kind) continue
      const second = unitOf(rest[0], other)
      if (!rest.every(cell => inUnit(cell, second))) continue
      // the two must cross: share a cell
      if (!unitCells(first).some(cell => inUnit(cell, second))) continue
      const share = Math.min(...[first, second].map(ref => cells.filter(cell => inUnit(cell, ref)).length))
      if (share > bestShare) {
        best = kind === 'box' ? [second, first] : [first, second]
        bestShare = share
      }
    }
  }
  return best
}

function allSee(cells: CellIdx[]): boolean {
  for (let i = 0; i < cells.length; i++) {
    for (let j = i + 1; j < cells.length; j++) {
      if (!sees(cells[i], cells[j])) return false
    }
  }
  return true
}

/** The cells outside the set that hold the digit and see every one of its places. */
function inSightOfAll(places: CellIdx[], digit: number, masks: Uint16Array, set: CellIdx[]): CellIdx[] {
  // they are all among the peers of the first place
  return PEERS[places[0]]
    .filter(cell => (masks[cell] >> digit) & 1 && !set.includes(cell) && places.every(place => sees(cell, place)))
    .sort((a, b) => a - b)
}

function describe(
  snapshot: Snapshot,
  cells: CellIdx[],
  digits: ReadonlyArray<number>,
  places: CellIdx[][],
  z: number | null,
  removals: Array<{ digit: number; targets: CellIdx[] }>,
  cover: [UnitRef, UnitRef],
): StratInstance {
  const { candidates } = snapshot
  const names = proseList(cells.map(cellLabel))
  const where = cover.map(unitDisplayName).join(' or ')

  // Type 1: discs on the Zs, one of which is true, rings on the digits held
  // to one place each. Type 2: discs on the whole locked set.
  const marks: CandidateAnnotation[] = cells.flatMap(cell =>
    [...candidates[cell]].sort().map(digit => ({
      cell,
      digit,
      kind: z === null || digit === z ? ('highlight' as const) : ('alternate' as const),
    })),
  )
  for (const { digit, targets } of removals) {
    for (const cell of targets) marks.push({ cell, digit, kind: 'eliminate' })
  }

  const gone = removals.map(({ digit, targets }) => `${digit} from ${targets.map(cellLabel).join(', ')}`)
  const opening = `${names} each lie in ${where}, and between them hold only ${proseList(digits)}. `

  let narrative: string
  if (z !== null) {
    const held = digits.filter(d => d !== z).map(d => `${d}s`)
    const zCells = places[digits.indexOf(z)]
    const { targets } = removals[0]
    narrative =
      opening +
      `The ${proseList(held)} each sit only in cells that see one another, so none of them can be ` +
      `used twice in these four cells. Were none of the four ${z}, they would have three digits for ` +
      `four cells, so at least one of ${proseList(zCells.map(cellLabel), 'or')} is ${z}. ` +
      `${proseList(targets.map(cellLabel))} ${targets.length === 1 ? 'sees' : 'see'} ` +
      `${zCells.length === 2 ? 'both' : 'all'} of them, so ${z} is removed from ` +
      `${targets.length === 1 ? 'it' : 'them'}.`
  } else {
    const told = removals.map(
      ({ digit, targets }) =>
        `${proseList(targets.map(cellLabel))} ${targets.length === 1 ? 'sees' : 'see'} every ${digit} ` +
        `of the four, so ${targets.length === 1 ? 'it loses its' : 'they lose their'} ${digit}.`,
    )
    narrative =
      opening +
      `Each of these digits sits only in cells that see one another, so none can be used twice. ` +
      `Four cells and four digits, each used at most once: every digit is in exactly one of them, ` +
      `as in a naked quad, though the cells do not share one unit. ${told.join(' ')}`
  }

  return {
    patternCells: [...cells],
    solvedCells: [],
    candidateAnnotations: marks,
    units: cover,
    label:
      `WXYZ-Wing${z === null ? ' (Type 2)' : ` on ${z}`}: ${cells.map(cellLabel).join('/')} ` +
      `hold ${digits.join('/')}, eliminates ${gone.join('; ')}`,
    narrative,
  }
}
