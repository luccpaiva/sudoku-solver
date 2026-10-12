# Sudoku Solver

A Sudoku solver that works the way a person does. It never guesses: it goes down a list of twenty-one named strategies, simplest first, stops at the first one that applies, marks it on the board and explains it in words. The engine is plain TypeScript; the workspace around it is React.

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
- **Library**: one puzzle for each strategy (`data/testBoards.ts`). It opens at the step where that strategy first comes in, with the steps before it already in the solve path; Reset comes back to that step.
- **Rating**: a puzzle is solved once when it is loaded, with every strategy on (`rating.ts`): the number of steps and the hardest strategy it called for, or where the strategies run out.
- **Generator**: `generator.ts` fills a grid by backtracking, then takes clues away in random order, keeping each removal only while the solution stays unique. Hard aims for 26 clues. Few clues do not make a puzzle hard, so Expert is graded by solving: puzzles are dug towards 22 clues until the strategies finish one and at least two of its steps are tough ones. Easy and Medium come from `sudoku-gen`.

## Strategies

Twenty-one, tried from the simplest; the exact order is in `solver.ts`. The tough ones are those of [sudokuwiki.org](https://www.sudokuwiki.org/sudoku.htm)'s solver, in its order.

| | Strategy | What it finds |
|---|----------|---------------|
| Basic | Naked Singles | A cell with one candidate left |
| Basic | Hidden Singles | A digit with one cell left in a row, column or box |
| Basic | Naked Pairs, Triples | Cells that share the same few candidates, which no other cell of the unit can then take |
| Basic | Hidden Pairs, Triples | Digits confined to the same few cells, which can then hold nothing else |
| Basic | Pointing Pairs | A digit confined to one row or column within a box |
| Basic | Box-Reduction | A digit confined to one box within a row or column |
| Tough | BUG+1 | Every unsolved cell down to two candidates but one, with three: it keeps the digit that would be left unpaired |
| Tough | X-Wing | A digit confined to the same two columns in two rows, or to the same two rows in two columns |
| Tough | Unique Rectangles | Three corners of a rectangle in two boxes holding the same pair: the fourth is neither digit (Type 1) |
| Tough | Chute Remote Pairs | The same pair in two cells of a chute that do not see each other, with one of its digits missing from the third box |
| Tough | Y-Wing | A hinge of two candidates and two pincers that share a third digit, which goes from the cells that see both |
| Tough | W-Wing | Two cells with the same pair, joined by a unit with only two places for one of the digits |
| Tough | Rectangle Elimination | A candidate that, if true, would leave a box with nowhere for the digit |
| Tough | Simple Colouring | A chain of units with two places for a digit, its cells on two sides of which one is true |
| Tough | Naked Quads, Hidden Quads | The pairs and triples above, over four cells |
| Tough | Swordfish | An X-Wing over three rows and columns |
| Tough | XYZ-Wing | A Y-Wing whose hinge holds the third digit too |
| Tough | Jellyfish | An X-Wing over four rows and columns |

BUG+1 and Unique Rectangles take it that the puzzle has exactly one solution.

## Tests

`npm test` runs them in Node.

| Test | What it checks |
|------|----------------|
| `strategies/*.test.ts` | Each tough strategy on the worked examples of its sudokuwiki.org article: it removes what the article says. And over a few hundred generated solves, at every position: it never removes the digit a cell ends up with |
| `solver.test.ts` | Every puzzle of the library solves, each step agreeing with the solution, and the strategy it is named for is one of the steps: the one it opens at |
| `generator.test.ts` | Expert puzzles have one solution, and the strategies finish them only with the tough ones |
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
└── tools/                  # export-demo.mjs
```

The Python files at the root (`main.py`, `strats/`) are the first version of the solver, a PyGame app.
