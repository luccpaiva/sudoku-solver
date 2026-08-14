import type { CellViewModel } from '@/core/types'
import { CandidateGrid } from './CandidateGrid'
import { useUIStore } from '@/store/uiStore'
import { useCellKeyHandler } from '@/hooks/useSolverActions'
import { theme } from '@/theme'

type Props = {
  cell: CellViewModel
  showCandidates: boolean
}

export function SudokuCell({ cell, showCandidates }: Props) {
  const selectCell = useUIStore(s => s.selectCell)
  const handleKey = useCellKeyHandler()

  const bg = getCellBg(cell)
  const textColor = cell.isGiven ? theme.value.given : theme.value.input

  return (
    <div
      role="gridcell"
      tabIndex={0}
      aria-label={`Cell ${cell.idx}, value ${cell.value ?? 'empty'}`}
      className={`
        relative flex items-center justify-center
        w-full h-full
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
        <span className={`text-xl leading-none ${textColor}`}>
          {cell.value}
        </span>
      ) : (
        <CandidateGrid cell={cell} visible={showCandidates} />
      )}
    </div>
  )
}

function getCellBg(cell: CellViewModel): string {
  if (cell.isSelected) return theme.cell.selected
  if (cell.isPatternCell) return theme.cell.pattern
  if (cell.isSameValue) return theme.cell.sameValue
  if (cell.isPeer) return theme.cell.peer
  return theme.cell.default
}
