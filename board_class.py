from utils import CellType, BoardType


class Board:
    def __init__(self, puzzle: list[list[int]] = None):
        self.puzzle = {}  # Dict for the initial puzzle
        self.board = {}  # Dict for the current state of the board
        self.possibles = {}  # Dict for possible values for each cell
        if puzzle:
            self.load_board(puzzle)

    def load_board(self, puzzle: list[list[int]]):
        assert len(puzzle) == 9 and all(len(row) == 9 for row in puzzle), "Invalid puzzle size"

        self.puzzle.clear()
        self.board.clear()

        self.puzzle = {
            (row, col): value
            for row, row_data in enumerate(puzzle)
            for col, value in enumerate(row_data) if value != 0
        }

        self.board = self.puzzle.copy()  # Board gets the initial state from the puzzle
        self.initialize_possibles()

    def initialize_possibles(self):
        all_cells = {(i, j): set(range(1, 10)) for i in range(9) for j in range(9)}
        self.possibles = {key: value for key, value in all_cells.items() if key not in self.puzzle}

    def print_board(self):
        for i in range(9):
            if i % 3 == 0 and i > 0:
                print("- - - - - - - - - - - -")
            for j in range(9):
                if j % 3 == 0 and j > 0:
                    print("| ", end="")
                print(self.board[i, j] if self.board[i, j] != 0 else ".", end=" ")
            print()

    def get_board_state(self):
        return self.board.copy()
