from utils import format_cell, BoardType
from itertools import combinations
import strats.solver_utils as solver_utils


def jellyfish_potential(unsolved_cells: BoardType, unsolved_units) -> dict:

    # three possible cells for a candidate in each of three different rows
    jellyfish_candidates = {}

    for unit_type, unit_cells in unsolved_units.items():
        # skip empty and boxes
        if not unit_cells or unit_type == 'Bbox':
            continue

        for unit_index, unit in unit_cells.items():
            # Get a dictionary of candidates for each cell in the unit
            candidates_dict = solver_utils.get_candidates_dict(unsolved_cells, unit)

            # Create a dicionary of potential jellyfish candidates in the format:
            # (candidate, unit_type, unit_index): {'cells': [cell1, cell2, cell3, cell4]}
            for candidate, candidate_cells_list in candidates_dict.items():
                if len(candidate_cells_list) <= 4:
                    if candidate not in jellyfish_candidates:
                        jellyfish_candidates[candidate] = {}
                    if unit_type not in jellyfish_candidates[candidate]:
                        jellyfish_candidates[candidate][unit_type] = {}
                    jellyfish_candidates[candidate][unit_type][unit_index] = {
                        'cells': candidate_cells_list,
                    }

    return jellyfish_candidates


def jellyfish_find(unsolved_cells: BoardType, unsolved_units):
    jellyfish_candidates = jellyfish_potential(unsolved_cells, unsolved_units)

    jellyfish_results = {}

    # Iterate through each candidate
    for candidate, candidate_cells in jellyfish_candidates.items():
        row_list = candidate_cells.get('Arow', None)
        col_list = candidate_cells.get('Ccol', None)

        if not row_list or not col_list:
            continue

        # Get the column indeces
        rows_indeces = {col: set(cell[0] for cell in cells['cells']) for col, cells in col_list.items()}
        # Generate all combinations of 3 columns
        for comb in combinations(col_list.keys(), 4):
            rows_union = rows_indeces[comb[0]] | rows_indeces[comb[1]] | rows_indeces[comb[2]] | rows_indeces[comb[3]]
            # Check if the union fits in exactly 4 unique rows
            if len(rows_union) == 4:
                # now check whether the candidate appears in the other columns
                jellyfish_cells = [(row, col) for row in rows_union for col in comb]
                removal_cells = []
                jellyfish_remaining_cells = [cell for row in rows_union for cell in unsolved_units['Arow'][row]]
                for cell in jellyfish_remaining_cells:
                    if candidate in unsolved_cells[cell] and cell not in jellyfish_cells:
                        removal_cells.append(cell)

                if removal_cells:
                    jellyfish_results[candidate] = {
                        'unit_type': 'Ccol',
                        'jellyfish_cells': jellyfish_cells,
                        'removal_cells': removal_cells
                    }

        # Get the row indeces
        cols_indeces = {row: set(cell[1] for cell in cells['cells']) for row, cells in row_list.items()}
        # Generate all combinations of 3 rows
        for comb in combinations(row_list.keys(), 4):
            cols_union = cols_indeces[comb[0]] | cols_indeces[comb[1]] | cols_indeces[comb[2]] | cols_indeces[comb[3]]
            # Check if the union fits in exactly 4 unique columns
            if len(cols_union) == 4:
                # now check whether the candidate appears in the other rows
                jellyfish_cells = [(row, col) for row in comb for col in cols_union]
                removal_cells = []
                jellyfish_remaining_cells = [cell for col in cols_union for cell in unsolved_units['Ccol'][col]]
                for cell in jellyfish_remaining_cells:
                    if candidate in unsolved_cells[cell] and cell not in jellyfish_cells:
                        removal_cells.append(cell)

                if removal_cells:
                    jellyfish_results[candidate] = {
                        'unit_type': 'Arow',
                        'jellyfish_cells': jellyfish_cells,
                        'removal_cells': removal_cells
                    }

    return jellyfish_results


def jellyfish_process(jellyfish_results):
    highlight_candidates = []
    eliminated_candidates = []
    highlight_cells = []
    description = []

    for candidate, result in jellyfish_results.items():
        highlight_candidates.extend([(cell, candidate) for cell in result['jellyfish_cells']])
        eliminated_candidates.extend([(cell, candidate) for cell in result['removal_cells']])
        highlight_cells.extend(result['jellyfish_cells'])

        # Create description for each result
        unit_type = result['unit_type'][1:].capitalize()
        jellyfish_cells = "/".join(format_cell(cell) for cell in result['jellyfish_cells'])
        removal_cells = ", ".join(format_cell(cell) for cell in result['removal_cells'])
        description.append(f"jellyfish: ({unit_type} in cells {jellyfish_cells}) removes {candidate} from"
                           f" {removal_cells}")

    return highlight_candidates, eliminated_candidates, highlight_cells, description
