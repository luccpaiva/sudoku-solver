import type {
  Snapshot,
  StratResult,
  StratInstance,
  CandidateAnnotation,
  CellIdx,
  UnitKind,
  UnitRef,
} from '../types'
import { ROWS, COLS, BOXES, CELL_UNITS, commonPeers, sees } from '../units'
import { cellLabel, combinations, proseList, unitDisplayName } from '../utils'

/**
 * W-Wing:
 * Two cells hold the same two digits and do not see each other. A strong
 * link on one of the digits joins them: a unit with only two places for it,
 * one in sight of each cell. Both cells cannot be that digit, so one of them
 * is the other digit → eliminate it from every cell that sees both.
 *
 * Joined on both digits, the two cells hold one of each and both digits go.
 * That takes a pair of the same two digits between them (the double, a
 * Remote Pair chain of four) or a link of its own for each digit (the split
 * double).
 */

/** Two cells of which one must be the digit, and a unit they share. */
type Link = { from: CellIdx; to: CellIdx; unit: UnitRef }

/** A link on `digit` between the two cells, and what it removes where. */
type Join = { digit: number; link: Link; removes: number; cells: CellIdx[] }

const UNIT_GROUPS: Array<[UnitKind, ReadonlyArray<ReadonlyArray<CellIdx>>]> = [
  ['row', ROWS],
  ['col', COLS],
  ['box', BOXES],
]

export function wWing(snapshot: Snapshot): StratResult | null {
  const { values, candidates } = snapshot
  const instances: StratInstance[] = []

  // Cells with two candidates, grouped by the two digits
  const twinsByPair = new Map<number, CellIdx[]>()
  for (let cell = 0; cell < 81; cell++) {
    if (values[cell] !== null || candidates[cell].size !== 2) continue
    const [low, high] = [...candidates[cell]].sort((a, b) => a - b)
    const twins = twinsByPair.get(low * 10 + high)
    if (twins) twins.push(cell)
    else twinsByPair.set(low * 10 + high, [cell])
  }

  // The strong links of a digit, worked out the first time they are needed
  const linksByDigit = new Map<number, Link[]>()
  const linksOn = (digit: number): Link[] => {
    let links = linksByDigit.get(digit)
    if (!links) {
      links = strongLinks(snapshot, digit)
      linksByDigit.set(digit, links)
    }
    return links
  }

  for (const [pair, twins] of twinsByPair) {
    if (twins.length < 2) continue
    const digits: [number, number] = [(pair / 10) | 0, pair % 10]

    // Two twins that see each other take one digit each: a link on both
    const twinLinks = combinations(twins, 2)
      .filter(([a, b]) => sees(a, b))
      .map(([a, b]): Link => ({ from: a, to: b, unit: sharedUnit(a, b) }))

    for (const [p, q] of combinations(twins, 2)) {
      if (sees(p, q)) continue
      const targets = commonPeers(p, q).sort((a, b) => a - b)
      const double = connect(twinLinks, p, q)

      // One instance for the two cells, whichever links join them
      const joins: Join[] = []
      for (const removes of digits) {
        const cells = targets.filter(cell => candidates[cell].has(removes))
        if (cells.length === 0) continue
        // removing one digit takes a link on the other
        const digit = digits[0] + digits[1] - removes
        const link = double ?? connect(linksOn(digit), p, q)
        if (link) joins.push({ digit, link, removes, cells })
      }
      if (joins.length > 0) instances.push(toInstance(p, q, digits, joins, double))
    }
  }

  if (instances.length === 0) return null
  return { name: 'W-Wing', instances }
}

/** Every unit with only two places left for the digit. */
function strongLinks({ values, candidates }: Snapshot, digit: number): Link[] {
  const links: Link[] = []
  for (const [kind, group] of UNIT_GROUPS) {
    for (let index = 0; index < 9; index++) {
      const places = group[index].filter(c => values[c] === null && candidates[c].has(digit))
      if (places.length === 2) links.push({ from: places[0], to: places[1], unit: { kind, index } })
    }
  }
  return links
}

/** The first link with one end in sight of p and the other of q, turned to run from p's side. */
function connect(links: Link[], p: CellIdx, q: CellIdx): Link | null {
  for (const link of links) {
    if (sees(link.from, p) && sees(link.to, q)) return link
    if (sees(link.to, p) && sees(link.from, q)) return { from: link.to, to: link.from, unit: link.unit }
  }
  return null
}

/** A unit two cells that see each other are both in: their line, or else their box. */
function sharedUnit(a: CellIdx, b: CellIdx): UnitRef {
  if (CELL_UNITS[a].row === CELL_UNITS[b].row) return { kind: 'row', index: CELL_UNITS[a].row }
  if (CELL_UNITS[a].col === CELL_UNITS[b].col) return { kind: 'col', index: CELL_UNITS[a].col }
  return { kind: 'box', index: CELL_UNITS[a].box }
}

