import { useSolverStore } from '@/store/solverStore'
import { useUIStore } from '@/store/uiStore'
import { useSolverStep } from '@/hooks/useSolverActions'
import { useEffect } from 'react'
import { theme } from '@/theme'

export function Controls() {
  const pending = useSolverStore(s => s.pending)
  const canUndo = useSolverStore(s => s.canUndo())
  const canRedo = useSolverStore(s => s.canRedo())
  const undo = useSolverStore(s => s.undo)
  const redo = useSolverStore(s => s.redo)
  const reset = useSolverStore(s => s.reset)
  const showCandidates = useUIStore(s => s.showCandidates)
  const toggleCandidates = useUIStore(s => s.toggleCandidates)
  const step = useSolverStep()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault()
        step()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [step])

  return (
    <div className="flex flex-col gap-3">
      {/* One big verb — everything else stays quiet */}
      <button
        onClick={step}
        className={`${theme.button.base} ${theme.button.primary} w-full py-2.5 flex items-center justify-center gap-3`}
      >
        <span>{pending ? 'Apply' : 'Find next'}</span>
        <span className="text-[9px] tracking-[0.2em] uppercase opacity-50">space</span>
      </button>

      <div className={`flex divide-x divide-line/60 border ${theme.app.border} rounded-[var(--radius)] overflow-hidden`}>
        <QuietBtn onClick={undo} disabled={!canUndo}>Undo</QuietBtn>
        <QuietBtn onClick={redo} disabled={!canRedo}>Redo</QuietBtn>
        <QuietBtn onClick={reset}>Reset</QuietBtn>
      </div>

      <label className="flex items-center justify-between cursor-pointer select-none py-0.5">
        <span className="text-xs text-soft">Candidates</span>
        <input
          type="checkbox"
          checked={showCandidates}
          onChange={toggleCandidates}
          className="sr-only peer"
        />
        <span
          aria-hidden
          className="relative h-4 w-8 rounded-full bg-line/80 transition-colors peer-checked:bg-ink
                     after:absolute after:top-0.5 after:left-0.5 after:h-3 after:w-3 after:rounded-full
                     after:bg-surface after:transition-transform peer-checked:after:translate-x-4
                     peer-focus-visible:ring-1 peer-focus-visible:ring-accent"
        />
      </label>
    </div>
  )
}

function QuietBtn({ children, onClick, disabled = false }: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex-1 py-1.5 text-xs text-soft hover:text-ink hover:bg-wash/50 transition-colors
                 disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-transparent
                 focus:outline-none focus-visible:ring-1 focus-visible:ring-accent"
    >
      {children}
    </button>
  )
}
