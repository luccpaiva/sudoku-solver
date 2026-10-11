import { useBoardView, useActiveInstance } from '@/hooks/useBoardView'
import { useUIStore } from '@/store/uiStore'
import { SudokuCell } from './SudokuCell'
import { BoardOverlay } from './BoardOverlay'
import { DigitStrip } from './DigitStrip'
import { ROW_LABELS } from '@/core/utils'

const COL_LABELS = '123456789'

export function SudokuBoard() {
  const cells = useBoardView()
  const instance = useActiveInstance()
  const showCandidates = useUIStore(s => s.showCandidates)
  const focusDigit = useUIStore(s => s.focusDigit)

  // The lines the found step works in get their labels picked out
  const inScope = (kind: 'row' | 'col', index: number) =>
    instance?.units.some(unit => unit.kind === kind && unit.index === index) ?? false

  return (
    <div className="sd-table">
      <div className="sd-axis cols" aria-hidden="true">
        {[...COL_LABELS].map((label, i) => (
          <span key={label} className={inScope('col', i) ? 'is-scope' : undefined}>{label}</span>
        ))}
      </div>
      <div className="sd-axis rows" aria-hidden="true">
        {[...ROW_LABELS].map((label, i) => (
          <span key={label} className={inScope('row', i) ? 'is-scope' : undefined}>{label}</span>
        ))}
      </div>

      <div className={`sd-board${focusDigit !== null ? ' is-focusing' : ''}`}>
        <BoardOverlay />
        <div role="grid" aria-label="Sudoku board" className="sd-grid">
          {cells.map(cell => (
            <SudokuCell key={cell.idx} cell={cell} showCandidates={showCandidates} focusDigit={focusDigit} />
          ))}
        </div>
      </div>

      <DigitStrip />
    </div>
  )
}
