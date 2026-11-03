import type {
  Snapshot,
  StratResult,
  StratInstance,
  CandidateAnnotation,
  CellIdx,
  UnitRef,
} from '../types'
import { CELL_UNITS, PEERS, sees, unitCells } from '../units'
import { cellLabel, combinations, proseList, unitDisplayName, ROW_LABELS } from '../utils'
import { RECTANGLES } from './uniqueness'

/**
 * Unique Rectangle Guardians (Unique Rectangles, Types 2 to 5):
 * four corners of a rectangle in two rows, two columns and two boxes all hold
 * the same two digits a and b. Were all four left with just those two, a and
 * b could swap round the rectangle for a second solution, so in a puzzle with
 * one solution some corner takes another digit, a guardian. Type 1 (a single
 * corner with guardians) is in uniqueness.ts. Here the floor is two corners
 * holding only a and b; the roof is the other two.
 *   Type 5   the floor on a diagonal, and one floor corner's b is the only b
 *            of its row and of its column besides the corners next to it:
 *            were it a, the four corners would be a and b → it is not a
 *   Type 2   every guardian is one digit x, so a corner is x → eliminate x
 *            from the cells that see every corner holding it (2: roof in one
 *            box, 2b: in two, 2C: guardians on a diagonal or in three corners)
 *   Type 2D  the roof can take at most one of a and b; when only one other
 *            cell of a unit it shares holds either → that cell is a or b
 *   Type 3   at least one roof corner is a guardian, so the roof acts as one
 *            cell holding the guardians; with other cells of a unit it shares
 *            that makes a naked set → its digits leave the rest of the unit
 *            (3: roof in two boxes, 3b: in one)
 *   Type 4   one of the digits is confined to the roof in a unit it shares, so
 *            a roof corner is that digit → the other digit leaves both
 *            (4: roof in one box, 4b: in two)
 */
export function uniqueRectangleGuardians(snapshot: Snapshot): StratResult | null {
  const { values, candidates } = snapshot
  const found: Record<Kind, StratInstance[]> = { '5': [], '2': [], '2D': [], '3': [], '4': [] }

  for (const corners of RECTANGLES) {
    if (corners.some(cell => values[cell] !== null)) continue
    const common = [...candidates[corners[0]]]
      .filter(digit => corners.every(cell => candidates[cell].has(digit)))
      .sort((x, y) => x - y)

    for (const [a, b] of combinations(common, 2)) {
      const bare = corners.filter(cell => candidates[cell].size === 2)
      // three bare corners is Type 1; four is a deadly pattern already
      if (bare.length >= 3) continue
      const rect: Rect = { corners, a, b, bare, extra: corners.filter(cell => !bare.includes(cell)) }

      found['2'].push(...typeTwo(snapshot, rect))
      if (bare.length !== 2) continue

      if (!sees(bare[0], bare[1])) {
        found['5'].push(...typeFive(snapshot, rect))
        continue
      }
      // the floor is one side of the rectangle, the roof the other
      found['2D'].push(...typeTwoD(snapshot, rect))
      found['3'].push(...typeThree(snapshot, rect))
      found['4'].push(...typeFour(snapshot, rect))
    }
  }

  // The site tries Type 5 first, then the others. An occurrence that removes
  // nothing the ones before it do not is left out: Type 2D, say, often
  // reaches what a Type 3 or 4 on the same rectangle would, more simply.
  const instances: StratInstance[] = []
  const removed = new Set<string>()
  for (const kind of ORDER) {
    for (const instance of found[kind]) {
      const gone = instance.candidateAnnotations
        .filter(mark => mark.kind === 'eliminate')
        .map(mark => `${mark.cell}:${mark.digit}`)
      if (gone.every(key => removed.has(key))) continue
      for (const key of gone) removed.add(key)
      instances.push(instance)
    }
  }

  if (instances.length === 0) return null
  return { name: 'Unique Rectangle Guardians', instances: instances.slice(0, MAX_INSTANCES) }
}

type Kind = '5' | '2' | '2D' | '3' | '4'

const ORDER: Kind[] = ['5', '2', '2D', '3', '4']

/** More than this many occurrences at once are left for a later step. */
const MAX_INSTANCES = 30

