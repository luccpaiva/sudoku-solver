import { useEffect } from 'react'
import { SudokuBoard } from '@/components/Board/SudokuBoard'
import { StrategyPanel } from '@/components/StrategyPanel/StrategyPanel'
import { Controls } from '@/components/Controls/Controls'
import { Explainer } from '@/components/Explainer/Explainer'
import { PuzzleLoader } from '@/components/PuzzleLoader/PuzzleLoader'
import { useSolverStore } from '@/store/solverStore'
import { useUIStore } from '@/store/uiStore'
import { TEST_BOARDS } from '@/data/testBoards'
import { theme } from '@/theme'

export default function App() {
  const loadPuzzle = useSolverStore(s => s.loadPuzzleFromString)
  const stepCount = useSolverStore(s => s.cursor)
  const darkMode = useUIStore(s => s.darkMode)
  const toggleDark = useUIStore(s => s.toggleDark)

  useEffect(() => {
    // ?puzzle=<81 chars> loads a shared puzzle; ?autofind runs the solver once
    const params = new URLSearchParams(window.location.search)
    const puzzle = params.get('puzzle')
    loadPuzzle(puzzle && puzzle.length >= 81 ? puzzle : TEST_BOARDS[0].puzzle)
    if (params.has('autofind')) useSolverStore.getState().findNext()
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  return (
    <div className={`min-h-screen ${theme.app.bg} ${theme.app.text} flex flex-col transition-colors`}>
      <header className="masthead px-6 py-3 flex items-center justify-between">
        <h1 className="font-display text-xl tracking-wide">
          Sudoku Solver
          <span className={`ml-3 text-[10px] font-sans font-semibold uppercase tracking-[0.25em] ${theme.app.muted}`}>
            strategy trainer
          </span>
        </h1>
        <div className="flex items-center gap-4">
          <span className={`text-xs tabular-nums ${theme.app.muted}`}>step {stepCount}</span>
          <button
            onClick={toggleDark}
            aria-label={darkMode ? 'Switch to light theme' : 'Switch to dark theme'}
            className={`h-7 w-7 rounded-[var(--radius)] border ${theme.app.border} text-sm ${theme.app.muted} hover:text-ink transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-accent`}
          >
            {darkMode ? '☀' : '☾'}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 flex flex-col items-center justify-start pt-6 px-6 pb-6 gap-5 overflow-y-auto">
          <SudokuBoard />
          <div style={{ width: 'min(540px, 90vw)' }}>
            <Explainer />
          </div>
        </main>

        <aside className={`w-80 shrink-0 border-l ${theme.app.border} p-5 flex flex-col gap-6 overflow-y-auto`}>
          <Controls />
          <hr className={theme.app.border} />
          <StrategyPanel />
          <hr className={theme.app.border} />
          <PuzzleLoader />
        </aside>
      </div>
    </div>
  )
}
