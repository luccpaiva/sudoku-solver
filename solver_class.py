from itertools import chain, combinations

import helpers
from board_class import Board


class Solver:
    def __init__(self, board: Board):
        self.board = board.get_board_state()
        self.possibles = self.initialize_possibles()
        self.update_possibles()
        # self.naked_singles()

    def initialize_possibles(self):
        # Initialize possibilities for all cells
        all_cells = {(i, j): set(range(1, 10)) for i in range(9) for j in range(9)}

        # Filter out the cells that already have a value in self.board
        empty_cells_possibles = {key: value for key, value in all_cells.items() if key not in self.board}

        return empty_cells_possibles

    def update_possibles(self):
        for cell in self.possibles.keys():
            visible_cells = helpers.get_visible_cells(cell)
            taken_numbers = helpers.get_cells(self.board, *visible_cells)
            self.possibles[cell] = helpers.FULL_SET - taken_numbers

    def print_possibles(self):
        for i in range(9):
            for j in range(9):
                key = (i, j)
                if key in self.possibles:
                    print(f"{self.possibles[key]}", end=" ")
                else:
                    # If the key doesn't exist, print a placeholder
                    print("_", end=" ")
            print()

    def naked_singles(self):
        n_singles = []
        for cell, possibles in self.possibles.items():
            # Check if the cell has only one candidate
            if len(possibles) == 1:
                value = possibles.pop()
                self.board[cell] = value
                del self.possibles[cell]

                n_singles.append([*cell, value])

        # Prepare messages for the found cells
        n_singles_text = [f"Cell {cell} set to {value}." for *cell, value in n_singles]

        print("***********************************************************")
        print(f"Naked singles: {len(n_singles)}")
        for text in n_singles_text:
            print(text)

    def list_solved_cells(board, possibles, solved_list):
        for solved_candidate in solved_list:
            board[solved_candidate[0]][solved_candidate[1]] = solved_candidate[2]
            possibles[solved_candidate[0]][solved_candidate[1]] = set()

    def list_solved_candidates(possibles, solved_list):
        for solved_candidate in solved_list:
            possibles[solved_candidate[0]][solved_candidate[1]].pop(solved_candidate[2])

    def naked_singles(possibles):
        # Check if the cell has only one candidate
        n_singles = []
        n_singles_text = []
        for i, row in enumerate(possibles):
            for j, p in enumerate(row):
                if len(p) == 1:
                    n_singles.append([i, j, int(str(p)[1:2])])

        print("***********************************************************")
        print(f"Naked singles: {str(len(n_singles))}")

        for i, num in enumerate(n_singles):
            text = f"{helpers.pos2cord(num)} set to {num[2]}."
            print(text)
            n_singles_text.append(text)

        if len(n_singles) > 0:
            return "Naked Singles", True, list(n_singles), n_singles_text
        else:
            return "Naked Singles", False

    def hidden_singles(possibles):
        # For each unit, store in a dict all possible positions for a given candidate.
        # If the candidate has only one place to go, it is a hidden single

        # CHECK BOX
        # ///////////////////////////////////////////////////////////////
        h_singles_box = set()
        h_singles_text = []
        for i in range(3):
            for j in range(3):
                table_box = {_: [] for _ in FULL_SET}

                ii = i * 3
                jj = j * 3

                for ibox in range(ii, ii + 3):
                    for jbox in range(jj, jj + 3):
                        for p in possibles[ibox][jbox]:
                            table_box[p].append((ibox, jbox))

                for p in table_box:
                    if len(table_box[p]) == 1:
                        h_singles_box.add(table_box[p][0] + (p,))

        # CHECK ROW
        # ///////////////////////////////////////////////////////////////
        h_singles_row = set()
        for i in range(9):
            table_row = {_: [] for _ in FULL_SET}

            for k in range(9):
                for p in possibles[i][k]:
                    table_row[p].append((i, k))

            for p in table_row:
                if len(table_row[p]) == 1:
                    h_singles_row.add(table_row[p][0] + (p,))

        # CHECK COL
        # ///////////////////////////////////////////////////////////////
        h_singles_col = set()
        for j in range(9):
            table_col = {_: [] for _ in FULL_SET}

            for k in range(9):
                for p in possibles[k][j]:
                    table_col[p].append((k, j))

            for p in table_col:
                if len(table_col[p]) == 1:
                    h_singles_col.add(table_col[p][0] + (p,))

        h_singles = list({*h_singles_row, *h_singles_col, *h_singles_box})
        h_singles.sort()

        rcb = set.intersection(h_singles_row, h_singles_col, h_singles_box)
        rc = set.intersection(h_singles_row, h_singles_col)
        rb = set.intersection(h_singles_row, h_singles_box)
        cb = set.intersection(h_singles_col, h_singles_box)

        print("***********************************************************")
        print(f"Hidden singles: {str(len(h_singles))}")
        for i, num in enumerate(h_singles):
            if num in rcb:
                text = f"{helpers.pos2cord(num)} set to {num[2]}. unique in Row, Column and Box"
                print(text)
                h_singles_text.append(text)
            elif num in rc:
                text = f"{helpers.pos2cord(num)} set to {num[2]}. unique in Row and Column"
                print(text)
                h_singles_text.append(text)
            elif num in rb:
                text = f"{helpers.pos2cord(num)} set to {num[2]}. unique in Row and Box"
                print(text)
                h_singles_text.append(text)
            elif num in cb:
                text = f"{helpers.pos2cord(num)} set to {num[2]}. unique in Column and Box"
                print(text)
                h_singles_text.append(text)
            elif num in h_singles_row:
                text = f"{helpers.pos2cord(num)} set to {num[2]}. unique in Row"
                print(text)
                h_singles_text.append(text)
            elif num in h_singles_col:
                text = f"{helpers.pos2cord(num)} set to {num[2]}. unique in Column"
                print(text)
                h_singles_text.append(text)
            else:
                text = f"{helpers.pos2cord(num)} set to {num[2]}. unique Box"
                print(text)
                h_singles_text.append(text)

        if len(h_singles) > 0:
            return "Hidden Singles", True, list(h_singles), h_singles_text
        else:
            return "Hidden Singles", False

    def naked_pairs(possibles):
        n_pairs_box = []
        h_pairs_box = []
        n_triples_box = []
        n_pairs_row = []
        n_pairs_col = []

        for i, row in enumerate(possibles):
            for j, p in enumerate(row):
                if 0 < len(p) < 5:
                    # CHECK BOX
                    # ///////////////////////////////////////////////////////////////
                    ii = 3 * (i // 3)
                    jj = 3 * (j // 3)

                    count_empty = 0
                    count_matches = 0
                    match_pos = []
                    for ibox in range(ii, ii + 3):
                        for jbox in range(jj, jj + 3):

                            if len(possibles[ibox][jbox]) == 0: count_empty += 1

                            if [i, j] != [ibox, jbox] and possibles[ibox][jbox] <= p if possibles[ibox][
                                jbox] else False:
                                count_matches += 1
                                match_pos.append([ibox, jbox])

                    if count_matches == 1 and count_empty != (9 - len(p)):
                        if len(p) == 2:
                            for k in match_pos:
                                n_pairs_box.append(k)
                        else:
                            for k in match_pos:
                                h_pairs_box.append(k)
                        # n_pairs_box.append(match_pos)

                    if len(p) <= 3 and count_matches == 2 and count_empty != (9 - len(p)):
                        for k in match_pos:
                            n_triples_box.append(k)
                        # n_triples_box.append(match_pos)

        # print(n_pairs_box)
        #
        # print(n_triples_box)

        # for i in n_pairs_box:
        #     print(helpers.pos2cord(i), end=" ")
        #
        # print()
        #
        # for i in n_triples_box:
        #     print(helpers.pos2cord(i), end=" ")

        # what it should print:
        print("naked pairs: A2/A3 ; C6/C9 ; E4/E5 ; D7/F7")

        for i in h_pairs_box:
            print(helpers.pos2cord(i), end=" ")
