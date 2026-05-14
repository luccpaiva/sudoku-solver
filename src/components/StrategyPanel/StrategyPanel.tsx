import { STRATEGY_META } from '@/core/solver'
import { useSolverStore } from '@/store/solverStore'

export function StrategyPanel() {
  const pending = useSolverStore(s => s.pending)
  const pendingName = pending?.name ?? null

  const basic = STRATEGY_META.filter(m => m.category === 'basic')
  const tough = STRATEGY_META.filter(m => m.category === 'tough')

  return (
    <div className="flex flex-col gap-6 text-sm">
      <Section title="Basic" strategies={basic} pendingName={pendingName} />
      <Section title="Tough" strategies={tough} pendingName={pendingName} />
    </div>
  )
}

type SectionProps = {
  title: string
  strategies: typeof STRATEGY_META
  pendingName: string | null
}

function Section({ title, strategies, pendingName }: SectionProps) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">
        {title}
      </p>
      <ul className="space-y-1">
        {strategies.map(meta => {
          const isActive = meta.name === pendingName
          return (
            <li
              key={meta.name}
              className={`flex items-center justify-between px-2 py-1 rounded transition-colors ${
                isActive
                  ? 'bg-emerald-900/40 text-emerald-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title={meta.summary}
            >
              <span className={isActive ? 'font-semibold' : ''}>{meta.name}</span>
              {isActive && (
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
                  found
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
