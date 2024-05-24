from utils import format_cell, CellType, BoardType
import strats.solver_utils as solver_utils
from itertools import combinations


def x_wing_potential(board: BoardType, all_units) -> dict:
    # two possible cells for a candidate in each of two different rows
    x_wing_candidates = {}

    for unit_type, unit_cells in all_units.items():
        # skip empty and boxes
        if not unit_cells or unit_type == 'Bbox':
            continue

        for unit_index, unit in unit_cells.items():
            # Get a dictionary of candidates for each cell in the unit
            candidates_dict = solver_utils.get_candidates_dict(board, unit)

            # Create a dicionary of potential x-wing candidates in the format:
            # (candidate, unit_type, unit_index): {'cells': [cell1, cell2]}
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


def x_wing_find(board: BoardType, all_units):
    x_wing_candidates = x_wing_potential(board, all_units)

    x_wing_results = {}

    # Iterate through each candidate
    for candidate, candidate_cells in x_wing_candidates.items():
        row_list = candidate_cells.get('Arow', None)
        col_list = candidate_cells.get('Ccol', None)

        if not row_list or not col_list:
            continue

        # Check if the candidates that appear in the row are in the same columns
        current_unit_keys = []
        for current_row_index, current_cells in row_list.items():
            current_cells_list = [cell for cell in current_cells['cells']]
            current_unit_keys = solver_utils.get_cell_unit_keys(current_cells_list)

            for remaining_row_index, remaining_cells in row_list.items():
                if current_row_index == remaining_row_index:
                    continue
                remaining_cells_list = [cell for cell in remaining_cells['cells']]
                remaining_unit_keys = solver_utils.get_cell_unit_keys(remaining_cells_list)

                if current_unit_keys['Ccol'] == remaining_unit_keys['Ccol']:
                    # check whether the candidate actually appears in the columns
                    removal_cells = []
                    col_cells_dict = {cell: board[cell] for cell in board if cell[1] in current_unit_keys['Ccol']}
                    for cell, cell_candidates in col_cells_dict.items():
                        if candidate in cell_candidates and cell not in (current_cells_list + remaining_cells_list):
                            removal_cells.append(cell)

                    if removal_cells:
                        x_wing_results[candidate] = {
                            'unit_type': 'Arow',
                            'Cols': current_unit_keys['Ccol'],
                            'x_wing_cells': current_cells_list + remaining_cells_list,
                            'removal_cells': removal_cells,
                        }

        # Check if the candidates that appear in the column are in the same rows
        current_unit_keys = []
        for current_col_index, current_cells in col_list.items():
            current_cells_list = [cell for cell in current_cells['cells']]
            current_unit_keys = solver_utils.get_cell_unit_keys(current_cells_list)

            for remaining_col_index, remaining_cells in col_list.items():
                if current_col_index == remaining_col_index:
                    continue
                remaining_cells_list = [cell for cell in remaining_cells['cells']]
                remaining_unit_keys = solver_utils.get_cell_unit_keys(remaining_cells_list)

                if current_unit_keys['Arow'] == remaining_unit_keys['Arow']:
                    # check whether the candidate actually appears in the rows
                    removal_cells = []
                    row_cells_dict = {cell: board[cell] for cell in board if cell[0] in current_unit_keys['Arow']}
                    for cell, cell_candidates in row_cells_dict.items():
                        if candidate in cell_candidates and cell not in (current_cells_list + remaining_cells_list):
                            removal_cells.append(cell)

                    if removal_cells:
                        x_wing_results[candidate] = {
                            'unit_type': 'Ccol',
                            'Rows': current_unit_keys['Arow'],
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

        # Create description for each result
        unit_type = result['unit_type'][1:].capitalize()
        x_wing_cells = "/".join(format_cell(cell) for cell in result['x_wing_cells'])
        removal_cells = ", ".join(format_cell(cell) for cell in result['removal_cells'])
        description.append(f"X-wing: ({unit_type} in cells {x_wing_cells}) removes {candidate} from {removal_cells}")

    return highlight_candidates, eliminated_candidates, highlight_cells, description
