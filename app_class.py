import sys

import requests
from bs4 import BeautifulSoup

import solution_count
import test_boards
from board_class import *
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
        self.updateboard = False
        self.state = IDLE

        # INITIALIZE CLASSES
        # ///////////////////////////////////////////////////////////////
        self.board = Board()
        self.solver = Solver(self.board.get_board_state())
        self.strategy_result = None

        # STRATEGIES VARIABLES
        # ///////////////////////////////////////////////////////////////
        self.basic_stt_list = ['Naked Singles', 'Hidden Singles', 'Naked Pairs/Triples', 'Hidden Pairs/Triples',
                               'Naked/Hidden Quads', 'Pointing Pairs', 'Box/Line Reduction']
        self.tough_stt_list = ['X-Wing', 'Y-Wing', 'Swordfish', 'XYZ-Wing']

        # BUTTONS
        # ///////////////////////////////////////////////////////////////
        self.playingButtons = []
        self.load_buttons()

        # LOAD THESE METHODS WHEN THE PROGRAM OPENS, FOR TESTING
        # ///////////////////////////////////////////////////////////////
        self.board.load_board(helpers.str2grid(test_boards.TESTBOARD_npair))
        self.solver = Solver(self.board.get_board_state())

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
                            self.handle_button_action(button.text)

            self.actionMade = True
            # USER TYPES A KEY
            # ///////////////////////////////////////////////////////////////
            if event.type == pg.KEYDOWN:
                self.actionMade = True

                if self.selected is not None and self.puzzle[self.selected[1]][self.selected[0]] == 0:
                    if helpers.is_int(event.unicode):
                        self.cboard[self.selected[1]][self.selected[0]] = int(event.unicode)

                if event.key == pg.K_SPACE:
                    self.step_handler()

    def step_handler(self):
        if self.state == IDLE:
            # Perform the strategy test
            self.solver = Solver(self.board.get_board_state())
            strategies = [self.solver.naked_singles, self.solver.hidden_singles, self.solver.naked_pairs]

            for strategy in strategies:
                self.strategy_result = strategy()

                if self.strategy_result.success:
                    self.state = STRATEGY_SUCCESSFUL
                    break
            else:
                print('No strategy found')

        elif self.state == STRATEGY_SUCCESSFUL:
            # Update the board based on the strategy's results
            helpers.set_cells(self.board.current_board, self.strategy_result.solved_candidates)
            self.solver = Solver(self.board.get_board_state())
            self.state = IDLE  # Prepare for the next strategy

        elif self.state == BOARD_UPDATING:
            # The board has been updated, ready for the next strategy
            # leave this here if needed to implement something between one strategy and the next
            # for that, turn the state to BOARD_UPDATING IN elif self.state
            self.state = IDLE

    def playing_update(self):
        self.mousePos = pg.mouse.get_pos()

        for button in self.playingButtons:
            button.update(self.mousePos)

    def playing_draw(self):
        if self.actionMade:
            self.window.fill(WHITE)

            if self.selected:
                self.draw_highlight(self.selected)

            for button in self.playingButtons:
                button.draw(self.window)

            if self.state == STRATEGY_SUCCESSFUL:
                self.draw_highlight_solved_candidates()
                self.draw_solved_text()

            self.draw_board_numbers()

            if self.state == BOARD_UPDATING:
                pass

            self.draw_candidates_numbers()

            self.draw_grid()
            self.draw_strategy_list()

            pg.display.flip()

            self.actionMade = False

    # CLASS HELPER FUNCTIONS
    # ///////////////////////////////////////////////////////////////
    def draw_cell_number(self, cell_value, row, col, color):
        pos = [GRID_POS[0] + (col * CELL_SIZE), GRID_POS[1] + (row * CELL_SIZE)]
        self.text_to_screen(str(cell_value), pos, 'board_num_size', color)

    def draw_cell_candidates(self, candidate, row, col):
        pos = [
            GRID_POS[0] + (col * CELL_SIZE) + ((candidate - 1) % 3 * MINI_CELL_SIZE),
            GRID_POS[1] + (row * CELL_SIZE) + ((candidate - 1) // 3 * MINI_CELL_SIZE)
        ]
        self.text_to_screen(str(candidate), pos, 'cand_size', BLACK)

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

        board_str = ''

        for cid in ids:
            cell = str(soup.find('input', id=cid))

            if 'value' in cell:
                # Extract the value attribute from the cell; it's assumed to be a single digit
                value = cell.split('"')[-2]  # The value is assumed to be between the last pair of quotes
                board_str += value
            else:
                board_str += '.'  # Represent empty cells with '.'

        self.board.load_board(helpers.str2grid(board_str))
        self.solver = Solver(self.board.get_board_state())

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

        board_str = ''

        for cid in ids:
            cell = soup.find('textarea', id=cid)

            # Assuming the number is directly contained in the textarea
            if cell and cell.get_text().isdigit():
                board_str += cell.get_text()
            else:
                board_str += '.'  # Represent empty cells with '.'

        self.board.load_board(helpers.str2grid(board_str))
        self.solver = Solver(self.board.get_board_state())

    def draw_rect(self, color, pos, size):
        pg.draw.rect(self.window, color, (*pos, *size))

    def draw_line(self, start_pos, end_pos, width):
        pg.draw.line(self.window, BLACK, start_pos, end_pos, width)

    def draw_board_numbers(self):
        # common keys are merged, but the last dict overwrites, so the board.puzzle numbers are still blue
        full_board = {**{coord: (value, BLACK) for coord, value in self.board.current_board.items()},
                      **{coord: (value, DARKBLUE) for coord, value in self.board.puzzle.items()}}

        for (row, col), (value, color) in full_board.items():
            self.draw_cell_number(value, row, col, color)

    def draw_candidates_numbers(self):
        for (row, col), candidates in self.solver.possibles.items():
            for candidate in candidates:
                self.draw_cell_candidates(candidate, row, col)

    def draw_highlight(self, pos):
        row, col = pos

        # Highlight row, column, and box
        self.draw_rect(LIGHTBLUE, (GRID_POS[0], GRID_POS[1] + col * CELL_SIZE), (GRID_SIZE, CELL_SIZE))
        self.draw_rect(LIGHTBLUE, (GRID_POS[0] + row * CELL_SIZE, GRID_POS[1]), (CELL_SIZE, GRID_SIZE))
        self.draw_rect(LIGHTBLUE,
                       (GRID_POS[0] + (row // 3 * 3 * CELL_SIZE), GRID_POS[1] + (col // 3 * 3 * CELL_SIZE)),
                       (3 * CELL_SIZE, 3 * CELL_SIZE))

        current_num = self.board.current_board.get((col, row))

        if current_num:
            for (i, j), num in (self.board.current_board.items() or self.board.puzzle.items()):
                if num == current_num and (i, j) != (row, col):
                    self.draw_rect(LIGHTGRAY,
                                   (GRID_POS[0] + j * CELL_SIZE, GRID_POS[1] + i * CELL_SIZE),
                                   (CELL_SIZE, CELL_SIZE))

        # Highlight active cell
        self.draw_rect(LIGHTYELLOW,
                       (GRID_POS[0] + row * CELL_SIZE, GRID_POS[1] + col * CELL_SIZE),
                       (CELL_SIZE, CELL_SIZE))

    def draw_grid(self):
        # grid
        pg.draw.rect(self.window,
                     BLACK,
                     (GRID_POS[0], GRID_POS[1], GRID_SIZE, GRID_SIZE),
                     2)
        for i in range(9):
            pg.draw.line(self.window, BLACK, (GRID_POS[0] + (i * CELL_SIZE), GRID_POS[1]),
                         (GRID_POS[0] + (i * CELL_SIZE), GRID_POS[1] + GRID_SIZE),
                         2 if i % 3 == 0 else 1)
            pg.draw.line(self.window, BLACK, (GRID_POS[0], GRID_POS[1] + (i * CELL_SIZE)),
                         (GRID_POS[0] + GRID_SIZE, GRID_POS[1] + (i * CELL_SIZE)),
                         2 if i % 3 == 0 else 1)

            # coordinates
            pos = [GRID_POS[0] + (i * CELL_SIZE), GRID_POS[1] - 55]
            self.text_to_screen(str(i + 1), pos, 'coord_size', BLACK)

            pos = [GRID_POS[0] - 55, GRID_POS[1] + (i * CELL_SIZE)]
            self.text_to_screen(helpers.int2char(i), pos, 'coord_size', BLACK)

        # strategy list board
        pg.draw.rect(self.window,
                     BLACK,
                     (STT_LIST_POS[0], STT_LIST_POS[1], *STRATEGY_LIST_SIZE),
                     THICK_LINE)

        # strategy text board
        pg.draw.rect(self.window,
                     BLACK,
                     (STT_RESULT_POS[0], STT_RESULT_POS[1], *STRATEGY_TEXT_SIZE), THICK_LINE)

    def draw_highlight_solved_cells(self):
        for (row, col), cell_value in self.strategy_result.solved_cells:
            pos = [GRID_POS[0] + (col * CELL_SIZE), GRID_POS[1] + (row * CELL_SIZE)]
            pg.draw.rect(self.window, LIGHTGREEN, (pos[0], pos[1], CELL_SIZE, CELL_SIZE))

    def draw_highlight_solved_candidates(self):
        if self.strategy_result.solved_candidates:
            for (row, col), candidate in self.strategy_result.solved_candidates:
                pos = [
                    GRID_POS[0] + (col * CELL_SIZE) + ((candidate - 1) % 3) * MINI_CELL_SIZE,
                    GRID_POS[1] + (row * CELL_SIZE) + ((candidate - 1) // 3) * MINI_CELL_SIZE
                ]
                self.draw_rect(LIGHTYELLOW, pos, (MINI_CELL_SIZE, MINI_CELL_SIZE))

    def draw_solved_text(self):
        pos = [STT_LIST_POS[0] + 10, STT_LIST_POS[1] + 230]
        for solved_cell_text in self.strategy_result.description:
            pos[1] += 25
            self.text_to_screen(solved_cell_text, pos, 'stt_size', BLACK)

    def draw_strategy_list_section(self, title, strats, start_pos):
        # Initial positions for list and indicator
        pos_list = [start_pos[0] + 10, start_pos[1] + 10]
        pos_indicator = [start_pos[0] + 200, start_pos[1] + 10]

        # Draw the title
        self.text_to_screen(title, pos_list, 'stt_size', BLACK)
        pos_list[1] += 10
        pos_indicator[1] += 10

        successful_strategy_name = self.strategy_result.name if self.strategy_result else None
        should_print_no = True  # Flag to decide if 'NO' should be printed

        for strategy in strats:
            # Increment positions for the next strategy
            pos_list[1] += 25
            pos_indicator[1] += 25

            # Determine the style based on whether it's the successful strategy
            is_active_strategy = strategy == successful_strategy_name
            style = 'stt_size_bold' if is_active_strategy else 'stt_size'

            # Draw the strategy name
            self.text_to_screen(strategy, pos_list, style, BLACK)

            # If this is the successful strategy, print 'YES' and update the flag
            if is_active_strategy:
                self.text_to_screen('YES', pos_indicator, 'stt_size_bold', GREEN)
                should_print_no = False  # We found a 'YES', so we won't print 'NO' anymore
            elif should_print_no and self.strategy_result:
                # If we haven't found a 'YES' and the flag is still True, print 'NO'
                self.text_to_screen('NO', pos_indicator, 'stt_size_bold', RED)

    def draw_strategy_list(self):
        basic_strategies_start = [STT_LIST_POS[0] + 10, STT_LIST_POS[1] + 10]
        tough_strategies_start = [STT_LIST_POS[0] + 280, STT_LIST_POS[1] + 10]

        self.draw_strategy_list_section('Basic Strategies', self.basic_stt_list, basic_strategies_start)
        self.draw_strategy_list_section('Tough Strategies', self.tough_stt_list, tough_strategies_start)

    def mouse_on_grid(self):
        if self.mousePos[0] < GRID_POS[0] or self.mousePos[1] < GRID_POS[1]:
            return False

        if self.mousePos[0] > GRID_POS[0] + GRID_SIZE or self.mousePos[1] > GRID_POS[1] + GRID_SIZE:
            return False

        return (self.mousePos[0] - GRID_POS[0]) // CELL_SIZE, (self.mousePos[1] - GRID_POS[1]) // CELL_SIZE

    def handle_button_action(self, button_text):
        match button_text:
            case 'Check':
                if self.solver.board_solved():
                    print("Solved!")
                else:
                    print("Not solved!")

            case 'Load':
                pass
                # self.load_test_puzzle(test_boards.TESTBOARD_npair)

            case 'Easy':
                self.get_puzzle('1')

            case 'Medium':
                self.get_puzzle2('3')

            case 'Hard':
                self.get_puzzle2('4')

            case 'Evil':
                self.get_puzzle2('Evil')

            case 'Solution Count':
                solution_count.count_solutions(self.board.puzzle)

            case 'Solve':
                pass

            case 'Next Step':
                print('button pressed')
                self.step_handler()

            case _:
                print(f'No action defined for {button_text}')

    def load_buttons(self):
        for props in BUTTON_PROPERTIES:
            self.playingButtons.append(Button(**props))

    def text_to_screen(self, text, pos, size, colour):
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
            pos[0] += (MINI_CELL_SIZE - fontWidth) // 2
            pos[1] += (MINI_CELL_SIZE - fontHeight) // 2
        elif size == 'stt_size':
            font = self.stt_font.render(text, True, colour)
        elif size == 'stt_size_bold':
            font = self.stt_bold_font.render(text, True, colour)

        self.window.blit(font, pos)
