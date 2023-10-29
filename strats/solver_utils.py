import utils
from itertools import combinations


def format_naked_hidden_sets_text(result_dict, naked_hidden_set_name):
    text = []
    for conjugate, data in result_dict.items():
        candidates = "/".join(map(str, data['candidates']))
        cells = "/".join([utils.format_cell(cell) for cell in conjugate])

        # If there are common units, add them to the text
        if 'Naked' in naked_hidden_set_name:

            for unit_type, cells_to_remove_from in data['common_units'].items():
                if cells_to_remove_from:  # Check if set is not empty
                    removal_cells = ", ".join([utils.format_cell(c) for c in cells_to_remove_from])
                    unit_name = unit_type[1:]
                    text.append(
                        f"{naked_hidden_set_name} ({unit_name}): {cells} removes {candidates} from {removal_cells}")

        else:
            removal_cells = ", ".join([utils.format_cell(c) for c in conjugate])
            text.append(f"{naked_hidden_set_name} {cells} removes {candidates} from {removal_cells}")

    return text


def format_hidden_single_text(cell, hidden_single, hidden_in_units):
    """Formats the descriptive text for a found hidden single."""
    units_text = ', '.join([unit[1:] for unit in hidden_in_units])

    # If there are multiple units, use 'and' for the last one
    if len(hidden_in_units) > 1:
        last_comma_idx = units_text.rfind(',')
        units_text = units_text[:last_comma_idx] + ' and' + units_text[last_comma_idx + 1:]

    text = f"{utils.pos2cord(cell)} set to {hidden_single}. Unique in {units_text}"
    return text


def get_combinations(iterable, r):
    return combinations(iterable, r)


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


def get_common_units(all_units, *cells):
    """Return the common units for multiple cells if they exist, classified by unit type.
    example:
        cells = [(0, 0), (0, 1)]
        common_units = {
        'row': ((0, 0), (0, 1), (0, 2), (0, 3), (0, 4), ..., (0, 8)),
        'col': ((0, 0), (1, 0), (2, 0), (3, 0), (4, 0), ..., (8, 0)),
        'box': None}
    """
    # Get the unit keys for all cells
    cells_unit_keys = [get_cell_unit_keys(cell) for cell in cells]

    common_units = {unit_type: tuple() for unit_type in ['Arow', 'Bbox', 'Ccol']}

    # Iterate over each unit type

    for unit_type in ['Arow', 'Ccol', 'Bbox']:
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
