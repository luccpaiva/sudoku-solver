import type { Snapshot, StratResult, StratInstance, CandidateAnnotation, CellIdx, UnitRef } from '../types'
import { ALL_UNITS, CELL_UNITS, PEERS, sees } from '../units'
import { cellLabel, proseList, unitDisplayName } from '../utils'

/**
 * Aligned Pair Exclusion (Subset Exclusion):
 * Two cells, the base pair, can only be filled with certain pairs of digits.
 * A pair is ruled out when it would leave an Almost Locked Set (N cells of
 * one unit with N + 1 digits between them; a bi-value cell is the smallest)
 * with too few digits: every cell of the set that holds the first digit
 * sees the first base cell, and every one that holds the second digit sees
 * the second. Base cells that see each other cannot share a digit either
 * (Type 1); base cells that do not see each other can (Type 2).
 * → A digit of one base cell that pairs with none of the other's is removed.
 */
export function alignedPairExclusion(snapshot: Snapshot): StratResult | null {
  const { values, candidates } = snapshot

  // Candidates as bits: 1 << digit
  const masks = new Uint16Array(81)
  for (let cell = 0; cell < 81; cell++) {
    if (values[cell] !== null) continue
    for (const digit of candidates[cell]) masks[cell] |= 1 << digit
  }

  const sets = almostLockedSets(values, masks)

  // For each cell and digit, the sets whose cells holding that digit all
  // lie in the cell's sight: were the cell that digit, the set would lose it
  const losers: number[][] = Array.from({ length: 810 }, () => [])
  sets.forEach((set, k) => {
    for (const digit of DIGITS) {
      for (const cell of set.seers[digit]) losers[cell * 10 + digit].push(k)
    }
  })

  // A digit of a base cell, and a partner cell left with nothing beside it
  const found: Array<{ cell: CellIdx; digit: number; partner: CellIdx }> = []
  const covered = new Uint16Array(81)
  for (let cell = 0; cell < 81; cell++) {
    for (const digit of DIGITS) {
      const lists = losers[cell * 10 + digit]
      if (lists.length === 0 || !(masks[cell] & (1 << digit))) continue

      // The digits each other cell could not take beside it
      const touched: CellIdx[] = []
      for (const k of lists) {
        const set = sets[k]
        for (const other of DIGITS) {
          if (other === digit || !(set.mask & (1 << other))) continue
          for (const partner of set.seers[other]) {
            if (partner === cell) continue
            if (covered[partner] === 0) touched.push(partner)
            covered[partner] |= 1 << other
          }
        }
      }

      for (const partner of touched) {
        // a partner in sight cannot take the same digit as well
        const left = masks[partner] & ~(sees(cell, partner) ? 1 << digit : 0)
        if (BITS[masks[partner]] >= 2 && left !== 0 && (left & ~covered[partner]) === 0) {
          found.push({ cell, digit, partner })
        }
      }
      for (const partner of touched) covered[partner] = 0
    }
  }
  if (found.length === 0) return null

  // One occurrence for each base pair, with what it removes from either cell
  const pairs = new Map<number, Removal[]>()
  for (const { cell, digit, partner } of found) {
    const key = Math.min(cell, partner) * 81 + Math.max(cell, partner)
    if (!pairs.has(key)) pairs.set(key, [])
    pairs.get(key)!.push({ cell, digit, partner, reasons: reasonsFor(cell, digit, partner, masks, sets, losers) })
  }

  const occurrences = [...pairs.entries()].map(([key, removals]) => {
    const base: [CellIdx, CellIdx] = [(key / 81) | 0, key % 81]
    const used = [...new Set(removals.flatMap(r => r.reasons.map(reason => reason.set)))]
      .filter(k => k !== -1)
      .sort((a, b) => a - b)
    const sizes = used.map(k => sets[k].cells.length)
    return {
      base,
      removals,
      used,
      cells: sizes.reduce((sum, n) => sum + n, 0),
      largest: Math.max(...sizes),
      aligned: sees(base[0], base[1]),
      keys: new Set(removals.map(r => `${r.cell}:${r.digit}`)),
    }
  })

  // Simplest first: fewer cells in the sets, then smaller sets, then a pair
  // that sees each other, then more removed. An occurrence is left out when
  // one before it already removes all it does, and past MAX_INSTANCES.
  occurrences.sort(
    (a, b) =>
      a.cells - b.cells ||
      a.largest - b.largest ||
      Number(b.aligned) - Number(a.aligned) ||
      b.removals.length - a.removals.length ||
      a.base[0] - b.base[0] ||
      a.base[1] - b.base[1],
  )
  const kept: typeof occurrences = []
  for (const occurrence of occurrences) {
    if (kept.some(before => [...occurrence.keys].every(k => before.keys.has(k)))) continue
    kept.push(occurrence)
    if (kept.length === MAX_INSTANCES) break
  }
  const instances = kept.map(occurrence => describe(occurrence, sets, masks))

  return { name: 'Aligned Pair Exclusion', instances }
}

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

