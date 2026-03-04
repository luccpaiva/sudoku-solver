from utils import format_cell, BoardType, UnitKey
import strats.solver_utils as solver_utils


def x_wing_potential(unsolved_cells: BoardType, unsolved_units) -> dict:
    """Find cells where a candidate appears in exactly 2 positions within a row or column."""
    x_wing_candidates = {}

    for unit_type, unit_cells in unsolved_units.items():
        if not unit_cells or unit_type == UnitKey.BOX:
            continue

        for unit_index, unit in unit_cells.items():
            candidates_dict = solver_utils.get_candidates_dict(unsolved_cells, unit)

            for candidate, candidate_cells_list in candidates_dict.items():
                if len(candidate_cells_list) == 2:
                    if candidate not in x_wing_candidates:
                        x_wing_candidates[candidate] = {}
                    if unit_type not in x_wing_candidates[candidate]:
                        x_wing_candidates[candidate][unit_type] = {}
                    x_wing_candidates[candidate][unit_type][unit_index] = {
                        'cells': candidate_cells_list,
                    }

    return x_wing_candidates


def x_wing_find(unsolved_cells: BoardType, unsolved_units):
    x_wing_candidates = x_wing_potential(unsolved_cells, unsolved_units)

    x_wing_results = {}

    for candidate, candidate_cells in x_wing_candidates.items():
        row_list = candidate_cells.get(UnitKey.ROW)
        col_list = candidate_cells.get(UnitKey.COL)

        if not row_list or not col_list:
            continue

        # Check if candidates in rows share the same two columns
        for current_row_index, current_cells in row_list.items():
            current_cells_list = list(current_cells['cells'])
            current_unit_keys = solver_utils.get_cell_unit_keys(current_cells_list)

            for remaining_row_index, remaining_cells in row_list.items():
                if current_row_index == remaining_row_index:
                    continue
                remaining_cells_list = list(remaining_cells['cells'])
                remaining_unit_keys = solver_utils.get_cell_unit_keys(remaining_cells_list)

                if current_unit_keys[UnitKey.COL] == remaining_unit_keys[UnitKey.COL]:
                    removal_cells = []
                    col_cells_dict = {cell: unsolved_cells[cell] for cell in unsolved_cells
                                      if cell[1] in current_unit_keys[UnitKey.COL]}
                    for cell, cell_candidates in col_cells_dict.items():
                        if candidate in cell_candidates and cell not in (current_cells_list + remaining_cells_list):
                            removal_cells.append(cell)

                    if removal_cells:
                        x_wing_results[candidate] = {
                            'unit_type': UnitKey.ROW,
                            'cols': current_unit_keys[UnitKey.COL],
                            'x_wing_cells': current_cells_list + remaining_cells_list,
                            'removal_cells': removal_cells,
                        }

        # Check if candidates in columns share the same two rows
        for current_col_index, current_cells in col_list.items():
            current_cells_list = list(current_cells['cells'])
            current_unit_keys = solver_utils.get_cell_unit_keys(current_cells_list)

            for remaining_col_index, remaining_cells in col_list.items():
                if current_col_index == remaining_col_index:
                    continue
                remaining_cells_list = list(remaining_cells['cells'])
                remaining_unit_keys = solver_utils.get_cell_unit_keys(remaining_cells_list)

                if current_unit_keys[UnitKey.ROW] == remaining_unit_keys[UnitKey.ROW]:
                    removal_cells = []
                    row_cells_dict = {cell: unsolved_cells[cell] for cell in unsolved_cells
                                      if cell[0] in current_unit_keys[UnitKey.ROW]}
                    for cell, cell_candidates in row_cells_dict.items():
                        if candidate in cell_candidates and cell not in (current_cells_list + remaining_cells_list):
                            removal_cells.append(cell)

                    if removal_cells:
                        x_wing_results[candidate] = {
                            'unit_type': UnitKey.COL,
                            'rows': current_unit_keys[UnitKey.ROW],
                            'x_wing_cells': current_cells_list + remaining_cells_list,
                            'removal_cells': removal_cells,
                        }

    return x_wing_results


def x_wing_process(x_wing_results):
    highlight_candidates = []
    eliminated_candidates = []
    highlight_cells = []
    description = []

    for candidate, result in x_wing_results.items():
        highlight_candidates.extend([(cell, candidate) for cell in result['x_wing_cells']])
        eliminated_candidates.extend([(cell, candidate) for cell in result['removal_cells']])
        highlight_cells.extend(result['x_wing_cells'])

        unit_type = result['unit_type'].value.capitalize()
        x_wing_cells = "/".join(format_cell(cell) for cell in result['x_wing_cells'])
        removal_cells = ", ".join(format_cell(cell) for cell in result['removal_cells'])
        description.append(f"X-Wing: ({unit_type} in cells {x_wing_cells}) removes {candidate} from {removal_cells}")

    return highlight_candidates, eliminated_candidates, highlight_cells, description
