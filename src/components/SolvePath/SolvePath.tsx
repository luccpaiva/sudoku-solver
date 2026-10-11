import { useEffect, useRef } from 'react'
import { useSolverStore } from '@/store/solverStore'

/**
 * Every step applied so far, in order. Any row takes the board back to how
 * it stood after that step; the rows after it stay, greyed, until a new step
 * replaces them.
 */
export function SolvePath() {
  const steps = useSolverStore(s => s.steps)
  const cursor = useSolverStore(s => s.cursor)
  const clues = useSolverStore(s => s.given.filter(v => v !== null).length)
  const jumpTo = useSolverStore(s => s.jumpTo)
  const list = useRef<HTMLOListElement>(null)

  // Keep the current row in sight, without scrollIntoView: that would also
  // scroll a page this workspace is embedded in.
  useEffect(() => {
    const box = list.current
    const row = box?.children[cursor]
    if (!box || !(row instanceof HTMLElement)) return
    const top = row.offsetTop - box.offsetTop
    if (top < box.scrollTop) box.scrollTop = top
    else if (top + row.offsetHeight > box.scrollTop + box.clientHeight) {
      box.scrollTop = top + row.offsetHeight - box.clientHeight
    }
  }, [cursor, steps])

  return (
    <section className="sd-pane sd-path" id="path">
      <header>
        <h2>Solve path</h2>
        {steps.length > 0 && <span className="sd-note">step {cursor} of {steps.length}</span>}
      </header>
      <ol className="sd-list" ref={list}>
        <li>
          <button
            type="button"
            data-step={0}
            className={cursor === 0 ? 'is-current' : undefined}
            aria-current={cursor === 0 ? 'step' : undefined}
            onClick={() => jumpTo(0)}
          >
            <i>0</i>
            <span>Start</span>
            <em>{clues} clues</em>
          </button>
        </li>
        {steps.map((step, i) => {
          const at = i + 1
          const state = at === cursor ? 'is-current' : at > cursor ? 'is-ahead' : undefined
          return (
            <li key={at}>
              <button
                type="button"
                data-step={at}
                className={state}
                aria-current={at === cursor ? 'step' : undefined}
                onClick={() => jumpTo(at)}
              >
                <i>{at}</i>
                <span>{step.name}</span>
                {step.placed > 0 && <em className="placed" title={`${step.placed} placed`}>{step.placed}</em>}
                {step.removed > 0 && <em className="removed" title={`${step.removed} candidates removed`}>{step.removed}</em>}
              </button>
            </li>
          )
        })}
      </ol>
      {steps.length === 0 && (
        <p className="sd-empty">Applied steps are listed here. Click one to go back to it.</p>
      )}
    </section>
  )
}
