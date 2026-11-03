import type { Snapshot, StratResult, StratInstance, CandidateAnnotation, CellIdx, UnitRef } from '../types'
import { CELL_UNITS, PEERS, sees } from '../units'
import { cellLabel, proseList, unitDisplayName } from '../utils'

/**
 * Twinned XY-Chains:
 * six cells where two rows cross three columns (or three rows two columns)
 * hold six digits between them, and each digit's places among them all see
 * one another. No digit can then be in two of the cells, and six cells need
 * six different digits, so each digit is in exactly one of its places: two
 * XY-Chain loops, one of which must be live, twinned on the cells they share.
 * → Eliminate each digit from the cells outside that see all its places.
 */
export function twinnedXyChains(snapshot: Snapshot): StratResult | null {
  const { values, candidates } = snapshot
  const instances: StratInstance[] = []

  // Each open cell's candidates as bits; 0 for a solved cell
  const bits = candidates.map((set, cell) => (values[cell] === null ? [...set].reduce((m, d) => m | (1 << d), 0) : 0))

  for (const across of [false, true]) {
    // two rows by three columns, then two columns by three rows
    const at = across ? (line: number, place: number) => place * 9 + line : (line: number, place: number) => line * 9 + place
    for (let a = 0; a < 9; a++) {
      for (let b = a + 1; b < 9; b++) {
        // where lines a and b cross each line the other way: their two cells' digits,
        // or 0 when a cell is solved or the two already hold more than six
        const pair: number[] = []
        for (let place = 0; place < 9; place++) {
          const x = bits[at(a, place)]
          const y = bits[at(b, place)]
          pair.push(x && y && POPCOUNT[x | y] <= 6 ? x | y : 0)
        }
        for (let p = 0; p < 9; p++) {
          if (!pair[p]) continue
          for (let q = p + 1; q < 9; q++) {
            if (!pair[q] || POPCOUNT[pair[p] | pair[q]] > 6) continue
            for (let r = q + 1; r < 9; r++) {
              if (!pair[r]) continue
              const union = pair[p] | pair[q] | pair[r]
              if (POPCOUNT[union] !== 6) continue
              const two = [a, b]
              const three = [p, q, r]
              // all six in one box is a plain naked set, found long before
              if (sameChute(two) && sameChute(three)) continue

              const rows = across ? three : two
              const cols = across ? two : three
              const cells = rows.flatMap(row => cols.map(col => row * 9 + col))
              const instance = settle(cells, rows, cols, union)
              if (instance) instances.push(instance)
            }
          }
        }
      }
    }
  }

  if (instances.length === 0) return null
  return { name: 'Twinned XY-Chains', instances }

  /** What one formation removes, or null when a digit is not confined or nothing goes. */
  function settle(cells: CellIdx[], rows: number[], cols: number[], union: number): StratInstance | null {
    const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(d => union & (1 << d))
    const places = digits.map(d => cells.filter(cell => bits[cell] & (1 << d)))

    // every digit restricted: its places in the six cells all see each other
    for (const at of places) {
      for (let i = 0; i < at.length; i++) {
        for (let j = i + 1; j < at.length; j++) {
          if (!sees(at[i], at[j])) return null
        }
      }
    }

    const inside = new Set(cells)
    const gone: Array<{ digit: number; cells: CellIdx[] }> = []
    digits.forEach((digit, i) => {
      const [first, ...rest] = places[i]
      const targets = PEERS[first]
        .filter(cell => !inside.has(cell) && bits[cell] & (1 << digit) && rest.every(other => sees(cell, other)))
        .sort((m, n) => m - n)
      if (targets.length > 0) gone.push({ digit, cells: targets })
    })
    if (gone.length === 0) return null

    // The unit each digit's places share, where the removals happen
    const shared = places.map(at => sharedUnit(at))
    const units: UnitRef[] = []
    for (const { digit } of gone) {
      const unit = shared[digits.indexOf(digit)]
      if (!units.some(u => u.kind === unit.kind && u.index === unit.index)) units.push(unit)
    }

    // Each digit ties its places together; the ties make the two loops
    const links: Array<[CellIdx, CellIdx]> = []
    for (const at of places) {
      for (let i = 1; i < at.length; i++) {
        const tie: [CellIdx, CellIdx] = [at[i - 1], at[i]]
        if (!links.some(([a, b]) => a === tie[0] && b === tie[1])) links.push(tie)
      }
    }

    const marks: CandidateAnnotation[] = [
      ...cells.flatMap(cell =>
        digits.filter(d => bits[cell] & (1 << d)).map(digit => ({ cell, digit, kind: 'highlight' as const })),
      ),
      ...gone.flatMap(({ digit, cells: targets }) =>
        targets.map(cell => ({ cell, digit, kind: 'eliminate' as const })),
      ),
    ]

    const rowNames = rows.map(r => unitDisplayName({ kind: 'row', index: r }).slice(4))
    const colNames = cols.map(c => String(c + 1))
    return {
      patternCells: [...cells].sort((m, n) => m - n),
      solvedCells: [],
      candidateAnnotations: marks,
      units,
      links,
      label:
        `Twinned XY-Chains on ${digits.join('/')}: rows ${rowNames.join('&')}, columns ${colNames.join('&')}, ` +
        `eliminates ${gone.map(g => `${g.digit} from ${g.cells.map(cellLabel).join(', ')}`).join('; ')}`,
      narrative: narrate(cells, digits, places, shared, gone),
    }
  }
}

/** How many digits a candidate mask holds, for every mask of digits 1 to 9. */
const POPCOUNT: ReadonlyArray<number> = Array.from({ length: 1024 }, (_, mask) => {
  let n = 0
  for (let m = mask; m; m &= m - 1) n++
  return n
})

/** Whether three or two lines all fall in one band (rows) or stack (columns). */
function sameChute(lines: number[]): boolean {
  return lines.every(line => ((line / 3) | 0) === ((lines[0] / 3) | 0))
}

/** A unit all the cells are in: a row, else a column, else a box. */
function sharedUnit(cells: CellIdx[]): UnitRef {
  const [first] = cells
  const { row, col, box } = CELL_UNITS[first]
  if (cells.every(c => CELL_UNITS[c].row === row)) return { kind: 'row', index: row }
  if (cells.every(c => CELL_UNITS[c].col === col)) return { kind: 'col', index: col }
  return { kind: 'box', index: box }
}

function narrate(
  cells: CellIdx[],
  digits: number[],
  places: CellIdx[][],
  shared: UnitRef[],
  gone: Array<{ digit: number; cells: CellIdx[] }>,
): string {
  const ties = digits.map(
    (digit, i) =>
      `${digit} in ${proseList(places[i].map(cellLabel))}` +
      (places[i].length > 1 ? ` (${unitDisplayName(shared[i])})` : ''),
  )
  const removals = gone.map(
    (g, i) => `${g.digit} ${i === 0 ? 'is removed ' : ''}from ${proseList(g.cells.map(cellLabel))}`,
  )
  return (
    `${proseList(cells.map(cellLabel))} hold six digits between them, ${proseList(digits)}, and ` +
    `wherever a digit can go among them, those places see one another: ${ties.join(', ')}. ` +
    `So no digit can be in two of the six cells, and six cells need six different digits: each ` +
    `digit is in exactly one of its places here. It works like two XY-Chain loops twinned on ` +
    `the cells they share, one of which must hold. A cell outside that sees every place of a ` +
    `digit cannot be that digit, so ${removals.join('; ')}.`
  )
}
