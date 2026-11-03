import { useActiveInstance, useSpot } from '@/hooks/useBoardView'
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
 * Ties a pattern asks for by name, cell to cell, each from the edge of one
 * ring to the edge of the other. A chain is not confined to lines: its
 * links may run across a box.
 */
function links(pairs: ReadonlyArray<[CellIdx, CellIdx]>): string[] {
  const reach = 0.5 - RING
  return pairs.map(([a, b]) => {
    const ax = (a % 9) + 0.5, ay = Math.floor(a / 9) + 0.5
    const bx = (b % 9) + 0.5, by = Math.floor(b / 9) + 0.5
    const dx = bx - ax, dy = by - ay
    // how far along the way the line leaves a ring, which is square
    const out = reach / Math.max(Math.abs(dx), Math.abs(dy))
    const point = (x: number, y: number) => `${+x.toFixed(3)} ${+y.toFixed(3)}`
    return `M${point(ax + dx * out, ay + dy * out)}L${point(bx - dx * out, by - dy * out)}`
  })
}

/**
 * What a found step draws under the digits:
 *   1. a highlighter wash over each row, column or box the rule works in
 *   2. ties between the pattern cells: the ones the step names, or else
 *      between those in the same line; a chain's weak links are dashed
 * Rings and candidate marks are drawn by the cells themselves.
 *
 * With a part of the step picked out, only that part is drawn: the wash
 * over its own units, stronger, and the ties only with the pattern.
 */
export function BoardOverlay() {
  const instance = useActiveInstance()
  const spot = useSpot()
  if (!instance) return null

  const washed = spot ? spot.units ?? [] : instance.units
  const tied = !spot || spot.layer === 'pattern'

  return (
    <svg className="sd-overlay" viewBox="0 0 9 9" aria-hidden="true">
      {washed.map(ref => {
        const r = unitRect(ref)
        return (
          <rect
            key={`${ref.kind}${ref.index}`}
            className={spot ? 'scope is-lit' : 'scope'}
            x={r.x + 0.03} y={r.y + 0.03}
            width={r.w - 0.06} height={r.h - 0.06}
            rx={0.07}
          />
        )
      })}
      {tied && (instance.links || instance.weakLinks
        ? links(instance.links ?? [])
        : ties(instance.units, new Set(instance.patternCells))
      ).map(d => (
        <path key={d} className="tie" d={d} />
      ))}
      {tied && links(instance.weakLinks ?? []).map(d => (
        <path key={d} className="tie is-weak" d={d} />
      ))}
    </svg>
  )
}
