import utils


def naked_singles(board):
    n_singles = []
    for cell, possibles in board.items():
        # Check if the cell has only one candidate
        if len(possibles) == 1:
            value = next(iter(possibles))
            n_singles.append((cell, value))

    n_singles_text = [f"{utils.pos2cord(cell)} set to {value}." for cell, value in n_singles]

    return n_singles, n_singles_text
