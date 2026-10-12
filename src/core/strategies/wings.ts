import type { Snapshot, StratResult, StratInstance, CellIdx, UnitRef } from '../types'
import { CELL_UNITS, PEERS, sees, commonPeers } from '../units'
import { cellLabel, proseList, unitDisplayName } from '../utils'

/**
 * Y-Wing and XYZ-Wing:
 * A hinge cell sees two pincer cells that do not see each other. Each pincer
 * has two candidates: one of the hinge's, and a digit Z both pincers hold.
 *   Y-Wing    hinge XY,  pincers XZ and YZ: one of the pincers is Z
 *   XYZ-Wing  hinge XYZ, pincers XZ and YZ: one of the three cells is Z
 * → eliminate Z from every cell that sees all the cells Z may be in.
 */
type WingName = 'Y-Wing' | 'XYZ-Wing'

function findWings(snapshot: Snapshot, name: WingName): StratResult | null {
  const { candidates } = snapshot
  const hingeSize = name === 'Y-Wing' ? 2 : 3
  const instances: StratInstance[] = []

  for (let hinge = 0; hinge < 81; hinge++) {
    const hingeDigits = candidates[hinge]
    if (hingeDigits.size !== hingeSize) continue

    // Cells in sight with two candidates: one of them the hinge's for a
    // Y-Wing, both of them for an XYZ-Wing
    const pincers = PEERS[hinge]
      .filter(
        cell =>
          candidates[cell].size === 2 &&
          shared(candidates[cell], hingeDigits).length === hingeSize - 1,
      )
      .sort((a, b) => a - b)

    for (let i = 0; i < pincers.length; i++) {
      for (let j = i + 1; j < pincers.length; j++) {
        const first = pincers[i]
        const second = pincers[j]

        // Pincers in sight of each other put all three cells in one unit:
        // that is a naked triple
        if (sees(first, second)) continue

        // Exactly one digit in common leaves each pincer a different digit
        // of the hinge. The hinge of a Y-Wing lacks the common digit.
        const common = shared(candidates[first], candidates[second])
        if (common.length !== 1) continue
        const z = common[0]
        if (hingeSize === 2 && hingeDigits.has(z)) continue

        const targets = commonPeers(first, second)
          .filter(cell => candidates[cell].has(z) && (hingeSize === 2 || sees(cell, hinge)))
          .sort((a, b) => a - b)
        if (targets.length === 0) continue

        instances.push(describeWing(name, snapshot, hinge, [first, second], z, targets))
      }
    }
  }

  if (instances.length === 0) return null
  return { name, instances }
}

/** The digits two cells both hold. */
function shared(a: ReadonlySet<number>, b: ReadonlySet<number>): number[] {
  const both: number[] = []
  for (const d of a) {
    if (b.has(d)) both.push(d)
  }
  return both
}

/** The unit through which two cells see each other: their box, or else their line. */
function sharedUnit(a: CellIdx, b: CellIdx): UnitRef {
  if (CELL_UNITS[a].box === CELL_UNITS[b].box) return { kind: 'box', index: CELL_UNITS[a].box }
  if (CELL_UNITS[a].row === CELL_UNITS[b].row) return { kind: 'row', index: CELL_UNITS[a].row }
  return { kind: 'col', index: CELL_UNITS[a].col }
}

function describeWing(
  name: WingName,
  snapshot: Snapshot,
  hinge: CellIdx,
  pincers: [CellIdx, CellIdx],
  z: number,
  targets: CellIdx[],
): StratInstance {
  const { candidates } = snapshot
  const hingeHasZ = candidates[hinge].has(z)

  // The digit each pincer has from the hinge, and the unit they meet in
  const linkDigits = pincers.map(cell => [...candidates[cell]].find(d => d !== z)!)
  const units = pincers.map(cell => sharedUnit(hinge, cell))

  const at = cellLabel(hinge)
  const [first, second] = pincers.map(cellLabel)
  const either = (cell: CellIdx) => proseList([...candidates[cell]].sort(), 'or')

  return {
    patternCells: [hinge, ...pincers],
    solvedCells: [],
    candidateAnnotations: [
      // Discs on the Zs, one of which is true; rings on the digits that tie
      // the hinge to each pincer
      ...(hingeHasZ ? [hinge, ...pincers] : pincers).map(cell => ({
        cell,
        digit: z,
        kind: 'highlight' as const,
      })),
      ...pincers.flatMap((cell, i) => [
        { cell: hinge, digit: linkDigits[i], kind: 'alternate' as const },
        { cell, digit: linkDigits[i], kind: 'alternate' as const },
      ]),
      ...targets.map(cell => ({ cell, digit: z, kind: 'eliminate' as const })),
    ],
    units,
    links: pincers.map((cell): [CellIdx, CellIdx] => [hinge, cell]),
    label:
      `${name} on ${z}: hinge ${at}, pincers ${first} & ${second}` +
      `, eliminates ${z} from ${targets.map(cellLabel).join(', ')}`,
    narrative:
      `${at} can only be ${either(hinge)}. It shares ${unitDisplayName(units[0])} with ` +
      `${first} (${either(pincers[0])}) and ${unitDisplayName(units[1])} with ` +
      `${second} (${either(pincers[1])}), so if ${at} is ${linkDigits[0]} then ${first} is ${z}, ` +
      `and if ${at} is ${linkDigits[1]} then ${second} is ${z}` +
      `${hingeHasZ ? `; otherwise ${at} is ${z} itself` : ''}. ` +
      `Either way one of ${hingeHasZ ? 'the three cells' : `${first} and ${second}`} is ${z}, ` +
      `so ${z} is removed from ${proseList(targets.map(cellLabel))}, which ` +
      `${targets.length === 1 ? 'sees' : 'see'} ${hingeHasZ ? 'all three' : 'both of them'}.`,
  }
}

export const yWing = (s: Snapshot) => findWings(s, 'Y-Wing')
export const xyzWing = (s: Snapshot) => findWings(s, 'XYZ-Wing')
