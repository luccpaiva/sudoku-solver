from itertools import chain, combinations

import helpers
from board_class import Board
from strat_handler import StratHandler


class Solver:
    def __init__(self, board: Board):
        self.board = board.get_board_state()
        self.possibles = self.initialize_possibles()
        self.update_possibles()

    def initialize_possibles(self):
        # Initialize possibilities for all cells
        all_cells = {(i, j): set(range(1, 10)) for i in range(9) for j in range(9)}

        # Filter out the cells that already have a value in self.board
        empty_cells_possibles = {key: value for key, value in all_cells.items() if key not in self.board}

        return empty_cells_possibles

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
                value = possibles.pop()
                self.board[cell] = value
                n_singles.append((cell, value))

        # Prepare messages for the found cells
        n_singles_text = [f"Cell {cell} set to {value}." for *cell, value in n_singles]

        # Determine if the strategy was successful
        success = bool(n_singles)

        # Create a StrategyResult object
        result = StratHandler(name="Naked Singles",
                              success=success,
                              solved_cells=n_singles,
                              solved_candidates=None,
                              description=n_singles_text if success else None)

        return result

    def hidden_singles(self):
        """Find hidden singles in the Sudoku board."""
        h_singles = []
        h_singles_text = []

        for cell, possibles in self.possibles.items():
            units = helpers.get_visible_cells(cell)

            hidden_in_units = []
            hidden_single = None  # Initialize hidden_single

            for unit_type, unit_cells in units.items():
                possibles_in_unit = set()
                for unit_cell in unit_cells:
                    possibles_in_unit.update(self.possibles.get(unit_cell, set()))

                hidden_singles = possibles - possibles_in_unit
                if len(hidden_singles) == 1:
                    hidden_single = hidden_singles.pop()
                    hidden_in_units.append(unit_type)

            # Check if the cell was a hidden single in multiple units and if hidden_single has a value
            if hidden_in_units:
                h_singles.append((cell, hidden_single))

                text = helpers.format_hidden_single_text(cell,
                                                         hidden_single,
                                                         hidden_in_units)
                print(text)
                h_singles_text.append(text)

        success = bool(h_singles)

        result = StratHandler(name="Hidden Singles",
                              success=success,
                              solved_cells=h_singles,
                              solved_candidates=None,
                              description=h_singles_text if success else None)

        return result
