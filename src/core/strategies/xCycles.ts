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
 * X-Cycles (Nice Loops on a single digit):
 * A strong link joins the only two places a unit has left for a digit: if
 * one is not the digit, the other is. A weak link joins two places that
 * share a unit: if one is the digit, the other is not (a strong link can
 * serve as a weak one). A loop of links on one digit:
 *   Rule 1: strong and weak alternate all the way round. Then every link
 *           holds exactly one of the digit, so a cell off the loop that sees
 *           both ends of a weak link cannot be it.
 *   Rule 2: two strong links meet at one cell, the rest alternate. Were that
 *           cell not the digit, the loop would make it the digit: it is.
 *   Rule 3: two weak links meet at one cell, the rest alternate. Were that
 *           cell the digit, the loop would rule it out: it is not.
 * → Rule 1 and 3 eliminate the digit; Rule 2 places it.
 */
export function xCycles(snapshot: Snapshot): StratResult | null {
  const found: Loop[] = []
  for (let digit = 1; digit <= 9; digit++) loopsOf(snapshot, digit, found)
  if (found.length === 0) return null

  // The shortest loops first; among them a placement first, then the most removals
  found.sort(
    (a, b) =>
      a.cells.length - b.cells.length ||
      Number(b.rule === 2) - Number(a.rule === 2) ||
      b.removals.length - a.removals.length,
  )

  // A loop is kept only if it does something the ones before it do not. A
  // placed digit also takes the others out of its cell and itself out of
  // the cell's peers, so a loop that removes no more than that is dropped.
  const done = new Set<string>()
  const instances: StratInstance[] = []
  for (const loop of found) {
    const { digit } = loop
    const acts = loop.rule === 2 ? [`${digit}=${loop.cells[0]}`] : loop.removals.map(cell => `${digit}:${cell}`)
    if (acts.every(act => done.has(act))) continue
    for (const act of acts) done.add(act)
    if (loop.rule === 2) {
      const cell = loop.cells[0]
      for (const peer of PEERS[cell]) done.add(`${digit}:${peer}`)
      for (let other = 1; other <= 9; other++) done.add(`${other}:${cell}`)
    }
    instances.push(describe(loop))
    if (instances.length === MAX_INSTANCES) break
  }

  return { name: 'X-Cycles', instances }
}

/** The longest chain searched between two ends, in links: loops of up to 12 cells. */
const MAX_LINKS = 11
/** A step shows at most this many loops; the rest wait for the next step. */
const MAX_INSTANCES = 12
/** A loop of more links than this is summed up rather than walked link by link. */
const WALK_LIMIT = 8

type Link = { strong: boolean; unit: UnitRef }

type Loop = {
  rule: 1 | 2 | 3
  digit: number
  /**
   * The cells in order round the loop: `links[i]` joins `cells[i]` to the
   * next, the last link back to `cells[0]`. Rules 2 and 3 start at the
   * discontinuity.
   */
  cells: CellIdx[]
  links: Link[]
  /** Rule 3: every cell that sees both ends of the chain, `cells[0]` among them. */
  targets: CellIdx[]
  removals: CellIdx[]
  /** Rule 1: the removals each weak link makes, as [one end, the other, removed]. */
  sightings: Array<[CellIdx, CellIdx, CellIdx[]]>
  /** The rows, columns and boxes the conclusion is drawn in. */
  units: UnitRef[]
}

const UNIT_KINDS: UnitKind[] = ['row', 'col', 'box']

function unitRef(u: number): UnitRef {
  return { kind: UNIT_KINDS[(u / 9) | 0], index: u % 9 }
}

/** A unit two cells share: their row, else their column, else their box. */
function sharedUnit(a: CellIdx, b: CellIdx): UnitRef {
  const ua = CELL_UNITS[a]
  const ub = CELL_UNITS[b]
  if (ua.row === ub.row) return { kind: 'row', index: ua.row }
  if (ua.col === ub.col) return { kind: 'col', index: ua.col }
  return { kind: 'box', index: ua.box }
}

/** A unit three cells share, if they share one. */
function unitOfAll(cells: CellIdx[]): UnitRef | null {
  for (const kind of UNIT_KINDS) {
    const index = CELL_UNITS[cells[0]][kind]
    if (cells.every(cell => CELL_UNITS[cell][kind] === index)) return { kind, index }
  }
  return null
}

const unitKey = (ref: UnitRef) => `${ref.kind}${ref.index}`