type Rect = {
  /** Top left, top right, bottom left, bottom right. */
  corners: ReadonlyArray<CellIdx>
  a: number
  b: number
  /** The corners that hold a and b and nothing else. */
  bare: CellIdx[]
  /** The corners with guardians. */
  extra: CellIdx[]
}

type Removal = { cell: CellIdx; digit: number }

const COUNT_WORDS = ['', 'one', 'two', 'three', 'four', 'five']

// ── Type 5 ─────────────────────────────────────────────────────────────────────

/**
 * Two bare corners on a diagonal. If a pivot's `keep` is strongly linked to
 * both corners next to it, the pivot being `drop` would make those two `keep`
 * and leave the opposite corner (bare, and in sight of both) as `drop`: the
 * deadly pattern. So the pivot is not `drop`. When both bare corners are such
 * pivots for the same digit, one step takes it from both.
 */
function typeFive(snapshot: Snapshot, rect: Rect): StratInstance[] {
  const { a, b, bare, corners } = rect
  const out: StratInstance[] = []

  for (const [keep, drop] of [[a, b], [b, a]]) {
    const pivots = bare.flatMap(pivot => {
      const [across, down] = neighbours(corners, pivot)
      const first = conjugateUnit(snapshot, keep, pivot, across)
      const second = first && conjugateUnit(snapshot, keep, pivot, down)
      return first && second ? [{ pivot, across, down, units: [first, second] }] : []
    })
    if (pivots.length === 0) continue

    const removals = pivots.map(({ pivot }) => ({ cell: pivot, digit: drop })).sort((p, q) => p.cell - q.cell)
    const units = pivots.flatMap(p => p.units).filter(
      (unit, i, all) => all.findIndex(u => u.kind === unit.kind && u.index === unit.index) === i,
    )
    const [{ pivot, across, down, units: [first, second] }] = pivots
    const at = cellLabel(pivot)
    const opposite = cellLabel(bare.find(cell => cell !== pivot)!)
    const reason =
      `The only places for ${keep} in ${unitDisplayName(first)} are ${at} and ${cellLabel(across)}, ` +
      `and those in ${unitDisplayName(second)} are ${at} and ${cellLabel(down)}. Were ${at} ${drop}, ` +
      `${cellLabel(across)} and ${cellLabel(down)} would both be ${keep}, and ${opposite}, which sees ` +
      `both, would be ${drop}: all four corners ${a} and ${b}.`
    out.push({
      ...frame(rect, '5', removals, []),
      units,
      narrative:
        `${deadly(rect)} ${at} and ${opposite}, on opposite corners, can only be ${a} or ${b}. ` +
        reason +
        (pivots.length === 1
          ? ` So ${at} is not ${drop}, and ${drop} is removed from it.`
          : ` ${opposite} is tied to the same two corners by ${keep} in the same way, so neither ` +
            `${at} nor ${opposite} is ${drop}, and ${drop} is removed from both.`),
    })
  }
  return out
}

// ── Type 2 ─────────────────────────────────────────────────────────────────────

/**
 * Every corner with guardians has the same single one, x: one of them is x,
 * so x goes from every cell that sees all of them.
 */
function typeTwo(snapshot: Snapshot, rect: Rect): StratInstance[] {
  const { candidates } = snapshot
  const { a, b, bare, extra, corners } = rect
  if (extra.length < 2 || extra.length > 3) return []

  const guards = new Set(extra.flatMap(cell => [...candidates[cell]].filter(d => d !== a && d !== b)))
  if (guards.size !== 1 || extra.some(cell => candidates[cell].size !== 3)) return []
  const x = [...guards][0]

  const targets = PEERS[extra[0]]
    .filter(cell => !corners.includes(cell) && candidates[cell].has(x))
    .filter(cell => extra.every(corner => sees(cell, corner)))
    .sort((p, q) => p - q)
  if (targets.length === 0) return []

  const side = extra.length === 2 && sees(extra[0], extra[1])
  const type = !side ? '2C' : CELL_UNITS[extra[0]].box === CELL_UNITS[extra[1]].box ? '2' : '2b'
  // where the removals are: the units the roof shares, or the boxes they fall in
  const units = side
    ? sharedUnits(extra[0], extra[1]).filter(ref => targets.some(cell => unitCells(ref).includes(cell)))
    : boxesOf(targets)
  const removals = targets.map(cell => ({ cell, digit: x }))
  const guarded = extra.map(cellLabel)

  return [{
    ...frame(rect, type, removals, extra.map(cell => ({ cell, digit: x }))),
    units,
    narrative:
      `${deadly(rect)} ${proseList(bare.map(cellLabel))} can only be ${a} or ${b}, and the only ` +
      `other digit ${proseList(guarded)} hold is ${x}, so one of them is ${x}. ` +
      `${proseList(targets.map(cellLabel))} ${targets.length === 1 ? 'sees' : 'see'} ` +
      `${extra.length === 2 ? 'both' : 'all three'} of them, so ${x} is removed from ` +
      `${targets.length === 1 ? 'it' : 'them'}.`,
  }]
}

