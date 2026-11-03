import type { CellIdx, UnitRef } from './types'
import { unitCells } from './units'
import { ROW_LABELS } from './utils'

/**
 * A stretch of an explanation that names something on the board: a cell
 * ("A4"), or one or more rows, columns or boxes ("rows B and F").
 */
export type Mention = {
  text: string
  /** The cell named, or every cell of the units named. */
  cells: CellIdx[]
  /** Set when it is units that are named. */
  units?: UnitRef[]
}

/** One name, or several as prose: "4", "4 and 8", "1, 4 and 8". */
const listOf = (name: string) => `${name}(?:(?:, ${name})* and ${name})?`

const NAMED = new RegExp(
  '\\b(?:' +
    '(?<cell>[A-HJ][1-9])' +
    `|rows? (?<row>${listOf('[A-HJ]')})` +
    `|columns? (?<col>${listOf('[1-9]')})` +
    `|box(?:es)? (?<box>${listOf('[1-9]')})` +
    ')\\b',
  'g',
)

function unitsNamed(kind: UnitRef['kind'], names: string): UnitRef[] {
  return [...names.matchAll(/[A-HJ1-9]/g)].map(([name]) => ({
    kind,
    index: kind === 'row' ? ROW_LABELS.indexOf(name) : Number(name) - 1,
  }))
}

/**
 * An explanation cut up where it names cells or units: the plain text and
 * the mentions, in the order they are read. The names are the ones
 * `cellLabel` and `unitsDisplayName` write.
 */
export function mentions(text: string): Array<string | Mention> {
  const pieces: Array<string | Mention> = []
  let read = 0
  for (const found of text.matchAll(NAMED)) {
    if (found.index > read) pieces.push(text.slice(read, found.index))
    read = found.index + found[0].length

    const { cell, row, col, box } = found.groups!
    if (cell) {
      pieces.push({ text: cell, cells: [ROW_LABELS.indexOf(cell[0]) * 9 + Number(cell[1]) - 1] })
      continue
    }
    const units = row ? unitsNamed('row', row) : col ? unitsNamed('col', col) : unitsNamed('box', box)
    pieces.push({ text: found[0], cells: units.flatMap(unitCells), units })
  }
  if (read < text.length) pieces.push(text.slice(read))
  return pieces
}
