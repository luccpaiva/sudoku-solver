import { useMemo, type CSSProperties } from 'react'
import { FAMILIES, STRATEGY_META } from '@/core/solver'
import { useSolverStore } from '@/store/solverStore'
import { useUIStore } from '@/store/uiStore'
import { CheckIcon } from '@/components/icons'

/** Where each strategy stands in the order the solver tries them. */
const PLACE = new Map(STRATEGY_META.map((meta, place) => [meta.name, place]))

/** The families, each with its strategies in the order they are tried. */
const SECTIONS = FAMILIES.map(name => ({
  name,
  strategies: STRATEGY_META.filter(meta => meta.family === name),
})).filter(section => section.strategies.length > 0)

/** The bottom of the list, where a search that found nothing is closed off. */
const LAST_SHOWN = SECTIONS[SECTIONS.length - 1].strategies.at(-1)!.name

/**
 * The strategies, family by family. Each can be switched off, a whole family
 * from its heading, and shows how many steps of the solve so far it has made.
 *
 * The solver does not go down this list: it tries the strategies simplest
 * first, whatever their family. The last search is drawn in that order, one
 * strategy after another: a mark in the margin and "no" beside each one it
 * tried, "yes" and a dot beside the one that applied. With nothing found
 * every strategy is marked, and an empty ring closes the list.
 */
export function StrategyPanel() {
  const pending = useSolverStore(s => s.pending)
  const stalled = useSolverStore(s => s.stalled)
  const steps = useSolverStore(s => s.steps)
  const cursor = useSolverStore(s => s.cursor)
  const clearSearch = useSolverStore(s => s.clearSearch)
  const enabledStrategies = useUIStore(s => s.enabledStrategies)
  const toggleStrategy = useUIStore(s => s.toggleStrategy)
  const setStrategies = useUIStore(s => s.setStrategies)

  const used = useMemo(() => {
    const counts = new Map<string, number>()
    for (const step of steps.slice(0, cursor)) counts.set(step.name, (counts.get(step.name) ?? 0) + 1)
    return counts
  }, [steps, cursor])

  // how far the search went, in the order it tries them: to what it found, or all the way
  const foundAt = pending ? (PLACE.get(pending.name) ?? -1) : -1
  const reached = foundAt !== -1 ? foundAt : stalled ? STRATEGY_META.length : -1

  return (
    <section className="sd-group" id="strategies" style={{ '--last': STRATEGY_META.length } as CSSProperties}>
      <header>
        <h2>Strategies</h2>
        <span className="sd-note">{enabledStrategies.size} of {STRATEGY_META.length} on</span>
      </header>
      <p className="sd-hint">Tried simplest first, whatever the family. The first that applies is the next step.</p>

      {SECTIONS.map(section => {
        const names = section.strategies.map(meta => meta.name)
        const allOn = names.every(name => enabledStrategies.has(name))
        return (
          <div key={section.name} className="sd-ladder">
            <h3>
              <button
                type="button"
                title={`Switch every ${section.name.toLowerCase()} strategy ${allOn ? 'off' : 'on'}`}
                onClick={() => {
                  clearSearch()
                  setStrategies(names, !allOn)
                }}
              >
                {section.name}
              </button>
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
                  data-end={stalled && meta.name === LAST_SHOWN ? '' : undefined}
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
