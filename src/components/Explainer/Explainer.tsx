import { useMemo, type PointerEvent, type ReactNode } from 'react'
import { useSolverStore } from '@/store/solverStore'
import { useUIStore } from '@/store/uiStore'
import { useActiveInstance } from '@/hooks/useBoardView'
import { STRATEGY_META } from '@/core/solver'
import { isSolved } from '@/core/board'
import { mentions } from '@/core/mentions'
import { unitCells } from '@/core/units'
import { cellLabel, unitsDisplayName } from '@/core/utils'
import type { CellIdx, Spot, StratInstance, StratResult, UnitRef } from '@/core/types'
import { NextIcon, PrevIcon } from '@/components/icons'

/** A pattern of more cells than this is counted, not listed. */
const LISTED_CELLS = 6

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

/**
 * The step the solver has found, under the board it is marked on: its name,
 * the reasoning in words, and a key to its marks.
 */
export function Explainer() {
  const pending = useSolverStore(s => s.pending)
  const instance = useActiveInstance()

  return (
    <section className="sd-step" id="explainer">
      {pending && instance ? <Found pending={pending} instance={instance} /> : <Waiting />}
    </section>
  )
}

/** With no step found: what to do next, or how the solve ended. */
function Waiting() {
  const stalled = useSolverStore(s => s.stalled)
  const solved = useSolverStore(s => isSolved(s.currentSnapshot()))
  const cursor = useSolverStore(s => s.cursor)
  const allEnabled = useUIStore(s => s.enabledStrategies.size === STRATEGY_META.length)

  return (
    <>
      <header>
        <h2>{solved ? 'Solved' : stalled ? 'Nothing applies' : 'Next step'}</h2>
      </header>
      {solved ? (
        <p className="sd-step-text">
          Every cell is filled, {cursor === 0 ? 'with nothing left to do' : `in ${plural(cursor, 'step')}`}.
        </p>
      ) : stalled ? (
        <p className="sd-step-text">
          {allEnabled
            ? 'None of these strategies moves this position forward. It needs one that is not built yet.'
            : 'None of the strategies that are switched on moves this position forward. Switch more of them on and look again.'}
        </p>
      ) : (
        <p className="sd-step-text">
          <b>Find next</b> goes down the strategy list and stops at the first one that
          applies. It marks what it found on the board, and <b>Apply</b> writes it in.
        </p>
      )}
    </>
  )
}

/**
 * What a control that picks a part of the step out on the board is given:
 * the part shows while the pointer is over the control, and a click holds it.
 */
function usePick() {
  const held = useUIStore(s => s.spot)
  const toggleSpot = useUIStore(s => s.toggleSpot)
  const setPeek = useUIStore(s => s.setPeek)

  return (spot: Spot) => ({
    'aria-pressed': held?.of === spot.of && held.id === spot.id,
    onClick: () => toggleSpot(spot),
    // a finger has no hover to end: it only holds
    onPointerEnter: (e: PointerEvent) => { if (e.pointerType === 'mouse') setPeek(spot) },
    onPointerLeave: () => setPeek(null),
  })
}

function Found({ pending, instance }: { pending: StratResult; instance: StratInstance }) {
  const activeInstance = useSolverStore(s => s.activeInstance)
  const setActiveInstance = useSolverStore(s => s.setActiveInstance)
  const pick = usePick()

  const meta = STRATEGY_META.find(m => m.name === pending.name)
  const count = pending.instances.length
  const idx = Math.min(activeInstance, count - 1)

  const { key, told } = useMemo(() => {
    const part = (id: string, layer: Spot['layer'], cells: Iterable<CellIdx>, units?: UnitRef[]): Spot =>
      ({ of: instance, id, layer, cells: new Set(cells), units })

    const { patternCells: pattern, solvedCells: writes, units } = instance
    const struck = instance.candidateAnnotations.filter(a => a.kind === 'eliminate')

    // each row leads with the mark it explains, drawn as it is on the board
    const key: Array<{ spot: Spot; mark: ReactNode; name: string; value: string }> = [{
      spot: part('pattern', 'pattern', pattern),
      mark: <i className="sd-mark disc" />,
      name: 'Pattern',
      value: pattern.length > LISTED_CELLS ? `${pattern.length} cells` : pattern.map(cellLabel).join(', '),
    }]
    if (writes.length > 0) key.push({
      spot: part('writes', 'writes', writes.map(s => s.cell)),
      mark: <i className="sd-mark digit">{writes[0].digit}</i>,
      name: 'Writes',
      value: writes.map(s => `${s.digit} in ${cellLabel(s.cell)}`).join(', '),
    })
    if (struck.length > 0) key.push({
      spot: part('removes', 'removes', struck.map(a => a.cell)),
      mark: <i className="sd-mark strike" />,
      name: 'Removes',
      value: plural(struck.length, 'candidate'),
    })
    if (units.length > 0) key.push({
      spot: part('scope', 'scope', units.flatMap(unitCells), units),
      mark: <i className="sd-mark wash" />,
      name: 'Looks at',
      value: unitsDisplayName(units),
    })

    // the explanation, with the cells and units it names as parts to pick out
    const told = mentions(instance.narrative).map(piece =>
      typeof piece === 'string' ? piece : part(piece.text, piece.units ? 'scope' : 'cells', piece.cells, piece.units))

    return { key, told }
  }, [instance])

  // a name said again is one stop for the Tab key, not several
  const reached = new Set<string>()

  return (
    <>
      <header>
        <h2>{pending.name}</h2>
        {meta && <p className="sd-step-rule" title={meta.summary}>{meta.summary}</p>}
        {count > 1 && (
          <div className="sd-pager" role="group" aria-label="Occurrences of this step">
            <button
              type="button"
              id="occurrence-prev"
              onClick={() => setActiveInstance(idx - 1)}
              disabled={idx === 0}
              aria-label="Previous occurrence"
            >
              <PrevIcon small />
            </button>
            <output>{idx + 1} of {count}</output>
            <button
              type="button"
              id="occurrence-next"
              onClick={() => setActiveInstance(idx + 1)}
              disabled={idx === count - 1}
              aria-label="Next occurrence"
            >
              <NextIcon small />
            </button>
          </div>
        )}
      </header>

      <p className="sd-step-text">
        {told.map((piece, i) => {
          if (typeof piece === 'string') return piece
          const again = reached.has(piece.id)
          reached.add(piece.id)
          return (
            <button
              key={i}
              type="button"
              className={piece.units ? 'sd-ref is-unit' : 'sd-ref'}
              tabIndex={again ? -1 : undefined}
              {...pick(piece)}
            >
              {piece.id}
            </button>
          )
        })}
      </p>

      <footer>
        <div className="sd-key" role="group" aria-label="Pick out on the board">
          {key.map(({ spot, mark, name, value }) => (
            <button key={spot.id} type="button" data-part={spot.id} {...pick(spot)}>
              {mark}
              <span>{name}</span>
              <b>{value}</b>
            </button>
          ))}
        </div>
        {count > 1 && <p className="sd-note">Apply takes all {count}.</p>}
      </footer>
    </>
  )
}
