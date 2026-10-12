import { describe, expect, it } from 'vitest'
import { applyStratResult, isSolved, loadPuzzle } from './board'
import { mentions, type Mention } from './mentions'
import { findNextStrategy } from './solver'
import { cellLabel, unitsDisplayName } from './utils'
import { TEST_BOARDS } from '../data/testBoards'

const named = (text: string) => mentions(text).filter((piece): piece is Mention => typeof piece !== 'string')
const texts = (text: string) => named(text).map(mention => mention.text)

describe('what an explanation names on the board', () => {
  it('finds a cell', () => {
    expect(mentions('A4 has only one candidate left: it must be 5.')).toEqual([
      { text: 'A4', cells: [3] },
      ' has only one candidate left: it must be 5.',
    ])
    expect(named('so 8 is removed from J9.')[0].cells).toEqual([80])
  })

  it('takes several rows or columns as one mention', () => {
    const [rows, cols] = named('The only places for 7 in rows B and F are columns 4 and 8: four corners of a rectangle.')
    expect(rows.text).toBe('rows B and F')
    expect(rows.units).toEqual([{ kind: 'row', index: 1 }, { kind: 'row', index: 5 }])
    expect(rows.cells).toHaveLength(18)
    expect(cols.text).toBe('columns 4 and 8')
    expect(cols.units).toEqual([{ kind: 'col', index: 3 }, { kind: 'col', index: 7 }])

    expect(texts('In columns 1, 4 and 8, every possible 4 falls inside rows B, E and F.')).toEqual([
      'columns 1, 4 and 8',
      'rows B, E and F',
    ])
  })

  it('takes every cell of a unit', () => {
    expect(named('row A')[0].cells).toHaveLength(9)
    expect(named('box 9')[0].units).toEqual([{ kind: 'box', index: 8 }])
  })

  it('stops a list where the names stop', () => {
    expect(texts('the digit that appears three times in row F, column 8 and box 6, so 4 and 6 are removed from it.'))
      .toEqual(['row F', 'column 8', 'box 6'])
    expect(texts('Inside box 5, the digit 7 fits only in row E.')).toEqual(['box 5', 'row E'])
    expect(texts('A 1 in A4 would rule out A3, also in row A, and so force G3')).toEqual(['A4', 'A3', 'row A', 'G3'])
  })

  it('leaves words that only look like names', () => {
    expect(texts('every digit would be a candidate exactly twice in each row, column and box')).toEqual([])
    expect(texts('A 1 or a 2, in a row.')).toEqual([])
  })

  it('reads back what the solver writes, on every step of the library', () => {
    for (const board of TEST_BOARDS) {
      let snapshot = loadPuzzle(board.puzzle).snapshot
      for (let step = 0; step < 729 && !isSolved(snapshot); step++) {
        const result = findNextStrategy(snapshot)
        if (!result) break
        for (const instance of result.instances) {
          const pieces = mentions(instance.narrative)
          // nothing is lost or added on the way
          expect(pieces.map(piece => (typeof piece === 'string' ? piece : piece.text)).join('')).toBe(instance.narrative)
          // a name is the same thing on the way back
          for (const piece of pieces) {
            if (typeof piece === 'string') continue
            expect(piece.units ? unitsDisplayName(piece.units) : cellLabel(piece.cells[0])).toBe(piece.text)
          }
        }
        snapshot = applyStratResult(snapshot, result)
      }
    }
  })
})
