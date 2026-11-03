import { useSolverStore } from '@/store/solverStore'
import { isSolved } from '@/core/board'
import { CheckCircleIcon, WarningIcon } from '@/components/icons'

/** How far the board has come: cells filled, and pencil marks still standing. */
export function Progress() {
  const snapshot = useSolverStore(s => s.currentSnapshot())
  const clues = useSolverStore(s => s.given.filter(v => v !== null).length)
  const stalled = useSolverStore(s => s.stalled)
  const cursor = useSolverStore(s => s.cursor)

  const filled = snapshot.values.filter(v => v !== null).length
  const candidates = snapshot.candidates.reduce((sum, set) => sum + set.size, 0)
  const solved = isSolved(snapshot)
  const share = (cells: number) => `${(cells / 81) * 100}%`

  return (
    <section className="sd-pane" id="progress">
      <header>
        <h2>Progress</h2>
      </header>
      <p className="sd-figure">
        <strong>{filled}</strong>
        <span>of 81 cells</span>
      </p>
      <div
        className="sd-meter"
        role="img"
        aria-label={`${clues} given, ${filled - clues} solved, ${81 - filled} empty`}
      >
        <i className="given" style={{ width: share(clues) }} />
        <i className="solved" style={{ width: share(filled - clues) }} />
      </div>
      <dl className="sd-tally">
        <div className="given"><dt>Given</dt><dd>{clues}</dd></div>
        <div className="solved"><dt>Solved</dt><dd>{filled - clues}</dd></div>
        <div><dt>Candidates left</dt><dd>{candidates}</dd></div>
      </dl>

      {solved && (
        <p className="sd-verdict">
          <CheckCircleIcon />
          <span>Solved in <b>{cursor}</b> {cursor === 1 ? 'step' : 'steps'}</span>
        </p>
      )}
      {stalled && (
        <p className="sd-verdict warn">
          <WarningIcon />
          <span>No strategy applies here</span>
        </p>
      )}
    </section>
  )
}
