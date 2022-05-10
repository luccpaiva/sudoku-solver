import helpers
from itertools import chain, combinations

FULL_SET = set(range(1, 10))


def powerset(iterable):
    # powerset([1,2,3]) --> () (1,) (2,) (3,) (1,2) (1,3) (2,3) (1,2,3)
    s = set(iterable)  # allows duplicate elements
    return chain.from_iterable(combinations(s, r) for r in range(1, len(s) + 1))


def board_is_solved(board):
    for i, row in enumerate(board):
        if 0 in row:
            return False
    return True


def visible_cells(idx):
    # TODO consider update this method to make it possible to use the indices directly with an array
    cells_seen_temp = []
    for i in range(9):
        cells_seen_temp.append([idx[0], i])
        cells_seen_temp.append([i, idx[1]])

    ii = 3 * (idx[0] // 3)
    jj = 3 * (idx[1] // 3)

    for ibox in range(ii, ii + 3):
        for jbox in range(jj, jj + 3):
            cells_seen_temp.append([ibox, jbox])

    cells_seen = []
    for elem in cells_seen_temp:
        if elem not in cells_seen:
            cells_seen.append(elem)

    cells_seen.sort()

    return cells_seen


# gets a list of solved cells in the format [row (int), col (int), single_candidate (set)]
def list_solved_cells(board, possibles, solved_list):
    for solved_candidate in solved_list:
        board[solved_candidate[0]][solved_candidate[1]] = solved_candidate[2]
        possibles[solved_candidate[0]][solved_candidate[1]] = set()


def list_solved_candidates(possibles, solved_list):
    for solved_candidate in solved_list:
        possibles[solved_candidate[0]][solved_candidate[1]].pop(solved_candidate[2])


def initiate_possibles(board):
    possibles: list = [None] * 9
    for i in range(9):
        possibles[i] = [None] * 9
        for j in range(9):

            if board[i][j] == 0:
                possibles[i][j] = FULL_SET.copy()
            else:
                possibles[i][j] = set()

    return possibles


def get_possibles(board, possibles):
    for i in range(9):
        for j in range(9):
            taken = set()
            for row, col in visible_cells([i, j]):
                taken.add(board[row][col])
            possibles[i][j] -= taken

    # TODO understand why this doesn't work as substitute of lines 74,75:
    # taken.add(board[row][col] for row, col in visible_cells([i, j]))

    return possibles


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

                        if [i, j] != [ibox, jbox] and possibles[ibox][jbox] <= p if possibles[ibox][jbox] else False:
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

    for i in h_pairs_box:
        print(helpers.pos2cord(i), end=" ")
