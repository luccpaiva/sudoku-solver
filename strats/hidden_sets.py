from utils import format_cell
import strats.solver_utils as solver_utils


def hidden_sets_find(board, set_size, all_units):
    valid_hidden_sets = {}

    for current_cell in board:
        common_units = solver_utils.get_common_units(all_units, current_cell)

        # Store for each candidate the cells where it appears
        for unit_type, unit_cells in common_units.items():
            if not unit_cells:
                continue

            candidates_dict = solver_utils.get_candidates_dict(board, unit_cells)

            # Include also the current cell candidates
            for candidate in board.get(current_cell, []):
                candidates_dict.setdefault(candidate, []).append(current_cell)

            # Get the candidates that appear in up to set_size cells
            potential_hidden_sets = {}
            for candidate, cells in candidates_dict.items():
                if len(cells) <= set_size:
                    potential_hidden_sets.setdefault(candidate, []).append(cells)

            combined_sets = {}
            for candidate_combo in solver_utils.combinations(potential_hidden_sets.keys(), set_size):
                merged_cells = set()
                for candidate in candidate_combo:
                    cells_lists = potential_hidden_sets[candidate]
                    for cells in cells_lists:
                        merged_cells.update(cells)
                        combined_sets[candidate_combo] = tuple(sorted(merged_cells))

                # Check each combination of candidates of size set_size
            for combined_candidates, cells in combined_sets.items():

                # Check if the overall sum of candidates in unit is higher than set_size, otherwise not hidden set
                overall_candidates = set().union(*(board.get(c, set()) for c in cells))
                if len(cells) == set_size and len(overall_candidates) > set_size:
                    valid_hidden_sets[cells] = {
                        'candidates': tuple(combined_candidates),
                        'common_units': cells,
                    }

    return valid_hidden_sets


def hidden_sets_process(board, hidden_set):
    highlight_candidates_list = []
    eliminated_candidates_list = []

    for conjugate_cells, data in hidden_set.items():
        hidden_set_candidates = set(data['candidates'])
        common_units = data['common_units']

        for cell in common_units:
            cell_possibles = set(board.get(cell, []))

            candidates_eliminate = cell_possibles - hidden_set_candidates
            eliminated_candidates_list.extend((cell, candidate) for candidate in candidates_eliminate)

            highlight_candidates = cell_possibles & hidden_set_candidates
            highlight_candidates_list.extend((cell, candidate) for candidate in highlight_candidates)

    return highlight_candidates_list, eliminated_candidates_list


def format_hidden_sets_text(result_dict, naked_hidden_set_name):
    text = []
    for conjugate, data in result_dict.items():
        cells = "/".join([format_cell(cell) for cell in conjugate])

        removal_cells = ", ".join([format_cell(c) for c in conjugate])
        text.append(f"{naked_hidden_set_name} {cells} removes remaining candidates from {removal_cells}")

    return text
