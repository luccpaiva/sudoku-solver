import { useEffect } from 'react'
import { useSolverStore } from '@/store/solverStore'
import { useUIStore } from '@/store/uiStore'
import { useAutoRun, useSolverStep } from '@/hooks/useSolverActions'
import { isSolved } from '@/core/board'
import { CheckIcon, PauseIcon, PlayIcon, RedoIcon, ResetIcon, UndoIcon } from '@/components/icons'

/** Where a key press belongs to the control it was typed into, not to the solver. */
const TYPING = 'input, select, textarea, button, a'

export function Controls() {
  const pending = useSolverStore(s => s.pending)
  const running = useSolverStore(s => s.running)
  const setRunning = useSolverStore(s => s.setRunning)
  const solved = useSolverStore(s => isSolved(s.currentSnapshot()))
  const canUndo = useSolverStore(s => s.canUndo())
  const canRedo = useSolverStore(s => s.canRedo())
  const canReset = useSolverStore(s =>
    s.history !== s.opening.history || s.cursor !== s.opening.steps.length || s.pending !== null)
  const undo = useSolverStore(s => s.undo)
  const redo = useSolverStore(s => s.redo)
  const reset = useSolverStore(s => s.reset)
  const showCandidates = useUIStore(s => s.showCandidates)
  const toggleCandidates = useUIStore(s => s.toggleCandidates)
  const step = useSolverStep()

  useAutoRun()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || (e.target as Element).closest(TYPING)) return
      e.preventDefault()
      setRunning(false)
      step()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [step, setRunning])

  return (
    <div className="sd-toolbar">
      <button
        type="button"
        id="step"
        className="ui-btn solid"
        disabled={solved && !pending}
        onClick={() => { setRunning(false); step() }}
      >
        {pending ? 'Apply' : 'Find next'}
        <kbd>Space</kbd>
      </button>
      <button
        type="button"
        id="run"
        className="ui-btn"
        disabled={solved && !pending}
        onClick={() => setRunning(!running)}
      >
        {running ? <PauseIcon small /> : <PlayIcon small />}
        {running ? 'Pause' : 'Run'}
      </button>

      <div className="ui-acts" role="group" aria-label="History">
        <button type="button" id="undo" onClick={undo} disabled={!canUndo}><UndoIcon small /><span>Undo</span></button>
        <button type="button" id="redo" onClick={redo} disabled={!canRedo}><RedoIcon small /><span>Redo</span></button>
        <button type="button" id="reset" onClick={reset} disabled={!canReset}><ResetIcon small /><span>Reset</span></button>
      </div>

      <button
        type="button"
        id="candidates"
        role="switch"
        aria-checked={showCandidates}
        className={`ui-check${showCandidates ? ' is-on' : ''}`}
        onClick={toggleCandidates}
      >
        <i><CheckIcon /></i>
        <span>Candidates</span>
      </button>
    </div>
  )
}
