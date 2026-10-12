import type { Snapshot, StratResult, StratInstance, CandidateAnnotation, CellIdx, UnitRef } from '../types'
import { CELL_UNITS, sees } from '../units'
import { cellLabel, proseList, unitDisplayName } from '../utils'

/** One occurrence, as the narratives need it. */
type Rectangle = {
  digit: number
  hinge: CellIdx
  /** The hinge's only partner for the digit along `strongLine`. */
  strongWing: CellIdx
  /** The wing on the hinge's other line, `otherLine`. */
  wing: CellIdx
  strongLine: UnitRef
  otherLine: UnitRef
  /** The box at the fourth corner, and the places it has for the digit. */
  box: UnitRef
  emptied: CellIdx[]
}

/**
 * Rectangle Elimination (one digit; a hinge, two wings and a box):
 * The hinge and its strong wing are the only two places for the digit in
 * their row, so one of them holds it. The other wing shares the hinge's
 * column. Each wing is in a different box from the hinge, which makes the
 * three cells corners of a rectangle with its fourth corner in a fourth box.
 * Were the other wing the digit, the hinge would not be and the strong wing
 * would, and if the two wings between them see every place the fourth box
 * has for the digit, that box would be left without it.
 * → Eliminate the digit from the other wing. The same with the strong link
 * along a column and the other wing along the row.
 *
 * When the hinge's second line is a pair as well, the argument runs both ways
 * and the digit goes from both wings.
 */
export function rectangleElimination(snapshot: Snapshot): StratResult | null {
  const { values, candidates } = snapshot
  const instances: StratInstance[] = []

  for (let digit = 1; digit <= 9; digit++) {
    // Where the digit can still go, by row, by column and by box
    const places: CellIdx[] = []
    const inRow: CellIdx[][] = Array.from({ length: 9 }, () => [])
    const inCol: CellIdx[][] = Array.from({ length: 9 }, () => [])
    const inBox: CellIdx[][] = Array.from({ length: 9 }, () => [])
    for (let cell = 0; cell < 81; cell++) {
      if (values[cell] !== null || !candidates[cell].has(digit)) continue
      const { row, col, box } = CELL_UNITS[cell]
      places.push(cell)
      inRow[row].push(cell)
      inCol[col].push(cell)
      inBox[box].push(cell)
    }

    for (const hinge of places) {
      const { row, col, box: hingeBox } = CELL_UNITS[hinge]
      const rowIsPair = inRow[row].length === 2
      const colIsPair = inCol[col].length === 2
      if (!rowIsPair && !colIsPair) continue

      // The strong link runs along the row when it can; a hinge with a pair
      // both ways is one pattern, not two.
      const pair = rowIsPair ? inRow[row] : inCol[col]
      const across = rowIsPair ? inCol[col] : inRow[row]
      const strongWing = pair[0] === hinge ? pair[1] : pair[0]
      if (CELL_UNITS[strongWing].box === hingeBox) continue
      const bothStrong = rowIsPair && colIsPair

      for (const wing of across) {
        if (wing === hinge || CELL_UNITS[wing].box === hingeBox) continue

        // The box at the corner opposite the hinge. Both wings are outside it:
        // one sees a row of it, the other a column.
        const box = CELL_UNITS[strongWing + wing - hinge].box
        const emptied = inBox[box]
        if (emptied.length === 0) continue
        if (!emptied.every(cell => sees(cell, wing) || sees(cell, strongWing))) continue

        const strongLine: UnitRef = rowIsPair ? { kind: 'row', index: row } : { kind: 'col', index: col }
        const otherLine: UnitRef = rowIsPair ? { kind: 'col', index: col } : { kind: 'row', index: row }
        const boxRef: UnitRef = { kind: 'box', index: box }
        const cells: Rectangle = { digit, hinge, strongWing, wing, strongLine, otherLine, box: boxRef, emptied }

        // With a pair both ways the strong wing is as doomed as the other one
        const toEliminate = bothStrong ? [strongWing, wing] : [wing]
        const kept = bothStrong ? [hinge] : [hinge, strongWing]
        const candidateAnnotations: CandidateAnnotation[] = [
          ...kept.map(cell => ({ cell, digit, kind: 'highlight' as const })),
          ...emptied.map(cell => ({ cell, digit, kind: 'alternate' as const })),
          ...toEliminate.map(cell => ({ cell, digit, kind: 'eliminate' as const })),
        ]

        instances.push({
          patternCells: [hinge, strongWing, wing],
          solvedCells: [],
          candidateAnnotations,
          units: bothStrong ? [strongLine, otherLine, boxRef] : [strongLine, boxRef],
          links: [[hinge, strongWing], [hinge, wing]],
          label:
            `Rectangle on ${digit}: hinge ${cellLabel(hinge)}, wings ${cellLabel(strongWing)} and ` +
            `${cellLabel(wing)}, ${unitDisplayName(boxRef)}, eliminates ${digit} from ` +
            toEliminate.map(cellLabel).join(', '),
          narrative: bothStrong ? narrateBothStrong(cells) : narrate(cells),
        })
      }
    }
  }

  if (instances.length === 0) return null
  return { name: 'Rectangle Elimination', instances }
}

/** "every 9 in box 2 (A5, A6 and B6)", or "the last 9 in box 2 (C6)". */
function boxLoss({ digit, box, emptied }: Rectangle): string {
  const where = `${unitDisplayName(box)} (${proseList(emptied.map(cellLabel))})`
  return emptied.length === 1 ? `the last ${digit} in ${where}` : `every ${digit} in ${where}`
}

function narrate(cells: Rectangle): string {
  const { digit, strongLine, otherLine } = cells
  const [h, s, w] = [cells.hinge, cells.strongWing, cells.wing].map(cellLabel)
  return (
    `In ${unitDisplayName(strongLine)}, the digit ${digit} fits only in ${h} and ${s}, so if ${h} ` +
    `isn't the ${digit} then ${s} is. A ${digit} in ${w} would rule out ${h}, also in ` +
    `${unitDisplayName(otherLine)}, and so force ${s}, and between them ${w} and ${s} would cross ` +
    `out ${boxLoss(cells)}. A box can't be left without its ${digit}, so ${w} can't be ${digit} ` +
    `and the candidate is removed.`
  )
}

function narrateBothStrong(cells: Rectangle): string {
  const { digit, strongLine, otherLine } = cells
  const [h, s, w] = [cells.hinge, cells.strongWing, cells.wing].map(cellLabel)
  return (
    `The digit ${digit} fits only in ${h} and ${s} in ${unitDisplayName(strongLine)}, and only in ` +
    `${h} and ${w} in ${unitDisplayName(otherLine)}. If either ${s} or ${w} were the ${digit}, ${h} ` +
    `would not be, which forces the other one to be a ${digit} too, and together they would cross ` +
    `out ${boxLoss(cells)}. A box can't be left without its ${digit}, so neither ${s} nor ${w} ` +
    `can be ${digit} and both candidates are removed.`
  )
}
