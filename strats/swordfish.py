from utils import format_cell, BoardType
from itertools import combinations
import strats.solver_utils as solver_utils


def swordfish_potential(board: BoardType, all_units) -> dict:
    """
    The idea here is similar to X-Wing, but in a sense, reversed in terms of rows and columns.
    The main difference is that in the X-Wing, we look at a candidate that appears in exactly two rows or two columns,
    Then we just have to check whether the candidate appears in the same opposite columns or rows.

    In the Swordfish, the "Column" version, the candidate may appear in more than 3 rows, but it must appear in exactly
    3 columns. The same applies to the "Row" version, where the candidate may appear in more than 3 columns, but it must
    appear in exactly 3 rows.

    "Column" X-Wing: we eliminate the candidate from the rest of the 2 columns
    "Column" Swordfish: we eliminate the candidate from the rest of the rows.

    More interestingly, the Swordfish follows the same idea of naked/hidden triples, where the candidate doesn't have to
    appear in all cells of the unit, but it must appear in at most 3x3x3 cells.
    """

    # three possible cells for a candidate in each of three different rows
    swordfish_candidates = {}

    for unit_type, unit_cells in all_units.items():
        # skip empty and boxes
        if not unit_cells or unit_type == 'Bbox':
            continue

        for unit_index, unit in unit_cells.items():
            # Get a dictionary of candidates for each cell in the unit
            candidates_dict = solver_utils.get_candidates_dict(board, unit)

            # Create a dicionary of potential swordfish candidates in the format:
            # (candidate, unit_type, unit_index): {'cells': [cell1, cell2, cell3]}
            for candidate, candidate_cells_list in candidates_dict.items():
                if len(candidate_cells_list) <= 3:
                    if candidate not in swordfish_candidates:
                        swordfish_candidates[candidate] = {}
                    if unit_type not in swordfish_candidates[candidate]:
                        swordfish_candidates[candidate][unit_type] = {}
                    swordfish_candidates[candidate][unit_type][unit_index] = {
                        'cells': candidate_cells_list,
                    }

    return swordfish_candidates


def swordfish_find(board: BoardType, all_units):
    swordfish_candidates = swordfish_potential(board, all_units)

    swordfish_results = {}

    # Iterate through each candidate
    for candidate, candidate_cells in swordfish_candidates.items():
        row_list = candidate_cells.get('Arow', None)
        col_list = candidate_cells.get('Ccol', None)

        if not row_list or not col_list:
            continue

        # Get the column indeces
        rows_indeces = {col: set(cell[0] for cell in cells['cells']) for col, cells in col_list.items()}
        # Generate all combinations of 3 columns
        for comb in combinations(col_list.keys(), 3):
            rows_union = rows_indeces[comb[0]] | rows_indeces[comb[1]] | rows_indeces[comb[2]]
            # Check if the union fits in exactly 3 unique rows
            if len(rows_union) == 3:
                # now check whether the candidate appears in the other columns
                swordfish_cells = [(row, col) for row in rows_union for col in comb]
                removal_cells = []
                swordfish_remaining_cells = [cell for row in rows_union for cell in all_units['Arow'][row]]
                for cell in swordfish_remaining_cells:
                    if candidate in board[cell] and cell not in swordfish_cells:
                        removal_cells.append(cell)

                if removal_cells:
                    swordfish_results[candidate] = {
                        'unit_type': 'Ccol',
                        'swordfish_cells': swordfish_cells,
                        'removal_cells': removal_cells
                    }

        # Get the row indeces
        cols_indeces = {row: set(cell[1] for cell in cells['cells']) for row, cells in row_list.items()}
        # Generate all combinations of 3 rows
        for comb in combinations(row_list.keys(), 3):
            cols_union = cols_indeces[comb[0]] | cols_indeces[comb[1]] | cols_indeces[comb[2]]
            # Check if the union fits in exactly 3 unique columns
            if len(cols_union) == 3:
                # now check whether the candidate appears in the other rows
                swordfish_cells = [(row, col) for row in comb for col in cols_union]
                removal_cells = []
                swordfish_remaining_cells = [cell for col in cols_union for cell in all_units['Ccol'][col]]
                for cell in swordfish_remaining_cells:
                    if candidate in board[cell] and cell not in swordfish_cells:
                        removal_cells.append(cell)

                if removal_cells:
                    swordfish_results[candidate] = {
                        'unit_type': 'Arow',
                        'swordfish_cells': swordfish_cells,
                        'removal_cells': removal_cells
                    }

    return swordfish_results


def swordfish_process(swordfish_results):
    highlight_candidates = []
    eliminated_candidates = []
    highlight_cells = []
    description = []

    for candidate, result in swordfish_results.items():
        highlight_candidates.extend([(cell, candidate) for cell in result['swordfish_cells']])
        eliminated_candidates.extend([(cell, candidate) for cell in result['removal_cells']])
        highlight_cells.extend(result['swordfish_cells'])

        # Create description for each result
        unit_type = result['unit_type'][1:].capitalize()
        swordfish_cells = "/".join(format_cell(cell) for cell in result['swordfish_cells'])
        removal_cells = ", ".join(format_cell(cell) for cell in result['removal_cells'])
        description.append(f"Swordfish: ({unit_type} in cells {swordfish_cells}) removes {candidate} from"
                           f" {removal_cells}")

    return highlight_candidates, eliminated_candidates, highlight_cells, description
