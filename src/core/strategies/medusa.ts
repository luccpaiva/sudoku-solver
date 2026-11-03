import type {
  Snapshot,
  StratResult,
  StratInstance,
  CandidateAnnotation,
  CellIdx,
  UnitKind,
  UnitRef,
} from '../types'
import { ALL_UNITS, CELL_UNITS, PEERS } from '../units'
import { cellLabel, proseList, unitDisplayName } from '../utils'

/**
 * 3D Medusa:
 * Two candidates are linked when one of them is true and the other is not:
 * the two digits of a cell with two candidates left, or the two places of a
 * row, column or box with two places left for a digit. Linked up across cells
 * and digits they make a web whose candidates fall on two sides in turn (the
 * two colours): one side is all true, the other all false.
 *   Rule 1: a side with two candidates in one cell is the false one.
 *   Rule 2: so is a side with the same digit twice in one unit.
 *   Rule 6: so is a side that sees every candidate of a cell off the web.
 *   Rule 7: so is a side that sees every place a unit has for a digit, none of them on the web.
 *   Rule 3: a candidate off the web in a cell that holds both sides goes.
 *   Rule 4: so does one that sees its digit on both sides.
 *   Rule 5: so does one that sees its digit on one side and has the other side in its own cell.
 * → Eliminate the false side, if there is one, and every candidate rules 3 to 5 catch.
 *
 * A web that keeps to one digit is Simple Colouring's, which comes earlier:
 * only webs that cross from one digit to another through a cell are taken.
 */
export function medusa(snapshot: Snapshot): StratResult | null {
  const { values, candidates } = snapshot
  const instances: StratInstance[] = []

  // A candidate is a node: cell * 9 + digit - 1
  const partners: number[][] = Array.from({ length: 729 }, () => [])
  const link = (a: number, b: number) => {
    if (partners[a].includes(b)) return
    partners[a].push(b)
    partners[b].push(a)
  }

  // Bi-value: the two digits of a cell
  for (let cell = 0; cell < 81; cell++) {
    if (values[cell] !== null || candidates[cell].size !== 2) continue
    const [a, b] = candidates[cell]
    link(cell * 9 + a - 1, cell * 9 + b - 1)
  }
  // The places each unit has for each digit, at unit * 9 + digit - 1
  const places: CellIdx[][] = []
  for (const unit of ALL_UNITS) {
    for (let digit = 1; digit <= 9; digit++) {
      places.push(unit.filter(cell => values[cell] === null && candidates[cell].has(digit)))
    }
  }
  // Bi-location: the two places of a unit for a digit (a line and a box can hold the same pair)
  places.forEach((cells, at) => {
    const offset = at % 9
    if (cells.length === 2) link(cells[0] * 9 + offset, cells[1] * 9 + offset)
  })

  const taken = new Uint8Array(729)
  // what the webs kept so far remove: a web that removes nothing more is left out
  const gone = new Uint8Array(729)
  for (let start = 0; start < 729; start++) {
    if (taken[start] || partners[start].length === 0) continue

    const nodes = [start]
    const side = new Uint8Array(729)
    side[start] = 1
    let broken = false
    let crosses = false
    let joins = 0
    // the list grows as the colouring spreads
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]
      taken[node] = 1
      for (const next of partners[node]) {
        if (node < next) {
          joins++
          if (cellOf(node) === cellOf(next)) crosses = true
        }
        if (side[next] === 0) {
          side[next] = 3 - side[node]
          nodes.push(next)
        } else if (side[next] === side[node]) {
          // two linked candidates on one side: the board is broken already
          broken = true
        }
      }
    }
    // A lone pair is no web, and one digit alone is Simple Colouring's
    if (broken || !crosses || joins < 2) continue

    const instance = settle(snapshot, nodes.sort((a, b) => a - b), side, partners, places)
    if (!instance) continue
    const removes = instance.candidateAnnotations
      .filter(mark => mark.kind === 'eliminate')
      .map(mark => mark.cell * 9 + mark.digit - 1)
    if (removes.every(node => gone[node])) continue
    for (const node of removes) gone[node] = 1
    instances.push(instance)
  }

  if (instances.length === 0) return null
  return { name: '3D Medusa', instances }
}

const cellOf = (node: number): CellIdx => (node / 9) | 0
const digitOf = (node: number): number => (node % 9) + 1

const UNIT_KINDS: UnitKind[] = ['row', 'col', 'box']

function unitRef(u: number): UnitRef {
  return { kind: UNIT_KINDS[(u / 9) | 0], index: u % 9 }
}

