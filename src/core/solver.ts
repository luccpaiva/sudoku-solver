import type { Snapshot, StratResult, StrategyMeta } from './types'
import {
  nakedSingles,
  hiddenSingles,
  nakedPairs,
  nakedTriples,
  nakedQuads,
  hiddenPairs,
  hiddenTriples,
  hiddenQuads,
  pointingPairs,
  boxReduction,
  xWing,
  swordfish,
  jellyfish,
} from './strategies'

type Strategy = (snapshot: Snapshot) => StratResult | null

/**
 * Ordered list of strategies from simplest to hardest.
 * The solver tries them in sequence and returns the first success.
 */
const STRATEGY_PIPELINE: Array<{ fn: Strategy; meta: StrategyMeta }> = [
  {
    fn: nakedSingles,
    meta: { name: 'Naked Singles', category: 'basic', summary: 'Cell with only one candidate' },
  },
  {
    fn: hiddenSingles,
    meta: {
      name: 'Hidden Singles',
      category: 'basic',
      summary: 'Digit that can only go in one cell within a unit',
    },
  },
  {
    fn: nakedPairs,
    meta: {
      name: 'Naked Pairs',
      category: 'basic',
      summary: 'Two cells sharing exactly two candidates — eliminate from unit peers',
    },
  },
  {
    fn: nakedTriples,
    meta: {
      name: 'Naked Triples',
      category: 'basic',
      summary: 'Three cells sharing exactly three candidates',
    },
  },
  {
    fn: hiddenPairs,
    meta: {
      name: 'Hidden Pairs',
      category: 'basic',
      summary: 'Two digits that only appear in two cells — eliminate other candidates from them',
    },
  },
  {
    fn: hiddenTriples,
    meta: { name: 'Hidden Triples', category: 'basic', summary: 'Hidden set of size 3' },
  },
  {
    fn: nakedQuads,
    meta: { name: 'Naked Quads', category: 'basic', summary: 'Naked set of size 4' },
  },
  {
    fn: hiddenQuads,
    meta: { name: 'Hidden Quads', category: 'basic', summary: 'Hidden set of size 4' },
  },
  {
    fn: pointingPairs,
    meta: {
      name: 'Pointing Pairs',
      category: 'basic',
      summary: 'Digit confined to one row/col within a box',
    },
  },
  {
    fn: boxReduction,
    meta: {
      name: 'Box-Reduction',
      category: 'basic',
      summary: 'Digit confined to one box within a row/col',
    },
  },
  {
    fn: xWing,
    meta: {
      name: 'X-Wing',
      category: 'tough',
      summary: 'Digit locked in two rows forming a rectangle — eliminate from shared columns',
    },
  },
  {
    fn: swordfish,
    meta: {
      name: 'Swordfish',
      category: 'tough',
      summary: 'X-Wing extended to three rows/columns',
    },
  },
  {
    fn: jellyfish,
    meta: {
      name: 'Jellyfish',
      category: 'tough',
      summary: 'X-Wing extended to four rows/columns',
    },
  },
]

export const STRATEGY_META: StrategyMeta[] = STRATEGY_PIPELINE.map(s => s.meta)

/**
 * Run strategies in order and return the first one that finds something.
 * Returns null if no strategy can make progress.
 */
export function findNextStrategy(snapshot: Snapshot): StratResult | null {
  for (const { fn } of STRATEGY_PIPELINE) {
    const result = fn(snapshot)
    if (result !== null) return result
  }
  return null
}
