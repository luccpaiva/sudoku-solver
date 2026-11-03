import type {
  Snapshot,
  StratResult,
  StratInstance,
  CandidateAnnotation,
  CellIdx,
  UnitRef,
} from '../types'
import { unitCells } from '../units'
import { cellLabel, proseList, unitDisplayName, unitsDisplayName } from '../utils'

/**
 * SK Loops:
 * four solved cells at the corners of a rectangle over four boxes (two bands,
 * two stacks). Beside each corner, the other two cells of its box in its row
 * make a pair, and so do the other two in its column: eight pairs, sixteen
 * cells, going round a loop of eight units (the two rows, the two columns
 * and the four boxes), each pair in one line and one box of it.
 * Count the digits the loop can hold. Take the units as the corners of a
 * ring of eight and each pair as the edge between its two units. A digit
 * goes once in a unit, so the pairs that end up holding it are edges that
 * share no unit: a matching of the ring. Each digit can fill at most as many
 * pairs as the largest matching of the edges that have it as a candidate.
 * When those maximums add up to exactly the number of empty loop cells,
 * every digit must reach its maximum, so it lies in the loop on a largest
 * matching:
 *   - a unit that every largest matching touches holds the digit inside the
 *     loop, so the digit goes from the rest of the unit;
 *   - a pair that no largest matching uses cannot hold the digit.
 * The site counts it another way that comes to the same thing: it gives each
 * unit a set of digits (a smallest cover of the edges, digit by digit) and
 * asks that the sets add up to the empty cells. A smallest cover is as big
 * as a largest matching (König), and every unit of any smallest cover is
 * touched by every largest matching, so its removals are among these.
 */
export function skLoops(snapshot: Snapshot): StratResult | null {
  const { values, candidates } = snapshot
  const instances: StratInstance[] = []
  const seen = new Set<string>()

  for (const [r1, r2] of LINE_PAIRS) {
    for (const [c1, c2] of LINE_PAIRS) {
      const corners = [r1 * 9 + c1, r1 * 9 + c2, r2 * 9 + c1, r2 * 9 + c2]
      if (corners.some(cell => values[cell] === null)) continue

      const loop = loopOf(r1, r2, c1, c2)
      const open = loop.pairs.map(pair => pair.filter(cell => values[cell] === null))
      // a pair with both cells solved is no link at all
      if (open.some(cells => cells.length === 0)) continue

      // which pairs hold each digit, and how many of them it can fill at most
      const edges = new Uint8Array(10)
      open.forEach((cells, i) => {
        for (const cell of cells) for (const digit of candidates[cell]) edges[digit] |= 1 << i
      })
      const empty = open.reduce((n, cells) => n + cells.length, 0)
      let needed = 0
      for (let digit = 1; digit <= 9; digit++) needed += MATCHINGS[edges[digit]].size
      // more digits than cells proves nothing; fewer would be a broken board
      if (needed !== empty) continue

      const instance = settle(snapshot, corners, loop, open, edges)
      if (!instance) continue
      const key = instance.candidateAnnotations
        .filter(a => a.kind === 'eliminate')
        .map(a => `${a.cell}:${a.digit}`)
        .sort()
        .join(',')
      if (seen.has(key)) continue
      seen.add(key)
      instances.push(instance)
    }
  }

  if (instances.length === 0) return null
  return { name: 'SK Loops', instances }
}

/** Two rows in different bands, or two columns in different stacks. */
const LINE_PAIRS: Array<[number, number]> = []
for (let a = 0; a < 9; a++) {
  for (let b = a + 1; b < 9; b++) {
    if (((a / 3) | 0) !== ((b / 3) | 0)) LINE_PAIRS.push([a, b])
  }
}

/**
 * For each set of edges of the ring (bit i: pair i, between units i and
 * i + 1), what its largest matchings have in common:
 *   size    how many edges a largest matching has
 *   always  the units every largest matching touches
 *   usable  the edges some largest matching uses
 *   covers  the smallest sets of units touching every edge, for the words
 */
type Matching = { size: number; always: number; usable: number; covers: number[] }

/** The units an edge set touches: edge i touches units i and i + 1. */
const touched = (edges: number) => (edges | (edges << 1) | (edges >> 7)) & 255