// ── Type 2D ────────────────────────────────────────────────────────────────────

/**
 * The roof cannot be a and b both, so it takes at most one of them, and a
 * unit it shares needs the other somewhere else. With a single cell there
 * holding a or b, that cell is one of them.
 */
function typeTwoD(snapshot: Snapshot, rect: Rect): StratInstance[] {
  const { values, candidates } = snapshot
  const { a, b, bare, extra: roof } = rect
  const out: StratInstance[] = []

  for (const unit of sharedUnits(roof[0], roof[1])) {
    const holders = unitCells(unit).filter(
      cell => !roof.includes(cell) && values[cell] === null && (candidates[cell].has(a) || candidates[cell].has(b)),
    )
    if (holders.length !== 1) continue
    const [cell] = holders
    const others = [...candidates[cell]].filter(d => d !== a && d !== b).sort((p, q) => p - q)
    if (others.length === 0) continue

    const held = [a, b].filter(d => candidates[cell].has(d))
    const at = cellLabel(cell)
    out.push({
      ...frame(rect, '2D', others.map(digit => ({ cell, digit })), held.map(digit => ({ cell, digit }))),
      patternCells: [...rect.corners, cell].sort((p, q) => p - q),
      units: [unit],
      narrative:
        `${deadly(rect)} ${proseList(bare.map(cellLabel))} can only be ${a} or ${b}, so ` +
        `${cellLabel(roof[0])} and ${cellLabel(roof[1])} cannot both be: at most one of the two ` +
        `digits goes into them, yet ${unitDisplayName(unit)} needs both, and outside ` +
        `${cellLabel(roof[0])} and ${cellLabel(roof[1])} only ${at} can take ${a} or ${b}. So ` +
        `${at} is ${proseList(held, 'or')}, and ${proseList(others)} ` +
        `${others.length === 1 ? 'is' : 'are'} removed from it.`,
    })
  }
  return out
}

// ── Type 3 ─────────────────────────────────────────────────────────────────────

/** The largest naked set the roof is looked for in, the roof counted as one cell. */
const MAX_SET = 4

/**
 * At least one roof corner is a guardian, so between them they hold one of
 * the guardian digits, like a single cell. A unit the roof shares in which
 * that cell and k others hold only k + 1 digits has them all placed there.
 */
