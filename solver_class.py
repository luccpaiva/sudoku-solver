import utils
from utils import BoardType, CellType
from strat_handler import StratHandler
import strats


class Solver:
    def __init__(self, current_board):
        self.board = current_board.board
        self.possibles = current_board.possibles
        self.units = self.initialize_units()

    def update_possibles(self, current_board):

        # In the case a cell was set, first eliminate the keys from the possibles:
        current_board.possibles = {key: value for key, value in current_board.possibles.items() if
                                   key not in current_board.board}

        for cell in current_board.possibles.keys():
            visible_units = self.get_visible_cells(cell)
            visible_cells = set.union(visible_units['row'], visible_units['col'], visible_units['box'])
            taken_numbers = utils.get_cells(current_board.board, *visible_cells)

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

        units = {'Arow': {i: set() for i in range(9)},
                 'Ccol': {i: set() for i in range(9)},
                 'Bbox': {i: set() for i in range(9)}}

        for (row, col) in self.possibles.keys():
            box_index = (row // 3) * 3 + col // 3

            units['Arow'][row].add((row, col))
            units['Ccol'][col].add((row, col))
            units['Bbox'][box_index].add((row, col))

        return units

    def board_solved(self):
        return len(self.board) == 81

    @staticmethod
    def remove_candidates(current_board, eliminated_candidates):
        for cell, candidate in eliminated_candidates:
            current_board.possibles[cell].discard(candidate)

        return current_board.possibles

    # STRATEGIES
    # ///////////////////////////////////////////////////////////////
    def naked_singles(self):
        n_singles, n_singles_text = strats.naked_singles(self.possibles)
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
        h_singles, h_singles_text = strats.hidden_singles(self.possibles, self.units)

        success = bool(h_singles)

        result = StratHandler('Hidden Singles',
                              success,
                              h_singles if success else None,
                              None,
                              h_singles if success else None,
                              h_singles if success else None,
                              h_singles_text)

        return result

    def naked_sets(self, set_filter):

        for set_size in set_filter:
            strat_name = None
            match set_size:
                case 2:
                    strat_name = 'Naked Pairs'
                case 3:
                    strat_name = 'Naked Triples'
                case 4:
                    strat_name = 'Naked Quads'

            naked_sets = strats.naked_sets_find(self.possibles,
                                                set_size,
                                                self.units)

            processed_naked_sets, highlight_list, eliminate_list = strats.naked_sets_process(self.possibles,
                                                                                             naked_sets)

            # Double check if there is something to eliminate
            success = bool(processed_naked_sets) and bool(eliminate_list)

            if success:
                n_pairs_text = strats.naked_sets_text_format(processed_naked_sets,
                                                             strat_name)

                return StratHandler(strat_name,
                                    success,
                                    None,
                                    None,
                                    highlight_list,
                                    eliminate_list,
                                    n_pairs_text)

    def hidden_sets(self, set_filter):

        for set_size in set_filter:
            strat_name = None
            match set_size:
                case 2:
                    strat_name = 'Hidden Pairs'
                case 3:
                    strat_name = 'Hidden Triples'
                case 4:
                    strat_name = 'Hidden Quads'

            hidden_sets = strats.hidden_sets_find(self.possibles, set_size, self.units)
            highlight_list, eliminate_list = strats.hidden_sets_process(self.possibles, hidden_sets)

            success = bool(hidden_sets) and bool(eliminate_list)

            if success:
                h_pairs_text = strats.format_hidden_sets_text(hidden_sets,
                                                              strat_name)

                return StratHandler(strat_name,
                                    success,
                                    None,
                                    None,
                                    highlight_list,
                                    eliminate_list,
                                    h_pairs_text)

    def intersection_removal(self, intersection_type):
        pointing_pairs, box_reductions = strats.intersections_find(self.possibles, self.units)

        if intersection_type == 'Pointing Pairs':
            highlight_list, eliminate_list = strats.intersections_process(pointing_pairs)
        else:
            highlight_list, eliminate_list = strats.intersections_process(box_reductions)

        success = bool(eliminate_list)
        i_removals_text = None

        if success:
            i_removals_text = strats.format_intersections_text(box_reductions if intersection_type == 'Box-Reduction'
                                                               else pointing_pairs,
                                                               intersection_type)

        result = StratHandler(intersection_type,
                              success,
                              None,
                              None,
                              highlight_list if success else None,
                              eliminate_list if success else None,
                              i_removals_text)

        return result

    def x_wing(self):
        x_wing_results = strats.x_wing_find(self.possibles, self.units)

        success = bool(x_wing_results)
        highlight_candidates, eliminated_candidates, highlight_cells, description = None, None, None, None

        if success:
            highlight_candidates, eliminated_candidates, highlight_cells, description = strats.x_wing_process(
                x_wing_results)

        result = StratHandler('X-Wing ',
                              success,
                              None,
                              highlight_cells if success else None,
                              highlight_candidates if success else None,
                              eliminated_candidates if success else None,
                              description if success else None)

        return result

    def swordfish(self):
        swordfish_results = strats.swordfish_find(self.possibles, self.units)

        success = bool(swordfish_results)
        highlight_candidates, eliminated_candidates, highlight_cells, description = None, None, None, None

        if success:
            highlight_candidates, eliminated_candidates, highlight_cells, description = strats.swordfish_process(
                swordfish_results)

        result = StratHandler('Swordfish ',
                              success,
                              None,
                              highlight_cells if success else None,
                              highlight_candidates if success else None,
                              eliminated_candidates if success else None,
                              description if success else None)

        return result
