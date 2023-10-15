from itertools import chain, combinations

Cell = tuple[int, int]
BoardType = dict[Cell, int]


def is_int(string):
    """Check if a string is an integer."""
    try:
        int(string)
        return True
    except ValueError:
        return False


def int2char(integer):
    """Convert an integer to its character representation. Skip 'I' to avoid confusion with '1'."""
    if integer == 8:
        return "J"
    else:
        return chr(65 + integer)


def char2int(char):
    """Convert a character to its integer representation. Skip 'I' to avoid confusion with '1'"""
    if char == "J":
        return "8"
    else:
        return str(ord(char) - 1)


def pos2cord(pos):
    """Convert a position tuple (row, col) to its string representation."""
    return int2char(pos[0]) + str(pos[1] + 1)


def flatten(self) -> list[int]:
    """Flatten the current Sudoku board into a single list."""
    return [item for sublist in self.board for item in sublist]


def arr2str(arr: list[int]) -> str:
    """Convert a flattened Sudoku list into its string representation.
    Empty cells (0) are represented by '.'."""
    return ''.join(str(digit) if digit != 0 else '.' for digit in arr)


def grid2str(self) -> str:
    """Convert the current 2D Sudoku board to its string representation."""
    return self.arr2str(self.flatten())


def str2arr(string):
    """Convert a string representation of a Sudoku board into a flattened list."""
    arr = []
    end = string.find('-')
    end = len(string) if end == -1 else end
    for c in string[0:end]:
        if c == '.':
            arr.append(0)
        else:
            arr.append(int(c))
    return arr


def str2grid(string: str) -> list[list[int]]:
    """Convert a string representation of a Sudoku board into a 2D list."""
    return unflatten(str2arr(string))


def unflatten(arr: list[int], n=9):
    """Convert a flattened Sudoku list into a 2D list."""
    grid = []
    for i in range(0, len(arr), n):
        grid.append(arr[i:i + n])
    return grid


def get_cells(board: BoardType, *cells: Cell) -> set[int]:
    results = set()
    for cell in cells:
        value = board.get(cell)  # Default to None if the cell is not in the board
        if value is not None and value != 0:
            results.add(value)
    return results


def set_cells(board, *cells_values):
    for cell, value in cells_values:
        if value != 0:
            board[cell] = value
        elif cell in board:  # If the value is set to 0, remove the key from the board dictionary if it exists
            del board[cell]


def get_visible_cells(cell):
    row, col = cell
    row_units = [(row, i) for i in range(9)]
    col_units = [(i, col) for i in range(9)]

    # Calculate the box coordinates
    start_row, start_col = 3 * (row // 3), 3 * (col // 3)
    box_units = [(i, j) for i in range(start_row, start_row + 3) for j in range(start_col, start_col + 3)]

    visible = set(row_units + col_units + box_units)

    # Exclude the current cell from the visible set
    visible.discard(cell)

    return visible


def powerset(iterable):
    # powerset([1,2,3]) --> () (1,) (2,) (3,) (1,2) (1,3) (2,3) (1,2,3)
    s = set(iterable)  # allows duplicate elements
    return chain.from_iterable(combinations(s, r) for r in range(1, len(s) + 1))


FULL_SET = set(range(1, 10))