function uniqueUnits(refs: Array<UnitRef | null>): UnitRef[] {
  const seen = new Map<string, UnitRef>()
  for (const ref of refs) if (ref && !seen.has(unitKey(ref))) seen.set(unitKey(ref), ref)
  return [...seen.values()]
}

/**
 * Every loop on one digit, found from its chains. A chain from u to v that
 * starts and ends with a strong link (u = … = v) says that u or v is the
 * digit: were u not, the links would make v it. The search follows that
 * reasoning as states, "cell is off" and "cell is on": a strong link leads
 * from off to on, a weak link from on to off. From "u is off", breadth
 * first, so each state is reached by its shortest chain:
 *   - reaching "u is on" closes a Rule 2 loop at u;
 *   - reaching "v is on" gives the chain u = … = v. If u and v see each
 *     other the closing weak link makes a Rule 1 loop; otherwise each cell
 *     that sees both ends is a Rule 3 discontinuity.
 */
function loopsOf(snapshot: Snapshot, digit: number, out: Loop[]): void {
  const { values, candidates } = snapshot

  const has = new Uint8Array(81)
  const places: CellIdx[] = []
  const inUnit: CellIdx[][] = Array.from({ length: 27 }, () => [])
  for (let cell = 0; cell < 81; cell++) {
    if (values[cell] !== null || !candidates[cell].has(digit)) continue
    has[cell] = 1
    places.push(cell)
    const { row, col, box } = CELL_UNITS[cell]
    inUnit[row].push(cell)
    inUnit[9 + col].push(cell)
    inUnit[18 + box].push(cell)
  }

  // Strong links: units with two places left. A line and a box can hold the same pair.
  const partners: Array<Array<{ cell: CellIdx; unit: UnitRef }>> = Array.from({ length: 81 }, () => [])
  for (let u = 0; u < 27; u++) {
    if (inUnit[u].length !== 2) continue
    const [a, b] = inUnit[u]
    if (partners[a].some(p => p.cell === b)) continue
    partners[a].push({ cell: b, unit: unitRef(u) })
    partners[b].push({ cell: a, unit: unitRef(u) })
  }

  // Weak links: every other place in sight
  const inSight: CellIdx[][] = []
  for (const cell of places) inSight[cell] = PEERS[cell].filter(peer => has[peer])

  // States: cell * 2 for "off", cell * 2 + 1 for "on"
  const depth = new Int8Array(162)
  const parent = new Int16Array(162)
  const queue = new Int16Array(162)

  for (const start of places) {
    if (partners[start].length === 0) continue
    depth.fill(-1)
    depth[start * 2] = 0
    queue[0] = start * 2
    let head = 0
    let tail = 1
    while (head < tail) {
      const state = queue[head++]
      const cell = state >> 1
      if (depth[state] === MAX_LINKS) continue
      // "start is on" ends a Rule 2 loop; nothing simple runs on from it
      if (state === start * 2 + 1) continue
      const reach = (to: number) => {
        if (depth[to] !== -1) return
        depth[to] = depth[state] + 1
        parent[to] = state
        queue[tail++] = to
      }
      if (state & 1) for (const peer of inSight[cell]) reach(peer * 2)
      else for (const p of partners[cell]) reach(p.cell * 2 + 1)
    }

    const pathTo = (state: number): CellIdx[] => {
      const path: CellIdx[] = []
      for (let s = state; s !== start * 2; s = parent[s]) path.push(s >> 1)
      path.push(start)
      return path.reverse()
    }
    // the links along a path, whose first link is strong
    const linksOf = (path: CellIdx[]): Link[] =>
      path.slice(1).map((cell, i) =>
        i % 2 === 0
          ? { strong: true, unit: partners[path[i]].find(p => p.cell === cell)!.unit }
          : { strong: false, unit: sharedUnit(path[i], cell) },
      )

    // Rule 2: from "start is off" round to "start is on"
    if (depth[start * 2 + 1] !== -1) {
      const path = pathTo(start * 2 + 1)
      const cells = path.slice(0, -1)
      // a loop of three cells is a box/line reduction
      if (cells.length >= 5 && new Set(cells).size === cells.length) {
        const links = linksOf(path)
        out.push({
          rule: 2,
          digit,
          cells,
          links,
          targets: [],
          removals: [],
          sightings: [],
          units: uniqueUnits([links[0].unit, links[links.length - 1].unit]),
        })
      }
    }

    // Chains start = … = end; each pair of ends is looked at from its lower cell
    for (const end of places) {
      if (end <= start || depth[end * 2 + 1] === -1) continue
      const chain = pathTo(end * 2 + 1)
      // a single strong link removes nothing a box/line reduction leaves
      if (chain.length < 4 || new Set(chain).size !== chain.length) continue
      const links = linksOf(chain)
      const loop = sees(start, end)
        ? continuous(digit, chain, links, has)
        : discontinuous(digit, chain, links, has)
      if (loop) out.push(loop)
    }
  }
}

