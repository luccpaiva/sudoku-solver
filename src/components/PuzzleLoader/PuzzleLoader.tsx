import { useState } from 'react'
import { useSolverStore } from '@/store/solverStore'
import { TEST_BOARDS } from '@/data/testBoards'

export function PuzzleLoader() {
  const [input, setInput] = useState('')
  const loadPuzzle = useSolverStore(s => s.loadPuzzleFromString)

  const handleLoad = () => {
    const clean = input.trim()
    if (clean.length >= 81) {
      loadPuzzle(clean)
      setInput('')
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
        Load Puzzle
      </p>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="81-char puzzle string…"
          className="flex-1 rounded bg-slate-800 border border-slate-700 px-2 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
          onKeyDown={e => e.key === 'Enter' && handleLoad()}
        />
        <button
          onClick={handleLoad}
          className="rounded bg-slate-700 hover:bg-slate-600 px-3 py-1.5 text-xs font-medium text-slate-100 transition-colors"
        >
          Load
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {TEST_BOARDS.map(({ name, puzzle }) => (
          <button
            key={name}
            onClick={() => loadPuzzle(puzzle)}
            className="rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2 py-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  )
}
