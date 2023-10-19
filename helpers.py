from itertools import chain, combinations

# Constants
# ///////////////////////////////////////////////////////////////
FULL_SET = set(range(1, 10))

# Type hints
# ///////////////////////////////////////////////////////////////
Cell = tuple[int, int]
BoardType = dict[Cell, int]


# Conversion functions
# ///////////////////////////////////////////////////////////////
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


def format_cell(cell):
    """Represent cell coordinate as per your system."""
    return f"{int2char(cell[0])}{cell[1] + 1}"


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


# Board functions
# ///////////////////////////////////////////////////////////////
def get_cells(board: BoardType, *cells: Cell) -> set[int]:
    """Return a set of all values in the given cells."""
    results = set()
    for cell in cells:
        value = board.get(cell)  # Default to None if the cell is not in the board
        if value is not None and value != 0:
            results.add(value)
    return results


def set_cells(board, cells: list[tuple[Cell, int]]):
    """Set the given cells to the given values."""
    for cell, value in cells:
        board.board[cell] = value

    # return board


def print_possibles(board: BoardType):
    for i in range(9):
        for j in range(9):
            key = (i, j)
            if key in board:
                print(f"{board[key]}", end=" ")
            else:
                # If the key doesn't exist, print a placeholder
                print("_", end=" ")
        print()


# Solver text format
# ///////////////////////////////////////////////////////////////
def format_hidden_single_text(cell: Cell, hidden_single, hidden_in_units):
    """Formats the descriptive text for a found hidden single."""
    unit_names = {'row': 'row', 'col': 'column', 'box': 'box'}
    units_text = ', '.join([unit_names[unit] for unit in hidden_in_units])

    # If there are multiple units, use 'and' for the last one
    if len(hidden_in_units) > 1:
        last_comma_idx = units_text.rfind(',')
        units_text = units_text[:last_comma_idx] + ' and' + units_text[last_comma_idx + 1:]

    text = f"{pos2cord(cell)} set to {hidden_single}. Unique in {units_text}"
    return text


def format_naked_pairs_text(result_dict):
    text = []
    for pair, data in result_dict.items():
        candidates = "/".join(map(str, data['candidates']))
        cells = "/".join([format_cell(cell) for cell in pair])

        for unit_type, cells_to_remove_from in data['common_units'].items():
            if cells_to_remove_from:  # Check if set is not empty
                removal_cells = ", ".join([format_cell(cell) for cell in cells_to_remove_from])
                text.append(f"NAKED PAIR ({unit_type}): {cells} removes {candidates} from {removal_cells}")

    return text


# Solver functions
# ///////////////////////////////////////////////////////////////
def powerset(iterable):
    """Return a powerset of the given iterable."""
    # powerset([1,2,3]) --> () (1,) (2,) (3,) (1,2) (1,3) (2,3) (1,2,3)
    s = set(iterable)  # allows duplicate elements
    return chain.from_iterable(combinations(s, r) for r in range(1, len(s) + 1))