function toInstance(
  p: CellIdx,
  q: CellIdx,
  digits: [number, number],
  joins: Join[],
  double: Link | null,
): StratInstance {
  const links = double ? [double] : joins.map(join => join.link)
  const between = [...new Set(links.flatMap(link => [link.from, link.to]))]

  const eliminations: CandidateAnnotation[] = joins.flatMap(({ removes, cells }) =>
    cells.map(cell => ({ cell, digit: removes, kind: 'eliminate' as const })),
  )
  const removed = new Set(eliminations.map(({ cell, digit }) => cell * 10 + digit))

  // Discs on the two cells, rings on what joins them; a candidate that goes is only crossed out
  const linked: CandidateAnnotation[] = double
    ? [double.from, double.to].flatMap(cell =>
        digits.map(digit => ({ cell, digit, kind: 'alternate' as const })),
      )
    : joins.flatMap(({ digit, link }) =>
        [link.from, link.to].map(cell => ({ cell, digit, kind: 'alternate' as const })),
      )

  const via = double
    ? `the pair ${cellLabel(double.from)}/${cellLabel(double.to)}`
    : joins
        .map(({ digit, link }) => `${digit} in ${cellLabel(link.from)}/${cellLabel(link.to)}`)
        .join(' and ')
  const places = joins.map(({ cells }) => cells.map(cellLabel).join(', '))
  const taken =
    places.length === 2 && places[0] === places[1]
      ? `${digits.join('/')} from ${places[0]}`
      : joins.map(({ removes }, i) => `${removes} from ${places[i]}`).join('; ')

  return {
    patternCells: [p, q, ...between],
    solvedCells: [],
    candidateAnnotations: [
      ...[p, q].flatMap(cell => digits.map(digit => ({ cell, digit, kind: 'highlight' as const }))),
      ...linked.filter(({ cell, digit }) => !removed.has(cell * 10 + digit)),
      ...eliminations,
    ],
    units: distinct(links.map(link => link.unit), unit => `${unit.kind}${unit.index}`),
    links: distinct(
      links.flatMap(({ from, to }): Array<[CellIdx, CellIdx]> => [[p, from], [from, to], [to, q]]),
      ([a, b]) => Math.min(a, b) * 81 + Math.max(a, b),
    ),
    label:
      `W-Wing on ${digits.join('/')}: ${cellLabel(p)}/${cellLabel(q)} linked by ${via}` +
      `, eliminates ${taken}`,
    narrative: narrate(p, q, digits, joins, double),
  }
}

/** The items whose key has not come up before. */
function distinct<T>(items: T[], keyOf: (item: T) => string | number): T[] {
  const seen = new Set<string | number>()
  return items.filter(item => {
    const key = keyOf(item)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function narrate(
  p: CellIdx,
  q: CellIdx,
  [x, y]: [number, number],
  joins: Join[],
  double: Link | null,
): string {
  const ends = `${cellLabel(p)} and ${cellLabel(q)}`

  if (double) {
    const chain = proseList([p, double.from, double.to, q].map(cellLabel))
    return (
      `${chain} can each only be ${x} or ${y}, and each sees the next. Cells that see each ` +
      `other cannot hold the same digit, so the two digits alternate along the chain and ` +
      `${ends} end up different: one is ${x}, the other ${y}. ` +
      `A cell that sees both of them can be neither: ${removal(joins)}.`
    )
  }

  // why the two cells cannot both be the digit of a link
  const blocked = ({ digit, link }: Join) =>
    `the only places for ${digit} in ${unitDisplayName(link.unit)} are ${cellLabel(link.from)} and ` +
    `${cellLabel(link.to)}, and ${cellLabel(link.from)} sees ${cellLabel(p)} while ` +
    `${cellLabel(link.to)} sees ${cellLabel(q)}`

  const [first, second] = joins
  const opening =
    `${ends} can each only be ${x} or ${y}. They cannot both be ${first.digit}: ${blocked(first)}, ` +
    `so ${unitDisplayName(first.link.unit)} would be left without a ${first.digit}. `

  if (!second) {
    return (
      opening +
      `One of them is therefore ${first.removes}, so ${removal(joins)}, ` +
      `which ${first.cells.length === 1 ? 'sees' : 'see'} both of them.`
    )
  }
  return (
    opening +
    `They cannot both be ${second.digit} either: ${blocked(second)}. So one is ${x} and the ` +
    `other ${y}, and a cell that sees both of them can be neither: ${removal(joins)}.`
  )
}

/** "3 is removed from D6 and E6", for one digit or for both. */
function removal([first, second]: Join[]): string {
  const from = (join: Join) => proseList(join.cells.map(cellLabel))
  if (!second) return `${first.removes} is removed from ${from(first)}`
  if (from(first) === from(second)) {
    return `${first.removes} and ${second.removes} are removed from ${from(first)}`
  }
  return `${first.removes} is removed from ${from(first)} and ${second.removes} from ${from(second)}`
}