/** The unit through which two cells see each other: their box, or else their line. */
function sharedUnit(a: CellIdx, b: CellIdx): UnitRef {
  if (CELL_UNITS[a].box === CELL_UNITS[b].box) return { kind: 'box', index: CELL_UNITS[a].box }
  if (CELL_UNITS[a].row === CELL_UNITS[b].row) return { kind: 'row', index: CELL_UNITS[a].row }
  return { kind: 'col', index: CELL_UNITS[a].col }
}

/** What shows that one side of the web cannot be the true one. */
type Fault =
  | { rule: 1; side: number; cell: CellIdx; digits: number[] }
  | { rule: 2; side: number; digit: number; cells: CellIdx[]; unit: UnitRef }
  | { rule: 6; side: number; cell: CellIdx; digits: number[]; from: CellIdx[] }
  | { rule: 7; side: number; digit: number; unit: UnitRef; places: CellIdx[]; from: CellIdx[] }

/** How one side rules a candidate out: by a cell in sight with its digit, or by a digit of its own cell. */
type Way = { sight: CellIdx } | { own: number }

/** A candidate off the web that neither side lets stand. */
type Catch = {
  cell: CellIdx
  digit: number
  rule: 3 | 4 | 5
  /** The way each side rules it out. */
  by: [Way, Way]
}

/** Everything one side of a web would rule out, were it the true side. */
type Reach = {
  /** For a candidate: the first cell holding the same digit on this side that sees it, or -1. */
  seen: Int16Array
  /** For a cell: how many of its candidates are on this side. */
  held: Uint8Array
  /** For a cell: a digit of it on this side, or 0. */
  digit: Uint8Array
}

function reachOf(nodes: number[], side: Uint8Array, s: number): Reach {
  const seen = new Int16Array(729).fill(-1)
  const held = new Uint8Array(81)
  const digit = new Uint8Array(81)
  for (const node of nodes) {
    if (side[node] !== s) continue
    const cell = cellOf(node)
    const offset = node % 9
    held[cell]++
    if (digit[cell] === 0) digit[cell] = offset + 1
    for (const peer of PEERS[cell]) {
      if (seen[peer * 9 + offset] === -1) seen[peer * 9 + offset] = cell
    }
  }
  return { seen, held, digit }
}

/** What one web removes, or null when it removes nothing. */
function settle(
  snapshot: Snapshot,
  nodes: number[],
  side: Uint8Array,
  partners: number[][],
  places: CellIdx[][],
): StratInstance | null {
  const { values, candidates } = snapshot
  const reach: [Reach, Reach] = [reachOf(nodes, side, 1), reachOf(nodes, side, 2)]

  const faults = [1, 2].map(s => faultOf(snapshot, nodes, side, reach, s, places))
  // Both sides false: the board itself is broken, and nothing follows from it
  if (faults[0] && faults[1]) return null
  const fault = faults[0] ?? faults[1]

  // Rules 3 to 5: candidates off the web that either side rules out
  const caught: Catch[] = []
  for (let cell = 0; cell < 81; cell++) {
    if (values[cell] !== null) continue
    for (const digit of [...candidates[cell]].sort()) {
      const node = cell * 9 + digit - 1
      if (side[node] !== 0) continue
      const ways = reach.map((r): Way | null =>
        r.held[cell] > 0 ? { own: r.digit[cell] } : r.seen[node] !== -1 ? { sight: r.seen[node] } : null,
      )
      if (!ways[0] || !ways[1]) continue
      const owns = ways.filter(way => 'own' in way!).length
      caught.push({ cell, digit, rule: owns === 2 ? 3 : owns === 0 ? 4 : 5, by: ways as [Way, Way] })
    }
  }

  const coloured = nodes.map(node => ({ node, s: side[node] }))
  const kept = coloured.filter(({ s }) => s !== fault?.side)
  const struck = coloured.filter(({ s }) => s === fault?.side)
  if (struck.length === 0 && caught.length === 0) return null

  // With one side removed, the side left standing is drawn as discs
  const marks: CandidateAnnotation[] = [
    ...kept.map(({ node, s }) => ({
      cell: cellOf(node),
      digit: digitOf(node),
      kind: fault || s === 1 ? ('highlight' as const) : ('alternate' as const),
    })),
    ...struck.map(({ node }) => ({ cell: cellOf(node), digit: digitOf(node), kind: 'eliminate' as const })),
    ...caught.map(({ cell, digit }) => ({ cell, digit, kind: 'eliminate' as const })),
  ]

  // The ties drawn are the places linked in a unit; the two digits of one cell cannot be drawn
  const links: Array<[CellIdx, CellIdx]> = []
  const drawn = new Set<number>()
  for (const node of nodes) {
    for (const other of partners[node]) {
      const [a, b] = [cellOf(node), cellOf(other)]
      if (a >= b || drawn.has(a * 81 + b)) continue
      drawn.add(a * 81 + b)
      links.push([a, b])
    }
  }

  const gone = [...struck.map(({ node }) => node), ...caught.map(c => c.cell * 9 + c.digit - 1)].sort((a, b) => a - b)
  const rules = [...(fault ? [fault.rule] : []), ...new Set(caught.map(c => c.rule))].sort()

  return {
    // Rule 6's cell is off the web, so it is outlined with it to be seen
    patternCells: [...new Set([...nodes.map(cellOf), ...(fault?.rule === 6 ? [fault.cell] : [])])].sort((a, b) => a - b),
    solvedCells: [],
    candidateAnnotations: marks,
    units: fault?.rule === 2 || fault?.rule === 7 ? [fault.unit] : [],
    links,
    label: `3D Medusa, rule${rules.length > 1 ? 's' : ''} ${proseList(rules)}: ${shape(fault, caught)}, eliminates ${removals(gone)}`,
    narrative: narrate(fault, caught),
  }
}

