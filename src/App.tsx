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
 * The workspace: the puzzle and the path of its solve on the left, the
 * board in the middle with the step found under it, and on the right the
 * strategies the solver goes down to find that step.
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
        <aside className="sd-side" aria-label="Puzzle and solve path">
          <PuzzleLoader />
          <SolvePath />
          <Progress />
        </aside>

        <div className="sd-work">
          <Controls />
          <div className="sd-view">
            <div className="sd-stage">
              <SudokuBoard />
              <Explainer />
            </div>
          </div>
        </div>

        <aside className="sd-side" aria-label="Strategies">
          <StrategyPanel />
        </aside>
      </main>
    </div>
  )
}
