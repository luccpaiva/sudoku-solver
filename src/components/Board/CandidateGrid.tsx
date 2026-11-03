import type { CellViewModel } from '@/core/types'

type Props = {
  cell: CellViewModel
  visible: boolean
  focusDigit: number | null
}

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

/**
 * Pencil marks, each digit in its own place of a 3 × 3 block. The marks of
 * a found step stay up even when the others are hidden: a filled disc for
 * the pattern, a ring for its other side where it has two, a strike for
 * what gets removed.
 */
export function CandidateGrid({ cell, visible, focusDigit }: Props) {
  if (cell.value !== null) return null

  return (
    <div className="sd-cands">
      {DIGITS.map(d => {
        const annotation = cell.candidateAnnotations.get(d)
        if (!cell.candidates.has(d) || (!visible && !annotation)) return <i key={d} />

        const state = annotation === 'highlight'
          ? ' is-pattern'
          : annotation === 'alternate'
            ? ' is-pattern is-alternate'
            : annotation === 'eliminate'
              ? ' is-removed'
              : d === focusDigit
                ? ' is-focus'
                : ''

        return <i key={d} className={`sd-cand${state}`}>{d}</i>
      })}
    </div>
  )
}
