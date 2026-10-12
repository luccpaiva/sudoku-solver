import type {
  Snapshot,
  StratResult,
  StratInstance,
  CandidateAnnotation,
  CellIdx,
  UnitRef,
} from '../types'
import { ROWS, COLS, CELL_UNITS, commonPeers, sees } from '../units'
import { cellLabel, proseList, unitDisplayName, unitsDisplayName } from '../utils'

/**
 * Chute Remote Pairs:
 * Two cells with the same two candidates sit in one chute (three boxes in a
 * line), in different boxes and without seeing each other. In the chute's
 * third box, three cells are seen by neither: the ones on the chute's third
 * line. A digit of the pair that is nowhere in those three cells, neither
 * placed nor as a candidate, cannot be in both cells of the pair: the third
 * box would have no place left for it.
 * → One digit missing: the other one is in at least one cell of the pair, so
 *   eliminate it from every cell that sees both.
 * → Both missing: on each of the pair's two lines the third box holds one of
 *   the digits and the pair's cell the other, so eliminate both digits from
 *   the rest of those two lines.
 */
export function chuteRemotePairs(snapshot: Snapshot): StratResult | null {
  const { values, candidates } = snapshot
  const instances: StratInstance[] = []

  const bivalue: CellIdx[] = []
  for (let cell = 0; cell < 81; cell++) {
    if (values[cell] === null && candidates[cell].size === 2) bivalue.push(cell)
  }

  for (let i = 0; i < bivalue.length; i++) {
    const p = bivalue[i]
    const [a, b] = [...candidates[p]].sort((x, y) => x - y)

    for (let j = i + 1; j < bivalue.length; j++) {
      const q = bivalue[j]
      if (!candidates[q].has(a) || !candidates[q].has(b) || sees(p, q)) continue

      // Not seeing each other, the two can share a band or a stack, never both
      const unitsP = CELL_UNITS[p]
      const unitsQ = CELL_UNITS[q]
      let kind: 'row' | 'col'
      if (chuteOf(unitsP.row) === chuteOf(unitsQ.row)) kind = 'row'
      else if (chuteOf(unitsP.col) === chuteOf(unitsQ.col)) kind = 'col'
      else continue

      const lines = kind === 'row' ? ROWS : COLS
      const lineP = unitsP[kind]
      const lineQ = unitsQ[kind]

      // A chute's lines are 3k, 3k+1 and 3k+2, so the one neither cell is on
      // is what is left of their sum. The three cells are the ones it has
      // outside the pair's two boxes.
      const thirdLine = chuteOf(lineP) * 9 + 3 - lineP - lineQ
      const thirdCells = lines[thirdLine].filter(
        c => CELL_UNITS[c].box !== unitsP.box && CELL_UNITS[c].box !== unitsQ.box,
      )
      const thirdBox: UnitRef = { kind: 'box', index: CELL_UNITS[thirdCells[0]].box }

      // A clue or a solved cell holds its digit just as a candidate does
      const missing = [a, b].filter(
        digit => !thirdCells.some(c => values[c] === digit || candidates[c].has(digit)),
      )
      if (missing.length === 0) continue

      const both = missing.length === 2
      const pairLines: UnitRef[] = [lineP, lineQ]
        .sort((x, y) => x - y)
        .map(index => ({ kind, index }))
      const gone = both ? [a, b] : [missing[0] === a ? b : a]
      const reach = both
        ? [...lines[lineP], ...lines[lineQ]].filter(
            c => c !== p && c !== q && CELL_UNITS[c].box !== thirdBox.index,
          )
        : commonPeers(p, q)
      reach.sort((x, y) => x - y)

      // Cells grouped by what they lose, for the label: "7/9 from G8, J7"
      const toEliminate: CandidateAnnotation[] = []
      const losses = new Map<string, string[]>()
      for (const cell of reach) {
        const lost = gone.filter(digit => candidates[cell].has(digit))
        if (lost.length === 0) continue
        for (const digit of lost) toEliminate.push({ cell, digit, kind: 'eliminate' })
        const key = lost.join('/')
        losses.set(key, [...(losses.get(key) ?? []), cellLabel(cell)])
      }
      if (toEliminate.length === 0) continue

      // Where the three cells can still take a digit of the pair
      const stillOpen: CandidateAnnotation[] = thirdCells.flatMap(cell =>
        [a, b]
          .filter(digit => candidates[cell].has(digit))
          .map(digit => ({ cell, digit, kind: 'alternate' as const })),
      )

      instances.push({
        patternCells: [p, q],
        solvedCells: [],
        candidateAnnotations: [
          ...[p, q].flatMap(cell => [a, b].map(digit => ({ cell, digit, kind: 'highlight' as const }))),
          ...stillOpen,
          ...toEliminate,
        ],
        units: both ? [thirdBox, ...pairLines] : [thirdBox],
        links: [[p, q]],
        label:
          `${cellLabel(p)}/${cellLabel(q)} remote pair ${a}/${b}, ` +
          `no ${missing.join('/')} in ${thirdCells.map(cellLabel).join('/')}, eliminates ` +
          [...losses].map(([digits, cells]) => `${digits} from ${cells.join(', ')}`).join('; '),
        narrative: both
          ? narrateBoth(p, q, a, b, thirdBox, thirdCells, pairLines)
          : narrateOne(p, q, a, b, missing[0], thirdBox, thirdCells, pairLines, { kind, index: thirdLine }),
      })
    }
  }

  if (instances.length === 0) return null
  return { name: 'Chute Remote Pairs', instances }
}

/** The band a row is in, or the stack a column is in: 0, 1 or 2. */
function chuteOf(line: number): number {
  return (line / 3) | 0
}

function narrateOne(
  p: CellIdx,
  q: CellIdx,
  a: number,
  b: number,
  missing: number,
  thirdBox: UnitRef,
  thirdCells: CellIdx[],
  pairLines: UnitRef[],
  thirdLine: UnitRef,
): string {
  const kept = missing === a ? b : a
  return (
    `${cellLabel(p)} and ${cellLabel(q)} can each only be ${a} or ${b}, and they share no ` +
    `row, column or box. If both were ${missing}, ${unitsDisplayName(pairLines)} would have ` +
    `their ${missing}, leaving ${unitDisplayName(thirdBox)} only ${unitDisplayName(thirdLine)} ` +
    `for its own, but ${proseList(thirdCells.map(cellLabel))} cannot be ${missing}. ` +
    `So at least one of the two is ${kept}, and ${kept} is removed from the cells that share ` +
    `a row, column or box with both.`
  )
}

function narrateBoth(
  p: CellIdx,
  q: CellIdx,
  a: number,
  b: number,
  thirdBox: UnitRef,
  thirdCells: CellIdx[],
  pairLines: UnitRef[],
): string {
  const box = unitDisplayName(thirdBox)
  const lineNames = unitsDisplayName(pairLines)
  const [line, linesWord] = pairLines[0].kind === 'row' ? ['row', 'rows'] : ['column', 'columns']
  return (
    `${cellLabel(p)} and ${cellLabel(q)} can each only be ${a} or ${b}, and they share no ` +
    `row, column or box. The ${a} and ${b} of ${box} cannot go in ` +
    `${proseList(thirdCells.map(cellLabel), 'or')}, so they sit in ${lineNames}, one in each: ` +
    `both in one ${line} would leave ${cellLabel(p)} or ${cellLabel(q)} with nothing. ` +
    `So in each of those ${linesWord} one of the two digits is in ${box} and the other in the ` +
    `pair's own cell, and both are removed from the rest of ${lineNames}.`
  )
}
