import utils
import strats.solver_utils as solver_utils


def hidden_singles(board, all_units):
    """Find hidden singles in the puzzle."""

    h_singles = []
    h_singles_text = []

    for cell, possibles in board.items():
        visible_cells_of_current_cell = solver_utils.get_common_units(all_units, cell)
        if not visible_cells_of_current_cell:
            continue

        hidden_in_units = []  # Store the unit (row, column or box) where the cell is a hidden single
        hidden_single = None

        for unit_type, unit_cells in visible_cells_of_current_cell.items():
            if not unit_cells:
                continue

            possibles_in_unit = set()
            for unit_cell in unit_cells:
                possibles_in_unit.update(board.get(unit_cell, set()))

            potential_hidden_single = possibles - possibles_in_unit
            if len(potential_hidden_single) == 1:
                hidden_single = potential_hidden_single.pop()
                hidden_in_units.append(unit_type)

        if hidden_in_units:
            h_singles.append((cell, hidden_single))
            text = utils.format_hidden_single_text(cell,
                                                   hidden_single,
                                                   hidden_in_units) if hidden_in_units else None
            h_singles_text.append(text)

    return h_singles, h_singles_text