/** The first thing that rules a side out, if anything does. */
function faultOf(
  snapshot: Snapshot,
  nodes: number[],
  side: Uint8Array,
  reach: Reach[],
  s: number,
  places: CellIdx[][],
): Fault | null {
  const { values, candidates } = snapshot
  const { seen, held } = reach[s - 1]
  const mine = nodes.filter(node => side[node] === s)

  // Rule 1: two candidates of one cell
  for (let cell = 0; cell < 81; cell++) {
    if (held[cell] < 2) continue
    const digits = mine.filter(node => cellOf(node) === cell).map(digitOf)
    return { rule: 1, side: s, cell, digits }
  }

  // Rule 2: one digit twice in a unit
  for (const node of mine) {
    const other = seen[node]
    if (other === -1) continue
    const cells = [other, cellOf(node)].sort((a, b) => a - b)
    return { rule: 2, side: s, digit: digitOf(node), cells, unit: sharedUnit(cells[0], cells[1]) }
  }

  // Rule 6: a cell off the web with every candidate in sight of the side
  const offWeb = (cell: CellIdx) => [...candidates[cell]].every(d => side[cell * 9 + d - 1] === 0)
  for (let cell = 0; cell < 81; cell++) {
    if (values[cell] !== null || candidates[cell].size < 2 || !offWeb(cell)) continue
    const digits = [...candidates[cell]].sort()
    if (digits.every(d => seen[cell * 9 + d - 1] !== -1)) {
      return { rule: 6, side: s, cell, digits, from: digits.map(d => seen[cell * 9 + d - 1]) }
    }
  }

  // Rule 7: every place of a unit for a digit, none on the web, in sight of the side.
  // A unit with one place left is a hidden single, not this rule.
  for (let u = 0; u < 27; u++) {
    for (let digit = 1; digit <= 9; digit++) {
      const cells = places[u * 9 + digit - 1]
      if (cells.length < 2) continue
      if (cells.every(c => side[c * 9 + digit - 1] === 0 && seen[c * 9 + digit - 1] !== -1)) {
        const from = cells.map(c => seen[c * 9 + digit - 1])
        return { rule: 7, side: s, digit, unit: unitRef(u), places: cells, from }
      }
    }
  }

  return null
}

// ── Words ─────────────────────────────────────────────────────────────────────

/** Removals grouped by digit: "4 from A1, B2; 9 from C3". */
function removals(nodes: number[]): string {
  const byDigit = new Map<number, CellIdx[]>()
  for (const node of nodes) {
    const d = digitOf(node)
    byDigit.set(d, [...(byDigit.get(d) ?? []), cellOf(node)])
  }
  return [...byDigit.entries()]
    .sort(([a], [b]) => a - b)
    .map(([d, cells]) => `${d} from ${cells.map(cellLabel).join(', ')}`)
    .join('; ')
}

function shape(fault: Fault | null, caught: Catch[]): string {
  if (!fault) return `${caught.length === 1 ? 'a candidate' : `${caught.length} candidates`} ruled out by both sides`
  if (fault.rule === 1) return `${fault.digits.join('&')} on one side in ${cellLabel(fault.cell)}`
  if (fault.rule === 2) return `${fault.digit} twice on one side in ${unitDisplayName(fault.unit)}`
  if (fault.rule === 6) return `one side empties ${cellLabel(fault.cell)}`
  return `one side empties ${unitDisplayName(fault.unit)} of ${fault.digit}`
}

const INTRO =
  'Where a cell has only two candidates left, or a row, column or box only two places left for a ' +
  'digit, one of the two is true and the other is not. Linked up across cells and digits, such pairs ' +
  'make a web with two sides: one side is all true and the other all false. '

