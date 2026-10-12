import type {
  Snapshot,
  StratResult,
  StratInstance,
  CandidateAnnotation,
  CellIdx,
  UnitKind,
  UnitRef,
} from '../types'
import { CELL_UNITS, PEERS, sees } from '../units'
import { cellLabel, proseList, unitDisplayName } from '../utils'

/**
 * Simple Colouring (Singles Chains):
 * A unit with only two places left for a digit holds it in one of them and
 * not in the other. Such pairs link into a chain whose cells fall on two
 * sides in turn (the two colours): one side is all true, the other all false.
 *   Rule 2: a side with two cells in one unit is the false one.
 *   Rule 7: so is a side that sees every place a unit has for the digit.
 *   Rule 4: a cell off the chain that sees both sides cannot hold the digit.
 * → Eliminate the digit from the false side and from the cells that see both.
 */
export function simpleColouring(snapshot: Snapshot): StratResult | null {
  const { values, candidates } = snapshot
  const instances: StratInstance[] = []

  // Where each digit can still go
  const open: CellIdx[][] = Array.from({ length: 10 }, () => [])
  for (let cell = 0; cell < 81; cell++) {
    if (values[cell] !== null) continue
    for (const digit of candidates[cell]) open[digit].push(cell)
  }

  for (let digit = 1; digit <= 9; digit++) {
    // The same, unit by unit: rows 0 to 8, columns 9 to 17, boxes 18 to 26
    const places: CellIdx[][] = Array.from({ length: 27 }, () => [])
    for (const cell of open[digit]) {
      const { row, col, box } = CELL_UNITS[cell]
      places[row].push(cell)
      places[9 + col].push(cell)
      places[18 + box].push(cell)
    }

    for (const chain of chainsIn(places)) {
      const instance = settle(digit, chain, open[digit], places)
      if (instance) instances.push(instance)
    }
  }

  if (instances.length === 0) return null
  return { name: 'Simple Colouring', instances }
}

type Chain = {
  cells: CellIdx[]
  /** 1 or 2 for a cell of the chain, 0 for every other cell. */
  side: Uint8Array
  links: Array<[CellIdx, CellIdx]>
}

/** What shows that one side of a chain cannot be the true one. */
type Fault = {
  side: number
  rule: 2 | 7
  unit: UnitRef
  /** Rule 2: the cells of the side that share the unit. Rule 7: all the unit's places. */
  cells: CellIdx[]
}

const UNIT_KINDS: UnitKind[] = ['row', 'col', 'box']

function unitRef(u: number): UnitRef {
  return { kind: UNIT_KINDS[(u / 9) | 0], index: u % 9 }
}

/** The chains of one digit, each coloured outwards from its first cell. */
function chainsIn(places: CellIdx[][]): Chain[] {
  const partners = new Map<CellIdx, CellIdx[]>()
  for (const unit of places) {
    if (unit.length !== 2) continue
    const [a, b] = unit
    // a line and a box can hold the same pair
    if (partners.get(a)?.includes(b)) continue
    partners.set(a, [...(partners.get(a) ?? []), b])
    partners.set(b, [...(partners.get(b) ?? []), a])
  }

  const chains: Chain[] = []
  const taken = new Uint8Array(81)
  for (let start = 0; start < 81; start++) {
    if (taken[start] || !partners.has(start)) continue

    const cells = [start]
    const side = new Uint8Array(81)
    const links: Array<[CellIdx, CellIdx]> = []
    side[start] = 1
    // the list grows as the colouring spreads
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i]
      taken[cell] = 1
      for (const next of partners.get(cell)!) {
        if (side[next] === 0) {
          side[next] = 3 - side[cell]
          cells.push(next)
        }
        if (cell < next) links.push([cell, next])
      }
    }
    // A pair on its own is no chain: all it removes is what Pointing Pairs
    // and Box-Reduction remove
    if (links.length > 1) chains.push({ cells: cells.sort((a, b) => a - b), side, links })
  }
  return chains
}

