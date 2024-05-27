import utils


def naked_singles(unsolved_cells):
    n_singles = []
    for cell, candidates in unsolved_cells.items():
        # Check if the cell has only one candidate
        if len(candidates) == 1:
            value = next(iter(candidates))
            n_singles.append((cell, value))

    n_singles_text = [f"{utils.pos2cord(cell)} set to {value}." for cell, value in n_singles]

    return n_singles, n_singles_text
