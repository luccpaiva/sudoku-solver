import type { Snapshot, StratResult, StratInstance, CandidateAnnotation, CellIdx, UnitRef } from '../types'
import { CELL_UNITS, PEERS, sees, commonPeers } from '../units'
import { cellLabel, proseList } from '../utils'

/**
 * XY-Chain:
 * A chain of cells with two candidates each, every cell in sight of the
 * next and sharing a digit with it. Whatever digit a cell is, the next one
 * is not, so the next is its other digit. Both ends hold a digit Z that is
 * not the one they pass along: if the first end is not Z, the chain forces
 * the last end to be Z, so one of the two ends is Z.
 * → eliminate Z from every cell that sees both ends.
 *
 * Closed XY-Chain: when the ends see each other, the Z between them closes
 * the chain into a loop. Its cells then go one of two ways round, and of
 * every two neighbours exactly one holds the digit they share.
 * → eliminate that digit from every other cell that sees both neighbours.
 *
 * Three cells make a Y-Wing, which is tried earlier; a chain here has four
 * cells at least and at most MAX_CELLS.
 */
export function xyChain(snapshot: Snapshot): StratResult | null {
  const { values, candidates } = snapshot

  // The cells with two candidates, and the ones of them each one sees
  const pairOf: Array<[number, number] | null> = Array.from({ length: 81 }, () => null)
  for (let cell = 0; cell < 81; cell++) {
    if (values[cell] === null && candidates[cell].size === 2) {
      pairOf[cell] = [...candidates[cell]] as [number, number]
    }
  }
  const next: CellIdx[][] = pairOf.map((pair, cell) =>
    pair ? PEERS[cell].filter(peer => pairOf[peer] !== null) : [],
  )

  const found = new Map<string, Found>()
  let order = 0

  for (let start = 0; start < 81; start++) {
    const pair = pairOf[start]
    if (!pair) continue
    for (const z of pair) {
      for (const chain of chainsFrom(start, z, pairOf, next)) {
        const result = settle(chain, z, candidates)
        if (!result) continue
        const key = result.removals.map(([cell, digit]) => `${cell}:${digit}`).join(',')
        const kept = found.get(key)
        // the shortest chain for the same removals, the first found on a tie
        if (!kept || chain.cells.length < kept.chain.cells.length) {
          found.set(key, { chain, z, ...result, order: kept?.order ?? order++ })
        }
      }
    }
  }
  if (found.size === 0) return null

  // More removals first, then shorter chains; a chain that removes nothing
  // another one does not is left out
  const ranked = [...found.values()].sort(
    (a, b) =>
      b.removals.length - a.removals.length ||
      a.chain.cells.length - b.chain.cells.length ||
      a.order - b.order,
  )
  const kept: Found[] = []
  for (const candidate of ranked) {
    const covered = kept.some(other =>
      candidate.removals.every(([cell, digit]) =>
        other.removals.some(([c, d]) => c === cell && d === digit),
      ),
    )
    if (!covered) kept.push(candidate)
    if (kept.length === MAX_INSTANCES) break
  }

  return { name: 'XY-Chain', instances: kept.map(describe) }
}

/** The longest chain looked for, in cells (sudokuwiki.org's solver goes to 12). */
const MAX_CELLS = 12

/** How many chains one step shows at most; the rest wait for the next step. */
const MAX_INSTANCES = 12

type Chain = {
  /** The cells from the first end to the last. */
  cells: CellIdx[]
  /**
   * The digit each cell is when the first end is not Z: the one it passes
   * on to the next cell, and Z at the last.
   */
  on: number[]
}

type Removal = [CellIdx, number]

type Found = {
  chain: Chain
  z: number
  /** Whether the ends see each other, closing the chain into a loop. */
  closed: boolean
  /** What goes, sorted by cell then digit. */
  removals: Removal[]
  /** For each link, the cells that lose its digit: link i joins cell i to i + 1, the last closes a loop. */
  byLink: CellIdx[][]
  order: number
}

/**
 * Every chain from a start cell that does not take Z and ends on a cell
 * that must then be Z, the shortest to each end. A search outwards, cell by
 * cell, that never comes back through a cell already on its way.
 */
