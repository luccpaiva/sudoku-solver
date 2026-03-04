from typing import Optional, Generator

import utils
from strat_handler import StratHandler
from utils import UnitKey, UNIT_ORDER
import strats


class Solver:
    def __init__(self):
        pass  # Solver holds no board state; board is passed explicitly to each method

    # UNIT COMPUTATION
    # ///////////////////////////////////////////////////////////////
    @staticmethod
    def compute_units(unsolved: dict) -> dict:
        """Build a mapping of unit type → unit index → set of unsolved cells.
        Only cells currently in `unsolved` are included.
        Example:
            units = {
                UnitKey.ROW: {0: {(0,1), (0,3), ...}, 1: {...}, ...},
                UnitKey.COL: {...},
                UnitKey.BOX: {...},
            }
        """
        units = {key: {i: set() for i in range(9)} for key in UNIT_ORDER}

        for (row, col) in unsolved.keys():
            box_index = (row // 3) * 3 + col // 3
            units[UnitKey.ROW][row].add((row, col))
            units[UnitKey.COL][col].add((row, col))
            units[UnitKey.BOX][box_index].add((row, col))

        return units

    # CANDIDATE MANAGEMENT
    # ///////////////////////////////////////////////////////////////
    @staticmethod
    def update_unsolved(board) -> dict:
        """Eliminate candidates from unsolved cells based on placed numbers.
        Removes solved cells from unsolved, then removes taken values from each cell's candidates.
        """
        board.unsolved = {key: value for key, value in board.unsolved.items()
                         if key not in board.solved}

        for cell in board.unsolved.keys():
            visible_units = Solver.get_visible_cells(cell)
            visible_cells = set.union(visible_units['row'], visible_units['col'], visible_units['box'])
            taken_numbers = utils.get_cells(board.solved, *visible_cells)
            board.unsolved[cell] -= taken_numbers

        return board.unsolved

    @staticmethod
    def get_visible_cells(cell) -> dict:
        """Return all cells visible to the given cell, grouped by unit type."""
        row, col = cell
        row_units = {(row, i) for i in range(9)}
        col_units = {(i, col) for i in range(9)}
        start_row, start_col = 3 * (row // 3), 3 * (col // 3)
        box_units = {(i, j) for i in range(start_row, start_row + 3) for j in range(start_col, start_col + 3)}

        units = {'row': row_units, 'col': col_units, 'box': box_units}
        for unit_cells in units.values():
            unit_cells.discard(cell)
        return units

    @staticmethod
    def remove_candidates(board, eliminated_candidates: list) -> dict:
        """Discard the given (cell, candidate) pairs from board.unsolved."""
        for cell, candidate in eliminated_candidates:
            board.unsolved[cell].discard(candidate)
        return board.unsolved

    # STRATEGY PIPELINE
    # ///////////////////////////////////////////////////////////////
    def find_next_strategy(self, board) -> Optional[StratHandler]:
        """Run strategies in priority order and return the first successful result, or None."""
        unsolved = board.unsolved
        units = self.compute_units(unsolved)

        for result in self._strategy_pipeline(unsolved, units):
            if result is not None and result.success:
                return result
        return None

    def _strategy_pipeline(self, unsolved: dict, units: dict) -> Generator[StratHandler, None, None]:
        """Yield strategy results lazily in priority order."""
        yield self._naked_singles(unsolved)
        yield self._hidden_singles(unsolved, units)
        yield self._naked_sets(unsolved, units, [2, 3])
        yield self._hidden_sets(unsolved, units, [2, 3])
        yield self._naked_sets(unsolved, units, [4])
        yield self._hidden_sets(unsolved, units, [4])
        yield self._intersection_removal(unsolved, units, 'Pointing Pairs')
        yield self._intersection_removal(unsolved, units, 'Box-Reduction')
        yield self._x_wing(unsolved, units)
        yield self._swordfish(unsolved, units)

    # STRATEGY IMPLEMENTATIONS
    # ///////////////////////////////////////////////////////////////
    @staticmethod
    def _naked_singles(unsolved: dict) -> StratHandler:
        n_singles, n_singles_text = strats.naked_singles(unsolved)
        success = bool(n_singles)
        return StratHandler(
            name='Naked Singles',
            success=success,
            solved_cells=n_singles if success else None,
            highlight_candidates=n_singles if success else None,
            eliminated_candidates=n_singles if success else None,
            description=n_singles_text if success else None,
        )

    @staticmethod
    def _hidden_singles(unsolved: dict, units: dict) -> StratHandler:
        h_singles, h_singles_text = strats.hidden_singles(unsolved, units)
        success = bool(h_singles)
        return StratHandler(
            name='Hidden Singles',
            success=success,
            solved_cells=h_singles if success else None,
            highlight_candidates=h_singles if success else None,
            eliminated_candidates=h_singles if success else None,
            description=h_singles_text,
        )

    @staticmethod
    def _naked_sets(unsolved: dict, units: dict, set_filter: list) -> Optional[StratHandler]:
        size_names = {2: 'Naked Pairs', 3: 'Naked Triples', 4: 'Naked Quads'}

        for set_size in set_filter:
            strat_name = size_names[set_size]
            naked_sets = strats.naked_sets_find(unsolved, set_size, units)
            processed, highlight_list, eliminate_list = strats.naked_sets_process(unsolved, naked_sets)

            success = bool(processed) and bool(eliminate_list)
            if success:
                return StratHandler(
                    name=strat_name,
                    success=True,
                    highlight_candidates=highlight_list,
                    eliminated_candidates=eliminate_list,
                    description=strats.format_naked_sets_text(processed, strat_name),
                )
        return None

    @staticmethod
    def _hidden_sets(unsolved: dict, units: dict, set_filter: list) -> Optional[StratHandler]:
        size_names = {2: 'Hidden Pairs', 3: 'Hidden Triples', 4: 'Hidden Quads'}

        for set_size in set_filter:
            strat_name = size_names[set_size]
            hidden_sets = strats.hidden_sets_find(unsolved, set_size, units)
            highlight_list, eliminate_list = strats.hidden_sets_process(unsolved, hidden_sets)

            success = bool(hidden_sets) and bool(eliminate_list)
            if success:
                return StratHandler(
                    name=strat_name,
                    success=True,
                    highlight_candidates=highlight_list,
                    eliminated_candidates=eliminate_list,
                    description=strats.format_hidden_sets_text(hidden_sets, strat_name),
                )
        return None

    @staticmethod
    def _intersection_removal(unsolved: dict, units: dict, intersection_type: str) -> StratHandler:
        pointing_pairs, box_reductions = strats.intersections_find(unsolved, units)

        if intersection_type == 'Pointing Pairs':
            highlight_list, eliminate_list = strats.intersections_process(pointing_pairs)
            i_removals = pointing_pairs
        else:
            highlight_list, eliminate_list = strats.intersections_process(box_reductions)
            i_removals = box_reductions

        success = bool(eliminate_list)
        return StratHandler(
            name=intersection_type,
            success=success,
            highlight_candidates=highlight_list if success else None,
            eliminated_candidates=eliminate_list if success else None,
            description=strats.format_intersections_text(i_removals, intersection_type) if success else None,
        )

    @staticmethod
    def _x_wing(unsolved: dict, units: dict) -> StratHandler:
        x_wing_results = strats.x_wing_find(unsolved, units)
        success = bool(x_wing_results)
        highlight_candidates, eliminated_candidates, highlight_cells, description = None, None, None, None

        if success:
            highlight_candidates, eliminated_candidates, highlight_cells, description = strats.x_wing_process(
                x_wing_results)

        return StratHandler(
            name='X-Wing',
            success=success,
            highlight_cells=highlight_cells,
            highlight_candidates=highlight_candidates,
            eliminated_candidates=eliminated_candidates,
            description=description,
        )

    @staticmethod
    def _swordfish(unsolved: dict, units: dict) -> StratHandler:
        swordfish_results = strats.swordfish_find(unsolved, units)
        success = bool(swordfish_results)
        highlight_candidates, eliminated_candidates, highlight_cells, description = None, None, None, None

        if success:
            highlight_candidates, eliminated_candidates, highlight_cells, description = strats.swordfish_process(
                swordfish_results)

        return StratHandler(
            name='Swordfish',
            success=success,
            highlight_cells=highlight_cells,
            highlight_candidates=highlight_candidates,
            eliminated_candidates=eliminated_candidates,
            description=description,
        )
