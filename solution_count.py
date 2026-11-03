"""How many solutions a grid has, found by backtracking.

The grid is 9 lists of 9 ints, 0 for an empty cell. The search stops once it
has found `limit` solutions: past one, the exact number rarely matters.
"""

MAX_SOLUTIONS = 10


def _candidates(grid: list[list[int]], r: int, c: int) -> set[int]:
    """The digits cell (r, c) can still take."""
    used = set(grid[r]) | {grid[i][c] for i in range(9)}
    r0, c0 = 3 * (r // 3), 3 * (c // 3)
    used |= {grid[i][j] for i in range(r0, r0 + 3) for j in range(c0, c0 + 3)}
    return set(range(1, 10)) - used


def _search(grid: list[list[int]], limit: int) -> int:
    """Count the solutions of grid, up to limit, filling it in place as it goes."""
    best, best_options = None, None
    for r in range(9):
        for c in range(9):
            if grid[r][c] == 0:
                options = _candidates(grid, r, c)
                if not options:
                    return 0
                if best_options is None or len(options) < len(best_options):
                    best, best_options = (r, c), options
    if best is None:
        return 1

    r, c = best
    found = 0
    for digit in best_options:
        grid[r][c] = digit
        found += _search(grid, limit - found)
        if found >= limit:
            break
    grid[r][c] = 0
    return found


def solution_count(grid: list[list[int]], limit: int = MAX_SOLUTIONS) -> int:
    """The number of solutions of grid, counted up to limit."""
    return _search([row[:] for row in grid], limit)


def count_solutions(grid: list[list[int]], name: str) -> int:
    """Print how many solutions grid has, under the given name, and return it."""
    found = solution_count(grid)
    shown = f"at least {found}" if found >= MAX_SOLUTIONS else str(found)
    print(f"{name}: {shown} solution{'s' if found != 1 else ''}")
    return found
