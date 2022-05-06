# ******************************************************************************************************************


def hidden_singles(board, possibles):
    # CHECK BOX
    print("method 2")
    hiddenSinglesPos_box = []
    t1 = time.time()
    iterations = 0
    # Check each cell. Redundant but that way it is easy to get the hidden single coordinates
    for i in range(9):
        for j in range(9):
            # only search the remaining possibles within the box
            r = get_placed_numbers_box(board, i, j)
            p = [1, 2, 3, 4, 5, 6, 7, 8, 9]
            p = [_ for _ in p if _ not in r]  # final list with only possible candidates
            k = 0  # index for p
            # get box index
            ii = 3 * (i // 3)
            jj = 3 * (j // 3)
            while k < len(p):
                count = 0
                ibox_loop_must_break = False
                for ibox in range(ii, ii + 3):
                    for jbox in range(jj, jj + 3):
                        iterations += 1
                        if possibles[ibox][jbox][p[k] - 1] != 0:
                            count += 1
                            if count > 1:
                                k += 1
                                ibox_loop_must_break = True
                                break
                    if ibox_loop_must_break:
                        break
                if count == 1:
                    if possibles[i][j][p[k] - 1] != 0:
                        hiddenSinglesPos_box.append([i + 1, j + 1, p[k]])
                    k += 1

    deltaTT = time.time() - t1
    # print(deltaTT)
    print(f"Iterations: {iterations}")
    print(f"{str(len(hiddenSinglesPos_box))} hidden singles")
    print(str(hiddenSinglesPos_box))
    print("")
    print("")

    # CHECK BOX
    print("method 3")
    hiddenSinglesPos_box = []
    t2 = time.time()
    iterations = 0
    # Check each cell. Redundant but that way it is easy to get the hidden single coordinate, not only
    # to know that it is in the box
    for i in range(9):
        for j in range(9):
            p = [0, 1, 2, 3, 4, 5, 6, 7, 8]
            for k, num in enumerate(p):
                count = 0
                ii = 3 * (i // 3)
                jj = 3 * (j // 3)
                ibox_loop_must_break = False
                for ibox in range(ii, ii + 3):
                    for jbox in range(jj, jj + 3):
                        iterations += 1
                        if possibles[ibox][jbox][k] != 0:
                            count += 1
                            if count > 1:
                                ibox_loop_must_break = True
                                break
                    if ibox_loop_must_break: break
                if count == 1 and possibles[i][j][k] != 0:
                    hiddenSinglesPos_box.append([i + 1, j + 1, k + 1])
                    p.pop(num)  # if there is a hidden single in the box, remove this number for future search
    deltaTTT = time.time() - t2
    # print(deltaTTT)
    print(f"Iterations: {iterations}")
    print(f"{str(len(hiddenSinglesPos_box))} hidden singles")
    print(str(hiddenSinglesPos_box))


# GET NUMBERS FROM BOX
# Returns the list of numbers that are already placed on a box
# ///////////////////////////////////////////////////////////////
def get_placed_numbers_box(board, i, j):
    num_in_box = [0, 0, 0, 0, 0, 0, 0, 0, 0]
    ii = 3 * (i // 3)
    jj = 3 * (j // 3)
    for ibox in range(ii, ii + 3):
        for jbox in range(jj, jj + 3):
            if board[ibox][jbox] != 0:
                num_in_box[board[ibox][jbox] - 1] = board[ibox][jbox]
    return num_in_box


# ******************************************************************************************************************


def hidden_singles_2(board, possibles):
    # CHECK BOX
    # ///////////////////////////////////////////////////////////////
    h_singles_box = []
    # iterate over each cell in the board
    for i, row in enumerate(board):
        for j, bnum in enumerate(row):

            # if the cell already has a placed number, skip
            if bnum != 0:
                continue

            # get box index
            ii = 3 * (i // 3)
            jj = 3 * (j // 3)

            # reduce the candidate list of cell to only non-zeros
            p = [_ for _ in possibles[i][j] if _ != 0]

            # for each candidate, check the box for a hidden single
            for k, pnum in enumerate(p):

                count = 0

                for ibox in range(ii, ii + 3):
                    for jbox in range(jj, jj + 3):

                        # skip again if the cell within the box has a placed number
                        if board[ibox][jbox] != 0:
                            continue

                        if possibles[ibox][jbox][pnum - 1] != 0:
                            count += 1

                if count == 1:
                    h_singles_box.append([i, j, pnum])

    # CHECK ROW
    # ///////////////////////////////////////////////////////////////
    h_singles_row = []
    # iterate over each cell in the board
    for i, row in enumerate(board):
        for j, bnum in enumerate(row):

            # if the cell already has a placed number, skip
            if bnum != 0:
                continue

            # reduce the candidate list of cell to only non-zeros
            p = [_ for _ in possibles[i][j] if _ != 0]

            # for each candidate, check the row for a hidden single
            for k, pnum in enumerate(p):

                count = 0

                for col in range(9):

                    # skip again if the cell within the line has a placed number
                    if board[i][col] != 0:
                        continue

                    if possibles[i][col][pnum - 1] != 0:
                        count += 1

                if count == 1:
                    h_singles_row.append([i, j, pnum])

    # CHECK COLUMN
    # ///////////////////////////////////////////////////////////////
    h_singles_col = []
    # iterate over each cell in the board
    for i, c_row in enumerate(board):
        for j, bnum in enumerate(c_row):

            # if the cell already has a placed number, skip
            if bnum != 0:
                continue

            # reduce the candidate list of cell to only non-zeros
            p = [_ for _ in possibles[i][j] if _ != 0]

            # for each candidate, check the col for a hidden single
            for k, pnum in enumerate(p):

                count = 0

                for row in range(9):

                    # skip again if the cell within the line has a placed number
                    if board[row][j] != 0:
                        continue

                    if possibles[row][j][pnum - 1] != 0:
                        count += 1

                if count == 1:
                    h_singles_col.append([i, j, pnum])

    h_singles_temp = h_singles_box + h_singles_row + h_singles_col
    h_singles = []
    for elem in h_singles_temp:
        if elem not in h_singles:
            h_singles.append(elem)
    h_singles.sort()

    print("***********************************************************")
    print(f"Hidden singles: {len(h_singles)}")

    for i, num in enumerate(h_singles):
        if num in h_singles_row and num in h_singles_col and num in h_singles_box:
            print(f"{helpers.pos2cord(num)} set to {num[2]}. unique in Row, Column and Box")
        elif num in h_singles_row and num in h_singles_col:
            print(f"{helpers.pos2cord(num)} set to {num[2]}. unique in Row and Column")
        elif num in h_singles_row and num in h_singles_box:
            print(f"{helpers.pos2cord(num)} set to {num[2]}. unique in Row and Box")
        elif num in h_singles_col and num in h_singles_box:
            print(f"{helpers.pos2cord(num)} set to {num[2]}. unique in Column and Box")
        elif num in h_singles_row:
            print(f"{helpers.pos2cord(num)} set to {num[2]}. unique in Row")
        elif num in h_singles_col:
            print(f"{helpers.pos2cord(num)} set to {num[2]}. unique in Column")
        else:
            print(f"{helpers.pos2cord(num)} set to {num[2]}. unique Box")


   # CHECK BOX
    # ///////////////////////////////////////////////////////////////


# print(n_set)
# print(len(n_set))
# for k in n_set:
#     print(helpers.pos2cord(k))

# print(n_set)
# for i in n_set:
#     print(helpers.pos2cord(i))
# print("***")

# print(n_set)

# def hidden_pair_triple_quads(possibles):
#     # CHECK BOX
#     # ///////////////////////////////////////////////////////////////
#     naked_sets_box = []
#     hidden_sets_box = []
#     n_pairs_box = []
#     h_pairs_box = []
#     n_triples_box = []
#     n_quads_box = []

# for i in range(1, 2):
#     for j in range(2, 3):
#         table_box = {_: set() for _ in FULL_SET}
#
#         ii = i * 3
#         jj = j * 3
#
#         for ibox in range(ii, ii + 3):
#             for jbox in range(jj, jj + 3):
#                 for p in possibles[ibox][jbox]:
#                     table_box[p].add((ibox, jbox))
#
#             pass
#
# print(table_box)


# print(len(n_pairs_box))
# print(n_pairs_box)
#
# print(len(h_pairs_box))
# print(h_pairs_box)
# pass



# ***************************************************************************************************************
    #NAKED PAIRS

    # For each unit, check if the cell has only two candidates
    # Then, select this candidate and compare it with the other candidates in the unit

    n_pairs_box = []
    n_pairs_row = []
    n_pairs_col = []

    for i, row in enumerate(possibles):
        aa = len(row)
        for j, p in enumerate(row):
            if len(p) == 2:
                # CHECK BOX
                # ///////////////////////////////////////////////////////////////
                ii = 3 * (i // 3)
                jj = 3 * (j // 3)

                count_empty = 0
                for ibox in range(ii, ii + 3):
                    for jbox in range(jj, jj + 3):
                        if len(possibles[ibox][jbox]) == 0: count_empty += 1
                        if [i, j] != [ibox, jbox] and possibles[i][j] == possibles[ibox][jbox]:
                            n_pairs_box.append([ibox, jbox])

                if count_empty == 7: n_pairs_box.pop(-1)

                # CHECK ROW
                # ///////////////////////////////////////////////////////////////
                count_empty = 0
                for k in range(len(row)):
                    if len(possibles[i][k]) == 0: count_empty += 1
                    if k != j and possibles[i][k] == possibles[i][j]:
                        n_pairs_row.append([i, k])

                if count_empty == 7: n_pairs_row.pop(-1)

                # CHECK COL
                # ///////////////////////////////////////////////////////////////
                count_empty = 0
                for k in range(len(row)):
                    if len(possibles[k][j]) == 0: count_empty += 1
                    if k != i and possibles[k][j] == possibles[i][j]:
                        n_pairs_col.append([k, j])

                if count_empty == 7: n_pairs_col.pop(-1)

    n_pairs = n_pairs_box + n_pairs_row + n_pairs_col

    print("***********************************************************")
    print(f"Naked Pairs: {len(n_pairs)}")

    # for i, num in enumerate(n_pairs, step=2):
    #     pair =
    #
    # if len(n_pairs) > 0:
    #     return "Hidden Singles", True, n_pairs, n_pairs_text
    # else:
    #     return "Naked Singles", False

    for i in n_pairs_box:
        print(helpers.pos2cord(i))

    print("*************")

    for i in n_pairs_row:
        print(helpers.pos2cord(i))

    print("*************")

    for i in n_pairs_col:
        print(helpers.pos2cord(i))