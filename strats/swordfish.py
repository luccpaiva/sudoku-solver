from utils import format_cell, BoardType, UnitKey
from itertools import combinations
import strats.solver_utils as solver_utils


def swordfish_potential(unsolved_cells: BoardType, unsolved_units) -> dict:
    """
    Find rows/columns where a candidate appears in ≤3 positions.
    Swordfish extends X-Wing to 3 rows/columns: if a candidate appears in ≤3 positions
    across exactly 3 rows, and those positions fall in exactly 3 columns (or vice versa),
    the candidate can be eliminated from all other cells in those 3 columns (or rows).
    """
    swordfish_candidates = {}

    for unit_type, unit_cells in unsolved_units.items():
        if not unit_cells or unit_type == UnitKey.BOX:
            continue

        for unit_index, unit in unit_cells.items():
            candidates_dict = solver_utils.get_candidates_dict(unsolved_cells, unit)

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


def swordfish_find(unsolved_cells: BoardType, unsolved_units):
    swordfish_candidates = swordfish_potential(unsolved_cells, unsolved_units)

    swordfish_results = {}

    for candidate, candidate_cells in swordfish_candidates.items():
        row_list = candidate_cells.get(UnitKey.ROW)
        col_list = candidate_cells.get(UnitKey.COL)

        if not row_list or not col_list:
            continue

        # Column swordfish: candidate in ≤3 rows of exactly 3 columns → eliminate from rest of those rows
        cols_indeces = {col: set(cell[0] for cell in cells['cells']) for col, cells in col_list.items()}
        for comb in combinations(col_list.keys(), 3):
            rows_union = cols_indeces[comb[0]] | cols_indeces[comb[1]] | cols_indeces[comb[2]]
            if len(rows_union) == 3:
                swordfish_cells = [(row, col) for row in rows_union for col in comb]
                removal_cells = []
                swordfish_remaining_cells = [cell for row in rows_union for cell in unsolved_units[UnitKey.ROW][row]]
                for cell in swordfish_remaining_cells:
                    if candidate in unsolved_cells[cell] and cell not in swordfish_cells:
                        removal_cells.append(cell)

                if removal_cells:
                    swordfish_results[candidate] = {
                        'unit_type': UnitKey.COL,
                        'swordfish_cells': swordfish_cells,
                        'removal_cells': removal_cells
                    }

        # Row swordfish: candidate in ≤3 columns of exactly 3 rows → eliminate from rest of those columns
        rows_indeces = {row: set(cell[1] for cell in cells['cells']) for row, cells in row_list.items()}
        for comb in combinations(row_list.keys(), 3):
            cols_union = rows_indeces[comb[0]] | rows_indeces[comb[1]] | rows_indeces[comb[2]]
            if len(cols_union) == 3:
                swordfish_cells = [(row, col) for row in comb for col in cols_union]
                removal_cells = []
                swordfish_remaining_cells = [cell for col in cols_union for cell in unsolved_units[UnitKey.COL][col]]
                for cell in swordfish_remaining_cells:
                    if candidate in unsolved_cells[cell] and cell not in swordfish_cells:
                        removal_cells.append(cell)

                if removal_cells:
                    swordfish_results[candidate] = {
                        'unit_type': UnitKey.ROW,
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

        unit_type = result['unit_type'].value.capitalize()
        swordfish_cells = "/".join(format_cell(cell) for cell in result['swordfish_cells'])
        removal_cells = ", ".join(format_cell(cell) for cell in result['removal_cells'])
        description.append(
            f"Swordfish: ({unit_type} in cells {swordfish_cells}) removes {candidate} from {removal_cells}"
        )

    return highlight_candidates, eliminated_candidates, highlight_cells, description
