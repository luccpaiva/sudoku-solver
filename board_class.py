class Board:
    def __init__(self, puzzle: list[list[int]] = None):
        self.puzzle = {}  # Dict for the initial puzzle, with cells as keys and their fixed numbers as values
        self.current_board = {}  # Dict for the current state of the board
        if puzzle:
            self.load_board(puzzle)

    def load_board(self, puzzle: list[list[int]]):
        assert len(puzzle) == 9 and all(len(row) == 9 for row in puzzle), "Invalid puzzle size"

        self.puzzle.clear()
        self.current_board.clear()

        for row in range(9):
            for col in range(9):
                if puzzle[row][col] != 0:
                    cell = (row, col)
                    self.puzzle[cell] = puzzle[row][col]
                    self.current_board[cell] = puzzle[row][col]  # Board gets the initial state from the puzzle

    def print_board(self):
        for i in range(9):
            if i % 3 == 0 and i > 0:
                print("- - - - - - - - - - - -")
            for j in range(9):
                if j % 3 == 0 and j > 0:
                    print("| ", end="")
                print(self.current_board[i, j] if self.current_board[i, j] != 0 else ".", end=" ")
            print()

    def get_board_state(self):
        # Returns a shallow copy of the current board state
        return self.current_board.copy()
