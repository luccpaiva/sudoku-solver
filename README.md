# Sudoku Solver

A Sudoku solver that works the way a person does. It never guesses: it goes down a list of thirteen named strategies, simplest first, stops at the first one that applies, marks it on the board and explains it in words. The engine is plain TypeScript; the workspace around it is React.

![A guided tour of the workspace: a digit is picked to see where it can still go, hidden singles are found, stepped through and written in, a naked pair strikes candidates out, the tough strategies are switched off until the solver stalls and X-Wing gets it through, Run solves the rest, the solve path puts the board back as it stood at an earlier step, and an expert puzzle is generated](assets/demo_sudoku.webp)

## Usage

```bash
npm install
npm run dev
```

## Solver

`src/core/`. A position is a snapshot: 81 values and, for every empty cell, the digits it can still take. Nothing is changed in place. A step makes the next snapshot, so a solve is a list of them and any step can be gone back to.

- **Pipeline** — `solver.ts` tries the strategies in order and returns the first one that finds something. Any of them can be switched off; when none that is left applies, the solver stops rather than guess.
- **Occurrences** — a strategy returns every place its pattern occurs, each with its cells, the candidates it keeps and the ones it strikes, the rows, columns and boxes it reasoned over, and a sentence that explains it. One step applies them all.
- **Propagation** — a digit written into a cell is struck from that cell's row, column and box (`board.ts`).
- **Rating** — a puzzle is solved once when it is loaded, with every strategy on (`rating.ts`): the number of steps and the hardest strategy it called for, or where the strategies run out.
- **Generator** — `generator.ts` fills a grid by backtracking, then takes clues away in random order, keeping each removal only while the solution stays unique. Hard aims for 26 clues and Expert for 22; Easy and Medium come from `sudoku-gen`.

## Strategies

Thirteen, tried from the simplest; the exact order is in `solver.ts`.

| | Strategy | What it finds |
|---|----------|---------------|
| Basic | Naked Singles | A cell with one candidate left |
| Basic | Hidden Singles | A digit with one cell left in a row, column or box |
| Basic | Naked Pairs, Triples, Quads | Cells that share the same few candidates, which no other cell of the unit can then take |
| Basic | Hidden Pairs, Triples, Quads | Digits confined to the same few cells, which can then hold nothing else |
| Basic | Pointing Pairs | A digit confined to one row or column within a box |
| Basic | Box-Reduction | A digit confined to one box within a row or column |
| Tough | X-Wing | A digit confined to the same two columns in two rows, or to the same two rows in two columns |
| Tough | Swordfish | The same over three rows and columns |
| Tough | Jellyfish | The same over four |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server |
| `npm run build` | Type check and production build |
| `npm run preview` | Serve the production build |

## Project Structure

```
sudoku-solver/
├── index.html
├── src/
│   ├── main.tsx            # Entry
│   ├── App.tsx             # The workspace: puzzle and strategies, board, step and path
│   ├── core/               # The engine, no React
│   │   ├── solver.ts       # The strategy pipeline
│   │   ├── strategies/     # Singles, naked and hidden sets, intersections, fish
│   │   ├── board.ts        # Snapshots: load a puzzle, apply a step
│   │   ├── rating.ts       # What a puzzle takes to solve
│   │   ├── generator.ts    # New puzzles with one solution
│   │   └── units.ts        # Rows, columns, boxes and peers
│   ├── store/              # The solve and its history; what the view shows
│   ├── hooks/              # The board as it is drawn; stepping and Run
│   ├── components/         # Board, controls, explainer, progress, solve path
│   ├── data/               # The puzzle library
│   ├── workspace.css       # The workspace
│   └── index.css           # The page around it
└── tools/                  # export-demo.mjs
```

The Python files at the root (`main.py`, `strats/`) are the first version of the solver, a PyGame app.
