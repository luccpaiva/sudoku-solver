import type { CellViewModel } from '@/core/types'
import { theme } from '@/theme'

type Props = {
  cell: CellViewModel
  visible: boolean
}

export function CandidateGrid({ cell, visible }: Props) {
  if (!visible || cell.value !== null) return null

  return (
    <div className="absolute inset-0">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => {
        if (!cell.candidates.has(d)) return null

        const row = Math.floor((d - 1) / 3)
        const col = (d - 1) % 3
        const annotation = cell.candidateAnnotations.get(d)

        const color = annotation === 'highlight'
          ? theme.candidate.highlight
          : annotation === 'eliminate'
            ? theme.candidate.eliminate
            : theme.candidate.normal

        return (
          <span
            key={d}
            style={{
              position: 'absolute',
              left: `${(col / 3 + 1 / 6) * 100}%`,
              top: `${(row / 3 + 1 / 6) * 100}%`,
              transform: 'translate(-50%, -50%)',
            }}
            className={`flex h-4 w-4 items-center justify-center font-cand text-[0.8rem] leading-none select-none ${color}`}
          >
            {d}
            {annotation === 'highlight' && (
              <span
                aria-hidden
                className={`absolute inset-0 rotate-[4deg] rounded-[48%_52%_50%_46%] ${theme.candidate.patternRing}`}
              />
            )}
            {annotation === 'eliminate' && (
              <span
                aria-hidden
                className={`absolute left-1/2 top-1/2 h-px w-[1.15em] -translate-x-1/2 -translate-y-1/2 -rotate-45 ${theme.candidate.eliminateSlash}`}
              />
            )}
          </span>
        )
      })}
    </div>
  )
}