/** Rule 1: the chain closed by a weak link between its ends. */
function continuous(digit: number, chain: CellIdx[], chainLinks: Link[], has: Uint8Array): Loop | null {
  const closing: Link = { strong: false, unit: sharedUnit(chain[chain.length - 1], chain[0]) }
  const { cells, links } = canonical(chain, [...chainLinks, closing])
  const onLoop = new Set(cells)

  const sightings: Array<[CellIdx, CellIdx, CellIdx[]]> = []
  const removed = new Set<CellIdx>()
  const units: Array<UnitRef | null> = []
  links.forEach((link, i) => {
    if (link.strong) return
    const a = cells[i]
    const b = cells[(i + 1) % cells.length]
    const caught = PEERS[a].filter(t => has[t] && !onLoop.has(t) && !removed.has(t) && sees(t, b))
    if (caught.length === 0) return
    caught.sort((x, y) => x - y).forEach(t => {
      removed.add(t)
      units.push(unitOfAll([a, b, t]))
    })
    sightings.push([a, b, caught])
  })
  if (removed.size === 0) return null

  return {
    rule: 1,
    digit,
    cells,
    links,
    targets: [],
    removals: [...removed].sort((x, y) => x - y),
    sightings,
    units: uniqueUnits(units),
  }
}

/** Rule 3: the chain closed through a cell that sees both of its ends. */
function discontinuous(digit: number, chain: CellIdx[], chainLinks: Link[], has: Uint8Array): Loop | null {
  const start = chain[0]
  const end = chain[chain.length - 1]
  const onChain = new Set(chain)
  const targets = PEERS[start].filter(t => has[t] && !onChain.has(t) && sees(t, end)).sort((x, y) => x - y)
  if (targets.length === 0) return null

  const t = targets[0]
  return {
    rule: 3,
    digit,
    cells: [t, ...chain],
    links: [{ strong: false, unit: sharedUnit(t, start) }, ...chainLinks, { strong: false, unit: sharedUnit(end, t) }],
    targets,
    removals: targets,
    sightings: [],
    units: uniqueUnits(targets.flatMap(cell => [sharedUnit(cell, start), sharedUnit(cell, end)])),
  }
}

/**
 * A continuous loop written the one way, whichever link closed it: from its
 * first cell in board order, setting off along its strong link.
 */
function canonical(cells: CellIdx[], links: Link[]): { cells: CellIdx[]; links: Link[] } {
  const n = cells.length
  const first = cells.indexOf(Math.min(...cells))
  let order = cells.map((_, i) => (first + i) % n)
  let joins = order.map(i => links[i])
  if (!joins[0].strong) {
    // the other way round: the link into a cell becomes the link out of it
    order = cells.map((_, i) => (first - i + n) % n)
    joins = order.map(i => links[(i - 1 + n) % n])
  }
  return { cells: order.map(i => cells[i]), links: joins }
}

function describe(loop: Loop): StratInstance {
  const { rule, digit, cells, links, targets } = loop
  const n = cells.length
  const ends = (i: number): [CellIdx, CellIdx] => [cells[i], cells[(i + 1) % n]]

  const strong: Array<[CellIdx, CellIdx]> = []
  const weak: Array<[CellIdx, CellIdx]> = []
  links.forEach((link, i) => (link.strong ? strong : weak).push(ends(i)))
  // the other cells at the discontinuity are tied to both ends as well
  for (const t of targets.slice(1)) weak.push([t, cells[1]], [cells[n - 1], t])

  const marks: CandidateAnnotation[] = []
  if (rule === 1) {
    // the two sides of the loop, one of which is all true
    cells.forEach((cell, i) => marks.push({ cell, digit, kind: i % 2 === 0 ? 'highlight' : 'alternate' }))
  } else {
    // the cell at the discontinuity takes the digit (rule 2) or loses it (below)
    if (rule === 2) marks.push({ cell: cells[0], digit, kind: 'highlight' })
    cells.slice(1).forEach(cell => marks.push({ cell, digit, kind: 'alternate' }))
  }
  for (const cell of loop.removals) marks.push({ cell, digit, kind: 'eliminate' })

  const head = rule === 3 && targets.length > 1 ? targets.map(cellLabel).join('|') : cellLabel(cells[0])
  const notation =
    head + cells.slice(1).map((cell, i) => `${links[i].strong ? '=' : '-'}${cellLabel(cell)}`).join('') +
    `${links[n - 1].strong ? '=' : '-'}${head}`
  const outcome =
    rule === 2
      ? `places ${digit} in ${cellLabel(cells[0])}`
      : `eliminates ${digit} from ${loop.removals.map(cellLabel).join(', ')}`

  return {
    patternCells: [...new Set([...cells, ...targets])].sort((a, b) => a - b),
    solvedCells: rule === 2 ? [{ cell: cells[0], digit }] : [],
    candidateAnnotations: marks,
    units: loop.units,
    links: strong,
    weakLinks: weak,
    label: `X-Cycle on ${digit} (rule ${rule}): ${notation}, ${outcome}`,
    narrative: narrate(loop),
  }
}

