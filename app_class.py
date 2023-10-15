import copy
import sys

import requests
from bs4 import BeautifulSoup

import helpers
import solution_count
import test_boards
from solver_class import *
from button_class import *
from settings import *


class Game:
    def __init__(self):
        # PYGAME INITIALIZATION
        # ///////////////////////////////////////////////////////////////
        pg.init()
        pg.display.set_caption('Sudoku Solver by Lucas Paiva')
        self.clock = pg.time.Clock()
        self.window = pg.display.set_mode((WIDTH, HEIGHT))
        self.board_num_font = pg.font.SysFont('Arial', CELL_SIZE // 2)  # for puzzle numbers
        self.coord_font = pg.font.SysFont('Arial', 25)  # for grid coordinate
        self.cand_font = pg.font.SysFont('Arial', CELL_SIZE // 4)  # for candidate numbers
        self.stt_font = pg.font.SysFont('Consolas', 17)  # for results
        self.stt_bold_font = pg.font.SysFont('Consolas', 17, bold=True)  # for highlighted results

        # GAME LOOP VARIABLES
        # ///////////////////////////////////////////////////////////////
        self.running = True
        self.selected = None
        self.mousePos = None
        self.actionMade = True
        self.cellChanged = False

        # INITIALIZE BOARD
        # ///////////////////////////////////////////////////////////////
        self.board = Board()
        self.solver = Solver(self.board)
        self.strategy_result = None

        # STRATEGIES VARIABLES
        # ///////////////////////////////////////////////////////////////
        self.basic_stt_list = ['Naked Singles', 'Hidden Singles', 'Naked Pairs/Triples', 'Hidden Pairs/Triples',
                               'Naked/Hidden Quads', 'Pointing Pairs', 'Box/Line Reduction']
        self.tough_stt_list = ['X-Wing', 'Y-Wing', 'Swordfish', 'XYZ-Wing']
        self.current_stt = None  # the current applied strategy
        self.draw_solved_cells = False  # draw the result if some cell is solved
        self.draw_solved_candidates = False  # draw the result if some candidate is solved

        # BUTTONS
        # ///////////////////////////////////////////////////////////////
        self.playingButtons = []
        self.load_buttons()

        # LOAD THESE METHODS WHEN THE PROGRAM OPENS, FOR TESTING
        # ///////////////////////////////////////////////////////////////
        self.board.load_board(helpers.str2grid(test_boards.TESTBOARD_hsingle))
        self.solver = Solver(self.board)

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

    # PLAYING STATE FUNCTIONS
    # ///////////////////////////////////////////////////////////////
    # TODO: use the new function match instead of if/elif
    def playing_events(self):
        for event in pg.event.get():

            if event.type == pg.QUIT:
                self.running = False

            # user clicks
            if event.type == pg.MOUSEBUTTONDOWN:

                # user clicks on a cell
                cellSelected = self.mouse_on_grid()

                if cellSelected:
                    self.selected = cellSelected
                    self.actionMade = True
                else:
                    self.selected = None

                    # user clicks on a button
                    for button in self.playingButtons:
                        if button.highlighted:

                            if button.text == 'Check':
                                # print(solution_count.grid2str(self.puzzle))
                                if solver.board_is_solved(self.cboard):
                                    print("Solved!")
                                else:
                                    print("Not solved!")

                            elif button.text == 'Load':
                                self.load_test_puzzle(test_boards.TESTBOARD_npair)

                            elif button.text == 'Easy':
                                self.get_puzzle('1')

                            elif button.text == 'Medium':
                                self.get_puzzle2('3')

                            elif button.text == 'Hard':
                                self.get_puzzle2('4')

                            elif button.text == 'Evil':
                                self.get_puzzle2('Evil')

                            elif button.text == 'Solution Count':
                                solution_count.count_solutions(self.board.puzzle)

                            elif button.text == 'Solve':
                                pass

                            elif button.text == 'Next Step':
                                print('button pressed')
                                self.step_handler()

                        self.actionMade = True

            # USER TYPES A KEY
            # ///////////////////////////////////////////////////////////////
            if event.type == pg.KEYDOWN:
                print('key pressed')
                self.actionMade = True

                if self.selected is not None and self.puzzle[self.selected[1]][self.selected[0]] == 0:
                    if helpers.is_int(event.unicode):
                        self.cboard[self.selected[1]][self.selected[0]] = int(event.unicode)

                if event.key == pg.K_SPACE:
                    # solver.get_possibles(self.cboard, self.cpossibles)
                    # solver.get_possibles(self.cboard, self.cpossibles)
                    solution_count.count_solutions(self.puzzle)

                    # if self.draw_solved_cells:
                    #     solver.set_solved_cells(self.cboard, self.cpossibles, self.draw_solved_cells[1])
                    #     solver.get_possibles(self.cboard, self.cpossibles)
                    #     self.draw_solved_cells = False
                    #
                    # elif self.step_handler(solver.naked_singles(self.cpossibles)):
                    #     pass
                    #
                    # elif self.step_handler(solver.hidden_singles(self.cpossibles)):
                    #     pass

                    # elif self.step_handler(solver.naked_pair_triple_quads(self.cpossibles)):
                    #     pass

    def step_handler(self):
        self.solver = Solver(self.board)
        strategies = [self.solver.naked_singles, self.solver.hidden_singles]
        for strategy in strategies:
            self.strategy_result = strategy()

            if self.strategy_result.success:
                self.current_stt = self.strategy_result.name

                if self.strategy_result.solved_cells:
                    self.draw_solved_cells = True
                    helpers.set_cells(self.board.board, self.strategy_result.solved_cells)
                    self.solver = Solver(self.board)

                if self.strategy_result.solved_candidates:
                    self.draw_solved_candidates = True

                break

            else:
                pass

    def playing_update(self):
        self.mousePos = pg.mouse.get_pos()

        for button in self.playingButtons:
            button.update(self.mousePos)

    def playing_draw(self):
        # ONLY DRAW IF SOMETHING HAPPENS
        # ///////////////////////////////////////////////////////////////
        if self.actionMade:
            self.window.fill(WHITE)

            if self.selected:
                self.draw_highlight(self.window, self.selected)

            # self.shadeLockedCells(self.window, self.lockedCells)
            # self.shadeIncorrectCells(self.window, self.incorrectCells)

            for button in self.playingButtons:
                button.draw(self.window)

            if self.draw_solved_cells:
                self.draw_highlight_solved_cells(self.window)
                self.draw_solved_text(self.window)

            self.draw_board_numbers(self.window)

            if self.draw_solved_candidates:
                self.draw_highlight_solved_candidates(self.window, self.draw_solved_candidates[2])
                self.draw_solved_text(self.window, self.draw_solved_candidates[3])

            self.draw_candidates_numbers(self.window)

            self.draw_grid(self.window)
            self.draw_strategy_list(self.window)

            pg.display.flip()

            self.actionMade = False
            self.current_stt = None

    # CLASS HELPER FUNCTIONS
    # ///////////////////////////////////////////////////////////////
    def draw_cell_number(self, window, cell_value, row, col, color):
        pos = [GRID_POS[0] + (col * CELL_SIZE), GRID_POS[1] + (row * CELL_SIZE)]
        self.text_to_screen(window, str(cell_value), pos, 'board_num_size', color)

    def draw_cell_candidates(self, window, candidate, row, col):
        pos = [
            GRID_POS[0] + (col * CELL_SIZE) + ((candidate - 1) % 3 * CELL_SIZE // 3),
            GRID_POS[1] + (row * CELL_SIZE) + ((candidate - 1) // 3 * CELL_SIZE // 3)
        ]
        self.text_to_screen(window, str(candidate), pos, 'cand_size', BLACK)

    def load_test_puzzle(self, testpuzzle):
        self.board.puzzle = solution_count.str2grid(testpuzzle)
        self.board.board = solution_count.str2grid(testpuzzle)

    def get_puzzle(self, difficulty):
        html_doc = requests.get('https://nine.websudoku.com/?level={}'.format(difficulty)).content
        soup = BeautifulSoup(html_doc, 'html.parser')
        ids = ['f00', 'f01', 'f02', 'f03', 'f04', 'f05', 'f06', 'f07', 'f08',
               'f10', 'f11', 'f12', 'f13', 'f14', 'f15', 'f16', 'f17', 'f18',
               'f20', 'f21', 'f22', 'f23', 'f24', 'f25', 'f26', 'f27', 'f28',
               'f30', 'f31', 'f32', 'f33', 'f34', 'f35', 'f36', 'f37', 'f38',
               'f40', 'f41', 'f42', 'f43', 'f44', 'f45', 'f46', 'f47', 'f48',
               'f50', 'f51', 'f52', 'f53', 'f54', 'f55', 'f56', 'f57', 'f58',
               'f60', 'f61', 'f62', 'f63', 'f64', 'f65', 'f66', 'f67', 'f68',
               'f70', 'f71', 'f72', 'f73', 'f74', 'f75', 'f76', 'f77', 'f78',
               'f80', 'f81', 'f82', 'f83', 'f84', 'f85', 'f86', 'f87', 'f88']
        data = []

        for cid in ids:
            data.append(str(soup.find('input', id=cid)))

        board = [[0 for _ in range(9)] for _ in range(9)]

        for index, cell in enumerate(data):
            if 'value' in cell:
                board[index // 9][index % 9] = int(cell[-4])
            else:
                board[index // 9][index % 9] = 0

        self.puzzle = copy.deepcopy(board)
        self.cboard = copy.deepcopy(board)

    def get_puzzle2(self, difficulty):

        if difficulty == "Evil":
            html_doc = requests.get('https://sudoku9x9.com/expert.php').content
        else:
            html_doc = requests.get('https://sudoku9x9.com/?level={}'.format(difficulty)).content

        soup = BeautifulSoup(html_doc, 'html.parser')

        ids = ['c0', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8',
               'c9', 'c10', 'c11', 'c12', 'c13', 'c14', 'c15', 'c16',
               'c17', 'c18', 'c19', 'c20', 'c21', 'c22', 'c23', 'c24',
               'c25', 'c26', 'c27', 'c28', 'c29', 'c30', 'c31', 'c32',
               'c33', 'c34', 'c35', 'c36', 'c37', 'c38', 'c39', 'c40',
               'c41', 'c42', 'c43', 'c44', 'c45', 'c46', 'c47', 'c48',
               'c49', 'c50', 'c51', 'c52', 'c53', 'c54', 'c55', 'c56',
               'c57', 'c58', 'c59', 'c60', 'c61', 'c62', 'c63', 'c64',
               'c65', 'c66', 'c67', 'c68', 'c69', 'c70', 'c71', 'c72',
               'c73', 'c74', 'c75', 'c76', 'c77', 'c78', 'c79', 'c80']

        data = []
        for cid in ids:
            data.append(str(soup.find('textarea', id=cid)))

        board = [[0 for _ in range(9)] for _ in range(9)]
        for index, cell in enumerate(data):
            if helpers.is_int(cell[-12]):
                board[index // 9][index % 9] = int(cell[-12])
            else:
                board[index // 9][index % 9] = 0

        self.puzzle = copy.deepcopy(board)
        self.cboard = copy.deepcopy(board)
        self.cpossibles = solver.initiate_possibles(self.cboard)

    def draw_board_numbers(self, window):
        # common keys are merged, but the last dict overwrites, so the board.puzzle numbers are still blue
        full_board = {**{coord: (value, BLACK) for coord, value in self.board.board.items()},
                      **{coord: (value, DARKBLUE) for coord, value in self.board.puzzle.items()}}

        for (row, col), (value, color) in full_board.items():
            self.draw_cell_number(window, value, row, col, color)

    def draw_candidates_numbers(self, window):
        for (row, col), candidates in self.solver.possibles.items():
            for candidate in candidates:
                self.draw_cell_candidates(window, candidate, row, col)

    def draw_highlight(self, window, pos):
        # HIGHLIGHT ROW
        # ///////////////////////////////////////////////////////////////
        pg.draw.rect(window, LIGHTBLUE, (GRID_POS[0],
                                         (pos[1] * CELL_SIZE) + GRID_POS[1],
                                         GRID_SIZE,
                                         CELL_SIZE))

        # HIGHLIGHT COLUMN
        # ///////////////////////////////////////////////////////////////
        pg.draw.rect(window, LIGHTBLUE, ((pos[0] * CELL_SIZE) + GRID_POS[0],
                                         GRID_POS[1],
                                         CELL_SIZE,
                                         GRID_SIZE))

        # HIGHLIGHT BOX
        # ///////////////////////////////////////////////////////////////
        pg.draw.rect(window, LIGHTBLUE, (GRID_POS[0] + (3 * CELL_SIZE * (pos[0] // 3)),
                                         GRID_POS[1] + (3 * CELL_SIZE * (pos[1] // 3)),
                                         3 * CELL_SIZE,
                                         3 * CELL_SIZE))

        # HIGHLIGHT SAME NUMBERS
        # ///////////////////////////////////////////////////////////////
        for i, row in enumerate(self.cboard):
            for j, num in enumerate(row):
                if ((i != pos[0] or j != pos[1]) and self.cboard[pos[1]][pos[0]] != 0 and
                        self.cboard[i][j] == self.cboard[pos[1]][pos[0]]):
                    pg.draw.rect(window, LIGHTGRAY, (GRID_POS[0] + (j * CELL_SIZE),
                                                     GRID_POS[1] + (i * CELL_SIZE),
                                                     CELL_SIZE,
                                                     CELL_SIZE))

        # HIGHLIGHT ACTIVE CELL
        # ///////////////////////////////////////////////////////////////
        pg.draw.rect(window, LIGHTYELLOW, (GRID_POS[0] + (pos[0] * CELL_SIZE),
                                           GRID_POS[1] + (pos[1] * CELL_SIZE),
                                           CELL_SIZE,
                                           CELL_SIZE))

    def draw_grid(self, window):
        # grid
        pg.draw.rect(window, BLACK, (GRID_POS[0], GRID_POS[1], GRID_SIZE, GRID_SIZE), 2)
        for i in range(9):
            pg.draw.line(window, BLACK, (GRID_POS[0] + (i * CELL_SIZE), GRID_POS[1]),
                         (GRID_POS[0] + (i * CELL_SIZE), GRID_POS[1] + GRID_SIZE),
                         2 if i % 3 == 0 else 1)
            pg.draw.line(window, BLACK, (GRID_POS[0], GRID_POS[1] + (i * CELL_SIZE)),
                         (GRID_POS[0] + GRID_SIZE, GRID_POS[1] + (i * CELL_SIZE)),
                         2 if i % 3 == 0 else 1)

            # coordinates
            pos = [GRID_POS[0] + (i * CELL_SIZE), GRID_POS[1] - 55]
            self.text_to_screen(window, str(i + 1), pos, 'coord_size', BLACK)

            pos = [GRID_POS[0] - 55, GRID_POS[1] + (i * CELL_SIZE)]
            self.text_to_screen(window, helpers.int2char(i), pos, 'coord_size', BLACK)

        # strategy list board
        pg.draw.rect(window, BLACK, (STT_LIST_POS[0], STT_LIST_POS[1], 460, 220), 2)

        # strategy text board
        pg.draw.rect(window, BLACK, (STT_RESULT_POS[0], STT_RESULT_POS[1], 460, 385), 2)

    def draw_highlight_solved_cells(self, window):
        for (row, col), cell_value in self.strategy_result.solved_cells:
            pos = [GRID_POS[0] + (col * CELL_SIZE), GRID_POS[1] + (row * CELL_SIZE)]
            pg.draw.rect(window, LIGHTGREEN, (pos[0], pos[1], CELL_SIZE, CELL_SIZE))

        # for solved_cell in list_solved_cells:
        #     pos = [GRID_POS[0] + (solved_cell[1] * CELL_SIZE) + (((solved_cell[2] - 1) % 3) * CELL_SIZE // 3),
        #            GRID_POS[1] + (solved_cell[0] * CELL_SIZE) + (((solved_cell[2] - 1) // 3) * CELL_SIZE // 3)]
        #     pg.draw.rect(window, LIGHTGREEN, (pos[0], pos[1], CELL_SIZE // 3, CELL_SIZE // 3))

    @staticmethod
    def draw_highlight_solved_candidates(window, list_highlighted_candidates, list_solved_candidates):
        for highlighted_candidates in list_highlighted_candidates:
            pos = [GRID_POS[0] + (highlighted_candidates[1] * CELL_SIZE) + (
                    ((highlighted_candidates[2] - 1) % 3) * CELL_SIZE // 3),
                   GRID_POS[1] + (highlighted_candidates[0] * CELL_SIZE) + (
                           ((highlighted_candidates[2] - 1) // 3) * CELL_SIZE // 3)]
            pg.draw.rect(window, LIGHTYELLOW, (pos[0], pos[1], CELL_SIZE // 3, CELL_SIZE // 3))

        for solved_candidate in list_solved_candidates:
            pos = [GRID_POS[0] + (solved_candidate[1] * CELL_SIZE) + (((solved_candidate[2] - 1) % 3) * CELL_SIZE // 3),
                   GRID_POS[1] + (solved_candidate[0] * CELL_SIZE) + (
                           ((solved_candidate[2] - 1) // 3) * CELL_SIZE // 3)]
            pg.draw.rect(window, LIGHTGREEN, (pos[0], pos[1], CELL_SIZE // 3, CELL_SIZE // 3))

    def draw_solved_text(self, window):
        pos = [STT_LIST_POS[0] + 10, STT_LIST_POS[1] + 230]
        for solved_cell_text in self.strategy_result.description:
            pos[1] += 25
            self.text_to_screen(window, solved_cell_text, pos, 'stt_size', BLACK)

    def draw_strategy_list(self, window):

        pos_list = [STT_LIST_POS[0] + 10, STT_LIST_POS[1] + 10]  # for the list
        pos_indicator = [STT_LIST_POS[0] + 200, STT_LIST_POS[1] + 20]  # for the YES/NO indicator

        self.text_to_screen(window, 'Basic Strategies', pos_list, 'stt_size', BLACK)

        pos_list[1] += 10
        stop_indicator = True
        for i, stt in enumerate(self.basic_stt_list):
            pos_list[1] += 25
            pos_indicator[1] += 25

            if stt == self.current_stt:
                self.text_to_screen(window, stt, pos_list, 'stt_size_bold', BLACK)

                if self.draw_solved_cells:
                    self.text_to_screen(window, 'YES', pos_indicator, 'stt_size_bold', GREEN)
                    stop_indicator = False
            else:
                self.text_to_screen(window, stt, pos_list, 'stt_size', BLACK)

                if stop_indicator and self.draw_solved_cells:
                    self.text_to_screen(window, 'NO', pos_indicator, 'stt_size_bold', RED)

        pos_list = [STT_LIST_POS[0] + 280, STT_LIST_POS[1] + 10]  # for the list
        self.text_to_screen(window, 'Tough Strategies', pos_list, 'stt_size', BLACK)

        pos_list[1] += 10
        for i, stt in enumerate(self.tough_stt_list):
            pos_list[1] += 25

            if stt == self.current_stt:
                self.text_to_screen(window, stt, pos_list, 'stt_size_bold', BLACK)
            else:
                self.text_to_screen(window, stt, pos_list, 'stt_size', BLACK)

    def mouse_on_grid(self):
        if self.mousePos[0] < GRID_POS[0] or self.mousePos[1] < GRID_POS[1]:
            return False

        if self.mousePos[0] > GRID_POS[0] + GRID_SIZE or self.mousePos[1] > GRID_POS[1] + GRID_SIZE:
            return False

        return (self.mousePos[0] - GRID_POS[0]) // CELL_SIZE, (self.mousePos[1] - GRID_POS[1]) // CELL_SIZE

    def load_buttons(self):
        self.playingButtons.append(Button(GRID_POS[0], 5, 70, 40,
                                          colour=(27, 142, 207),
                                          text='Check'))
        self.playingButtons.append(Button(152, 5, 70, 40,
                                          colour=DARKGRAY,
                                          text='Load'))
        self.playingButtons.append(Button(264, 5, 70, 40,
                                          colour=(117, 172, 112),
                                          text='Easy'))
        self.playingButtons.append(Button(376, 5, 70, 40,
                                          colour=(204, 197, 110),
                                          text='Medium'))
        self.playingButtons.append(Button(488, 5, 70, 40,
                                          colour=(199, 129, 48),
                                          text='Hard'))
        self.playingButtons.append(Button(600, 5, 70, 40,
                                          colour=(207, 68, 68),
                                          text='Evil'))
        self.playingButtons.append(Button(720, 5, 140, 40,
                                          colour=LIGHTGRAY,
                                          text='Solution Count'))
        self.playingButtons.append(Button(890, 5, 70, 40,
                                          colour=LIGHTGRAY,
                                          text='Solve'))

        self.playingButtons.append(Button(1000, 5, 100, 40,
                                          colour=LIGHTGRAY,
                                          text='Next Step'))

    def text_to_screen(self, window, text, pos, size, colour):
        font = None
        if size == 'board_num_size':
            font = self.board_num_font.render(text, True, colour)
            fontWidth = font.get_width()
            fontHeight = font.get_height()
            pos[0] += (CELL_SIZE - fontWidth) // 2
            pos[1] += (CELL_SIZE - fontHeight) // 2
        elif size == 'coord_size':
            font = self.coord_font.render(text, True, colour)
            fontWidth = font.get_width()
            fontHeight = font.get_height()
            pos[0] += (CELL_SIZE - fontWidth) // 2
            pos[1] += (CELL_SIZE - fontHeight) // 2
        elif size == 'cand_size':
            font = self.cand_font.render(text, True, colour)
            fontWidth = font.get_width()
            fontHeight = font.get_height()
            pos[0] += (CELL_SIZE // 3 - fontWidth) // 2
            pos[1] += (CELL_SIZE // 3 - fontHeight) // 2
        elif size == 'stt_size':
            font = self.stt_font.render(text, True, colour)
        elif size == 'stt_size_bold':
            font = self.stt_bold_font.render(text, True, colour)

        window.blit(font, pos)
