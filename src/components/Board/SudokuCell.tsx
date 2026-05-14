import type { CellViewModel } from '@/core/types'
import { CandidateGrid } from './CandidateGrid'
import { useUIStore } from '@/store/uiStore'
import { useSolverStore } from '@/store/solverStore'
import { useCellKeyHandler } from '@/hooks/useSolverActions'

type Props = {
  cell: CellViewModel
  showCandidates: boolean
}

export function SudokuCell({ cell, showCandidates }: Props) {
  const selectCell = useUIStore(s => s.selectCell)
  const handleKey = useCellKeyHandler()

  const bg = getCellBg(cell)
  const textColor = cell.isGiven ? 'text-slate-200 font-semibold' : 'text-blue-400'

  return (
    <div
      role="gridcell"
      tabIndex={0}
      aria-label={`Cell ${cell.idx}, value ${cell.value ?? 'empty'}`}
      className={`
        relative flex items-center justify-center
        cursor-pointer select-none focus:outline-none
        ${bg}
        transition-colors duration-75
      `}
      onClick={() => selectCell(cell.idx)}
      onKeyDown={e => {
        selectCell(cell.idx)
        handleKey(cell.idx, e.key)
      }}
    >
      {cell.value !== null ? (
        <span className={`text-xl font-medium leading-none ${textColor}`}>
          {cell.value}
        </span>
      ) : (
        <CandidateGrid cell={cell} visible={showCandidates} />
      )}
    </div>
  )
}

function getCellBg(cell: CellViewModel): string {
  if (cell.isSelected) return 'bg-blue-900/60'
  if (cell.isPatternCell) return 'bg-emerald-900/40'
  if (cell.isSameValue) return 'bg-slate-700/50'
  if (cell.isPeer) return 'bg-slate-800/60'
  return 'bg-slate-900/40'
}
