import { useSolverStore } from '@/store/solverStore'
import { useUIStore } from '@/store/uiStore'
import { MoonIcon, SunIcon } from '@/components/icons'

/** A box of the grid, one cell of it marked: what the solver does all day. */
function Mark() {
  const squares = [0, 1, 2, 3, 5, 6, 7, 8].map(i => (
    <rect key={i} x={(i % 3) * 7} y={Math.floor(i / 3) * 7} width="5" height="5" rx="1" />
  ))
  return (
    <svg viewBox="0 0 19 19" aria-hidden="true">
      <g className="squares">{squares}</g>
      <rect className="found" x="7" y="7" width="5" height="5" rx="2.5" />
    </svg>
  )
}

/** The browser's clock ticks in tenths of a millisecond, so nothing finer is shown. */
function duration(ms: number): string {
  if (ms < 0.1) return 'under 0.1 ms'
  return `${ms < 10 ? ms.toFixed(1) : Math.round(ms)} ms`
}

export function TopBar() {
  const clues = useSolverStore(s => s.given.filter(v => v !== null).length)
  const cursor = useSolverStore(s => s.cursor)
  const searchMs = useSolverStore(s => s.searchMs)
  const darkMode = useUIStore(s => s.darkMode)
  const toggleDark = useUIStore(s => s.toggleDark)

  return (
    <header className="sd-topbar">
      <div className="sd-brand">
        <Mark />
        Sudoku Solver
      </div>

      <div className="sd-status" role="status">
        <span><b>{clues}</b> clues</span>
        <span>step <b>{cursor}</b></span>
        {searchMs !== null && (
          <span>searched in <b>{duration(searchMs)}</b></span>
        )}
      </div>
      <button
        type="button"
        className="sd-theme"
        onClick={toggleDark}
        aria-label={darkMode ? 'Switch to the light theme' : 'Switch to the dark theme'}
      >
        {darkMode ? <SunIcon /> : <MoonIcon />}
      </button>
    </header>
  )
}