function typeThree(snapshot: Snapshot, rect: Rect): StratInstance[] {
  const { values, candidates } = snapshot
  const { a, b, bare, extra: roof } = rect
  const guards = [...new Set(roof.flatMap(cell => [...candidates[cell]].filter(d => d !== a && d !== b)))]
    .sort((p, q) => p - q)
  // a single guardian is Type 2
  if (guards.length < 2 || guards.length > MAX_SET - 1) return []
  const out: StratInstance[] = []

  for (const unit of sharedUnits(roof[0], roof[1])) {
    const pool = unitCells(unit).filter(
      cell => !roof.includes(cell) && values[cell] === null && candidates[cell].size < MAX_SET + 1,
    )

    for (let k = 1; k + 1 <= MAX_SET; k++) {
      for (const set of combinations(pool, k)) {
        const own = new Set(set.flatMap(cell => [...candidates[cell]]))
        // cells that lock on their own are a naked set, the roof aside
        if (own.size <= k) continue
        const digits = new Set([...own, ...guards])
        if (digits.size !== k + 1) continue

        const removals: Removal[] = []
        for (const cell of unitCells(unit)) {
          if (roof.includes(cell) || set.includes(cell) || values[cell] !== null) continue
          for (const digit of [...candidates[cell]].sort((p, q) => p - q)) {
            if (digits.has(digit)) removals.push({ cell, digit })
          }
        }
        if (removals.length === 0) continue

        const type = CELL_UNITS[roof[0]].box === CELL_UNITS[roof[1]].box ? '3b' : '3'
        const locked = [...digits].sort((p, q) => p - q)
        const either = (cell: CellIdx) => proseList([...candidates[cell]].sort((p, q) => p - q), 'or')
        const where = unitDisplayName(unit)
        out.push({
          ...frame(rect, type, removals, [
            ...roof.flatMap(cell => guards.filter(d => candidates[cell].has(d)).map(digit => ({ cell, digit }))),
            ...set.flatMap(cell => [...candidates[cell]].map(digit => ({ cell, digit }))),
          ]),
          patternCells: [...rect.corners, ...set].sort((p, q) => p - q),
          units: [unit],
          label: `${labelOf(rect, type)}, set with ${set.map(cellLabel).join('/')}, eliminates ${removalLabel(removals)}`,
          narrative:
            `${deadly(rect)} ${proseList(bare.map(cellLabel))} can only be ${a} or ${b}, so at least ` +
            `one of ${cellLabel(roof[0])} and ${cellLabel(roof[1])} is ${proseList(guards, 'or')}: ` +
            `between them they act as one cell holding ${proseList(guards)}. With ` +
            `${proseList(set.map(cell => `${cellLabel(cell)} (${either(cell)})`))} that makes ` +
            `${COUNT_WORDS[k + 1]} cells of ${where} for just ${proseList(locked)}, one digit each, so ` +
            `no other cell of ${where} can take them: ${removalProse(removals)}.`,
        })
      }
    }
  }
  return out
}

// ── Type 4 ─────────────────────────────────────────────────────────────────────

/**
 * One of the digits has no place in a unit the roof shares but the roof, so
 * a roof corner is that digit; were the other corner the second digit, the
 * four would be deadly. So the second digit goes from both.
 */
function typeFour(snapshot: Snapshot, rect: Rect): StratInstance[] {
  const { a, b, bare, extra: roof } = rect
  const out: StratInstance[] = []

  for (const [keep, drop] of [[a, b], [b, a]]) {
    const units = sharedUnits(roof[0], roof[1]).filter(unit =>
      placesOf(snapshot, unit, keep).every(cell => roof.includes(cell)),
    )
    if (units.length === 0) continue

    const type = CELL_UNITS[roof[0]].box === CELL_UNITS[roof[1]].box ? '4' : '4b'
    const [first, second] = roof.map(cellLabel)
    out.push({
      ...frame(rect, type, roof.map(cell => ({ cell, digit: drop })), []),
      units,
      narrative:
        `${deadly(rect)} ${proseList(bare.map(cellLabel))} can only be ${a} or ${b}. In ` +
        `${proseList(units.map(unitDisplayName))}, ${keep} can only go in ${first} or ${second}, so ` +
        `one of them is ${keep}, and were the other ${drop}, all four corners would be ${a} and ${b}. ` +
        `So neither is ${drop}, and ${drop} is removed from both.`,
    })
  }
  return out
}

// ── Shared ─────────────────────────────────────────────────────────────────────

/** What every type shares: cells, marks, the rectangle's sides, a label. */
function frame(
  rect: Rect,
  type: string,
  removals: Removal[],
  rings: Removal[],
): Pick<StratInstance, 'patternCells' | 'solvedCells' | 'candidateAnnotations' | 'links' | 'label'> {
  const gone = new Set(removals.map(({ cell, digit }) => `${cell}:${digit}`))
  const [topLeft, topRight, bottomLeft, bottomRight] = rect.corners

  // Discs on the rectangle's two digits, rings on what guards it, strikes on removals
  const marks: CandidateAnnotation[] = []
  for (const cell of rect.corners) {
    for (const digit of [rect.a, rect.b]) {
      if (!gone.has(`${cell}:${digit}`)) marks.push({ cell, digit, kind: 'highlight' })
    }
  }
  for (const { cell, digit } of rings) {
    if (!gone.has(`${cell}:${digit}`)) marks.push({ cell, digit, kind: 'alternate' })
  }
  for (const { cell, digit } of removals) marks.push({ cell, digit, kind: 'eliminate' })

  return {
    patternCells: [...rect.corners],
    solvedCells: [],
    candidateAnnotations: marks,
    links: [
      [topLeft, topRight],
      [topRight, bottomRight],
      [bottomRight, bottomLeft],
      [bottomLeft, topLeft],
    ],
    label: `${labelOf(rect, type)}, eliminates ${removalLabel(removals)}`,
  }
}

