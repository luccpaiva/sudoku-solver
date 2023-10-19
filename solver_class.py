from itertools import combinations

import helpers
from strat_handler import StratHandler
import pprint


class Solver:
    def __init__(self, current_board):
        self.board = current_board.board
        self.possibles = current_board.possibles
        self.units = self.initialize_units()

    def update_possibles(self, current_board):

        # in the case a cell was set, first eliminate the keys from the possibles:
        current_board.possibles = {key: value for key, value in current_board.possibles.items() if
                                   key not in current_board.board}

        for cell in current_board.possibles.keys():
            visible_units = self.get_visible_cells(cell)
            visible_cells = set.union(visible_units['row'], visible_units['col'], visible_units['box'])
            taken_numbers = helpers.get_cells(current_board.board, *visible_cells)

            current_board.possibles[cell] -= taken_numbers

        return current_board.possibles

    @staticmethod
    def get_visible_cells(cell):
        """Return a dictionary containing sets of all cells visible to the given cell, categorized by unit."""
        row, col = cell
        row_units = {(row, i) for i in range(9)}
        col_units = {(i, col) for i in range(9)}

        # Calculate the box coordinates
        start_row, start_col = 3 * (row // 3), 3 * (col // 3)
        box_units = {(i, j) for i in range(start_row, start_row + 3) for j in range(start_col, start_col + 3)}

        units = {
            'row': row_units,
            'col': col_units,
            'box': box_units,
        }

        # Exclude the current cell from the units
        for unit_cells in units.values():
            unit_cells.discard(cell)

        return units

    def initialize_units(self):
        """Return a dictionary containing sets of all cells in each unit, categorized by unit type and index.
        Important note: only the cells that are empty in self.board are included in the units.
        example:
            units = {
                'row': {
                    0: {(0, 0), (0, 1), (0, 2), ..., (0, 8)},
                    1: {(1, 0), (1, 1), (1, 2), ..., (1, 8)},
                    ...
                    8: {(8, 0), (8, 1), (8, 2), ..., (8, 8)}
                },
                'col': {...},
                'box': {...}}

        """

        units = {'row': {i: set() for i in range(9)},
                 'col': {i: set() for i in range(9)},
                 'box': {i: set() for i in range(9)}}

        for (row, col) in self.possibles.keys():
            box_index = (row // 3) * 3 + col // 3

            units['row'][row].add((row, col))
            units['col'][col].add((row, col))
            units['box'][box_index].add((row, col))

        return units

    @staticmethod
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
        return {'row': row, 'col': col, 'box': box}

    def get_common_units(self, cell1, cell2):
        """Return the common units for two cells if they exist, classified by unit type.
        example:
            cell1 = (0, 0)
            cell2 = (0, 1)
            common_units = {
            'row': {(0, 0), (0, 1), (0, 2), (0, 3), (0, 4), ..., (0, 8)},
            'col': {(0, 0), (1, 0), (2, 0), (3, 0), (4, 0), ..., (8, 0)},
            'box': None}
        """
        unit_keys1 = self.get_cell_unit_keys(cell1)
        unit_keys2 = self.get_cell_unit_keys(cell2)

        common_units = {unit_type: None for unit_type in ['row', 'col', 'box']}

        for unit_type in ['row', 'col', 'box']:
            if unit_keys1[unit_type] == unit_keys2[unit_type]:
                unit_key = unit_keys1[unit_type]
                unit_cells = self.units[unit_type][unit_key]
                common_units[unit_type] = unit_cells
                common_units[unit_type] = unit_cells - {cell1, cell2}

        if all(value is None for value in common_units.values()):
            return None  # return None if all units are None

        return common_units

    def board_solved(self):
        return len(self.board) == 81

    @staticmethod
    def remove_candidates(current_board, eliminated_candidates):
        for cell, candidate in eliminated_candidates:
            current_board.possibles[cell].discard(candidate)

        return current_board.possibles

    def naked_singles(self):
        n_singles = []
        for cell, possibles in self.possibles.items():
            # Check if the cell has only one candidate
            if len(possibles) == 1:
                value = next(iter(possibles))
                n_singles.append((cell, value))

        n_singles_text = [f"{helpers.pos2cord(cell)} set to {value}." for cell, value in n_singles]
        success = bool(n_singles)

        result = StratHandler('Naked Singles',
                              success,
                              n_singles if success else None,
                              None,
                              n_singles if success else None,
                              n_singles if success else None,
                              n_singles_text if success else None)

        return result

    def hidden_singles(self):
        h_singles = []
        h_singles_text = []

        for cell, possibles in self.possibles.items():
            units = self.get_visible_cells(cell)

            hidden_in_units = []  # store the unit (row, column or box) where the cell is a hidden single
            hidden_single = None

            for unit_type, unit_cells in units.items():
                possibles_in_unit = set()
                for unit_cell in unit_cells:
                    possibles_in_unit.update(self.possibles.get(unit_cell, set()))

                hidden_singles = possibles - possibles_in_unit
                if len(hidden_singles) == 1:
                    hidden_single = hidden_singles.pop()
                    hidden_in_units.append(unit_type)

            # Check if the cell was a hidden single in multiple units
            if hidden_in_units:
                h_singles.append((cell, hidden_single))
                text = helpers.format_hidden_single_text(cell,
                                                         hidden_single,
                                                         hidden_in_units) if hidden_in_units else None
                h_singles_text.append(text)

        success = bool(h_singles)

        result = StratHandler('Hidden Singles',
                              success,
                              h_singles if success else None,
                              None,
                              h_singles if success else None,
                              h_singles if success else None,
                              h_singles_text)

        return result

    def naked_pairs2(self):
        n_pairs = {}

        for cell1, candidates1 in self.possibles.items():
            if len(candidates1) == 2:
                for cell2, candidates2 in self.possibles.items():
                    if cell1 != cell2 and candidates1 == candidates2:
                        common_units = self.get_common_units(cell1, cell2)
                        if common_units:
                            candidate_tuple = tuple(candidates1)
                            cell_pair = frozenset([cell1, cell2])

                            # Check if this pair already exists in the dictionary
                            if cell_pair not in n_pairs:
                                n_pairs[cell_pair] = {
                                    'candidates': candidate_tuple,
                                    'common_units': common_units
                                }

                            else:
                                # Update the existing common units for this pair
                                n_pairs[cell_pair]['common_units'].update(common_units)

                            break  # it is a naked *pair*, so there won't be a third cell with the same candidates

        valid_n_pairs = {}

        for pair, data in n_pairs.items():
            candidates = data['candidates']
            common_units = data['common_units']

            valid_pair = False  # Flag to check if this pair is valid

            # Check each unit individually within the common units
            for unit, unit_cells in common_units.items():
                if unit_cells is not None:  # Ensure the unit is not empty
                    for cell in unit_cells:
                        if cell not in pair and any(candidate in self.possibles[cell] for candidate in candidates):
                            valid_pair = True
                            break  # Break from the inner loop as we found the pair valid

                if valid_pair:
                    break  # Break from the outer loop as we found the pair valid

            if valid_pair:
                valid_n_pairs[pair] = data  # This naked pair is valid, add it to the valid_n_pairs

        highlight_candidates_list = []
        eliminated_candidates_list = []

        for pair, data in valid_n_pairs.items():
            candidates = data['candidates']
            common_units = data['common_units']

            # Check each unit individually within the common units
            for unit, unit_cells in common_units.items():
                if unit_cells:  # Check if the unit is not empty
                    # Since the unit is not empty, we add this pair to the highlight list
                    for cell in pair:
                        highlight_candidates_list.extend(
                            [(cell, candidate) for candidate in candidates if candidate in self.possibles[cell]])

                    # Proceed to gather eliminated candidates
                    eliminated_candidates_list.extend(
                        [(cell, candidate) for cell in unit_cells for candidate in candidates if
                         candidate in self.possibles[cell]])
                # If unit_cells is empty, we simply don't do anything, effectively skipping this unit

        success = bool(valid_n_pairs)
        n_pairs_text = helpers.format_naked_pairs_text(valid_n_pairs) if success else None

        return StratHandler('Naked Pairs',
                            success,
                            None,
                            None,
                            highlight_candidates_list,
                            eliminated_candidates_list,
                            n_pairs_text)

    def find_naked_sets(self):
        candidates_for_naked_sets = {}
        for cell, candidates in self.possibles.items():
            if len(candidates) == 2:
                candidate_tuple = tuple(candidates)
                candidates_for_naked_sets.setdefault(candidate_tuple, []).append(cell)

        naked_pairs = {
            frozenset(pair): {
                'candidates': candidates,
                'common_units': self.get_common_units(*pair),
            }
            for candidates, cells in candidates_for_naked_sets.items()
            for pair in combinations(cells, 2)
            if self.get_common_units(*pair)
        }
        return naked_pairs

    def validate_naked_set(self, pair, data):
        """Check if the naked pair has common candidates in their units."""
        candidates = data['candidates']
        common_units = data['common_units']

        for unit_cells in common_units.values():
            if unit_cells is None:
                continue
            for cell in unit_cells:
                if cell not in pair and any(candidate in self.possibles.get(cell, []) for candidate in candidates):
                    return True
        return False

    def process_naked_sets(self, valid_naked_pairs):
        """Highlight and eliminate candidates based on valid naked pairs."""
        highlight_candidates_list = []
        eliminated_candidates_list = []

        for pair, data in valid_naked_pairs.items():
            candidates = data['candidates']
            common_units = data['common_units']

            for unit_cells in common_units.values():
                if not unit_cells:
                    continue
                pair_cells_highlight = [
                    (cell, candidate) for cell in pair for candidate in candidates
                    if candidate in self.possibles.get(cell, [])
                ]
                highlight_candidates_list.extend(pair_cells_highlight)

                other_cells_eliminate = [
                    (cell, candidate) for cell in unit_cells for candidate in candidates
                    if cell not in pair and candidate in self.possibles.get(cell, [])
                ]
                eliminated_candidates_list.extend(other_cells_eliminate)

        return highlight_candidates_list, eliminated_candidates_list

    def naked_pairs(self):
        naked_pairs = self.find_naked_sets()
        valid_naked_pairs = {
            pair: data for pair, data in naked_pairs.items()
            if self.validate_naked_set(pair, data)
        }

        highlight_list, eliminate_list = self.process_naked_sets(valid_naked_pairs)
        success = bool(valid_naked_pairs)
        n_pairs_text = helpers.format_naked_pairs_text(valid_naked_pairs) if success else None
        pprint.pprint(n_pairs_text)

        return StratHandler('Naked Pairs',
                            success,
                            None,
                            None,
                            highlight_list,
                            eliminate_list,
                            n_pairs_text)