/** The candidates rules 3 to 5 catch that are told in full; the rest are only named. */
const TOLD = 3

function narrate(fault: Fault | null, caught: Catch[]): string {
  if (!fault) {
    return `${INTRO}${tellCaught(caught, true)}`
  }

  const list = (cells: CellIdx[]) => proseList(cells.map(cellLabel))
  let proof: string
  if (fault.rule === 1) {
    proof =
      `${cellLabel(fault.cell)} holds ${proseList(fault.digits)} on the same side, yet a cell takes only ` +
      `one digit. `
  } else if (fault.rule === 2) {
    const where = unitDisplayName(fault.unit)
    proof = `${list(fault.cells)} hold ${fault.digit} on the same side, yet share ${where}, which takes only one ${fault.digit}. `
  } else if (fault.rule === 6) {
    const sights = fault.digits.map((d, i) => `its ${d} sees the ${d} in ${cellLabel(fault.from[i])}`)
    proof =
      `${cellLabel(fault.cell)} is off the web, and ${proseList(sights)}, all on the same side: were that ` +
      `side true, ${cellLabel(fault.cell)} would have no candidate left. `
  } else {
    const where = unitDisplayName(fault.unit)
    const from = [...new Set(fault.from)]
    proof =
      `${list(fault.places)} are the only places for ${fault.digit} in ${where}, and ` +
      `${fault.places.length === 2 ? 'both' : 'all'} are in sight of a ${fault.digit} on the same side ` +
      `(${list(from)}): were that side true, ${where} would have no ${fault.digit}. `
  }

  const also = caught.length === 0 ? '' : ` ${tellCaught(caught, false)}`
  return (
    `${INTRO}${proof}That side is therefore the false one, so its candidates are removed and the discs ` +
    `are the true side.${also}`
  )
}

/** Rules 3 to 5 in words, the first few with their reasons. */
function tellCaught(caught: Catch[], named: boolean): string {
  // A cell that holds both sides loses all its other candidates for one reason
  const reasons: string[] = []
  const unsaid: Catch[] = []
  const grouped = new Set<CellIdx>()
  for (const item of caught) {
    const { cell, rule } = item
    if (rule === 3 && grouped.has(cell)) continue
    if (reasons.length === TOLD) {
      unsaid.push(item)
      continue
    }
    reasons.push(reason(item, caught, named))
    if (rule === 3) grouped.add(cell)
  }

  const more =
    unsaid.length === 0
      ? ''
      : `; ${proseList(unsaid.map(({ cell, digit }) => `the ${digit} in ${cellLabel(cell)}`))} ${unsaid.length === 1 ? 'goes' : 'go'} the same way`
  const one = caught.length === 1
  return named
    ? `Here the sides are the discs and the rings. ${capital(reasons.join('; '))}${more}. Whichever side is true, ` +
        `${one ? 'that candidate is false, so it is removed' : 'these candidates are false, so they are removed'}.`
    : `Besides, ${reasons.join('; ')}${more}: whichever side is true, ` +
        `${one ? 'that candidate is false, so it goes' : 'those candidates are false, so they go'} too.`
}

/** Why one candidate (or, by rule 3, every candidate off the web in its cell) cannot stand. */
function reason({ cell, digit, rule, by }: Catch, caught: Catch[], named: boolean): string {
  const at = cellLabel(cell)
  const own = by.map(way => ('own' in way ? way.own : 0))
  if (rule === 3) {
    const digits = caught.filter(c => c.cell === cell && c.rule === 3).map(c => c.digit)
    return `${at} holds both sides (${own[0]} and ${own[1]}), so it cannot be ${proseList(digits, 'or')}`
  }
  const sight = by.map(way => ('sight' in way ? cellLabel(way.sight) : ''))
  if (rule === 4) {
    return named
      ? `the ${digit} in ${at} sees a disc ${digit} (${sight[0]}) and a ring ${digit} (${sight[1]})`
      : `the ${digit} in ${at} sees a ${digit} on each side (${sight[0]} and ${sight[1]})`
  }
  // rule 5: one side in sight, the other in its own cell
  const seen = own[0] === 0 ? 0 : 1
  const held = 1 - seen
  return named
    ? `the ${digit} in ${at} sees a ${seen === 0 ? 'disc' : 'ring'} ${digit} (${sight[seen]}) and has a ` +
        `${held === 0 ? 'disc' : 'ring'} in its own cell (the ${own[held]})`
    : `the ${digit} in ${at} sees a ${digit} on one side (${sight[seen]}) and has the other side in its own ` +
        `cell (the ${own[held]})`
}

const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)
