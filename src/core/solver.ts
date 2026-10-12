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
  bugPlusOne,
  xWing,
  uniqueRectangles,
  chuteRemotePairs,
  yWing,
  wWing,
  rectangleElimination,
  simpleColouring,
  swordfish,
  xyzWing,
  jellyfish,
} from './strategies'

type Strategy = (snapshot: Snapshot) => StratResult | null

/**
 * Ordered list of strategies from simplest to hardest.
 * The solver tries them in sequence and returns the first success.
 * The tough ones are in the order sudokuwiki.org's solver tries them.
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
      summary: 'Two cells sharing exactly two candidates: eliminate from unit peers',
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
      summary: 'Two digits that only appear in two cells: eliminate other candidates from them',
    },
  },
  {
    fn: hiddenTriples,
    meta: { name: 'Hidden Triples', category: 'basic', summary: 'Hidden set of size 3' },
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
    fn: bugPlusOne,
    meta: {
      name: 'BUG+1',
      category: 'tough',
      summary: 'One cell has three candidates, all others two: it keeps its unpaired digit',
    },
  },
  {
    fn: xWing,
    meta: {
      name: 'X-Wing',
      category: 'tough',
      summary: 'Digit locked in two rows forming a rectangle: eliminate from shared columns',
    },
  },
  {
    fn: uniqueRectangles,
    meta: {
      name: 'Unique Rectangles',
      category: 'tough',
      summary: 'Three corners of a two-box rectangle share a pair: remove it from the fourth',
    },
  },
  {
    fn: chuteRemotePairs,
    meta: {
      name: 'Chute Remote Pairs',
      category: 'tough',
      summary: 'Same pair twice in a chute, third box lacks one digit: eliminate the other',
    },
  },
  {
    fn: yWing,
    meta: {
      name: 'Y-Wing',
      category: 'tough',
      summary: 'Hinge XY sees pincers XZ and YZ: eliminate Z from cells that see both',
    },
  },
  {
    fn: wWing,
    meta: {
      name: 'W-Wing',
      category: 'tough',
      summary: 'Two identical pairs joined by a strong link: eliminate from cells that see both',
    },
  },
  {
    fn: rectangleElimination,
    meta: {
      name: 'Rectangle Elimination',
      category: 'tough',
      summary: 'Strong link plus a wing would empty a box of the digit: eliminate the wing',
    },
  },
  {
    fn: simpleColouring,
    meta: {
      name: 'Simple Colouring',
      category: 'tough',
      summary: "Chain of a digit's pairs: remove a side that cannot be true, and what sees both sides",
    },
  },
  {
    fn: nakedQuads,
    meta: { name: 'Naked Quads', category: 'tough', summary: 'Naked set of size 4' },
  },
  {
    fn: hiddenQuads,
    meta: { name: 'Hidden Quads', category: 'tough', summary: 'Hidden set of size 4' },
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
    fn: xyzWing,
    meta: {
      name: 'XYZ-Wing',
      category: 'tough',
      summary: 'Hinge XYZ sees pincers XZ and YZ: eliminate Z from cells that see all three',
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
export function findNextStrategy(snapshot: Snapshot, enabledNames?: Set<string>): StratResult | null {
  for (const { fn, meta } of STRATEGY_PIPELINE) {
    if (enabledNames && !enabledNames.has(meta.name)) continue
    const result = fn(snapshot)
    if (result !== null) return result
  }
  return null
}
