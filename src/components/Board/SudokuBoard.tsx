import { useBoardView } from '@/hooks/useBoardView'
import { useUIStore } from '@/store/uiStore'
import { SudokuCell } from './SudokuCell'
import { BoardOverlay } from './BoardOverlay'
import { CELL_UNITS } from '@/core/units'
import { theme } from '@/theme'

const BOARD_SIZE = 'min(540px, 90vw)'
const CELL_SIZE = `calc(${BOARD_SIZE} / 9)`

const COL_LABELS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']
const ROW_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J']

export function SudokuBoard() {
  const cells = useBoardView()
  const showCandidates = useUIStore(s => s.showCandidates)

  return (
    <div className="flex flex-col">
      {/* Column labels */}
      <div className="flex" style={{ paddingLeft: '1.5rem' }}>
        {COL_LABELS.map(c => (
          <div
            key={c}
            style={{ width: CELL_SIZE }}
            className={`flex items-center justify-center ${theme.label}`}
          >
            {c}
          </div>
        ))}
      </div>

      <div className="flex">
        {/* Row labels */}
        <div className="flex flex-col" style={{ width: '1.5rem' }}>
          {ROW_LABELS.map(r => (
            <div
              key={r}
              style={{ height: CELL_SIZE }}
              className={`flex items-center justify-center ${theme.label}`}
            >
              {r}
            </div>
          ))}
        </div>

        {/* Board */}
        <div className="relative shrink-0" style={{ width: BOARD_SIZE, height: BOARD_SIZE }}>
          <div
            role="grid"
            aria-label="Sudoku board"
            className={`grid grid-cols-9 grid-rows-9 ${theme.board.outerBorder} w-full h-full`}
          >
            {cells.map(cell => {
              const { row, col } = CELL_UNITS[cell.idx]
              const borderRight = col % 3 === 2 && col < 8
                ? theme.board.boxDividerRight
                : theme.board.cellDividerRight
              const borderBottom = row % 3 === 2 && row < 8
                ? theme.board.boxDividerBottom
                : theme.board.cellDividerBottom

              return (
                <div key={cell.idx} className={`${borderRight} ${borderBottom}`}>
                  <SudokuCell cell={cell} showCandidates={showCandidates} />
                </div>
              )
            })}
          </div>
          <BoardOverlay />
        </div>
      </div>
    </div>
  )
}
