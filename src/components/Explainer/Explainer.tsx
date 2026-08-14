import { useSolverStore } from '@/store/solverStore'
import { STRATEGY_META } from '@/core/solver'
import { theme } from '@/theme'

export function Explainer() {
  const pending = useSolverStore(s => s.pending)
  const activeInstance = useSolverStore(s => s.activeInstance)
  const setActiveInstance = useSolverStore(s => s.setActiveInstance)

  if (!pending) {
    return (
      <div className={theme.explainer.empty}>
        Press <kbd className={theme.explainer.kbd}>Space</kbd> or{' '}
        <span className="font-semibold">Find next</span> to discover a strategy.
      </div>
    )
  }

  const meta = STRATEGY_META.find(m => m.name === pending.name)
  const count = pending.instances.length
  const idx = Math.min(activeInstance, count - 1)
  const instance = pending.instances[idx]

  return (
    <div className={theme.explainer.container}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={theme.explainer.name}>{pending.name}</p>
          {meta && <p className={theme.explainer.summary}>{meta.summary}</p>}
        </div>

        {count > 1 && (
          <div className={theme.explainer.stepper} aria-label="Occurrence selector">
            <button
              type="button"
              className={theme.explainer.stepperButton}
              onClick={() => setActiveInstance(idx - 1)}
              disabled={idx === 0}
              aria-label="Previous occurrence"
            >
              ‹
            </button>
            <span className={theme.explainer.stepperCount}>
              {idx + 1} / {count}
            </span>
            <button
              type="button"
              className={theme.explainer.stepperButton}
              onClick={() => setActiveInstance(idx + 1)}
              disabled={idx === count - 1}
              aria-label="Next occurrence"
            >
              ›
            </button>
          </div>
        )}
      </div>

      <p className={theme.explainer.narrative}>{instance.narrative}</p>
      <p className={theme.explainer.label}>{instance.label}</p>

      <div className={theme.explainer.legend}>
        <span className="flex items-center gap-1">
          <span className={`w-2 h-2 rounded-full ${theme.explainer.legendHighlight}`} />
          Pattern
        </span>
        <span className="flex items-center gap-1">
          <span className="relative inline-flex w-3 h-3 items-center justify-center">
            <span className={`absolute w-3 h-px -rotate-45 ${theme.explainer.legendEliminate}`} />
          </span>
          Removed
        </span>
      </div>
    </div>
  )
}