function chainsFrom(
  start: CellIdx,
  z: number,
  pairOf: ReadonlyArray<[number, number] | null>,
  next: ReadonlyArray<ReadonlyArray<CellIdx>>,
): Chain[] {
  const other = (cell: CellIdx, digit: number) => {
    const [a, b] = pairOf[cell]!
    return a === digit ? b : a
  }

  // A state is a cell and the digit it is: cell * 10 + digit
  const back = new Map<number, number>()
  const length = new Map<number, number>()
  const first = start * 10 + other(start, z)
  back.set(first, -1)
  length.set(first, 1)

  const onTheWay = (state: number, cell: CellIdx) => {
    for (let s = state; s !== -1; s = back.get(s)!) {
      if (((s / 10) | 0) === cell) return true
    }
    return false
  }

  const chains: Chain[] = []
  const queue = [first]
  for (let i = 0; i < queue.length; i++) {
    const state = queue[i]
    const cell = (state / 10) | 0
    const digit = state % 10
    const cells = length.get(state)!

    for (const peer of next[cell]) {
      if (!pairOf[peer]!.includes(digit)) continue
      const reached = peer * 10 + other(peer, digit)
      if (length.has(reached) || onTheWay(state, peer)) continue
      back.set(reached, state)
      length.set(reached, cells + 1)
      if (cells + 1 < MAX_CELLS) queue.push(reached)
      if (reached % 10 === z && cells + 1 >= 4) chains.push(walk(reached, back))
    }
  }
  return chains
}

/** The chain that leads to a state, from its first cell. */
function walk(end: number, back: ReadonlyMap<number, number>): Chain {
  const cells: CellIdx[] = []
  const on: number[] = []
  for (let s = end; s !== -1; s = back.get(s)!) {
    cells.push((s / 10) | 0)
    on.push(s % 10)
  }
  return { cells: cells.reverse(), on: on.reverse() }
}

/** What a chain removes, or null when it removes nothing. */
function settle(
  chain: Chain,
  z: number,
  candidates: Snapshot['candidates'],
): Omit<Found, 'chain' | 'z' | 'order'> | null {
  const { cells, on } = chain
  const first = cells[0]
  const last = cells[cells.length - 1]
  const onChain = new Set(cells)
  const closed = sees(first, last)

  const losing = (a: CellIdx, b: CellIdx, digit: number) =>
    commonPeers(a, b)
      .filter(cell => !onChain.has(cell) && candidates[cell].has(digit))
      .sort((x, y) => x - y)

  // On a loop every link counts, the closing one last; on an open chain only
  // the ends, which is the closing link alone
  const byLink: CellIdx[][] = cells.map((cell, i) =>
    i < cells.length - 1 ? (closed ? losing(cell, cells[i + 1], on[i]) : []) : losing(last, first, z),
  )

  const all = new Map<string, Removal>()
  byLink.forEach((targets, i) => {
    const digit = i < cells.length - 1 ? on[i] : z
    for (const cell of targets) all.set(`${cell}:${digit}`, [cell, digit])
  })
  if (all.size === 0) return null

  const removals = [...all.values()].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  return { closed, removals, byLink }
}

