import { useSolverStore } from '@/store/solverStore'
import type { UnitRef } from '@/core/types'
import { theme } from '@/theme'

const SIZE = 540
const CELL = SIZE / 9

function unitRect(ref: UnitRef): { x: number; y: number; w: number; h: number } {
  if (ref.kind === 'row') return { x: 0, y: ref.index * CELL, w: SIZE, h: CELL }
  if (ref.kind === 'col') return { x: ref.index * CELL, y: 0, w: CELL, h: SIZE }
  return {
    x: (ref.index % 3) * 3 * CELL,
    y: Math.floor(ref.index / 3) * 3 * CELL,
    w: CELL * 3,
    h: CELL * 3,
  }
}

/**
 * Visual layers for the active instance of the pending strategy:
 *   1. Unit tint — the row/col/box the rule operates in
 *   2. Ring around each pattern cell
 * Eliminations are marked directly on the candidate digits (CandidateGrid),
 * so no arrows are needed.
 */
export function BoardOverlay() {
  const pending = useSolverStore(s => s.pending)
  const activeInstance = useSolverStore(s => s.activeInstance)
  if (!pending) return null

  const instance = pending.instances[Math.min(activeInstance, pending.instances.length - 1)]
  if (!instance) return null

  return (
    <svg className="absolute inset-0 pointer-events-none" viewBox={`0 0 ${SIZE} ${SIZE}`}>
      {instance.units.map((ref, i) => {
        const r = unitRect(ref)
        return (
          <rect
            key={`unit-${i}`}
            x={r.x + 1} y={r.y + 1}
            width={r.w - 2} height={r.h - 2}
            rx={4}
            style={{
              fill: theme.overlay.unitFill,
              stroke: theme.overlay.unitStroke,
              strokeWidth: 1,
            }}
          />
        )
      })}

      {instance.patternCells.map(cell => (
        <rect
          key={`ring-${cell}`}
          x={(cell % 9) * CELL + 2}
          y={Math.floor(cell / 9) * CELL + 2}
          width={CELL - 4}
          height={CELL - 4}
          rx={5}
          style={{
            fill: 'none',
            stroke: theme.overlay.patternStroke,
            strokeWidth: 1.6,
            filter: theme.overlay.patternGlow,
          }}
        />
      ))}
    </svg>
  )
}