const MATCHINGS: Matching[] = []
for (let edges = 0; edges < 256; edges++) {
  let size = 0
  let always = 0
  let usable = 0
  // every subset of the edges, from all of them down to none
  for (let m = edges; ; m = (m - 1) & edges) {
    // no two edges side by side (pair i and pair i + 1 share unit i + 1)
    if ((m & (((m << 1) | (m >> 7)) & 255)) === 0) {
      const n = popcount(m)
      if (n > size) {
        size = n
        always = touched(m)
        usable = m
      } else if (n === size) {
        always &= touched(m)
        usable |= m
      }
    }
    if (m === 0) break
  }
  const covers: number[] = []
  for (let units = 0; units < 256; units++) {
    if (popcount(units) !== size) continue
    let all = true
    for (let i = 0; i < 8 && all; i++) {
      if (edges & (1 << i)) all = (units & ((1 << i) | (1 << ((i + 1) % 8)))) !== 0
    }
    if (all) covers.push(units)
  }
  MATCHINGS.push({ size, always, usable, covers })
}

/** Units 1, 3, 5 and 7 are the rows and columns; 0, 2, 4 and 6 the boxes. */
const LINES = 0b10101010

function popcount(bits: number): number {
  let n = 0
  for (; bits; bits &= bits - 1) n++
  return n
}

type Loop = {
  /** Round the loop: box A, row 1, box B, column 2, box D, row 2, box C, column 1. */
  units: UnitRef[]
  /** Pair i lies in units i and i + 1. */
  pairs: CellIdx[][]
}

/** The other two cells of the corner's box along its row, or its column. */
function rowPair(r: number, c: number): CellIdx[] {
  const left = c - (c % 3)
  return [left, left + 1, left + 2].filter(col => col !== c).map(col => r * 9 + col)
}
function colPair(r: number, c: number): CellIdx[] {
  const top = r - (r % 3)
  return [top, top + 1, top + 2].filter(row => row !== r).map(row => row * 9 + c)
}

function loopOf(r1: number, r2: number, c1: number, c2: number): Loop {
  const box = (r: number, c: number): UnitRef => ({ kind: 'box', index: ((r / 3) | 0) * 3 + ((c / 3) | 0) })
  return {
    units: [
      box(r1, c1),
      { kind: 'row', index: r1 },
      box(r1, c2),
      { kind: 'col', index: c2 },
      box(r2, c2),
      { kind: 'row', index: r2 },
      box(r2, c1),
      { kind: 'col', index: c1 },
    ],
    pairs: [
      rowPair(r1, c1),
      rowPair(r1, c2),
      colPair(r1, c2),
      colPair(r2, c2),
      rowPair(r2, c2),
      rowPair(r2, c1),
      colPair(r2, c1),
      colPair(r1, c1),
    ],
  }
}

