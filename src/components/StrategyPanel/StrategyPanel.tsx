import { useMemo, type CSSProperties } from 'react'
import { STRATEGY_META } from '@/core/solver'
import { useSolverStore } from '@/store/solverStore'
import { useUIStore } from '@/store/uiStore'
import { CheckIcon } from '@/components/icons'

const SECTIONS = [
  { title: 'Basic', strategies: STRATEGY_META.filter(m => m.category === 'basic') },
  { title: 'Tough', strategies: STRATEGY_META.filter(m => m.category === 'tough') },
]

/** Where each strategy stands in the order the solver tries them. */
const PLACE = new Map(STRATEGY_META.map((meta, place) => [meta.name, place]))

/**
 * The strategies in the order the solver tries them. Each can be switched
 * off, and shows how many steps of the solve so far it has made.
 *
 * The last search is drawn down the list: a line from the top to where it
 * stopped, "no" beside every strategy it tried on the way, "yes" beside the
 * one that applied. With nothing found the line runs to the bottom.
 */
export function StrategyPanel() {
  const pending = useSolverStore(s => s.pending)
  const stalled = useSolverStore(s => s.stalled)
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

  // how far down the list the search went: to what it found, or all the way
  const foundAt = pending ? (PLACE.get(pending.name) ?? -1) : -1
  const reached = foundAt !== -1 ? foundAt : stalled ? STRATEGY_META.length : -1
  const lastPlace = STRATEGY_META.length - 1

  return (
    <section className="sd-group" id="strategies">
      <header>
        <h2>Strategies</h2>
        <span className="sd-note">{enabledStrategies.size} of {STRATEGY_META.length} on</span>
      </header>
      <p className="sd-hint">Tried from the top. The first that applies is the next step.</p>

      {SECTIONS.map((section, nth) => {
        const first = PLACE.get(section.strategies[0].name)!
        return (
          <div key={section.title} className="sd-ladder">
            {/* the line crosses a heading on its way into the section below it */}
            <h3 data-passed={nth > 0 && reached >= first ? '' : undefined} style={{ '--i': first } as CSSProperties}>
              {section.title}
            </h3>
            {section.strategies.map(meta => {
              const place = PLACE.get(meta.name)!
              const isOn = enabledStrategies.has(meta.name)
              const taken = used.get(meta.name) ?? 0
              // "off" is a strategy the search went past without trying
              const verdict = place === foundAt ? 'yes' : place < reached ? (isOn ? 'no' : 'off') : undefined
              return (
                <button
                  key={meta.name}
                  type="button"
                  role="switch"
                  aria-checked={isOn}
                  data-strategy={meta.name}
                  data-verdict={verdict}
                  data-end={stalled && place === lastPlace ? '' : undefined}
                  title={meta.summary}
                  className={`ui-check${isOn ? ' is-on' : ''}${verdict === 'yes' ? ' is-found' : ''}`}
                  style={{ '--i': place } as CSSProperties}
                  onClick={() => {
                    // what was found depends on what was switched on
                    clearSearch()
                    toggleStrategy(meta.name)
                  }}
                >
                  <i><CheckIcon /></i>
                  <span>{meta.name}</span>
                  {taken > 0 && (
                    <small title={`${taken} ${taken === 1 ? 'step' : 'steps'} of this solve`}>×{taken}</small>
                  )}
                  {(verdict === 'yes' || verdict === 'no') && (
                    <output aria-live={verdict === 'no' ? 'off' : undefined}>{verdict}</output>
                  )}
                </button>
              )
            })}
          </div>
        )
      })}
    </section>
  )
}
