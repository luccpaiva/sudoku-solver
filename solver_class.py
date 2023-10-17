from itertools import chain, combinations

import helpers
from strat_handler import StratHandler


class Solver:
    def __init__(self, board):
        self.board = board
        self.possibles = self.initialize_possibles()
        self.update_possibles()

    def initialize_possibles(self):
        # Initialize possibilities for all cells
        all_cells = {(i, j): set(range(1, 10)) for i in range(9) for j in range(9)}

        # Filter out the cells that already have a value in self.board
        empty_cells_possibles = {key: value for key, value in all_cells.items() if key not in self.board}

        return empty_cells_possibles

    def board_solved(self):
        return len(self.board) == 81

    def update_possibles(self):
        for cell in self.possibles.keys():
            visible_units = helpers.get_visible_cells(cell)
            visible_cells = set.union(visible_units['row'], visible_units['col'], visible_units['box'])
            taken_numbers = helpers.get_cells(self.board, *visible_cells)

            self.possibles[cell] -= taken_numbers

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
                              n_singles_text if success else None)

        return result

    def hidden_singles(self):
        h_singles = []
        h_singles_text = []

        for cell, possibles in self.possibles.items():
            units = helpers.get_visible_cells(cell)

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
                                                         hidden_in_units)
                h_singles_text.append(text)

        success = bool(h_singles)

        result = StratHandler('Hidden Singles',
                              success,
                              h_singles if success else None,
                              h_singles_text if success else None)

        return result

    def naked_pairs(self):
        potential_pairs = {}

        # Check for naked pairs in possibles
        for cell, candidates in self.possibles.items():
            if len(candidates) == 2:
                # Use a frozenset so it can be a dict key
                candidate_set = frozenset(candidates)

                # If there's already an entry for this set of candidates, add the current cell
                if candidate_set in potential_pairs:
                    potential_pairs[candidate_set].append(cell)
                else:
                    potential_pairs[candidate_set] = [cell]

        naked_pairs = []
        for candidate_set, cells in potential_pairs.items():
            if len(cells) == 2:
                # Get the common units for this pair of cells
                common_units = helpers.get_common_units(cells[0], cells[1])

                if common_units:
                    # candidate_set is a set; convert it to a tuple for the result
                    candidate_tuple = tuple(candidate_set)
                    for unit_type, unit_cells in common_units.items():
                        # If they share a unit, then we add the pair, their common candidates, and the unit type
                        naked_pairs.append((cells, candidate_tuple, unit_type))

        print(naked_pairs)
        a = 2
        # success = bool(n_pairs)
        # # Create the successful result, including information about the naked pairs found
        # n_pairs_text = [(cells, list(candidates)) for cells, candidates, _ in n_pairs]
        # return StratHandler('Naked Pairs',
        #                     success,
        #                     n_pairs,
        #                     n_pairs_text)
