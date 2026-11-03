import type { Snapshot, StratResult, StrategyCategory, StrategyFamily, StrategyMeta } from './types'
import { applyStratResult } from './board'
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
  xCycles,
  xyChain,
  medusa,
  uniqueRectangleGuardians,
  avoidableRectangles,
  tridagons,
  extendedRectangles,
  hiddenRectangles,
  fireworks,
  skLoops,
  twinnedXyChains,
  wxyzWing,
  alignedPairExclusion,
} from './strategies'

type Strategy = (snapshot: Snapshot) => StratResult | null

type Entry = { fn: Strategy; meta: StrategyMeta }

function entry(
  fn: Strategy,
  name: string,
  category: StrategyCategory,
  family: StrategyFamily,
  summary: string,
): Entry {
  return { fn, meta: { name, category, family, summary } }
}

/**
 * The families, in the order the strategy panel and the guide list them.
 * Each lists its strategies in the order they are tried.
 */
export const FAMILIES: ReadonlyArray<StrategyFamily> = [
  'Singles',
  'Intersections',
  'Locked sets',
  'Fish',
  'Wings',
  'Chains',
  'Deadly patterns',
]

/**
 * The strategies from simplest to hardest: the order of sudokuwiki.org's
 * solver, except that triples come before the intersections here, as they
 * always have in this app. The solver tries them in sequence and returns
 * the first success. The category is the site's tier, which the rating and
 * the expert generator go by.
 */
const STRATEGY_PIPELINE: Entry[] = [
  entry(nakedSingles, 'Naked Singles', 'basic', 'Singles', 'Cell with only one candidate'),
  entry(hiddenSingles, 'Hidden Singles', 'basic', 'Singles', 'Digit that can only go in one cell within a unit'),
  entry(nakedPairs, 'Naked Pairs', 'basic', 'Locked sets', 'Two cells sharing exactly two candidates: eliminate from unit peers'),
  entry(nakedTriples, 'Naked Triples', 'basic', 'Locked sets', 'Three cells sharing exactly three candidates'),
  entry(hiddenPairs, 'Hidden Pairs', 'basic', 'Locked sets', 'Two digits that only appear in two cells: eliminate other candidates from them'),
  entry(hiddenTriples, 'Hidden Triples', 'basic', 'Locked sets', 'Hidden set of size 3'),
  entry(pointingPairs, 'Pointing Pairs', 'basic', 'Intersections', 'Digit confined to one row/col within a box'),
  entry(boxReduction, 'Box-Reduction', 'basic', 'Intersections', 'Digit confined to one box within a row/col'),

  entry(bugPlusOne, 'BUG+1', 'tough', 'Deadly patterns', 'One cell has three candidates, all others two: it keeps its unpaired digit'),
  entry(xWing, 'X-Wing', 'tough', 'Fish', 'Digit locked in two rows forming a rectangle: eliminate from shared columns'),
  entry(uniqueRectangles, 'Unique Rectangles', 'tough', 'Deadly patterns', 'Three corners of a two-box rectangle share a pair: remove it from the fourth'),
  entry(chuteRemotePairs, 'Chute Remote Pairs', 'tough', 'Chains', 'Same pair twice in a chute, third box lacks one digit: eliminate the other'),
  entry(yWing, 'Y-Wing', 'tough', 'Wings', 'Hinge XY sees pincers XZ and YZ: eliminate Z from cells that see both'),
  entry(wWing, 'W-Wing', 'tough', 'Wings', 'Two identical pairs joined by a strong link: eliminate from cells that see both'),
  entry(rectangleElimination, 'Rectangle Elimination', 'tough', 'Chains', 'Strong link plus a wing would empty a box of the digit: eliminate the wing'),
  entry(simpleColouring, 'Simple Colouring', 'tough', 'Chains', "Chain of a digit's pairs: remove a side that cannot be true, and what sees both sides"),
  entry(nakedQuads, 'Naked Quads', 'tough', 'Locked sets', 'Naked set of size 4'),
  entry(hiddenQuads, 'Hidden Quads', 'tough', 'Locked sets', 'Hidden set of size 4'),
  entry(swordfish, 'Swordfish', 'tough', 'Fish', 'X-Wing extended to three rows/columns'),
  entry(xyzWing, 'XYZ-Wing', 'tough', 'Wings', 'Hinge XYZ sees pincers XZ and YZ: eliminate Z from cells that see all three'),

  entry(xCycles, 'X-Cycles', 'diabolical', 'Chains', "One digit's loop of strong and weak links: remove along it, or settle its odd cell"),
  entry(xyChain, 'XY-Chain', 'diabolical', 'Chains', 'Chain of two-candidate cells whose ends share Z: eliminate Z from cells that see both'),
  entry(medusa, '3D Medusa', 'diabolical', 'Chains', 'Web of pairs across digits: remove a side that cannot be true, and what both sides rule out'),
  entry(jellyfish, 'Jellyfish', 'diabolical', 'Fish', 'X-Wing extended to four rows/columns'),
  entry(uniqueRectangleGuardians, 'Unique Rectangle Guardians', 'diabolical', 'Deadly patterns', 'Unique Rectangle types 2 to 5: where the guardians of a deadly rectangle must go'),
  entry(avoidableRectangles, 'Avoidable Rectangles', 'diabolical', 'Deadly patterns', 'Solved non-clue corners must not finish a swappable rectangle: remove the digit that would'),
  entry(tridagons, 'Tridagons', 'diabolical', 'Deadly patterns', 'Three digits on slants in four boxes, one slant odd out: no solution, so a guardian is true'),
  entry(fireworks, 'Fireworks', 'diabolical', 'Locked sets', 'Digits a row and column can only put in their crossing or one cell each: a locked set'),
  entry(skLoops, 'SK Loops', 'diabolical', 'Locked sets', 'Eight pairs round four solved corners hold exactly their digits: remove them elsewhere'),
  entry(twinnedXyChains, 'Twinned XY-Chains', 'diabolical', 'Locked sets', 'Six cells, two lines by three, hold six confined digits: remove what sees all of one'),
  entry(extendedRectangles, 'Extended Rectangles', 'diabolical', 'Deadly patterns', 'Six cells in three boxes share three digits: the cell with extras loses the three'),
  entry(hiddenRectangles, 'Hidden Rectangles', 'diabolical', 'Deadly patterns', 'Rectangle with a two-candidate corner, held by strong links: remove what would close it'),
  entry(wxyzWing, 'WXYZ-Wing', 'diabolical', 'Wings', 'Four cells, four digits in two crossing units: eliminate Z from cells that see every Z'),
  entry(alignedPairExclusion, 'Aligned Pair Exclusion', 'diabolical', 'Locked sets', 'Two cells whose digit pairs would starve a set they both see: remove digits left unpaired'),
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

/** Every step places a digit or removes a candidate, so 729 is a hard ceiling. */
export const MAX_STEPS = 729

/**
 * The steps of a solve that come before a strategy's first turn: with them
 * applied, that strategy is the next one found. Null when the solve never
 * calls on it.
 */
export function stepsBefore(start: Snapshot, name: string): StratResult[] | null {
  const taken: StratResult[] = []
  let snapshot = start

  for (let step = 0; step < MAX_STEPS; step++) {
    const result = findNextStrategy(snapshot)
    if (!result) break
    if (result.name === name) return taken
    taken.push(result)
    snapshot = applyStratResult(snapshot, result)
  }

  return null
}
