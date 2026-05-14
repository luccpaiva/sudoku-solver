import { useSolverStore } from '@/store/solverStore'
import { STRATEGY_META } from '@/core/solver'

export function Explainer() {
  const pending = useSolverStore(s => s.pending)

  if (!pending) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-4 text-sm text-slate-500">
        Press <kbd className="rounded bg-slate-700 px-1 py-0.5 font-mono text-xs">Space</kbd> or{' '}
        <span className="font-semibold">Find Next</span> to discover a strategy.
      </div>
    )
  }

  const meta = STRATEGY_META.find(m => m.name === pending.name)

  return (
    <div className="rounded-lg border border-emerald-800 bg-slate-800/60 p-4 text-sm space-y-3">
      <div>
        <p className="font-bold text-emerald-300 text-base">{pending.name}</p>
        {meta && <p className="text-slate-400 mt-0.5">{meta.summary}</p>}
      </div>

      <ul className="space-y-1">
        {pending.description.map((line, i) => (
          <li key={i} className="text-slate-200 leading-snug font-mono text-xs">
            {line}
          </li>
        ))}
      </ul>

      <div className="flex gap-2 text-xs text-slate-500">
        <LegendDot color="bg-emerald-400" label="Pattern" />
        <LegendDot color="bg-amber-400" label="Eliminated" />
      </div>
    </div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`w-2 h-2 rounded-full ${color}`} />
      {label}
    </span>
  )
}
