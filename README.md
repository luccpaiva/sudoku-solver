# Sudoku Solver

A Sudoku solver that works the way a person does. It never guesses: it goes down a list of thirty-four named strategies, simplest first, stops at the first one that applies, marks it on the board and explains it in words. The engine is plain TypeScript; the workspace around it is React.

It is for Sudoku players who want to learn the techniques behind a solve: why each digit goes where it does, one named step at a time.

![A guided tour of the workspace: a digit is picked to see where it can still go, hidden singles are found, stepped through and written in, a naked pair strikes candidates out, the tough strategies are switched off until the solver stalls and X-Wing gets it through, Run solves the rest, the solve path puts the board back as it stood at an earlier step, and an expert puzzle is generated](assets/demo_sudoku.webp)

## Usage

```bash
npm install
npm run dev
```

## Solver

`src/core/`. A position is a snapshot: 81 values and, for every empty cell, the digits it can still take. Nothing is changed in place. A step makes the next snapshot, so a solve is a list of them and any step can be gone back to.

- **Pipeline**: `solver.ts` tries the strategies in order and returns the first one that finds something. Any of them can be switched off; when none that is left applies, the solver stops rather than guess.
- **Occurrences**: a strategy returns every place its pattern occurs, each with its cells, the candidates it keeps and the ones it strikes, the rows, columns and boxes it reasoned over, and a sentence that explains it. One step applies them all.
- **Explanation**: the sentence sits under the board. The cells and units it names (`mentions.ts`), and each mark of its key, can be pointed at or clicked: the board lights that part and dims the rest.
- **Propagation**: a digit written into a cell is struck from that cell's row, column and box (`board.ts`).
- **Library**: a puzzle for each strategy but SK Loops, for which none was found (`data/testBoards.ts`). It opens at the step where that strategy first comes in, with the steps before it already in the solve path; Reset comes back to that step.
- **Rating**: a puzzle is solved once when it is loaded, with every strategy on (`rating.ts`): the number of steps and the hardest strategy it called for, or where the strategies run out.
- **Generator**: `generator.ts` fills a grid by backtracking, then takes clues away in random order, keeping each removal only while the solution stays unique. Hard aims for 26 clues. Few clues do not make a puzzle hard, so Expert is graded by solving: puzzles are dug towards 22 clues until the strategies finish one and at least two of its steps need more than the basic strategies (singles, pairs, triples, intersections). Easy and Medium come from `sudoku-gen`.

## Strategies

Thirty-four, those of [sudokuwiki.org](https://www.sudokuwiki.org/sudoku.htm)'s solver up to its extreme ones. The solver tries them simplest first, in the site's order; the exact order is in `solver.ts`. The strategy panel groups them by family instead, the kind of reasoning they use, and a family can be switched off from its name.

**[docs/STRATEGIES.md](docs/STRATEGIES.md)** explains each one: the idea and why it holds, a step drawn from a real position, and how the code finds it. Its boards are drawn by the solver itself (`node tools/strategy-guide.mjs`).

| Family | Strategies |
|--------|------------|
| Singles | Naked Singles, Hidden Singles |
| Intersections | Pointing Pairs, Box-Reduction |
| Locked sets | Naked Pairs, Naked Triples, Hidden Pairs, Hidden Triples, Naked Quads, Hidden Quads, Fireworks, SK Loops, Twinned XY-Chains, Aligned Pair Exclusion |
| Fish | X-Wing, Swordfish, Jellyfish |
| Wings | Y-Wing, W-Wing, XYZ-Wing, WXYZ-Wing |
| Chains | Chute Remote Pairs, Rectangle Elimination, Simple Colouring, X-Cycles, XY-Chain, 3D Medusa |
| Deadly patterns | BUG+1, Unique Rectangles, Unique Rectangle Guardians (UR types 2 to 5), Avoidable Rectangles, Tridagons, Extended Rectangles, Hidden Rectangles |

The deadly patterns take it that the puzzle has exactly one solution. Avoidable Rectangles also needs to know which digits were clues.

## Tests

`npm test` runs them in Node.

| Test | What it checks |
|------|----------------|
| `strategies/*.test.ts` | Each strategy past the basic ones on the worked examples of its sudokuwiki.org article: it removes what the article says, and where it differs the test says why. Near misses that must not fire. And over a few hundred generated solves, at every position: it never removes the digit a cell ends up with |
| `solver.test.ts` | Every puzzle of the library solves, each step agreeing with the solution, and the strategy it is named for is one of the steps: the one it opens at |
| `generator.test.ts` | Expert puzzles have one solution, and the strategies finish them only with more than the basic ones |
| `mentions.test.ts` | The cells, rows, columns and boxes an explanation names are found in it, on every step of the library |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server |
| `npm run build` | Type check and production build |
| `npm run preview` | Serve the production build |
| `npm test` | Run all tests |

## Project Structure

```
sudoku-solver/
├── index.html
├── src/
│   ├── main.tsx            # Entry
│   ├── App.tsx             # The workspace: puzzle and solve path, board and step, strategies
│   ├── core/               # The engine, no React
│   │   ├── solver.ts       # The strategy pipeline
│   │   ├── strategies/     # One file a family of strategies, with its tests
│   │   ├── board.ts        # Snapshots: load a puzzle, apply a step
│   │   ├── rating.ts       # What a puzzle takes to solve
│   │   ├── generator.ts    # New puzzles with one solution
│   │   ├── units.ts        # Rows, columns, boxes and peers
│   │   ├── mentions.ts     # The cells and units an explanation names
│   │   └── testing.ts      # What the tests share: the site's board format, a soundness check
│   ├── store/              # The solve and its history; what the view shows
│   ├── hooks/              # The board as it is drawn; stepping and Run
│   ├── components/         # Board, controls, explainer, progress, solve path
│   ├── data/               # The puzzle library
│   ├── workspace.css       # The workspace
│   └── index.css           # The page around it
├── docs/                   # STRATEGIES.md, the strategy guide, and its boards
└── tools/                  # export-demo.mjs; strategy-guide.mjs draws the guide's boards
```

The Python files at the root (`main.py`, `strats/`) are the first version of the solver, a PyGame app.

## Roadmap

[ROADMAP.md](ROADMAP.md): sudokuwiki.org's extreme strategies, hints that reveal a step a little at a time, bringing your own puzzle, and a layout for phones.

## License

[MIT](LICENSE)
