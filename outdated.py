# def hidden_singles(board, possibles):
#     # CHECK BOX
#     print("method 2")
#     hiddenSinglesPos_box = []
#     t1 = time.time()
#     iterations = 0
#     # Check each cell. Redundant but that way it is easy to get the hidden single coordinates
#     for i in range(9):
#         for j in range(9):
#             # only search the remaining possibles within the box
#             r = get_placed_numbers_box(board, i, j)
#             p = [1, 2, 3, 4, 5, 6, 7, 8, 9]
#             p = [_ for _ in p if _ not in r]  # final list with only possible candidates
#             k = 0  # index for p
#             # get box index
#             ii = 3 * (i // 3)
#             jj = 3 * (j // 3)
#             while k < len(p):
#                 count = 0
#                 ibox_loop_must_break = False
#                 for ibox in range(ii, ii + 3):
#                     for jbox in range(jj, jj + 3):
#                         iterations += 1
#                         if possibles[ibox][jbox][p[k] - 1] != 0:
#                             count += 1
#                             if count > 1:
#                                 k += 1
#                                 ibox_loop_must_break = True
#                                 break
#                     if ibox_loop_must_break:
#                         break
#                 if count == 1:
#                     if possibles[i][j][p[k] - 1] != 0:
#                         hiddenSinglesPos_box.append([i + 1, j + 1, p[k]])
#                     k += 1
#
#     deltaTT = time.time() - t1
#     # print(deltaTT)
#     print(f"Iterations: {iterations}")
#     print(f"{str(len(hiddenSinglesPos_box))} hidden singles")
#     print(str(hiddenSinglesPos_box))
#     print("")
#     print("")
#
#     # CHECK BOX
#     print("method 3")
#     hiddenSinglesPos_box = []
#     t2 = time.time()
#     iterations = 0
#     # Check each cell. Redundant but that way it is easy to get the hidden single coordinate, not only
#     # to know that it is in the box
#     for i in range(9):
#         for j in range(9):
#             p = [0, 1, 2, 3, 4, 5, 6, 7, 8]
#             for k, num in enumerate(p):
#                 count = 0
#                 ii = 3 * (i // 3)
#                 jj = 3 * (j // 3)
#                 ibox_loop_must_break = False
#                 for ibox in range(ii, ii + 3):
#                     for jbox in range(jj, jj + 3):
#                         iterations += 1
#                         if possibles[ibox][jbox][k] != 0:
#                             count += 1
#                             if count > 1:
#                                 ibox_loop_must_break = True
#                                 break
#                     if ibox_loop_must_break: break
#                 if count == 1 and possibles[i][j][k] != 0:
#                     hiddenSinglesPos_box.append([i + 1, j + 1, k + 1])
#                     p.pop(num)  # if there is a hidden single in the box, remove this number for future search
#     deltaTTT = time.time() - t2
#     # print(deltaTTT)
#     print(f"Iterations: {iterations}")
#     print(f"{str(len(hiddenSinglesPos_box))} hidden singles")
#     print(str(hiddenSinglesPos_box))
#
#
# def get_placed_numbers_box(board, i, j):
#     num_in_box = [0, 0, 0, 0, 0, 0, 0, 0, 0]
#     ii = 3 * (i // 3)
#     jj = 3 * (j // 3)
#     for ibox in range(ii, ii + 3):
#         for jbox in range(jj, jj + 3):
#             if board[ibox][jbox] != 0:
#                 num_in_box[board[ibox][jbox] - 1] = board[ibox][jbox]
#     return num_in_box
#
#
# def hidden_singles_2(board, possibles):
#     # CHECK BOX
#     # ///////////////////////////////////////////////////////////////
#     h_singles_box = []
#     # iterate over each cell in the board
#     for i, row in enumerate(board):
#         for j, bnum in enumerate(row):
#
#             # if the cell already has a placed number, skip
#             if bnum != 0:
#                 continue
#
#             # get box index
#             ii = 3 * (i // 3)
#             jj = 3 * (j // 3)
#
#             # reduce the candidate list of cell to only non-zeros
#             p = [_ for _ in possibles[i][j] if _ != 0]
#
#             # for each candidate, check the box for a hidden single
#             for k, pnum in enumerate(p):
#
#                 count = 0
#
#                 for ibox in range(ii, ii + 3):
#                     for jbox in range(jj, jj + 3):
#
#                         # skip again if the cell within the box has a placed number
#                         if board[ibox][jbox] != 0:
#                             continue
#
#                         if possibles[ibox][jbox][pnum - 1] != 0:
#                             count += 1
#
#                 if count == 1:
#                     h_singles_box.append([i, j, pnum])
#
#     # CHECK ROW
#     # ///////////////////////////////////////////////////////////////
#     h_singles_row = []
#     # iterate over each cell in the board
#     for i, row in enumerate(board):
#         for j, bnum in enumerate(row):
#
#             # if the cell already has a placed number, skip
#             if bnum != 0:
#                 continue
#
#             # reduce the candidate list of cell to only non-zeros
#             p = [_ for _ in possibles[i][j] if _ != 0]
#
#             # for each candidate, check the row for a hidden single
#             for k, pnum in enumerate(p):
#
#                 count = 0
#
#                 for col in range(9):
#
#                     # skip again if the cell within the line has a placed number
#                     if board[i][col] != 0:
#                         continue
#
#                     if possibles[i][col][pnum - 1] != 0:
#                         count += 1
#
#                 if count == 1:
#                     h_singles_row.append([i, j, pnum])
#
#     # CHECK COLUMN
#     # ///////////////////////////////////////////////////////////////
#     h_singles_col = []
#     # iterate over each cell in the board
#     for i, c_row in enumerate(board):
#         for j, bnum in enumerate(c_row):
#
#             # if the cell already has a placed number, skip
#             if bnum != 0:
#                 continue
#
#             # reduce the candidate list of cell to only non-zeros
#             p = [_ for _ in possibles[i][j] if _ != 0]
#
#             # for each candidate, check the col for a hidden single
#             for k, pnum in enumerate(p):
#
#                 count = 0
#
#                 for row in range(9):
#
#                     # skip again if the cell within the line has a placed number
#                     if board[row][j] != 0:
#                         continue
#
#                     if possibles[row][j][pnum - 1] != 0:
#                         count += 1
#
#                 if count == 1:
#                     h_singles_col.append([i, j, pnum])
#
#     h_singles_temp = h_singles_box + h_singles_row + h_singles_col
#     h_singles = []
#     for elem in h_singles_temp:
#         if elem not in h_singles:
#             h_singles.append(elem)
#     h_singles.sort()
#
#     print("***********************************************************")
#     print(f"Hidden singles: {len(h_singles)}")
#
#     for i, num in enumerate(h_singles):
#         if num in h_singles_row and num in h_singles_col and num in h_singles_box:
#             print(f"{helpers.pos2cord(num)} set to {num[2]}. unique in Row, Column and Box")
#         elif num in h_singles_row and num in h_singles_col:
#             print(f"{helpers.pos2cord(num)} set to {num[2]}. unique in Row and Column")
#         elif num in h_singles_row and num in h_singles_box:
#             print(f"{helpers.pos2cord(num)} set to {num[2]}. unique in Row and Box")
#         elif num in h_singles_col and num in h_singles_box:
#             print(f"{helpers.pos2cord(num)} set to {num[2]}. unique in Column and Box")
#         elif num in h_singles_row:
#             print(f"{helpers.pos2cord(num)} set to {num[2]}. unique in Row")
#         elif num in h_singles_col:
#             print(f"{helpers.pos2cord(num)} set to {num[2]}. unique in Column")
#         else:
#             print(f"{helpers.pos2cord(num)} set to {num[2]}. unique Box")
#
#     # CHECK BOX
#     # ///////////////////////////////////////////////////////////////
#
#     # print(n_set)
#     # print(len(n_set))
#     # for k in n_set:
#     #     print(helpers.pos2cord(k))
#
#     # print(n_set)
#     # for i in n_set:
#     #     print(helpers.pos2cord(i))
#     # print("***")
#
#     # print(n_set)
#
#     # def hidden_pair_triple_quads(possibles):
#     #     # CHECK BOX
#     #     # ///////////////////////////////////////////////////////////////
#     #     naked_sets_box = []
#     #     hidden_sets_box = []
#     #     n_pairs_box = []
#     #     h_pairs_box = []
#     #     n_triples_box = []
#     #     n_quads_box = []
#
#     # for i in range(1, 2):
#     #     for j in range(2, 3):
#     #         table_box = {_: set() for _ in FULL_SET}
#     #
#     #         ii = i * 3
#     #         jj = j * 3
#     #
#     #         for ibox in range(ii, ii + 3):
#     #             for jbox in range(jj, jj + 3):
#     #                 for p in possibles[ibox][jbox]:
#     #                     table_box[p].add((ibox, jbox))
#     #
#     #             pass
#     #
#     # print(table_box)
#
#     # print(len(n_pairs_box))
#     # print(n_pairs_box)
#     #
#     # print(len(h_pairs_box))
#     # print(h_pairs_box)
#     # pass
#
#     # ***************************************************************************************************************
#     # NAKED PAIRS
#
#     # For each unit, check if the cell has only two candidates
#     # Then, select this candidate and compare it with the other candidates in the unit
#
#     n_pairs_box = []
#     n_pairs_row = []
#     n_pairs_col = []
#
#     for i, row in enumerate(possibles):
#         aa = len(row)
#         for j, p in enumerate(row):
#             if len(p) == 2:
#                 # CHECK BOX
#                 # ///////////////////////////////////////////////////////////////
#                 ii = 3 * (i // 3)
#                 jj = 3 * (j // 3)
#
#                 count_empty = 0
#                 for ibox in range(ii, ii + 3):
#                     for jbox in range(jj, jj + 3):
#                         if len(possibles[ibox][jbox]) == 0: count_empty += 1
#                         if [i, j] != [ibox, jbox] and possibles[i][j] == possibles[ibox][jbox]:
#                             n_pairs_box.append([ibox, jbox])
#
#                 if count_empty == 7: n_pairs_box.pop(-1)
#
#                 # CHECK ROW
#                 # ///////////////////////////////////////////////////////////////
#                 count_empty = 0
#                 for k in range(len(row)):
#                     if len(possibles[i][k]) == 0: count_empty += 1
#                     if k != j and possibles[i][k] == possibles[i][j]:
#                         n_pairs_row.append([i, k])
#
#                 if count_empty == 7: n_pairs_row.pop(-1)
#
#                 # CHECK COL
#                 # ///////////////////////////////////////////////////////////////
#                 count_empty = 0
#                 for k in range(len(row)):
#                     if len(possibles[k][j]) == 0: count_empty += 1
#                     if k != i and possibles[k][j] == possibles[i][j]:
#                         n_pairs_col.append([k, j])
#
#                 if count_empty == 7: n_pairs_col.pop(-1)
#
#     n_pairs = n_pairs_box + n_pairs_row + n_pairs_col
#
#     print("***********************************************************")
#     print(f"Naked Pairs: {len(n_pairs)}")
#
#     # for i, num in enumerate(n_pairs, step=2):
#     #     pair =
#     #
#     # if len(n_pairs) > 0:
#     #     return "Hidden Singles", True, n_pairs, n_pairs_text
#     # else:
#     #     return "Naked Singles", False
#
#     for i in n_pairs_box:
#         print(helpers.pos2cord(i))
#
#     print("*************")
#
#     for i in n_pairs_row:
#         print(helpers.pos2cord(i))
#
#     print("*************")
#
#     for i in n_pairs_col:
#         print(helpers.pos2cord(i))
#
#
# def naked_pairs2(self):
#     n_pairs = {}
#
#     for cell1, candidates1 in self.possibles.items():
#         if len(candidates1) == 2:
#             for cell2, candidates2 in self.possibles.items():
#                 if cell1 != cell2 and candidates1 == candidates2:
#                     common_units = self.get_common_units(cell1, cell2)
#                     if common_units:
#                         candidate_tuple = tuple(candidates1)
#                         cell_pair = frozenset([cell1, cell2])
#
#                         # Check if this pair already exists in the dictionary
#                         if cell_pair not in n_pairs:
#                             n_pairs[cell_pair] = {
#                                 'candidates': candidate_tuple,
#                                 'common_units': common_units
#                             }
#
#                         else:
#                             # Update the existing common units for this pair
#                             n_pairs[cell_pair]['common_units'].update(common_units)
#
#                         break  # it is a naked *pair*, so there won't be a third cell with the same candidates
#
#     valid_n_pairs = {}
#
#     for pair, data in n_pairs.items():
#         candidates = data['candidates']
#         common_units = data['common_units']
#
#         valid_pair = False  # Flag to check if this pair is valid
#
#         # Check each unit individually within the common units
#         for unit, unit_cells in common_units.items():
#             if unit_cells is not None:  # Ensure the unit is not empty
#                 for cell in unit_cells:
#                     if cell not in pair and any(candidate in self.possibles[cell] for candidate in candidates):
#                         valid_pair = True
#                         break  # Break from the inner loop as we found the pair valid
#
#             if valid_pair:
#                 break  # Break from the outer loop as we found the pair valid
#
#         if valid_pair:
#             valid_n_pairs[pair] = data  # This naked pair is valid, add it to the valid_n_pairs
#
#     highlight_candidates_list = []
#     eliminated_candidates_list = []
#
#     for pair, data in valid_n_pairs.items():
#         candidates = data['candidates']
#         common_units = data['common_units']
#
#         # Check each unit individually within the common units
#         for unit, unit_cells in common_units.items():
#             if unit_cells:  # Check if the unit is not empty
#                 # Since the unit is not empty, we add this pair to the highlight list
#                 for cell in pair:
#                     highlight_candidates_list.extend(
#                         [(cell, candidate) for candidate in candidates if candidate in self.possibles[cell]])
#
#                 # Proceed to gather eliminated candidates
#                 eliminated_candidates_list.extend(
#                     [(cell, candidate) for cell in unit_cells for candidate in candidates if
#                      candidate in self.possibles[cell]])
#             # If unit_cells is empty, we simply don't do anything, effectively skipping this unit
#
#     success = bool(valid_n_pairs)
#     n_pairs_text = helpers.format_naked_sets_text(valid_n_pairs) if success else None
#
#     return StratHandler('Naked Pairs',
#                         success,
#                         None,
#                         None,
#                         highlight_candidates_list,
#                         eliminated_candidates_list,
#                         n_pairs_text)
#
#     # ***************************************************************************************************************
#
#
# def find_naked_sets2(self, set_size):
#     valid_naked_sets = {}
#
#     # for each cell
#     for cell, candidates in self.possibles.items():
#         # sets have more than one candidate (otherwise would be a naked single)
#         if len(candidates) > 1:
#             # get all the cells that are visible to the current cell
#             visible_cells_of_current_cell = self.get_common_units(cell)
#             if visible_cells_of_current_cell:
#                 # for each unit type (row, col, box)
#                 for unit_type, unit_cells in visible_cells_of_current_cell.items():
#                     if unit_cells is None:
#                         continue
#                     # get all the combinations of size (set_size - 1) one the unit
#                     combo = list(combinations(unit_cells, set_size - 1))
#                     # for each combination
#                     for c in combo:
#                         # let's check how many candidates are in the combination (adding now the current cell)
#                         # only add to the combination if the number of candidates is less than 5
#                         cells_combination = tuple(
#                             sorted([cell] + list(_ for _ in c if len(self.possibles.get(_, [])) < 5)))
#                         if len(cells_combination) > set_size - 1 and len(unit_cells) > set_size:
#                             # combine the candidates of the cells in the combination
#                             candidates_of_combination = tuple(set().union(
#                                 *(self.possibles.get(cell, set()) for cell in cells_combination)))
#                             # found a valid naked set o size set_size
#                             if (len(candidates_of_combination) == set_size and
#                                     cells_combination not in valid_naked_sets):
#                                 # valid_naked_sets.setdefault(unit_type, {}).setdefault(
#                                 #     candidates_of_combination, []).append(
#                                 #     cells_combination)
#                                 print(cells_combination)
#                                 print(self.get_common_units(*cells_combination))
#                                 # valid_naked_sets.setdefault(cells_combination, {}).setdefault(
#                                 #     candidates_of_combination, []).append(
#                                 #     self.get_common_units(*cells_combination))
#
#                                 valid_naked_sets[cells_combination] = {
#                                     'candidates': candidates_of_combination,
#                                     'common_units': self.get_common_units(*cells_combination)
#                                 }
#
#         return valid_naked_sets
#
#
# def naked_pairs_find(self):
#     candidates_for_naked_sets = {}
#     # Group cells by their candidates if they have exactly N candidates
#     for cell, candidates in self.possibles.items():
#         if len(candidates) == 2:
#             candidate_tuple = tuple(candidates)
#             candidates_for_naked_sets.setdefault(candidate_tuple, []).append(cell)
#
#     valid_naked_pairs = {}
#
#     # Go through each group of cells with the same candidates
#     for candidates, cells in candidates_for_naked_sets.items():
#         # For each pair of cells in the group
#         for pair in combinations(cells, 2):
#             common_units = self.get_common_units(*pair)
#             # If they have a common unit
#             if common_units:
#                 # Check if they form a valid naked pair
#                 valid_pair = False
#                 for unit_cells in common_units.values():
#                     if unit_cells is None:
#                         continue
#                     for cell in unit_cells:
#                         # If there's a cell in the unit that is not part of the pair
#                         # and it contains any of the candidates, this is a valid naked pair
#                         if cell not in pair and any(candidate in self.possibles.get(cell, [])
#                                                     for candidate in candidates):
#                             valid_pair = True
#                             break
#                     if valid_pair:
#                         break
#
#                 if valid_pair:
#                     valid_naked_pairs[pair] = {
#                         'candidates': candidates,
#                         'common_units': common_units,
#                     }
#
#     return valid_naked_pairs
#
#
# def naked_trip_quads_find(self, set_size):
#     valid_naked_sets = {}
#
#     # Only consider cells with 2 to set_size candidates (both inclusive)
#     potential_naked_sets = [cell for cell, candidates in self.possibles.items() if 1 < len(candidates) <= set_size]
#
#     for cell in potential_naked_sets:
#         visible_cells_of_current_cell = self.get_common_units(cell)
#         if not visible_cells_of_current_cell:
#             continue
#
#         for unit_type, unit_cells in visible_cells_of_current_cell.items():
#             if not unit_cells:
#                 continue
#
#             for combo in combinations(unit_cells, set_size - 1):
#                 cells_combination = tuple(sorted([cell] + list(combo)))
#
#                 # Combine the candidates of the cells in the combination
#                 combined_candidates = set().union(*(self.possibles.get(c, set()) for c in cells_combination))
#
#                 # If the combined candidates equal set_size, it's a naked set
#                 if len(combined_candidates) == set_size:
#                     common_units = self.get_common_units(*cells_combination)
#                     if common_units:
#                         valid_naked_sets[cells_combination] = {
#                             'candidates': tuple(combined_candidates),
#                             'common_units': common_units
#                         }
#
#     return valid_naked_sets
#
#
# def naked_trips_quads(self):
#     for set_size in [3, 4]:
#         naked_set_name = "Naked Triples" if set_size == 3 else "Naked Quads"
#
#         naked_sets = self.naked_trip_quads_find(set_size)
#
#         highlight_list, eliminate_list = self.naked_sets_process(naked_sets)
#
#         if len(naked_sets) > 0 and eliminate_list:
#             success = True
#         else:
#             success = False
#
#         n_sets_text = helpers.format_naked_sets_text(naked_sets,
#                                                      naked_set_name if success else None)
#
#         return StratHandler(naked_set_name,
#                             success,
#                             None,
#                             None,
#                             highlight_list,
#                             eliminate_list,
#                             n_sets_text)
#
#
# def hidden_singles2(self):
#     h_singles = []
#     h_singles_text = []
#
#     for cell, possibles in self.possibles.items():
#         units = self.get_visible_cells(cell)
#
#         hidden_in_units = []  # store the unit (row, column or box) where the cell is a hidden single
#         hidden_single = None
#
#         for unit_type, unit_cells in units.items():
#             possibles_in_unit = set()
#             for unit_cell in unit_cells:
#                 possibles_in_unit.update(self.possibles.get(unit_cell, set()))
#
#             hidden_singles = possibles - possibles_in_unit
#             if len(hidden_singles) == 1:
#                 hidden_single = hidden_singles.pop()
#                 hidden_in_units.append(unit_type)
#
#         # Check if the cell was a hidden single in multiple units
#         if hidden_in_units:
#             h_singles.append((cell, hidden_single))
#             text = helpers.format_hidden_single_text(cell,
#                                                      hidden_single,
#                                                      hidden_in_units) if hidden_in_units else None
#             h_singles_text.append(text)
#
#     success = bool(h_singles)
#
#     result = StratHandler('Hidden Singles',
#                           success,
#                           h_singles if success else None,
#                           None,
#                           h_singles if success else None,
#                           h_singles if success else None,
#                           h_singles_text)
#
#     return result