/** How many bits a mask of digits has set. */
const BITS = Uint8Array.from({ length: 1024 }, (_, m) => {
  let n = 0
  for (let v = m; v; v &= v - 1) n++
  return n
})

/** Sets of more cells than this are not looked for. */
const MAX_SET = 4

/** A step shows at most this many base pairs, the simplest. */
const MAX_INSTANCES = 12

const COUNT_WORDS = ['no', 'one', 'two', 'three', 'four']

type AlmostLockedSet = {
  /** In board order. */
  cells: CellIdx[]
  /** The digits of all its cells, as bits. */
  mask: number
  /** The unit it was found in: rows 0 to 8, columns 9 to 17, boxes 18 to 26. */
  unit: number
  /**
   * For each digit of the set: the cells outside it that hold the digit and
   * see every cell of the set that holds it.
   */
  seers: CellIdx[][]
}

/**
 * Every Almost Locked Set of one to MAX_SET cells: N cells of a unit, with
 * N + 1 digits between them. A set lying in a line and a box is kept once.
 */
function almostLockedSets(values: Snapshot['values'], masks: Uint16Array): AlmostLockedSet[] {
  const found: AlmostLockedSet[] = []
  const seen = new Set<string>()

  for (let u = 0; u < 27; u++) {
    const open = ALL_UNITS[u].filter(cell => values[cell] === null && masks[cell] !== 0)
    const pick: CellIdx[] = []

    const grow = (from: number, mask: number): void => {
      if (pick.length > 0 && BITS[mask] === pick.length + 1) {
        const key = pick.join(',')
        if (!seen.has(key)) {
          seen.add(key)
          found.push({ cells: [...pick], mask, unit: u, seers: seersOf(pick, mask, masks) })
        }
      }
      if (pick.length === MAX_SET) return
      for (let i = from; i < open.length; i++) {
        const next = mask | masks[open[i]]
        // digits only add up: past MAX_SET + 1 no set can come of it
        if (BITS[next] > MAX_SET + 1) continue
        pick.push(open[i])
        grow(i + 1, next)
        pick.pop()
      }
    }
    grow(0, 0)
  }
  return found
}

function seersOf(cells: CellIdx[], mask: number, masks: Uint16Array): CellIdx[][] {
  const seers: CellIdx[][] = Array.from({ length: 10 }, () => [])
  for (const digit of DIGITS) {
    if (!(mask & (1 << digit))) continue
    const holders = cells.filter(cell => masks[cell] & (1 << digit))
    seers[digit] = PEERS[holders[0]].filter(
      cell =>
        masks[cell] & (1 << digit) &&
        !cells.includes(cell) &&
        holders.every(holder => holder === holders[0] || sees(cell, holder)),
    )
  }
  return seers
}

/** Why a digit of the partner cannot go with the removed one: a set it would empty, or (-1) the digit itself. */
type Reason = { digit: number; set: number }

type Removal = { cell: CellIdx; digit: number; partner: CellIdx; reasons: Reason[] }

/** For each digit of the partner, the smallest set that rules it out beside the removed digit. */
function reasonsFor(
  cell: CellIdx,
  digit: number,
  partner: CellIdx,
  masks: Uint16Array,
  sets: AlmostLockedSet[],
  losers: number[][],
): Reason[] {
  return DIGITS.filter(other => masks[partner] & (1 << other)).map(other => {
    if (other === digit) return { digit: other, set: -1 }
    let best = -1
    for (const k of losers[cell * 10 + digit]) {
      if (!(sets[k].mask & (1 << other)) || !sets[k].seers[other].includes(partner)) continue
      if (best === -1 || sets[k].cells.length < sets[best].cells.length) best = k
    }
    return { digit: other, set: best }
  })
}

function unitRef(u: number): UnitRef {
  return { kind: (['row', 'col', 'box'] as const)[(u / 9) | 0], index: u % 9 }
}

/** The unit two cells that see each other share: their line, or else their box. */
function sharedUnit(a: CellIdx, b: CellIdx): UnitRef {
  if (CELL_UNITS[a].row === CELL_UNITS[b].row) return { kind: 'row', index: CELL_UNITS[a].row }
  if (CELL_UNITS[a].col === CELL_UNITS[b].col) return { kind: 'col', index: CELL_UNITS[a].col }
  return { kind: 'box', index: CELL_UNITS[a].box }
}

