import { useSolverStore } from '@/store/solverStore'
import { useUIStore } from '@/store/uiStore'
import { useSolverStep } from '@/hooks/useSolverActions'
import { useEffect } from 'react'

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

  // Space = step (find / apply)
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
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <Btn
          onClick={step}
          variant={pending ? 'primary' : 'default'}
          title="Space"
        >
          {pending ? 'Apply' : 'Find Next'}
        </Btn>
        <Btn onClick={undo} disabled={!canUndo} variant="ghost">
          Undo
        </Btn>
        <Btn onClick={redo} disabled={!canRedo} variant="ghost">
          Redo
        </Btn>
        <Btn onClick={reset} variant="ghost">
          Reset
        </Btn>
      </div>

      <Btn onClick={toggleCandidates} variant="ghost">
        {showCandidates ? 'Hide Candidates' : 'Show Candidates'}
      </Btn>
    </div>
  )
}

type BtnProps = {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  variant?: 'default' | 'primary' | 'ghost'
  title?: string
}

function Btn({ children, onClick, disabled = false, variant = 'default', title }: BtnProps) {
  const base =
    'px-3 py-2 rounded text-sm font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-40 disabled:cursor-not-allowed'
  const variants = {
    default: 'bg-slate-700 hover:bg-slate-600 text-slate-100',
    primary: 'bg-emerald-700 hover:bg-emerald-600 text-white',
    ghost: 'bg-transparent hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700',
  }

  return (
    <button
      className={`${base} ${variants[variant]}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {children}
    </button>
  )
}
