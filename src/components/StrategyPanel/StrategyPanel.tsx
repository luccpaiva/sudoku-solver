import { useMemo } from 'react'
import { STRATEGY_META } from '@/core/solver'
import { useSolverStore } from '@/store/solverStore'
import { useUIStore } from '@/store/uiStore'
import { CheckIcon } from '@/components/icons'

const SECTIONS = [
  { title: 'Basic', strategies: STRATEGY_META.filter(m => m.category === 'basic') },
  { title: 'Tough', strategies: STRATEGY_META.filter(m => m.category === 'tough') },
]

const stepsLabel = (count = 0) => (count === 0 ? '' : `${count} ${count === 1 ? 'step' : 'steps'}`)

/**
 * The strategies in the order the solver tries them. Each can be switched
 * off, and shows how many steps of the solve so far it has made.
 */
export function StrategyPanel() {
  const pending = useSolverStore(s => s.pending)
  const steps = useSolverStore(s => s.steps)
  const cursor = useSolverStore(s => s.cursor)
  const clearSearch = useSolverStore(s => s.clearSearch)
  const enabledStrategies = useUIStore(s => s.enabledStrategies)
  const toggleStrategy = useUIStore(s => s.toggleStrategy)

  const used = useMemo(() => {
    const counts = new Map<string, number>()
    for (const step of steps.slice(0, cursor)) counts.set(step.name, (counts.get(step.name) ?? 0) + 1)
    return counts
  }, [steps, cursor])

  return (
    <section className="sd-group" id="strategies">
      <header>
        <h2>Strategies</h2>
        <span className="sd-note">{enabledStrategies.size} of {STRATEGY_META.length} on</span>
      </header>
      <p className="sd-hint">Tried from the top. The first that applies is the next step.</p>

      {SECTIONS.map(section => (
        <div key={section.title} className="sd-ladder">
          <h3>{section.title}</h3>
          {section.strategies.map(meta => {
            const isOn = enabledStrategies.has(meta.name)
            const isFound = meta.name === pending?.name
            return (
              <button
                key={meta.name}
                type="button"
                role="switch"
                aria-checked={isOn}
                data-strategy={meta.name}
                title={meta.summary}
                className={`ui-check${isOn ? ' is-on' : ''}${isFound ? ' is-found' : ''}`}
                onClick={() => {
                  // what was found depends on what was switched on
                  clearSearch()
                  toggleStrategy(meta.name)
                }}
              >
                <i><CheckIcon /></i>
                <span>{meta.name}</span>
                <output>{isFound ? `found ${pending.instances.length}` : stepsLabel(used.get(meta.name))}</output>
              </button>
            )
          })}
        </div>
      ))}
    </section>
  )
}
