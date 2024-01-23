import time
from functools import wraps
from itertools import combinations, chain


def get_combinations(iterable, r):
    """Return r length subsequences of elements from the input iterable."""
    return combinations(iterable, r)


def get_chained_combinations(iterable, lengths):
    """Chain together multiple combination iterators of different lengths."""

    combo_iterators = [combinations(iterable, length) for length in lengths]

    # Chain all iterators into a single iterator and return it
    return chain(*combo_iterators)


def get_cell_unit_keys(cell):
    """Return the keys for the units the cell belongs to.
    example:
        cell = (0, 0)
        unit_keys = {'row': 0, 'col': 0, 'box': 0}
        cell = (3, 5)
        unit_keys = {'row': 3, 'col': 5, 'box': 1}
    """
    row, col = cell
    box = (row // 3) * 3 + (col // 3)
    return {'Arow': row, 'Bbox': box, 'Ccol': col}


def check_same_units(cells, unit_type):
    """Return True if all the cells belong to the same given unit type."""
    first_cell_unit = get_cell_unit_keys(cells[0])[unit_type]
    for cell in cells[1:]:
        if get_cell_unit_keys(cell)[unit_type] != first_cell_unit:
            return False

    return True


def get_common_units(all_units, *cells):
    """Return the common units for multiple cells if they exist, classified by unit type.
    Since now dictionaries are ordered, we want the box to be row to be checked first, hence _A_row, _B_box...
    example:
        cells = [(0, 0), (0, 1)]
        common_units = {
        'Arow': ((0, 0), (0, 1), (0, 2), (0, 3), (0, 4), ..., (0, 8)),
        'Bbox': ((0, 0), (1, 0), (2, 0), (3, 0), (4, 0), ..., (8, 0)),
        'Ccol': None}
    """
    # Get the unit keys for all cells
    cells_unit_keys = [get_cell_unit_keys(cell) for cell in cells]

    common_units = {unit_type: tuple() for unit_type in ['Arow', 'Bbox', 'Ccol']}

    # Iterate over each unit type

    for unit_type in ['Arow', 'Bbox', 'Ccol']:
        # Check if all cells belong to the same unit for the current unit type
        unit_key = cells_unit_keys[0][unit_type]
        if all(unit_key == cell_unit_keys[unit_type] for cell_unit_keys in cells_unit_keys):
            unit_cells = all_units[unit_type][unit_key]
            common_units[unit_type] = tuple(sorted(cell for cell in unit_cells if cell not in cells))
        else:
            common_units[unit_type] = None

    # If all the units are None, there are no common units among the cells
    if all(value is None or value == () for value in common_units.values()):
        return None

    return common_units


def get_candidates_dict(board, cells):
    """Return a dictionary containing the candidates for the list of cells."""
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
        # Create a counter and inject it into kwargs
        counter = LoopCounter()
        kwargs['loop_counter'] = counter
        result = func(*args, **kwargs)
        elapsed_time = (time.time() - start_time) * 1000
        print(f"Function '{func.__name__}' took {elapsed_time:.2f} ms and {counter.count} iterations.")
        return result

    return wrapper