const digitsOf = (mask: number) => DIGITS.filter(digit => mask & (1 << digit))

function describe(
  occurrence: { base: [CellIdx, CellIdx]; removals: Removal[]; used: number[]; aligned: boolean },
  sets: AlmostLockedSet[],
  masks: Uint16Array,
): StratInstance {
  const { base, removals, used, aligned } = occurrence
  const ordered = [...removals].sort((a, b) => a.cell - b.cell || a.digit - b.digit)

  // Discs on the digits of each set that a removed digit and a partner's digit would take away
  const marks: CandidateAnnotation[] = []
  const marked = new Set<string>()
  for (const { digit, reasons } of ordered) {
    for (const reason of reasons) {
      if (reason.set === -1) continue
      for (const cell of sets[reason.set].cells) {
        for (const d of [digit, reason.digit]) {
          const key = `${cell}:${d}`
          if (!(masks[cell] & (1 << d)) || marked.has(key)) continue
          marked.add(key)
          marks.push({ cell, digit: d, kind: 'highlight' })
        }
      }
    }
  }
  for (const { cell, digit } of ordered) marks.push({ cell, digit, kind: 'eliminate' })

  const units: UnitRef[] = []
  const add = (ref: UnitRef) => {
    if (!units.some(u => u.kind === ref.kind && u.index === ref.index)) units.push(ref)
  }
  if (aligned) add(sharedUnit(base[0], base[1]))
  for (const k of used) if (sets[k].cells.length > 1) add(unitRef(sets[k].unit))

  const [first, second] = base.map(cellLabel)
  const setNames = used.map(k => sets[k].cells.map(cellLabel).join('+')).join(', ')
  const gone = ordered.map(r => `${r.digit} from ${cellLabel(r.cell)}`).join(', ')

  return {
    patternCells: [...base],
    solvedCells: [],
    candidateAnnotations: marks,
    units,
    label: `${aligned ? 'Aligned' : 'Unaligned'} pair ${first}/${second} with ${setNames}: eliminates ${gone}`,
    narrative: narrate(base, aligned, ordered, sets),
  }
}

function narrate(base: [CellIdx, CellIdx], aligned: boolean, removals: Removal[], sets: AlmostLockedSet[]): string {
  const [first, second] = base.map(cellLabel)
  const head = aligned
    ? `${first} and ${second} share ${unitDisplayName(sharedUnit(base[0], base[1]))}, so they hold two different digits. `
    : `${first} and ${second} do not see each other, so they could even hold the same digit. `
  const rule =
    'A pair of digits for them is ruled out when it would leave cells that see them ' +
    'with too few digits to go round. '

  const told = removals.slice(0, 2).map(({ cell, digit, partner, reasons }) => {
    const options = reasons.map(r => r.digit)
    const why = reasons.map(({ digit: other, set }) => {
      if (set === -1) return `not ${other}, the digit ${cellLabel(cell)} would hold`
      const { cells, mask } = sets[set]
      const names = proseList(cells.map(cellLabel))
      const can = proseList(digitsOf(mask), 'or')
      if (cells.length === 1) return `not ${other}, as ${names}, which can only be ${can}, would be left empty`
      const rest = digitsOf(mask & ~(1 << digit) & ~(1 << other))
      return (
        `not ${other}, as ${names}, which between them can only be ${can}, ` +
        `would be left with only ${proseList(rest)} for ${COUNT_WORDS[cells.length]} cells`
      )
    })
    const none = options.length === 2 ? `neither ${options[0]} nor ${options[1]}` : `none of ${proseList(options)}`
    return `If ${cellLabel(cell)} were ${digit}, ${cellLabel(partner)} could be ${none}: ${why.join('; ')}. `
  })

  const more =
    removals.length > 2
      ? `The same check rules out ${proseList(removals.slice(2).map(r => `${r.digit} in ${cellLabel(r.cell)}`))}. `
      : ''

  // What goes, cell by cell (only the two base cells lose anything)
  const byCell = base
    .map(cell => ({ cell, digits: removals.filter(r => r.cell === cell).map(r => r.digit) }))
    .filter(group => group.digits.length > 0)
  const end = byCell
    .map(({ cell, digits }, i) =>
      i === 0
        ? `${proseList(digits)} ${digits.length === 1 ? 'is' : 'are'} removed from ${cellLabel(cell)}`
        : `${proseList(digits)} from ${cellLabel(cell)}`,
    )
    .join(', and ')

  return `${head}${rule}${told.join('')}${more}So ${end}.`
}
