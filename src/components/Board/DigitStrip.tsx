import { useMemo } from 'react'
import { useSolverStore } from '@/store/solverStore'
import { useUIStore } from '@/store/uiStore'
import { CheckIcon } from '@/components/icons'

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

/**
 * The nine digits under the board, each with how many of it are still to
 * be placed. Picking one shows on the board where it can still go.
 */
export function DigitStrip() {
  const values = useSolverStore(s => s.currentSnapshot().values)
  const focusDigit = useUIStore(s => s.focusDigit)
  const toggleFocusDigit = useUIStore(s => s.toggleFocusDigit)

  const left = useMemo(
    () => DIGITS.map(d => 9 - values.filter(v => v === d).length),
    [values],
  )

  return (
    <div className="sd-digits" role="group" aria-label="Show where a digit can go">
      {DIGITS.map((d, i) => (
        <button
          key={d}
          type="button"
          data-digit={d}
          aria-pressed={focusDigit === d}
          className={`${focusDigit === d ? 'is-on' : ''}${left[i] === 0 ? ' is-done' : ''}`}
          onClick={() => toggleFocusDigit(d)}
        >
          <b>{d}</b>
          {left[i] === 0 ? <CheckIcon small /> : <span>{left[i]} left</span>}
        </button>
      ))}
    </div>
  )
}
