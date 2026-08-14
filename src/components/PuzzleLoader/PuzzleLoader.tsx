import { useState } from 'react'
import { getSudoku } from 'sudoku-gen'
import { useSolverStore } from '@/store/solverStore'
import { TEST_BOARDS } from '@/data/testBoards'
import { generatePuzzle } from '@/core/generator'
import { theme } from '@/theme'

type Difficulty = 'easy' | 'medium' | 'hard' | 'expert'

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard', 'expert']

export function PuzzleLoader() {
  const [input, setInput] = useState('')
  const [selectedBoard, setSelectedBoard] = useState(TEST_BOARDS[0].name)
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const loadPuzzle = useSolverStore(s => s.loadPuzzleFromString)

  const handleManualLoad = () => {
    const clean = input.trim()
    if (clean.length >= 81) {
      loadPuzzle(clean)
      setInput('')
    }
  }

  const handleTestLoad = () => {
    const board = TEST_BOARDS.find(b => b.name === selectedBoard)
    if (board) loadPuzzle(board.puzzle)
  }

  const handleGenerate = () => {
    if (difficulty === 'hard' || difficulty === 'expert') {
      loadPuzzle(generatePuzzle(difficulty))
    } else {
      const { puzzle } = getSudoku(difficulty)
      loadPuzzle(puzzle.replaceAll('-', '.'))
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <p className={theme.loader.title}>New puzzle</p>

      <div className="flex flex-col gap-2.5">
        <div className="flex" role="radiogroup" aria-label="Difficulty">
          {DIFFICULTIES.map(d => (
            <button
              key={d}
              role="radio"
              aria-checked={difficulty === d}
              onClick={() => setDifficulty(d)}
              className={`flex-1 pb-1.5 text-xs capitalize transition-colors focus:outline-none
                          focus-visible:ring-1 focus-visible:ring-accent ${
                difficulty === d
                  ? 'text-ink border-b-2 border-ink font-medium'
                  : 'text-soft border-b border-line/70 hover:text-ink'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
        <button onClick={handleGenerate} className={`${theme.button.base} ${theme.button.default} w-full py-1.5 text-xs`}>
          Generate
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <p className={theme.loader.label}>From the library</p>
        <div className="flex gap-2">
          <select
            value={selectedBoard}
            onChange={e => setSelectedBoard(e.target.value)}
            className={`min-w-0 flex-1 px-2 py-1.5 text-xs ${theme.formControl}`}
          >
            {TEST_BOARDS.map(b => (
              <option key={b.name} value={b.name}>{b.name}</option>
            ))}
          </select>
          <button onClick={handleTestLoad} className={`px-3 py-1.5 ${theme.formButton}`}>
            Load
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className={theme.loader.label}>Paste a puzzle string</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="81 characters, dots for blanks"
            className={`min-w-0 flex-1 px-2 py-1.5 text-xs ${theme.formControl}`}
            onKeyDown={e => e.key === 'Enter' && handleManualLoad()}
          />
          <button onClick={handleManualLoad} className={`px-3 py-1.5 ${theme.formButton}`}>
            Load
          </button>
        </div>
      </div>
    </div>
  )
}