function describe(found: Found): StratInstance {
  const { chain, z, closed, removals, byLink } = found
  const { cells, on } = chain
  const off = cells.map((_, i) => (i === 0 ? z : on[i - 1]))
  const first = cells[0]
  const last = cells[cells.length - 1]

  // Discs on what each cell is if the first end is not Z, rings on the other
  // digit: on a loop, the two ways round
  const marks: CandidateAnnotation[] = [
    ...cells.flatMap((cell, i) => [
      { cell, digit: on[i], kind: 'highlight' as const },
      { cell, digit: off[i], kind: 'alternate' as const },
    ]),
    ...removals.map(([cell, digit]) => ({ cell, digit, kind: 'eliminate' as const })),
  ]

  const links: Array<[CellIdx, CellIdx]> = cells.slice(1).map((cell, i) => [cells[i], cell])
  if (closed) links.push([last, first])

  // On a loop, the units in which a link takes its digit from other cells
  const units: UnitRef[] = []
  if (closed) {
    byLink.forEach((targets, i) => {
      const a = cells[i]
      const b = cells[(i + 1) % cells.length]
      for (const ref of sharedUnits(a, b)) {
        const inside = targets.some(cell => unitIndex(cell, ref.kind) === ref.index)
        if (inside && !units.some(u => u.kind === ref.kind && u.index === ref.index)) units.push(ref)
      }
    })
  }

  const notation =
    cells.map((cell, i) => `(${off[i]}=${on[i]})${cellLabel(cell)}`).join('-') +
    // a loop comes back to where it started
    (closed ? `-${cellLabel(cells[0])}` : '')
  const byDigit = new Map<number, CellIdx[]>()
  for (const [cell, digit] of removals) byDigit.set(digit, [...(byDigit.get(digit) ?? []), cell])
  const gone = [...byDigit]
    .map(([digit, targets]) => `${digit} from ${targets.map(cellLabel).join(', ')}`)
    .join(', ')

  return {
    patternCells: [...cells],
    solvedCells: [],
    candidateAnnotations: marks,
    units,
    links,
    label: `XY-Chain ${closed ? 'loop' : `on ${z}`}: ${notation}, eliminates ${gone}`,
    narrative: closed ? narrateLoop(found, off) : narrateOpen(found),
  }
}

const list = (cells: CellIdx[]) => proseList(cells.map(cellLabel))

const OPENING =
  'can each only be one of two digits, and each sees the next and shares a digit with it, ' +
  'so whichever digit a cell is, the next is its other one'

function narrateOpen({ chain, z, removals }: Found): string {
  const { cells, on } = chain
  const first = cellLabel(cells[0])
  const last = cellLabel(cells[cells.length - 1])
  const targets = removals.map(([cell]) => cell)
  const forced = proseList(cells.slice(1).map((cell, i) => `${cellLabel(cell)} is ${on[i + 1]}`))
  return (
    `${list(cells)} ${OPENING}. If ${first} is not ${z}, it is ${on[0]}, and then ${forced}. ` +
    `So ${first} or ${last} is ${z}, and ${z} is removed from ${list(targets)}, ` +
    `which ${targets.length === 1 ? 'sees' : 'see'} both of them.`
  )
}

function narrateLoop({ chain, byLink }: Found, off: number[]): string {
  const { cells, on } = chain
  const first = cellLabel(cells[0])
  const last = cellLabel(cells[cells.length - 1])
  const way = (digits: number[]) => proseList(cells.map((cell, i) => `${cellLabel(cell)} is ${digits[i]}`))

  const removed = byLink
    .map((targets, i) => {
      if (targets.length === 0) return ''
      const a = cellLabel(cells[i])
      const b = cellLabel(cells[(i + 1) % cells.length])
      const digit = i < cells.length - 1 ? on[i] : off[0]
      return (
        `${digit} is removed from ${list(targets)}, which ${targets.length === 1 ? 'sees' : 'see'} ` +
        `${a} and ${b}`
      )
    })
    .filter(Boolean)

  return (
    `${list(cells)} ${OPENING}. ${last} sees ${first} as well, which closes the chain into a loop, ` +
    `and a loop goes only two ways round: ${way(on)} (the discs), or ${way(off)} (the rings). ` +
    `Either way, of every two neighbours on the loop exactly one holds the digit they share, so ` +
    `no other cell that sees both can hold it: ${removed.join('; ')}.`
  )
}

/** The units two cells that see each other have in common. */
function sharedUnits(a: CellIdx, b: CellIdx): UnitRef[] {
  const refs: UnitRef[] = []
  if (CELL_UNITS[a].row === CELL_UNITS[b].row) refs.push({ kind: 'row', index: CELL_UNITS[a].row })
  if (CELL_UNITS[a].col === CELL_UNITS[b].col) refs.push({ kind: 'col', index: CELL_UNITS[a].col })
  if (CELL_UNITS[a].box === CELL_UNITS[b].box) refs.push({ kind: 'box', index: CELL_UNITS[a].box })
  return refs
}

function unitIndex(cell: CellIdx, kind: UnitRef['kind']): number {
  return CELL_UNITS[cell][kind]
}
