import { useActiveInstance } from '@/hooks/useBoardView'
import type { CellIdx, UnitRef } from '@/core/types'
import { unitCells } from '@/core/units'

// Drawn in cell units: the board is 9 × 9, whatever its size on screen.

/** How far inside its cell a pattern ring sits (see `.sd-cell.is-pattern`). */
const RING = 0.04

function unitRect(ref: UnitRef): { x: number; y: number; w: number; h: number } {
  if (ref.kind === 'row') return { x: 0, y: ref.index, w: 9, h: 1 }
  if (ref.kind === 'col') return { x: ref.index, y: 0, w: 1, h: 9 }
  return { x: (ref.index % 3) * 3, y: Math.floor(ref.index / 3) * 3, w: 3, h: 3 }
}

/**
 * Ties between the pattern cells that share a row or column, ring to ring.
 * On an X-Wing they close into its rectangle.
 */
function ties(units: UnitRef[], pattern: ReadonlySet<CellIdx>): string[] {
  const paths: string[] = []
  for (const ref of units) {
    if (ref.kind === 'box') continue
    const along = unitCells(ref)
      .map((cell, place) => (pattern.has(cell) ? place : -1))
      .filter(place => place !== -1)
    for (let i = 1; i < along.length; i++) {
      const from = along[i - 1] + 1 - RING
      const to = along[i] + RING
      const across = ref.index + 0.5
      paths.push(ref.kind === 'row' ? `M${from} ${across}H${to}` : `M${across} ${from}V${to}`)
    }
  }
  return paths
}

/**
 * What a found step draws under the digits:
 *   1. a highlighter wash over each row, column or box the rule works in
 *   2. ties between the pattern cells in the same line
 * Rings and candidate marks are drawn by the cells themselves.
 */
export function BoardOverlay() {
  const instance = useActiveInstance()
  if (!instance) return null

  return (
    <svg className="sd-overlay" viewBox="0 0 9 9" aria-hidden="true">
      {instance.units.map(ref => {
        const r = unitRect(ref)
        return (
          <rect
            key={`${ref.kind}${ref.index}`}
            className="scope"
            x={r.x + 0.03} y={r.y + 0.03}
            width={r.w - 0.06} height={r.h - 0.06}
            rx={0.07}
          />
        )
      })}
      {ties(instance.units, new Set(instance.patternCells)).map(d => (
        <path key={d} className="tie" d={d} />
      ))}
    </svg>
  )
}