// ── Words ────────────────────────────────────────────────────────────────────

const KEY =
  'A solid link joins the only two places a row, column or box has left for the digit, so if one ' +
  'is not it, the other is; a dashed link joins two cells that share a unit, so if one is, the other is not.'

const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

/** One link walked, from a cell to the next: what the next one would be, and why. */
function step(digit: number, from: CellIdx, to: CellIdx, link: Link): string {
  return link.strong
    ? `${cellLabel(to)} would be (the only other ${digit} in ${unitDisplayName(link.unit)})`
    : `${cellLabel(to)} would not be (it shares ${unitDisplayName(link.unit)} with ${cellLabel(from)})`
}

function narrate(loop: Loop): string {
  const { rule, digit, cells, links } = loop
  const n = cells.length
  const names = (list: CellIdx[]) => proseList(list.map(cellLabel))
  const loopCells = names(cells)

  if (rule === 1) {
    const sides = [cells.filter((_, i) => i % 2 === 0), cells.filter((_, i) => i % 2 === 1)]
    const caught = loop.sightings
      .map(([a, b, ts]) => `${names(ts)} ${ts.length === 1 ? 'sees' : 'see'} both ${cellLabel(a)} and ${cellLabel(b)}`)
      .join(', and ')
    return (
      `The ${digit}s at ${loopCells} make a loop. ${KEY} Here the links alternate all the way round, ` +
      `so the cells are ${digit} in turn: either ${names(sides[0])} are ${digit}, or ${names(sides[1])} are. ` +
      `Every dashed link then holds exactly one ${digit} as well. ${capital(caught)}, so ${digit} is removed from ` +
      `${names(loop.removals)}.`
    )
  }

  const t = cells[0]
  const at = cellLabel(t)
  const last = links[n - 1]

  if (rule === 2) {
    const reason =
      n - 1 > WALK_LIMIT
        ? `the cells round the loop from ${cellLabel(cells[1])} to ${cellLabel(cells[n - 1])} would be ` +
          `${digit} and not ${digit} in turn, ${cellLabel(cells[n - 1])} not`
        : cells
            .slice(1)
            .map((cell, i) => step(digit, cells[i], cell, links[i]))
            .join(', so ')
    return (
      `The ${digit}s at ${loopCells} make a loop. ${KEY} Two solid links meet at ${at}. ` +
      `If ${at} were not ${digit}, ${reason}; and then ${at} would have to be ${digit} after all, as the ` +
      `only other ${digit} in ${unitDisplayName(last.unit)}. So ${at} is ${digit}.`
    )
  }

  const end = cells[n - 1]
  const reason =
    n - 1 > WALK_LIMIT
      ? `the cells round the loop from ${cellLabel(cells[1])} to ${cellLabel(end)} would be ` +
        `not ${digit} and ${digit} in turn, ${cellLabel(end)} ${digit}`
      : cells
          .slice(1)
          .map((cell, i) => step(digit, cells[i], cell, links[i]))
          .join(', so ')
  const others = loop.targets.slice(1)
  const also =
    others.length === 0
      ? ''
      : ` ${names(others)} ${others.length === 1 ? 'sees' : 'see'} both ${cellLabel(cells[1])} and ` +
        `${cellLabel(end)} as well, and ${others.length === 1 ? 'loses its' : 'lose their'} ${digit} the same way.`
  return (
    `The ${digit}s at ${loopCells} make a loop. ${KEY} Two dashed links meet at ${at}. ` +
    `If ${at} were ${digit}, ${reason}; but ${cellLabel(end)} shares ${unitDisplayName(last.unit)} with ${at}, ` +
    `so ${at} would not be ${digit} after all. The loop contradicts itself, so ${digit} is removed from ${at}.${also}`
  )
}
