import { useSolverStore } from '@/store/solverStore'
import { useUIStore } from '@/store/uiStore'
import { useActiveInstance } from '@/hooks/useBoardView'
import { STRATEGY_META } from '@/core/solver'
import { isSolved } from '@/core/board'
import { cellLabel, unitsDisplayName } from '@/core/utils'
import { NextIcon, PrevIcon } from '@/components/icons'

/** A pattern of more cells than this is counted, not listed. */
const LISTED_CELLS = 6

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

/** The step the solver has found, in words, with a key to its marks on the board. */
export function Explainer() {
  const pending = useSolverStore(s => s.pending)
  const activeInstance = useSolverStore(s => s.activeInstance)
  const setActiveInstance = useSolverStore(s => s.setActiveInstance)
  const stalled = useSolverStore(s => s.stalled)
  const solved = useSolverStore(s => isSolved(s.currentSnapshot()))
  const cursor = useSolverStore(s => s.cursor)
  const allEnabled = useUIStore(s => s.enabledStrategies.size === STRATEGY_META.length)
  const instance = useActiveInstance()

  if (!pending || !instance) {
    return (
      <section className="sd-pane sd-step" id="explainer">
        <header>
          <h2>{solved ? 'Solved' : stalled ? 'Nothing applies' : 'Next step'}</h2>
        </header>
        {solved ? (
          <p className="sd-step-text">
            Every cell is filled, {cursor === 0 ? 'with nothing left to do' : `in ${plural(cursor, 'step')}`}.
          </p>
        ) : stalled ? (
          <p className="sd-step-text">
            {allEnabled
              ? 'None of these strategies moves this position forward. It needs one that is not built yet.'
              : 'None of the strategies that are switched on moves this position forward. Switch more of them on and look again.'}
          </p>
        ) : (
          <p className="sd-step-text">
            <b>Find next</b> goes down the strategy list and stops at the first one that
            applies. It marks what it found on the board, and <b>Apply</b> writes it in.
          </p>
        )}
      </section>
    )
  }

  const meta = STRATEGY_META.find(m => m.name === pending.name)
  const count = pending.instances.length
  const idx = Math.min(activeInstance, count - 1)
  const removed = instance.candidateAnnotations.filter(a => a.kind === 'eliminate').length
  const pattern = instance.patternCells

  return (
    <section className="sd-pane sd-step" id="explainer">
      <header>
        <h2>{pending.name}</h2>
        {count > 1 && (
          <div className="sd-pager" role="group" aria-label="Occurrences of this step">
            <button
              type="button"
              id="occurrence-prev"
              onClick={() => setActiveInstance(idx - 1)}
              disabled={idx === 0}
              aria-label="Previous occurrence"
            >
              <PrevIcon small />
            </button>
            <output>{idx + 1} of {count}</output>
            <button
              type="button"
              id="occurrence-next"
              onClick={() => setActiveInstance(idx + 1)}
              disabled={idx === count - 1}
              aria-label="Next occurrence"
            >
              <NextIcon small />
            </button>
          </div>
        )}
      </header>

      {meta && <p className="sd-step-rule">{meta.summary}</p>}
      <p className="sd-step-text">{instance.narrative}</p>

      {/* each row leads with the mark it explains, drawn as it is on the board */}
      <dl className="sd-key">
        <div>
          <dt><i className="sd-mark disc" />Pattern</dt>
          <dd>{pattern.length > LISTED_CELLS ? `${pattern.length} cells` : pattern.map(cellLabel).join(', ')}</dd>
        </div>
        {instance.solvedCells.length > 0 && (
          <div>
            <dt><i className="sd-mark digit">{instance.solvedCells[0].digit}</i>Writes</dt>
            <dd>{instance.solvedCells.map(s => `${s.digit} in ${cellLabel(s.cell)}`).join(', ')}</dd>
          </div>
        )}
        {removed > 0 && (
          <div>
            <dt><i className="sd-mark strike" />Removes</dt>
            <dd>{plural(removed, 'candidate')}</dd>
          </div>
        )}
        {instance.units.length > 0 && (
          <div>
            <dt><i className="sd-mark wash" />Looks at</dt>
            <dd>{unitsDisplayName(instance.units)}</dd>
          </div>
        )}
      </dl>

      {count > 1 && <p className="sd-step-note">Apply takes all {count} occurrences at once.</p>}
    </section>
  )
}
