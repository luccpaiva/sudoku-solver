import { useBoardView } from '@/hooks/useBoardView'
import { useUIStore } from '@/store/uiStore'
import { SudokuCell } from './SudokuCell'
import { CELL_UNITS } from '@/core/units'

export function SudokuBoard() {
  const cells = useBoardView()
  const showCandidates = useUIStore(s => s.showCandidates)

  return (
    <div
      role="grid"
      aria-label="Sudoku board"
      className="grid grid-cols-9 grid-rows-9 border-2 border-slate-400"
      style={{ width: 'min(540px, 90vw)', height: 'min(540px, 90vw)' }}
    >
      {cells.map(cell => {
        const { row, col } = CELL_UNITS[cell.idx]
        const borderRight = col % 3 === 2 && col < 8 ? 'border-r-2 border-r-slate-400' : 'border-r border-r-slate-600'
        const borderBottom = row % 3 === 2 && row < 8 ? 'border-b-2 border-b-slate-400' : 'border-b border-b-slate-600'

        return (
          <div key={cell.idx} className={`${borderRight} ${borderBottom}`}>
            <SudokuCell cell={cell} showCandidates={showCandidates} />
          </div>
        )
      })}
    </div>
  )
}