/** What a loop whose digits fit its cells exactly removes, or null when nothing. */
function settle(
  snapshot: Snapshot,
  corners: CellIdx[],
  loop: Loop,
  open: CellIdx[][],
  edges: Uint8Array,
): StratInstance | null {
  const { values, candidates } = snapshot
  const inLoop = new Set([...corners, ...loop.pairs.flat()])
  const gone = new Map<string, { cell: CellIdx; digit: number }>()
  // the digits each unit is counted with, as the words give them
  const sets: number[][] = loop.units.map(() => [])
  // units a digit is placed in besides the ones it is counted in
  const alsoIn: Array<[number, number[]]> = []
  let doubled = false

  for (let digit = 1; digit <= 9; digit++) {
    const mask = edges[digit]
    if (mask === 0) continue
    const { always, usable, covers } = MATCHINGS[mask]

    // the digit is in the loop in each of these units, so nowhere else in them
    for (let u = 0; u < 8; u++) {
      if (!(always & (1 << u))) continue
      for (const cell of unitCells(loop.units[u])) {
        if (!inLoop.has(cell) && values[cell] === null && candidates[cell].has(digit)) {
          gone.set(`${cell}:${digit}`, { cell, digit })
        }
      }
    }
    // a pair that would leave the digit short of its count elsewhere
    for (let i = 0; i < 8; i++) {
      if (!(mask & (1 << i)) || usable & (1 << i)) continue
      for (const cell of open[i]) {
        if (candidates[cell].has(digit)) {
          gone.set(`${cell}:${digit}`, { cell, digit })
          doubled = true
        }
      }
    }

    // counted in rows and columns where there is a choice, as the site does
    const cover = covers.reduce((best, units) => (popcount(units & LINES) > popcount(best & LINES) ? units : best))
    for (let u = 0; u < 8; u++) if (cover & (1 << u)) sets[u].push(digit)
    const extra = always & ~cover
    if (extra) alsoIn.push([digit, [0, 1, 2, 3, 4, 5, 6, 7].filter(u => extra & (1 << u))])
  }

  if (gone.size === 0) return null

  const removals = [...gone.values()].sort((a, b) => a.cell - b.cell || a.digit - b.digit)
  const struck = new Set(gone.keys())
  // round the loop each set is a disc at one end and a ring at the other
  const marks: CandidateAnnotation[] = []
  open.forEach((cells, i) => {
    const next = sets[(i + 1) % 8]
    for (const cell of cells) {
      for (const digit of [...candidates[cell]].sort((a, b) => a - b)) {
        if (struck.has(`${cell}:${digit}`)) continue
        marks.push({ cell, digit, kind: next.includes(digit) ? 'highlight' : 'alternate' })
      }
    }
  })
  for (const { cell, digit } of removals) marks.push({ cell, digit, kind: 'eliminate' })

  const empty = open.reduce((n, cells) => n + cells.length, 0)
  const solvedInLoop = loop.pairs.flat().filter(cell => values[cell] !== null)
  const boxes = [0, 2, 6, 4].map(u => loop.units[u].index + 1)
  // the site's notation: the set sizes round the loop from the top left box
  const sizes = sets.map(set => set.length)
  // the removals digit by digit, each with its cells in board order
  const byDigit = [...new Set(removals.map(g => g.digit))]
    .sort((a, b) => a - b)
    .map((digit): [number, CellIdx[]] => [digit, removals.filter(g => g.digit === digit).map(g => g.cell)])
  const named = [0, 1, 2, 3, 4, 5, 6, 7]
    .filter(u => sets[u].length > 0)
    .map(u => `${proseList(sets[u])} in ${unitDisplayName(loop.units[u])}`)
  const cornerList = proseList(corners.map(cellLabel))

  const also = alsoIn.map(
    ([digit, units]) =>
      `${digit} could as well be counted in ` +
      unitsDisplayName(units.map(u => loop.units[u]).sort((a, b) => a.index - b.index)),
  )

  const narrative =
    `${cornerList} are solved, at the corners of a rectangle over boxes ${proseList([...boxes].sort())}. ` +
    `Beside each corner, the other two cells of its box in its row make a pair, and so do the other two ` +
    `in its column: eight pairs in a loop through those rows, columns and boxes, each pair in one row or ` +
    `column of it and one box. Every candidate in the loop belongs to the digits of its row or column or ` +
    `to those of its box: ${named.join(', ')}. ` +
    `That is ${empty} digits for the ${empty} empty cells` +
    (solvedInLoop.length > 0
      ? ` (${proseList(solvedInLoop.map(cellLabel))} ${solvedInLoop.length === 1 ? 'is' : 'are'} solved already)`
      : '') +
    `. A digit goes once in a row, column or box, so the loop cannot take more than these, and each cell ` +
    `needs one: every one of them is placed in the loop, inside the unit it is counted in` +
    (also.length > 0 ? ` (${also.join('; ')}, for the same total, so it is placed there too)` : '') +
    (doubled ? `. A pair cannot take a digit that both of its units count, which would use up two` : '') +
    `. So each set's digits go from the rest of its row, column or box` +
    (removals.length <= 6
      ? `: ${proseList(byDigit.map(([digit, cells]) => `${digit} from ${proseList(cells.map(cellLabel))}`))}.`
      : `, ${removals.length} candidates in all.`)

  return {
    patternCells: [...inLoop].sort((a, b) => a - b),
    solvedCells: [],
    candidateAnnotations: marks,
    // the lines draw the loop as a rectangle of ties through its cells
    units: [loop.units[1], loop.units[5], loop.units[7], loop.units[3]],
    label:
      `SK Loop ${sizes.join('-')} on ${corners.map(cellLabel).join('/')}` +
      `, eliminates ${byDigit.map(([digit, cells]) => `${digit} from ${cells.map(cellLabel).join(', ')}`).join('; ')}`,
    narrative,
  }
}
