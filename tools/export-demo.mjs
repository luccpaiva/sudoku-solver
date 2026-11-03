/**
 * Records what the portfolio's demo plays, and writes it where the demo reads it.
 *
 *   node tools/export-demo.mjs <target directory>
 *
 * The demo there is not this app. It is a page that draws a stripped copy of
 * the workspace and plays a tour over it, with no solver behind it: to run
 * the solver, one clones this repository. What the demo plays comes from
 * here. The puzzles listed below are solved with the real engine and every
 * step is written out as solve.json: what was found, how it is explained,
 * and how the board stood afterwards. Change the engine or the wording of a
 * strategy, export again, and the demo follows.
 */
import { existsSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

// What the tour plays, and how far into each solve it goes. The tour lives
// in the portfolio (demo/sudoku/tour.js); the two are changed together.
const PLAYED = [
  { puzzle: 'Naked Singles', steps: 2 },
  { puzzle: 'Naked Pairs', steps: 1 },
  { puzzle: 'X-Wing', steps: Infinity },
  // one puzzle from the generator, shown but not solved; seeded so that an
  // export made twice writes the same file
  { generate: 'expert', seed: 20261008, steps: 0 },
]

/** A pattern of more cells than this is counted, not listed (as in Explainer.tsx). */
const LISTED_CELLS = 6

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const target = process.argv[2] && resolve(process.argv[2])

if (!target || !existsSync(target)) {
  console.error('Usage: node tools/export-demo.mjs <target directory>')
  if (target) console.error(`No such directory: ${target}`)
  process.exit(1)
}

// The engine is TypeScript; Vite loads it here the way it does for the app.
const vite = await createServer({
  root,
  logLevel: 'error',
  appType: 'custom',
  server: { middlewareMode: true, hmr: false, watch: null },
})

try {
  const { TEST_BOARDS } = await vite.ssrLoadModule('/src/data/testBoards.ts')
  const { loadPuzzle, applyStratResult, isSolved } = await vite.ssrLoadModule('/src/core/board.ts')
  const { findNextStrategy, STRATEGY_META } = await vite.ssrLoadModule('/src/core/solver.ts')
  const { ratePuzzle } = await vite.ssrLoadModule('/src/core/rating.ts')
  const { generatePuzzle } = await vite.ssrLoadModule('/src/core/generator.ts')
  const { cellLabel, unitsDisplayName, serializeValues } = await vite.ssrLoadModule('/src/core/utils.ts')

  // a board as the demo draws it: 81 characters, and each cell's candidates as bits 1 to 9
  const board = snapshot => ({
    values: serializeValues(snapshot.values),
    candidates: snapshot.candidates.map(set => [...set].reduce((bits, d) => bits | (1 << (d - 1)), 0)),
  })

  const occurrence = instance => {
    const removed = instance.candidateAnnotations.filter(a => a.kind === 'eliminate')
    return {
      cells: instance.patternCells,
      // [cell, digit, 1 for part of the pattern, 2 for its other side, 0 for struck out]
      marks: instance.candidateAnnotations.map(a => [a.cell, a.digit, a.kind === 'highlight' ? 1 : a.kind === 'alternate' ? 2 : 0]),
      // ties between pattern cells, where the pattern names its own
      ...(instance.links ? { links: instance.links } : {}),
      units: instance.units.map(unit => [unit.kind, unit.index]),
      narrative: instance.narrative,
      // the rows of the key beside the board, worded as the app words them
      pattern: instance.patternCells.length > LISTED_CELLS
        ? `${instance.patternCells.length} cells`
        : instance.patternCells.map(cellLabel).join(', '),
      writes: instance.solvedCells.map(s => `${s.digit} in ${cellLabel(s.cell)}`).join(', '),
      writesDigit: instance.solvedCells[0]?.digit ?? null,
      removes: removed.length,
      scope: unitsDisplayName(instance.units),
    }
  }

  const record = (name, input, limit) => {
    const { given, snapshot: start } = loadPuzzle(input)
    const steps = []
    let snapshot = start
    while (steps.length < limit && !isSolved(snapshot)) {
      const result = findNextStrategy(snapshot)
      if (!result) break
      snapshot = applyStratResult(snapshot, result)
      steps.push({
        name: result.name,
        placed: new Set(result.instances.flatMap(i => i.solvedCells.map(s => s.cell))).size,
        removed: new Set(result.instances.flatMap(i =>
          i.candidateAnnotations.filter(a => a.kind === 'eliminate').map(a => `${a.cell}:${a.digit}`))).size,
        occurrences: result.instances.map(occurrence),
        after: board(snapshot),
      })
    }
    return {
      name,
      clues: given.filter(v => v !== null).length,
      rating: ratePuzzle(start),
      start: board(start),
      steps,
    }
  }

  // the generator draws on Math.random; for the length of one call it is given a seeded one
  const seeded = (seed, make) => {
    const random = Math.random
    let state = seed >>> 0
    Math.random = () => {
      state = (state + 0x6d2b79f5) >>> 0
      let t = state
      t = Math.imul(t ^ (t >>> 15), t | 1)
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
    try {
      return make()
    } finally {
      Math.random = random
    }
  }

  const puzzles = PLAYED.map(({ puzzle, generate, seed, steps }) => {
    if (generate) return record(`Generated, ${generate}`, seeded(seed, () => generatePuzzle(generate)), steps)
    const found = TEST_BOARDS.find(b => b.name === puzzle)
    if (!found) throw new Error(`No library puzzle called ${puzzle}`)
    return record(found.name, found.puzzle, steps)
  })

  const data = {
    strategies: STRATEGY_META,
    library: TEST_BOARDS.map(b => b.name),
    puzzles,
  }

  const file = join(target, 'solve.json')
  writeFileSync(file, JSON.stringify(data) + '\n')

  console.log(`Wrote ${file} (${Math.round(statSync(file).size / 1024)} kB)`)
  for (const p of puzzles) {
    const end = p.steps.length === p.rating.steps ? 'to the end' : `of ${p.rating.steps}`
    console.log(`  ${p.name}: ${p.clues} clues, ${p.steps.length} steps ${end}, hardest ${p.rating.hardest ?? 'none'}`)
  }
} finally {
  await vite.close()
}
