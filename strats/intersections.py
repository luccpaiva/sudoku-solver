from utils import format_cell
import strats.solver_utils as solver_utils


def intersections_find(board, all_units):
    box_reductions = {}
    pointing_pairs = {}

    for unit_type, unit_cells in all_units.items():
        # skip the box because it's already checked against the other units
        if not unit_cells or unit_type == 'Bbox':
            continue

        for unit_index, unit in unit_cells.items():
            # Get a dictionary of candidates for each cell in the unit
            candidates_dict = solver_utils.get_candidates_dict(board, unit)

            for candidate, candidate_cells_list in candidates_dict.items():
                # Get all combinations of 2 or 3 cells from the candidate cells
                cells_combinations = list(solver_utils.get_chained_combinations(candidate_cells_list,
                                                                                [2, 3]))

                for combination in cells_combinations:
                    # Check if the combination is in the same box
                    if solver_utils.check_same_units(combination, 'Bbox'):
                        box_index = solver_utils.get_cell_unit_keys(combination[0])['Bbox']
                        cells_in_current_box = [cell for cell in all_units['Bbox'][box_index] if
                                                cell not in combination]

                        # Find which cells in the box have the current candidate
                        candidate_box_cells = [cell for cell in cells_in_current_box if
                                               candidate in board.get(cell, [])]

                        # Candidate does not appear in the line (box-reduction)
                        if candidate_box_cells and len(candidate_cells_list) == len(combination):
                            box_reductions[combination] = {
                                'unit_type': unit_type,
                                'unit_index': unit_index,
                                'candidate': candidate,
                                'cells': candidate_box_cells,
                                'box': box_index,
                            }

                        # Candidate appears outside the the box (pointing pair)
                        elif not candidate_box_cells and len(candidate_cells_list) > len(combination):
                            pointing_pairs[combination] = {
                                'unit_type': unit_type,
                                'unit_index': unit_index,
                                'candidate': candidate,
                                'cells': [cell for cell in candidate_cells_list if cell not in combination],
                                'box': box_index,
                            }

    return pointing_pairs, box_reductions


def intersections_process(i_removals):
    highlight_candidates_list = []
    eliminated_candidates_list = []

    for conjugate_cells, data in i_removals.items():
        highlight_candidates_list.extend((cell, data['candidate']) for cell in conjugate_cells)

        for cell in data['cells']:
            eliminated_candidates_list.append((cell, data['candidate']))

    return highlight_candidates_list, eliminated_candidates_list


def format_intersections_text(i_removals, intersection_type):
    formatted_text = [intersection_type.replace("_", " ")]
    for _, data in i_removals.items():
        cells = "/".join(format_cell(cell) for cell in data['cells'])
        candidate = data['candidate']
        unit_type = data['unit_type'][1:].capitalize()
        unit_index = data['unit_index'] + 1
        box_index = data['box'] + 1
        formatted_text.append(
            f"Box={box_index} & {unit_type}={unit_index} removes {candidate} from {cells}"
        )
    return formatted_text
