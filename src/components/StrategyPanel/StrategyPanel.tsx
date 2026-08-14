import { STRATEGY_META } from '@/core/solver'
import { useSolverStore } from '@/store/solverStore'
import { useUIStore } from '@/store/uiStore'
import { theme } from '@/theme'

export function StrategyPanel() {
  const pending = useSolverStore(s => s.pending)
  const pendingName = pending?.name ?? null
  const pendingCount = pending?.instances.length ?? 0
  const enabledStrategies = useUIStore(s => s.enabledStrategies)
  const toggleStrategy = useUIStore(s => s.toggleStrategy)

  const basic = STRATEGY_META.filter(m => m.category === 'basic')
  const tough = STRATEGY_META.filter(m => m.category === 'tough')

  return (
    <div className="flex flex-col gap-6 text-sm">
      <Section title="Basic" strategies={basic} pendingName={pendingName} pendingCount={pendingCount} enabled={enabledStrategies} toggle={toggleStrategy} />
      <Section title="Tough" strategies={tough} pendingName={pendingName} pendingCount={pendingCount} enabled={enabledStrategies} toggle={toggleStrategy} />
    </div>
  )
}

type SectionProps = {
  title: string
  strategies: typeof STRATEGY_META
  pendingName: string | null
  pendingCount: number
  enabled: Set<string>
  toggle: (name: string) => void
}

function Section({ title, strategies, pendingName, pendingCount, enabled, toggle }: SectionProps) {
  return (
    <div>
      <p className={`${theme.strategy.sectionLabel} mb-2.5`}>
        {title}
      </p>
      <ul>
        {strategies.map(meta => {
          const isActive = meta.name === pendingName
          const isEnabled = enabled.has(meta.name)
          return (
            <li key={meta.name}>
              <button
                role="switch"
                aria-checked={isEnabled}
                title={meta.summary}
                onClick={() => toggle(meta.name)}
                className="group flex w-full items-center gap-2.5 px-1 py-[5px] text-left cursor-pointer
                           focus:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded-[var(--radius)]"
              >
                {/* Go stone — filled when the strategy is in play */}
                <span
                  aria-hidden
                  className={`h-2.5 w-2.5 shrink-0 rounded-full border transition-colors ${
                    isActive
                      ? theme.strategy.stoneActive
                      : isEnabled
                        ? theme.strategy.stoneOn
                        : theme.strategy.stoneOff
                  }`}
                />
                <span
                  className={`flex-1 text-xs transition-colors ${
                    isActive
                      ? theme.strategy.itemActive
                      : isEnabled
                        ? theme.strategy.itemEnabled
                        : theme.strategy.itemDisabled
                  }`}
                >
                  {meta.name}
                </span>
                {isActive && (
                  <span className={theme.strategy.badge}>
                    {pendingCount > 1 ? `found ×${pendingCount}` : 'found'}
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
