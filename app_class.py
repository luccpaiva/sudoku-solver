import sys

import pygame as pg

import settings
import utils
import test_boards
from settings import (
    GameState, FPS, WIDTH, HEIGHT, GRID_POS, GRID_SIZE, CELL_SIZE,
    BUTTON_PROPERTIES,
)
from solution_count import count_solutions
from board_class import Board
from solver_class import Solver
from button_class import Button
from renderer import Renderer
from puzzle_fetcher import fetch_from_websudoku, fetch_from_sudoku9x9


class Game:
    def __init__(self):
        pg.init()
        pg.display.set_caption('Sudoku Solver by Lucas Paiva')
        self.clock = pg.time.Clock()
        window = pg.display.set_mode((WIDTH, HEIGHT))

        # GAME STATE
        self.running = True
        self.selected = None
        self.mouse_pos = None
        self.action_made = True
        self.cell_changed = False
        self.state = GameState.IDLE
        self.no_strategies = False
        self.strategy_result = None

        # MODEL + CONTROLLER
        self.board = Board()
        self.solver = Solver()
        self.renderer = Renderer(window)

        # STRATEGY SIDEBAR LABELS
        self.basic_stt_list = [
            'Hidden Singles',
            'Naked Pairs/Triples',
            'Hidden Pairs/Triples',
            'Naked/Hidden Quads',
            'Pointing Pairs',
            'Box-Reduction',
        ]
        self.tough_stt_list = [
            'X-Wing',
            'Simple Colouring',
            'Y-Wing',
            'Rect Elim',
            'Swordfish',
            'XYZ-Wing',
            'BUG',
        ]

        # BUTTONS
        self.playing_buttons = []
        for props in BUTTON_PROPERTIES:
            self.playing_buttons.append(Button(**props))

        # INITIAL BOARD
        self.board.load_board(utils.str2grid(test_boards.DEMO_puzzle_x_wing))
        self.board.unsolved = self.solver.update_unsolved(self.board)

    # GAME LOOP
    # ///////////////////////////////////////////////////////////////
    def run(self):
        while self.running:
            self.playing_events()
            self.playing_update()
            self.playing_draw()
            self.clock.tick(FPS)
        pg.quit()
        sys.exit()

    # EVENT HANDLING
    # ///////////////////////////////////////////////////////////////
    def playing_events(self):
        for event in pg.event.get():
            if event.type == pg.QUIT:
                self.running = False

            if event.type == pg.MOUSEBUTTONDOWN:
                cell_selected = self._mouse_on_grid()
                if cell_selected:
                    self.selected = cell_selected
                else:
                    self.selected = None
                    for button in self.playing_buttons:
                        if button.highlighted:
                            self.handle_button_action(button.text)

            self.action_made = True

            if event.type == pg.KEYDOWN:
                self.action_made = True
                if self.selected is not None and utils.is_int(event.unicode):
                    if self.selected in self.board.puzzle:
                        print('Cannot change puzzle numbers')
                    elif self.selected in self.board.solved or self.selected in self.board.unsolved:
                        utils.set_cells(self.board.solved, [(self.selected, int(event.unicode))])
                        self.board.unsolved = self.solver.update_unsolved(self.board)
                        self.state = GameState.BOARD_UPDATING
                        self.cell_changed = True

                if event.key == pg.K_SPACE:
                    self.step_handler()

    def playing_update(self):
        self.mouse_pos = pg.mouse.get_pos()
        for button in self.playing_buttons:
            button.update(self.mouse_pos)

    def playing_draw(self):
        if self.action_made:
            self.renderer.draw_frame(
                board=self.board,
                strategy_result=self.strategy_result,
                selected=self.selected,
                game_state=self.state,
                basic_stt_list=self.basic_stt_list,
                tough_stt_list=self.tough_stt_list,
                buttons=self.playing_buttons,
            )
            self.action_made = False

    # STRATEGY STEP MACHINE
    # ///////////////////////////////////////////////////////////////
    def step_handler(self):
        if self.state == GameState.IDLE and not self.no_strategies:
            result = self.solver.find_next_strategy(self.board)
            if result is not None:
                self.strategy_result = result
                self.state = GameState.STRATEGY_SUCCESSFUL
            else:
                print('No strategy found')
                self.no_strategies = True

        elif self.state == GameState.STRATEGY_SUCCESSFUL:
            if self.strategy_result.eliminated_candidates:
                self.solver.remove_candidates(self.board, self.strategy_result.eliminated_candidates)

            if self.strategy_result.solved_cells:
                utils.set_cells(self.board.solved, self.strategy_result.solved_cells)
                self.board.unsolved = self.solver.update_unsolved(self.board)

            self.state = GameState.IDLE

        elif self.state == GameState.BOARD_UPDATING:
            self.no_strategies = False
            self.state = GameState.IDLE

    # BUTTON ACTIONS
    # ///////////////////////////////////////////////////////////////
    def handle_button_action(self, button_text):
        match button_text:
            case 'Check':
                print("Solved!" if self.board.is_solved() else "Not solved!")

            case 'Load':
                self.board.load_board(utils.str2grid(test_boards.TESTBOARD_npair))
                self.board.unsolved = self.solver.update_unsolved(self.board)

            case 'Easy':
                self._load_online_puzzle(fetch_from_websudoku, '1')

            case 'Medium':
                self._load_online_puzzle(fetch_from_sudoku9x9, '3')

            case 'Hard':
                self._load_online_puzzle(fetch_from_sudoku9x9, '4')

            case 'Evil':
                self._load_online_puzzle(fetch_from_sudoku9x9, 'Evil')

            case 'Solution Count':
                count_solutions(utils.dict2grid(self.board.puzzle), 'puzzle')
                count_solutions(utils.dict2grid(self.board.solved), 'current_board')

            case 'Solve':
                print('Full solve not yet implemented')

            case 'Next Step':
                self.step_handler()

            case _:
                print(f'No action defined for {button_text}')

    def _load_online_puzzle(self, fetcher, difficulty: str):
        board_str = fetcher(difficulty)
        self.board.load_board(utils.str2grid(board_str))
        self.board.unsolved = self.solver.update_unsolved(self.board)
        self.strategy_result = None
        self.no_strategies = False
        self.state = GameState.IDLE

        with open('z_last_loaded_puzzle', 'w') as file:
            file.write(board_str)

    # HELPERS
    # ///////////////////////////////////////////////////////////////
    def _mouse_on_grid(self):
        if self.mouse_pos[0] < GRID_POS[0] or self.mouse_pos[1] < GRID_POS[1]:
            return False
        if self.mouse_pos[0] > GRID_POS[0] + GRID_SIZE or self.mouse_pos[1] > GRID_POS[1] + GRID_SIZE:
            return False
        return (self.mouse_pos[1] - GRID_POS[1]) // CELL_SIZE, (self.mouse_pos[0] - GRID_POS[0]) // CELL_SIZE
