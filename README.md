# Sudoku Solver

A Sudoku solver with a PyGame UI that applies human-like strategies step by step, helping you analyse and understand your own game.
https://github.com/user-attachments/assets/9e53b61f-5aa2-4945-ac83-784cb91ec970

## How to run

```bash
pip install -r requirements.txt
python main.py
```

## Usage

- **Click a cell** to select it and highlight its row, column, and box
- **Type a number** to fill in a cell manually
- **Space / Next Step** — find and apply the next strategy
- **Easy / Medium / Hard / Evil** — fetch a puzzle from the web
- **Load** — load a hardcoded test puzzle
- **Check** — check whether the board is solved
- **Solution Count** — count distinct solutions for the current board

## Project structure

```
sudoku-solver/
├── main.py              # Entry point
├── app_class.py         # Game controller (events, state machine, button dispatch)
├── renderer.py          # Renderer (all drawing, fonts, pygame surface)
├── board_class.py       # Board model (puzzle, solved, unsolved dicts)
├── solver_class.py      # Solver (stateless, strategy pipeline)
├── puzzle_fetcher.py    # Fetches puzzles from websudoku.com / sudoku9x9.com
├── button_class.py      # Button UI component
├── strat_handler.py     # StratHandler dataclass (strategy result container)
├── settings.py          # Constants (colours, sizes, GameState enum)
├── utils.py             # Helpers (UnitKey enum, board conversions)
├── solution_count.py    # Backtracking solver used for solution counting
├── test_boards.py       # Hardcoded puzzle strings for testing
└── strats/              # Strategy implementations
    ├── naked_singles.py
    ├── hidden_singles.py
    ├── naked_sets.py      # Naked pairs / triples / quads
    ├── hidden_sets.py     # Hidden pairs / triples / quads
    ├── intersections.py   # Pointing pairs & box reduction
    ├── x_wing.py
    ├── swordfish.py
    └── solver_utils.py    # Shared utilities (unit keys, combinations)
```

## Strategies implemented so far

| Difficulty | Strategy |
|------------|----------|
| Basic | Naked Singles, Hidden Singles |
| Basic | Naked / Hidden Pairs, Triples, Quads |
| Basic | Pointing Pairs, Box Reduction |
| Tough | X-Wing, Swordfish |
