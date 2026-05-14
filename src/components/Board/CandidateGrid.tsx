import type { CellViewModel } from '@/core/types'

type Props = {
  cell: CellViewModel
  visible: boolean
}

export function CandidateGrid({ cell, visible }: Props) {
  if (!visible || cell.value !== null) return null

  return (
    <div className="grid grid-cols-3 grid-rows-3 w-full h-full p-[1px]">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => {
        const hasCandidate = cell.candidates.has(d)
        const annotation = cell.candidateAnnotations.get(d)

        const color = annotation === 'highlight'
          ? 'text-emerald-400 font-bold'
          : annotation === 'eliminate'
            ? 'text-amber-400 font-bold'
            : 'text-slate-500'

        return (
          <span
            key={d}
            className={`flex items-center justify-center text-[0.45rem] leading-none select-none ${color}`}
          >
            {hasCandidate ? d : ''}
          </span>
        )
      })}
    </div>
  )
}
