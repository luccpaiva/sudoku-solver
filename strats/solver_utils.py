import time
from functools import wraps
from itertools import combinations, chain
from utils import CellType, UnitKey, UNIT_ORDER


def get_combinations(iterable, r):
    """Return r length subsequences of elements from the input iterable."""
    return combinations(iterable, r)


def get_chained_combinations(iterable, lengths):
    """Chain together multiple combination iterators of different lengths."""
    combo_iterators = [combinations(iterable, length) for length in lengths]
    return chain(*combo_iterators)


def get_cell_unit_keys(cells: list[CellType] | CellType):
    """Return the UnitKey-keyed indices for the unit(s) a cell or list of cells belong to.
    example:
        cells = (0, 0)
        unit_keys = {UnitKey.ROW: 0, UnitKey.BOX: 0, UnitKey.COL: 0}
        cells = [(0, 0), (3, 5)]
        unit_keys = {UnitKey.ROW: {0, 3}, UnitKey.BOX: {0, 1}, UnitKey.COL: {0, 5}}
    """

    def cell_to_unit_keys(cell):
        row, col = cell
        box = (row // 3) * 3 + (col // 3)
        return {UnitKey.ROW: row, UnitKey.BOX: box, UnitKey.COL: col}

    if isinstance(cells, tuple):
        return cell_to_unit_keys(cells)

    unit_keys = {UnitKey.ROW: set(), UnitKey.BOX: set(), UnitKey.COL: set()}
    for cell in cells:
        cell_keys = cell_to_unit_keys(cell)
        unit_keys[UnitKey.ROW].add(cell_keys[UnitKey.ROW])
        unit_keys[UnitKey.BOX].add(cell_keys[UnitKey.BOX])
        unit_keys[UnitKey.COL].add(cell_keys[UnitKey.COL])

    return unit_keys


def check_same_units(cells, unit_type: UnitKey):
    """Return True if all the cells belong to the same given unit type."""
    first_cell_unit = get_cell_unit_keys(cells[0])[unit_type]
    for cell in cells[1:]:
        if get_cell_unit_keys(cell)[unit_type] != first_cell_unit:
            return False
    return True


def get_common_units(unsolved_units, *cells):
    """Return the common units for multiple cells if they exist, classified by unit type.
    Iteration order follows UNIT_ORDER (ROW → BOX → COL).
    example:
        cells = [(0, 0), (0, 1)]
        common_units = {
            UnitKey.ROW: ((0, 2), (0, 3), ..., (0, 8)),
            UnitKey.BOX: ((1, 0), (2, 0), ...),
            UnitKey.COL: ()
        }
    """
    cells_unit_keys = [get_cell_unit_keys(cell) for cell in cells]
    common_units = {unit_type: tuple() for unit_type in UNIT_ORDER}

    for unit_type in UNIT_ORDER:
        unit_key = cells_unit_keys[0][unit_type]
        if all(unit_key == cell_unit_keys[unit_type] for cell_unit_keys in cells_unit_keys):
            unit_cells = unsolved_units[unit_type][unit_key]
            common_units[unit_type] = tuple(sorted(cell for cell in unit_cells if cell not in cells))
        else:
            common_units[unit_type] = tuple()

    if all(value == () for value in common_units.values()):
        return None

    return common_units


def get_candidates_dict(board, cells):
    """Return a dictionary mapping each candidate value to the cells that contain it."""
    candidates_dict = {}
    for unit_cell in cells:
        for candidate in board.get(unit_cell, []):
            candidates_dict.setdefault(candidate, []).append(unit_cell)
    return candidates_dict


class LoopCounter:
    def __init__(self):
        self.count = 0


def time_and_count_loops(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        counter = LoopCounter()
        kwargs['loop_counter'] = counter
        result = func(*args, **kwargs)
        elapsed_time = (time.time() - start_time) * 1000
        print(f"Function '{func.__name__}' took {elapsed_time:.2f} ms and {counter.count} iterations.")
        return result
    return wrapper
