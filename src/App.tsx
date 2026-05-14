import { useEffect } from 'react'
import { SudokuBoard } from '@/components/Board/SudokuBoard'
import { StrategyPanel } from '@/components/StrategyPanel/StrategyPanel'
import { Controls } from '@/components/Controls/Controls'
import { Explainer } from '@/components/Explainer/Explainer'
import { PuzzleLoader } from '@/components/PuzzleLoader/PuzzleLoader'
import { useSolverStore } from '@/store/solverStore'
import { TEST_BOARDS } from '@/data/testBoards'

export default function App() {
  const loadPuzzle = useSolverStore(s => s.loadPuzzleFromString)
  const stepCount = useSolverStore(s => s.cursor)

  // Load a default puzzle on first render
  useEffect(() => {
    loadPuzzle(TEST_BOARDS[0].puzzle)
  }, [])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 px-6 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold tracking-tight">
          Sudoku Solver
          <span className="ml-2 text-xs font-normal text-slate-500">step-by-step</span>
        </h1>
        <span className="text-xs text-slate-500">
          step {stepCount}
        </span>
      </header>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: strategy list */}
        <aside className="w-52 shrink-0 border-r border-slate-800 p-4 overflow-y-auto">
          <StrategyPanel />
        </aside>

        {/* Center: board */}
        <main className="flex-1 flex items-center justify-center p-6">
          <SudokuBoard />
        </main>

        {/* Right: controls + explainer + loader */}
        <aside className="w-72 shrink-0 border-l border-slate-800 p-4 flex flex-col gap-5 overflow-y-auto">
          <Controls />
          <hr className="border-slate-800" />
          <Explainer />
          <hr className="border-slate-800" />
          <PuzzleLoader />
        </aside>
      </div>
    </div>
  )
}
