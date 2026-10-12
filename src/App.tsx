import { useEffect } from 'react'
import { TopBar } from '@/components/TopBar/TopBar'
import { PuzzleLoader } from '@/components/PuzzleLoader/PuzzleLoader'
import { StrategyPanel } from '@/components/StrategyPanel/StrategyPanel'
import { Controls } from '@/components/Controls/Controls'
import { SudokuBoard } from '@/components/Board/SudokuBoard'
import { Explainer } from '@/components/Explainer/Explainer'
import { Progress } from '@/components/Progress/Progress'
import { SolvePath } from '@/components/SolvePath/SolvePath'
import { useSolverStore } from '@/store/solverStore'
import { useUIStore } from '@/store/uiStore'
import { TEST_BOARDS } from '@/data/testBoards'

/**
 * The workspace: what goes in on the left (the puzzle, the strategies),
 * the board in the middle, what comes out on the right (the step found,
 * progress, the path so far).
 */
export default function App() {
  const loadPuzzle = useSolverStore(s => s.loadPuzzleFromString)
  const darkMode = useUIStore(s => s.darkMode)

  useEffect(() => {
    // ?puzzle=<81 chars> loads a shared puzzle; ?autofind runs the solver once
    const params = new URLSearchParams(window.location.search)
    const puzzle = params.get('puzzle')
    const [first] = TEST_BOARDS
    if (puzzle && puzzle.length >= 81) loadPuzzle(puzzle, 'Shared puzzle')
    else loadPuzzle(first.puzzle, first.name, first.name)
    if (params.has('autofind')) useSolverStore.getState().findNext()
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light'
  }, [darkMode])

  return (
    <div className="sd-shell">
      <TopBar />
      <main className="sd-main">
        <aside className="sd-inputs" aria-label="Puzzle and strategies">
          <PuzzleLoader />
          <StrategyPanel />
        </aside>

        <div className="sd-work">
          <Controls />
          <div className="sd-view">
            <SudokuBoard />
          </div>
        </div>

        <aside className="sd-results" aria-label="Step and progress">
          <Explainer />
          <Progress />
          <SolvePath />
        </aside>
      </main>
    </div>
  )
}