/** "Type 2 on 1/5: rows A&H, columns 5&6" */
function labelOf(rect: Rect, type: string): string {
  const [topLeft, topRight, bottomLeft] = rect.corners
  const rows = [topLeft, bottomLeft].map(cell => ROW_LABELS[CELL_UNITS[cell].row])
  const cols = [topLeft, topRight].map(cell => CELL_UNITS[cell].col + 1)
  return `Type ${type} on ${rect.a}/${rect.b}: rows ${rows.join('&')}, columns ${cols.join('&')}`
}

/** The first sentence of every explanation: what the rectangle is and why it must not be. */
function deadly(rect: Rect): string {
  return (
    `${proseList(rect.corners.map(cellLabel))} make a rectangle in two boxes, and all four can be ` +
    `${rect.a} or ${rect.b}. Were each of them one of the two, the ${rect.a}s and ${rect.b}s could ` +
    `swap corners and give the puzzle a second solution; assuming it has just one, that cannot happen.`
  )
}

/** "8 from H1, H7" or "1 from C7; 1/7 from H7": cells that lose the same digits together. */
function removalLabel(removals: Removal[]): string {
  const byCell = new Map<CellIdx, number[]>()
  for (const { cell, digit } of removals) byCell.set(cell, [...(byCell.get(cell) ?? []), digit])
  const byDigits = new Map<string, CellIdx[]>()
  for (const [cell, digits] of byCell) {
    const key = digits.sort((p, q) => p - q).join('/')
    byDigits.set(key, [...(byDigits.get(key) ?? []), cell])
  }
  return [...byDigits].map(([digits, cells]) => `${digits} from ${cells.map(cellLabel).join(', ')}`).join('; ')
}

/** "1 is removed from C7 and H7, and 7 from H7" */
function removalProse(removals: Removal[]): string {
  const byDigit = new Map<number, CellIdx[]>()
  for (const { cell, digit } of removals) byDigit.set(digit, [...(byDigit.get(digit) ?? []), cell])
  return [...byDigit]
    .sort(([p], [q]) => p - q)
    .map(([digit, cells], i) => `${digit}${i === 0 ? ' is removed' : ''} from ${proseList(cells.map(cellLabel))}`)
    .join(', and ')
}

/** The two corners next to one corner of the rectangle: along its row, then its column. */
function neighbours(corners: ReadonlyArray<CellIdx>, corner: CellIdx): [CellIdx, CellIdx] {
  const i = corners.indexOf(corner)
  // 0 1
  // 2 3
  return [corners[i ^ 1], corners[i ^ 2]]
}

/** The units two cells share: their line first, then their box. */
function sharedUnits(p: CellIdx, q: CellIdx): UnitRef[] {
  const units: UnitRef[] = []
  if (CELL_UNITS[p].row === CELL_UNITS[q].row) units.push({ kind: 'row', index: CELL_UNITS[p].row })
  if (CELL_UNITS[p].col === CELL_UNITS[q].col) units.push({ kind: 'col', index: CELL_UNITS[p].col })
  if (CELL_UNITS[p].box === CELL_UNITS[q].box) units.push({ kind: 'box', index: CELL_UNITS[p].box })
  return units
}

/** A unit of the two cells in which the digit has no other place, if there is one. */
function conjugateUnit(snapshot: Snapshot, digit: number, p: CellIdx, q: CellIdx): UnitRef | null {
  return (
    sharedUnits(p, q).find(unit => {
      const places = placesOf(snapshot, unit, digit)
      return places.length === 2 && places.includes(p) && places.includes(q)
    }) ?? null
  )
}

/** The unsolved cells of a unit that can still take the digit. */
function placesOf(snapshot: Snapshot, unit: UnitRef, digit: number): CellIdx[] {
  return unitCells(unit).filter(cell => snapshot.values[cell] === null && snapshot.candidates[cell].has(digit))
}

function boxesOf(cells: CellIdx[]): UnitRef[] {
  return [...new Set(cells.map(cell => CELL_UNITS[cell].box))]
    .sort((p, q) => p - q)
    .map(index => ({ kind: 'box', index }))
}
