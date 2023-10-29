import strats.solver_utils as solver_utils


def naked_sets_find(board, set_size, all_units):
    valid_naked_sets = {}

    # Only consider cells with up to set_size candidates
    potential_naked_sets = [cell for cell, candidates in board.items() if
                            1 < len(candidates) <= set_size]

    for cell in potential_naked_sets:
        visible_cells_of_current_cell = solver_utils.get_common_units(all_units, cell)
        if not visible_cells_of_current_cell:
            continue

        for unit_type, unit_cells in visible_cells_of_current_cell.items():
            if not unit_cells:
                continue

            # Get all the combinations of cells within the unit (without the current cell, add it later)
            for combo in solver_utils.get_combinations(unit_cells, set_size - 1):
                cells_combination = tuple(sorted([cell] + list(combo)))
                combined_candidates = set().union(*(board.get(c, set()) for c in cells_combination))

                if len(combined_candidates) == set_size:
                    common_units = solver_utils.get_common_units(all_units, *cells_combination)
                    if common_units:
                        valid_naked_sets[cells_combination] = {
                            # 'cells': (list(format_cell(c) for c in cells_combination)),
                            'candidates': tuple(combined_candidates),
                            'common_units': common_units
                        }

    return valid_naked_sets


def naked_sets_process(board, naked_set):
    processed_naked_sets = {}
    highlight_candidates_list = []
    eliminated_candidates_list = []

    # Conjugate is another word for set
    for conjugate, data in naked_set.items():
        candidates = data['candidates']
        common_units = data['common_units']

        for unit_cells in common_units.values():
            if not unit_cells:
                continue

            candidates_eliminate = []
            for cell in unit_cells:
                for candidate in candidates:
                    if cell not in conjugate and candidate in board.get(cell, []):
                        candidates_eliminate.append((cell, candidate))

            eliminated_candidates_list.extend(candidates_eliminate)

            if not candidates_eliminate:
                continue
            else:
                processed_naked_sets[conjugate] = data

            set_cells_highlight = [
                (cell, candidate) for cell in conjugate for candidate in candidates
                if candidate in board.get(cell, [])
            ]
            highlight_candidates_list.extend(set_cells_highlight)

    return processed_naked_sets, highlight_candidates_list, eliminated_candidates_list
