
# CONSTANTS
# ///////////////////////////////////////////////////////////////
FULL_SET = set(range(1, 10))

# TYPE HINTS
# ///////////////////////////////////////////////////////////////
Cell = tuple[int, int]
BoardType = dict[Cell, int]


# CONVERSION FUNCTIONS
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


def dict2grid(input_dict) -> list[list[int]]:
    """Convert a dictionary to its string representation."""
    # Initialize an empty board with '.' as placeholders
    sudoku_board = [['.' for _ in range(9)] for _ in range(9)]

    # Populate the board with your values
    for (row, col), value in input_dict.items():
        sudoku_board[row][col] = str(value)  # Convert int to str for concatenation later

    # Convert the 2D list back to a single string representation
    grid = str2grid(''.join(''.join(row) for row in sudoku_board))

    return grid


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


# BOARD
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
    units_text = ', '.join([unit[1:] for unit in hidden_in_units])

    # If there are multiple units, use 'and' for the last one
    if len(hidden_in_units) > 1:
        last_comma_idx = units_text.rfind(',')
        units_text = units_text[:last_comma_idx] + ' and' + units_text[last_comma_idx + 1:]

    text = f"{pos2cord(cell)} set to {hidden_single}. Unique in {units_text}"
    return text


def format_naked_hidden_sets_text(result_dict, naked_hidden_set_name):
    text = []
    for conjugate, data in result_dict.items():
        candidates = "/".join(map(str, data['candidates']))
        cells = "/".join([format_cell(cell) for cell in conjugate])

        # If there are common units, add them to the text
        if 'Naked' in naked_hidden_set_name:

            for unit_type, cells_to_remove_from in data['common_units'].items():
                if cells_to_remove_from:  # Check if set is not empty
                    removal_cells = ", ".join([format_cell(c) for c in cells_to_remove_from])
                    unit_name = unit_type[1:]
                    text.append(
                        f"{naked_hidden_set_name} ({unit_name}): {cells} removes {candidates} from {removal_cells}")

        else:
            removal_cells = ", ".join([format_cell(c) for c in conjugate])
            text.append(f"{naked_hidden_set_name} {cells} removes {candidates} from {removal_cells}")

    return text
