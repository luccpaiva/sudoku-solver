import { useState } from 'react'
import { getSudoku } from 'sudoku-gen'
import { useSolverStore } from '@/store/solverStore'
import { TEST_BOARDS } from '@/data/testBoards'
import { generatePuzzle } from '@/core/generator'
import { parseInput, serializeValues } from '@/core/utils'
import { LibraryMenu } from './LibraryMenu'

type Difficulty = 'easy' | 'medium' | 'hard' | 'expert'

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard', 'expert']

const generatedTitle = (difficulty: Difficulty) => `Generated, ${difficulty}`

export function PuzzleLoader() {
  const [input, setInput] = useState('')
  const [copyNote, setCopyNote] = useState<string | null>(null)
  const given = useSolverStore(s => s.given)
  const title = useSolverStore(s => s.title)
  const rating = useSolverStore(s => s.rating)
  const loadPuzzle = useSolverStore(s => s.loadPuzzleFromString)

  const pasted = parseInput(input.trim())
  const pasteReady = pasted.length === 81 && pasted.every(v => v === null || (v >= 1 && v <= 9))

  const handleManualLoad = () => {
    if (!pasteReady) return
    loadPuzzle(input.trim())
    setInput('')
  }

  const handleGenerate = (difficulty: Difficulty) => {
    const puzzle = difficulty === 'hard' || difficulty === 'expert'
      ? generatePuzzle(difficulty)
      : getSudoku(difficulty).puzzle.replaceAll('-', '.')
    loadPuzzle(puzzle, generatedTitle(difficulty))
  }

  const handleCopy = async () => {
    const link = new URL(window.location.href)
    link.search = `?puzzle=${serializeValues(given)}`
    try {
      await navigator.clipboard.writeText(link.href)
      setCopyNote('Link copied')
    } catch {
      // no clipboard here (an insecure page, or a frame without the permission)
      window.history.replaceState(null, '', link)
      setCopyNote('Link is in the address bar')
    }
    setTimeout(() => setCopyNote(null), 2200)
  }

  return (
    <section className="sd-group" id="puzzle">
      <header>
        <h2>Puzzle</h2>
        <button type="button" className="sd-link" onClick={handleCopy}>
          {copyNote ?? 'Copy link'}
        </button>
      </header>

      <div className="sd-field">
        <span id="library-label">From the library</span>
        <LibraryMenu
          current={TEST_BOARDS.some(b => b.name === title) ? title : null}
          onPick={board => loadPuzzle(board.puzzle, board.name, board.name)}
        />
      </div>

      <div className="sd-field">
        <span>Generate a new one</span>
        <div className="sd-quick" id="generate">
          {DIFFICULTIES.map(d => (
            <button
              key={d}
              type="button"
              className={`ui-toggle${title === generatedTitle(d) ? ' is-on' : ''}`}
              onClick={() => handleGenerate(d)}
            >
              {d[0].toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <label className="sd-field">
        <span>Paste 81 characters, dots for blanks</span>
        <div className="sd-paste">
          <input
            type="text"
            value={input}
            spellCheck={false}
            autoComplete="off"
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleManualLoad()}
          />
          <button type="button" className="ui-toggle" onClick={handleManualLoad} disabled={!pasteReady}>
            Load
          </button>
        </div>
      </label>

      <div className="sd-rating">
        <div className="sd-row">
          <span>Hardest step</span>
          <b>{rating.hardest ?? 'none'}</b>
        </div>
        <div className="sd-row">
          <span>{rating.solved ? 'Solves in' : 'Stalls after'}</span>
          <b>{rating.steps} {rating.steps === 1 ? 'step' : 'steps'}</b>
        </div>
      </div>
    </section>
  )
}