/** What one chain removes, or null when it removes nothing. */
function settle(
  digit: number,
  chain: Chain,
  open: CellIdx[],
  places: CellIdx[][],
): StratInstance | null {
  const { cells, side, links } = chain

  // Which sides of the chain each cell of the board sees: 1, 2 or both (3)
  const seen = new Uint8Array(81)
  for (const cell of cells) {
    for (const peer of PEERS[cell]) seen[peer] |= side[cell]
  }

  const faults = [faultOf(1, chain, seen, places), faultOf(2, chain, seen, places)]
  // Both sides false: the board itself is broken, and nothing follows from it
  if (faults[0] && faults[1]) return null
  const fault = faults[0] ?? faults[1]

  // Rule 4: off the chain and in sight of both sides
  const caught = open.filter(c => side[c] === 0 && seen[c] === 3)
  const kept = cells.filter(c => side[c] !== fault?.side)
  const gone = [...cells.filter(c => side[c] === fault?.side), ...caught].sort((a, b) => a - b)
  if (gone.length === 0) return null

  // With one side removed, the side left standing is drawn as discs
  const marks: CandidateAnnotation[] = [
    ...kept.map(cell => ({
      cell,
      digit,
      kind: fault || side[cell] === 1 ? ('highlight' as const) : ('alternate' as const),
    })),
    ...gone.map(cell => ({ cell, digit, kind: 'eliminate' as const })),
  ]

  const names = (list: CellIdx[]) => list.map(cellLabel).join('/')
  let shape: string
  if (!fault) {
    shape = `${names(cells.filter(c => side[c] === 1))} against ${names(cells.filter(c => side[c] === 2))}`
  } else if (fault.rule === 2) {
    shape = `${names(fault.cells)} twice in ${unitDisplayName(fault.unit)}`
  } else {
    shape = `${names(inSight(chain, fault.side, fault.cells))} empty ${unitDisplayName(fault.unit)}`
  }

  return {
    patternCells: cells,
    solvedCells: [],
    candidateAnnotations: marks,
    units: fault ? [fault.unit] : [],
    links,
    label: `Simple Colouring on ${digit}: ${shape}, eliminates ${digit} from ${gone.map(cellLabel).join(', ')}`,
    narrative: narrate(digit, chain, fault, caught),
  }
}

/** The first thing that rules a side out, if anything does. */
function faultOf(s: number, chain: Chain, seen: Uint8Array, places: CellIdx[][]): Fault | null {
  const { cells, side } = chain

  // Rule 2: two of its cells see each other, so they share a unit
  if (cells.some(c => side[c] === s && (seen[c] & s) !== 0)) {
    for (let u = 0; u < 27; u++) {
      const twice = places[u].filter(c => side[c] === s)
      if (twice.length > 1) return { side: s, rule: 2, unit: unitRef(u), cells: twice }
    }
  }
  // Rule 7: it sees every place a unit has for the digit, none of them on the
  // chain. A unit with one place left is a hidden single, not this rule.
  for (let u = 0; u < 27; u++) {
    const unit = places[u]
    if (unit.length > 1 && unit.every(c => side[c] === 0 && (seen[c] & s) !== 0)) {
      return { side: s, rule: 7, unit: unitRef(u), cells: unit }
    }
  }
  return null
}

/** For each of the given cells, the first cell on one side that it sees; each is named once. */
function inSight(chain: Chain, s: number, from: CellIdx[]): CellIdx[] {
  const found = from.map(cell => chain.cells.find(c => chain.side[c] === s && sees(cell, c))!)
  return [...new Set(found)].sort((a, b) => a - b)
}

function narrate(digit: number, chain: Chain, fault: Fault | null, caught: CellIdx[]): string {
  const list = (cells: CellIdx[]) => proseList(cells.map(cellLabel))
  const pairs =
    `Where a row, column or box has only two places left for ${digit}, one of them ` +
    `is the ${digit} and the other is not. `
  const sides = `one side is all ${digit}s and the other has none. `

  if (!fault) {
    // up to two cells are told with what they see, more are only named
    const sights =
      caught.length > 2
        ? `${list(caught)} each see both a disc and a ring`
        : caught
            .map(
              cell =>
                `${cellLabel(cell)} sees a disc (${list(inSight(chain, 1, [cell]))}) ` +
                `and a ring (${list(inSight(chain, 2, [cell]))})`,
            )
            .join(', and ')
    const none = caught.length === 1 ? 'it cannot' : caught.length === 2 ? 'neither can' : 'none of them can'
    return (
      `${pairs}Linked together, such pairs make a chain with two sides, discs and rings: ${sides}` +
      `${sights}, so ${none} be ${digit} whichever side is the true one.`
    )
  }

  const where = unitDisplayName(fault.unit)
  const proof =
    fault.rule === 2
      ? `${list(fault.cells)} are on the same side yet share ${where}, which takes only one ${digit}. `
      : `${list(fault.cells)} are the only places for ${digit} in ${where}, and ` +
        `${fault.cells.length === 2 ? 'both' : 'all'} are in sight of the same side of the chain ` +
        `(${list(inSight(chain, fault.side, fault.cells))}): were that side true, ` +
        `${where} would have no ${digit}. `
  const also =
    caught.length === 0
      ? ''
      : `; ${list(caught)}, in sight of both sides, ` +
        `${caught.length === 1 ? 'loses its' : 'lose their'} ${digit} as well`
  return (
    `${pairs}Linked together, such pairs make a chain with two sides: ${sides}${proof}` +
    `That side is therefore the false one, so its ${digit}s are removed and the discs are the true side${also}.`
  )
}
