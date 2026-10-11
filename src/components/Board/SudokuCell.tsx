import type { CellViewModel } from '@/core/types'
import { CandidateGrid } from './CandidateGrid'
import { useUIStore } from '@/store/uiStore'
import { useCellKeyHandler } from '@/hooks/useSolverActions'
import { cellLabel } from '@/core/utils'

type Props = {
  cell: CellViewModel
  showCandidates: boolean
  focusDigit: number | null
}

const ARROWS: Record<string, number> = { ArrowUp: -9, ArrowDown: 9, ArrowLeft: -1, ArrowRight: 1 }

export function SudokuCell({ cell, showCandidates, focusDigit }: Props) {
  const selectCell = useUIStore(s => s.selectCell)
  const handleKey = useCellKeyHandler()

  const states = [
    cell.value !== null && (cell.isGiven ? 'is-given' : 'is-placed'),
    cell.isSelected && 'is-selected',
    cell.isPeer && 'is-peer',
    cell.isSameValue && 'is-same',
    cell.isPatternCell && 'is-pattern',
    cell.hasFocusDigit && 'has-focus',
  ].filter(Boolean).join(' ')

  return (
    <div
      role="gridcell"
      tabIndex={0}
      data-cell={cellLabel(cell.idx)}
      aria-label={`${cellLabel(cell.idx)}, ${cell.value ?? 'empty'}`}
      aria-selected={cell.isSelected}
      className={`sd-cell ${states}`}
      onClick={() => selectCell(cell.idx)}
      onKeyDown={e => {
        const move = ARROWS[e.key]
        if (move !== undefined) {
          e.preventDefault()
          const col = cell.idx % 9
          // the row ends are walls, not a way round to the next row
          if ((move === -1 && col === 0) || (move === 1 && col === 8)) return
          const next = e.currentTarget.parentElement?.children[cell.idx + move]
          if (next instanceof HTMLElement) {
            selectCell(cell.idx + move)
            next.focus()
          }
          return
        }
        selectCell(cell.idx)
        handleKey(cell.idx, e.key)
      }}
    >
      {cell.value !== null ? (
        <span className="sd-value">{cell.value}</span>
      ) : (
        <CandidateGrid cell={cell} visible={showCandidates} focusDigit={focusDigit} />
      )}
    </div>
  )
}
