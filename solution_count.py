import random
import time
from copy import deepcopy
from itertools import combinations
from typing import List, Tuple, Set

SIZE = 9
BOX_SIZE = 3
MAX_SOLUTIONS = 10


class Sudoku:
    def __init__(self, grid: List, is_X_Sudoku=False):
        n = len(grid)
        # assert len(grid[0]) == n, "Grid is not square. n_rows=%d, n_columns=%d" % (n, len(grid[0]))
        self.grid = grid
        self.n = n
        self.is_X_Sudoku = is_X_Sudoku
        # create a grid of viable candidates for each position
        candidates = []
        for i in range(n):
            row = []
            for j in range(n):
                if grid[i][j] == 0:
                    row.append(self.find_options(i, j))
                else:
                    row.append(set())
            candidates.append(row)
        self.candidates = candidates

    def __repr__(self) -> str:
        repr = ''
        for row in self.grid:
            repr += str(row) + '\n'
        return repr

    def get_row(self, r: int) -> List[int]:
        return self.grid[r]

    def get_col(self, c: int) -> List[int]:
        return [row[c] for row in self.grid]

    def get_box_inds(self, r: int, c: int) -> List[Tuple[int, int]]:
        inds_box = []
        i0 = (r // BOX_SIZE) * BOX_SIZE  # get first row index
        j0 = (c // BOX_SIZE) * BOX_SIZE  # get first column index
        for i in range(i0, i0 + BOX_SIZE):
            for j in range(j0, j0 + BOX_SIZE):
                inds_box.append((i, j))
        return inds_box

    def get_box(self, r: int, c: int) -> List[int]:
        box = []
        for i, j in self.get_box_inds(r, c):
            box.append(self.grid[i][j])
        return box

    def get_diagonals(self, r: int, c: int):
        diag = []
        if r == c:
            for i in range(self.n):
                diag.append(self.grid[i][i])
        if r == (self.n - c - 1):
            for i in range(self.n):
                diag.append(self.grid[i][self.n - i - 1])
        return diag

    def get_neighbour_inds(self, r: int, c: int, flatten=False):
        inds_row = [(r, j) for j in range(self.n)]
        inds_col = [(i, c) for i in range(self.n)]
        inds_box = self.get_box_inds(r, c)
        inds_diag = []
        if self.is_X_Sudoku:
            if r == c:
                inds_diag.extend([(i, i) for i in range(self.n)])
            if r == (self.n - c - 1):
                inds_diag.extend([(i, self.n - i - 1) for i in range(self.n)])
        if flatten:
            return list(set(inds_row + inds_col + inds_box + inds_diag))
        return [inds_row, inds_col, inds_box, inds_diag]

    def find_options(self, r: int, c: int) -> Set:
        nums = set(range(1, SIZE + 1))
        set_row = set(self.get_row(r))
        set_col = set(self.get_col(c))
        set_box = set(self.get_box(r, c))
        set_diagonals = set(self.get_diagonals(r, c)) if self.is_X_Sudoku else set()
        used = set_row | set_col | set_box | set_diagonals
        valid = nums.difference(used)
        return valid

    def counting(self, arr: List[int], m=SIZE) -> List[int]:
        """ count occurances in an array """
        count = [0] * (m + 1)
        for x in arr:
            count[x] += 1
        return count

    def all_unique(self, arr: List[int], m=SIZE) -> bool:
        """ verify that all numbers are used, and at most once """
        count = self.counting(arr, m=m)
        for c in count[1:]:  # ignore 0
            if c != 1:
                return False  # not unique
        return True

    def no_duplicates(self, arr):
        """ verify that no number is used more than once """
        count = self.counting(arr)
        for c in count[1:]:  # exclude 0:
            if c > 1:
                return False  # more than 1 of value
        return True

    def all_exist(self, arr):
        """ verify that there is at least one of each number present """
        count = self.counting(arr)
        missing = None
        for num, c in enumerate(count[1:]):  # exclude 0:
            if c == 0:
                return False, num + 1  # no value or candidate exists
        return True, missing

    def check_done(self, num_boxes=SIZE) -> bool:
        """ check if each row/column/box only has unique elements"""
        # check rows
        for i in range(self.n):
            if not self.all_unique(self.get_row(i)):
                return False
        # check columns
        for j in range(self.n):
            if not self.all_unique(self.get_col(j)):
                return False
        # check boxes
        for i0 in range(0, self.n, BOX_SIZE):
            for j0 in range(0, self.n, BOX_SIZE):
                if not self.all_unique(self.get_box(i0, j0)):
                    return False
        return True

    def get_candidates(self, start, end):
        " get candidates within two corners of a rectangle/column/row"
        candidates = set()
        for i in range(start[0], end[0] + 1):
            for j in range(start[1], end[1] + 1):
                candidates = candidates | self.candidates[i][j]
        return candidates

    def check_possible(self):
        """ check if each row/column/box can have all unique elements"""
        # get rows
        rows_set = []
        for i in range(self.n):
            inds = [(i, j) for j in range(self.n)]
            rows_set.append(inds)
        # get columns
        cols_set = []
        for j in range(self.n):
            inds = [(i, j) for i in range(self.n)]
            cols_set.append(inds)
        # check rows and columns
        type_ = ['row', 'column']
        for t, inds_set in enumerate([rows_set, cols_set]):
            for k, inds in enumerate(inds_set):
                arr = [self.grid[i][j] for i, j in inds]
                if not self.no_duplicates(arr):
                    return False, 'Duplicate values in %s %d' % (type_[t], k)
                arr += list(self.get_candidates(inds[0], inds[-1]))
                possible, missing_num = self.all_exist(arr)
                if not possible:
                    return False, '%d not placeable in %s %d' % (missing_num, type_[t], k)
        # check boxes
        for i0 in range(0, self.n, BOX_SIZE):
            for j0 in range(0, self.n, BOX_SIZE):
                arr = self.get_box(i0, j0)[:]
                if not self.no_duplicates(arr):
                    return False, 'Duplicate values in box (%d, %d)' % (i0, j0)
                for i in range(i0, i0 + BOX_SIZE):
                    for j in range(j0, j0 + BOX_SIZE):
                        arr += list(self.candidates[i][j])
                possible, missing_num = self.all_exist(arr)
                if not possible:
                    return False, '%d not placeable in box (%d, %d)' % (missing_num, i0, j0)
        return True, None

    ## ------- Candidate functions -------- ##
    def place_and_erase(self, r: int, c: int, x: int, constraint_prop=True):
        """ remove x as a candidate in the grid in this row, column and box"""
        # place candidate x
        self.grid[r][c] = x
        self.candidates[r][c] = set()
        # remove candidate  x in neighbours
        inds_neighbours = self.get_neighbour_inds(r, c, flatten=True)
        erased = [(r, c)]  # set of indices for constraint propogration
        erased += self.erase([x], inds_neighbours, [])
        # constraint propogation, through every index that was changed
        while erased and constraint_prop:
            i, j = erased.pop()
            inds_neighbours = self.get_neighbour_inds(i, j, flatten=False)
            for inds in inds_neighbours:
                uniques = self.get_unique(inds, type=[1, 2, 3])
                for inds_combo, combo in uniques:
                    # passing back the erased here doesn't seem to be very helpful
                    self.set_candidates(combo, inds_combo)
                    erased += self.erase(combo, inds, inds_combo)
            inds_box = self.get_box_inds(i, j)
            pointers = self.pointing_combos(inds_box)
            for line, inds_pointer, num in pointers:
                erased += self.erase(num, line, inds_pointer)
        # keeps = self.box_line_reduction(inds_box) # doesn't work??
        # for inds_keep, nums in keeps:
        #     self.erase(nums, inds_box, inds_keep)

    def erase(self, nums, indices, keep):
        """ erase nums as candidates in indices, but not in keep"""
        erased = []
        for i, j in indices:
            edited = False
            if ((i, j) in keep):
                continue
            for x in nums:
                if (x in self.candidates[i][j]):
                    self.candidates[i][j].remove(x)
                    edited = True
            if edited:
                erased.append((i, j))
        return erased

    def set_candidates(self, nums, indices):
        """set candidates at indices. Remove all other candidates"""
        erased = []
        for i, j in indices:
            # beware triples where the whole triple is not in each box
            old = self.candidates[i][j].intersection(nums)
            if self.candidates[i][j] != old:
                self.candidates[i][j] = old.copy()
                erased.append((i, j))  # made changes here
        return erased

    def count_candidates(self, indices):
        count = [[] for _ in range(self.n + 1)]
        # get counts
        for i, j in indices:
            for num in self.candidates[i][j]:
                count[num].append((i, j))
        return count

    def get_unique(self, indices, type=(0, 1, 2)):
        # See documentation at https://www.sudokuwiki.org/Hidden_Candidates
        groups = self.count_candidates(indices)
        uniques = []  # final set of unique candidates to return
        uniques_temp = {2: [], 3: []}  # potential unique candidates
        for num, group_inds in enumerate(groups):
            c = len(group_inds)
            if c == 1 and (1 in type):
                uniques.append((group_inds, [num]))
            if c == 2 and ((2 in type) or (3 in type)):
                uniques_temp[2].append(num)
            if c == 3 and (3 in type):
                uniques_temp[3].append(num)
        uniques_temp[3] += uniques_temp[2]
        # check for matching combos (both hidden and naked)
        for c in [2, 3]:
            if c not in type:
                continue
            # make every possible combination
            for combo in list(combinations(uniques_temp[c], c)):
                group_inds = set(groups[combo[0]])
                for k in range(1, c):
                    # if positions are shared, this will not change the length
                    group_inds = group_inds | set(groups[combo[k]])
                if len(group_inds) == c:
                    # unique combo (pair or triple) found
                    uniques.append((list(group_inds), combo))
        return uniques

    def pointing_combos(self, inds_box):
        # See documentation https://www.sudokuwiki.org/Intersection_Removal
        # inds_box should come from self.get_inds_box()
        groups = self.count_candidates(inds_box)
        pointers = []
        for num, indices in enumerate(groups):
            # need a pair or triple
            if len(indices) == 2 or len(indices) == 3:
                row_same, col_same = True, True
                i0, j0 = indices[0]
                for i, j in indices[1:]:
                    row_same = row_same and (i == i0)
                    col_same = col_same and (j == j0)
                if row_same:
                    line = [(i0, j) for j in range(self.n)]
                    pointers.append((line, indices, [num]))
                if col_same:
                    line = [(i, j0) for i in range(self.n)]
                    pointers.append((line, indices, [num]))
        return pointers

    def box_line_reduction(self, inds_box):
        # See documentation https://www.sudokuwiki.org/Intersection_Removal
        # inds_box should come from self.get_inds_box()
        keeps = []
        i0, j0 = inds_box[0]
        i1, j1 = min(i0 + BOX_SIZE, self.n - 1), min(j0 + BOX_SIZE, self.n - 1)
        # check rows
        for i in range(i0, i1 + 1):
            row = self.get_candidates((i, j0), (i, j1))
            line = self.get_candidates(
                (i, 0), (i, j0 - 1)) | self.get_candidates((i, j1 + 1), (i, self.n - 1))
            uniques = row.difference(line)
            if uniques:
                keeps.append(
                    ([(i, j) for j in range(j0, j1 + 1)], list(uniques)))
        # check columns
        for j in range(j0, j1 + 1):
            col = self.get_candidates((i0, j), (i1, j))
            line = self.get_candidates(
                (0, j), (i0 - 1, j)) | self.get_candidates((i1 + 1, j), (self.n - 1, j))
            uniques = col.difference(line)
            if uniques:
                keeps.append(
                    ([(i, j) for i in range(i0, i1 + 1)], list(uniques)))
        return keeps

    def get_all_units(self):
        # get indices for each set
        inds_set = []
        for i in range(self.n):
            inds = [(i, j) for j in range(self.n)]
            inds_set.append(inds)
        # check in column
        for j in range(self.n):
            inds = [(i, j) for i in range(self.n)]
            inds_set.append(inds)
        return inds_set

    def get_all_boxes(self):
        inds_box = []
        for i0 in range(0, self.n, BOX_SIZE):
            for j0 in range(0, self.n, BOX_SIZE):
                inds = self.get_box_inds(i0, j0)
                inds_box.append(inds)
        return inds_box

    def flush_candidates(self) -> None:
        """set candidates across the whole grid, according to logical strategies"""
        # get indices for each set
        inds_box = self.get_all_boxes()
        inds_set = self.get_all_units()
        inds_set.extend(inds_box)
        for _ in range(1):  # repeat this process in case changes are made
            # apply strategies
            for inds in inds_set:
                # hidden/naked singles/pairs/triples
                uniques = self.get_unique(inds, type=[1, 2])
                for inds_combo, combo in uniques:
                    self.erase(combo, inds, inds_combo)
                    self.set_candidates(combo, inds_combo)
            for inds in inds_box:
                # pointing pairs
                pointers = self.pointing_combos(inds)
                for line, inds_pointer, num in pointers:
                    self.erase(num, line, inds_pointer)
                # box-line reduction
                # keeps = self.box_line_reduction(inds)
                # for inds_keep, nums in keeps:
                #     self.erase(nums, inds, inds_keep)


def grid_equal(A, B):
    """ Check if 2 grids are equal or not"""
    n = len(A)
    if n != len(B):
        return False
    for i in range(n):
        for j in range(n):
            if A[i][j] != B[i][j]:
                return False
    return True


def get_nonempty(A):
    n = len(A)
    m = len(A[0])
    nonempty = []
    for nm in range(n * m):
        i = nm // n
        j = nm % m
        if A[i][j] != 0:
            nonempty.append(nm)
    return nonempty


def flatten(grid):
    arr = []
    for row in grid:
        arr.extend(row)
    return arr


def unflatten(arr: List[int], n=9):
    grid = []
    for i in range(0, len(arr), n):
        grid.append(arr[i:i + n])
    return grid


def arr2str(arr):
    string = ''
    for digit in arr:
        if digit == 0:
            string += "."
        else:
            string += str(digit)
    return string


def str2arr(string):
    arr = []
    end = string.find('-')
    end = len(string) if end == -1 else end
    for c in string[0:end]:
        if c == '.':
            arr.append(0)
        else:
            arr.append(int(c))
    return arr  # [int(c) for c in string]


def grid2str(grid: Tuple[List[int]]) -> str:
    return arr2str(flatten(grid))


def str2grid(string: str) -> List[List[int]]:
    return unflatten(str2arr(string))


def print_grid(grid: List[List[int]]) -> None:
    repr = ''
    for row in grid:
        repr += str(row) + '\n'
    print(repr[:-1])


def solveSudoku(grid, verbose=True, all_solutions=False, is_X_Sudoku=False):
    """
    idea based on https://dev.to/aspittel/how-i-finally-wrote-a-sudoku-solver-177g
    Try each step until failure, and repeat:
    1) write numbers with only have 1 option
    2) write candidates with only 1 option/ 2 pairs
    3) with multiple options, take a guess and branch (backtrack)
    """

    def solve(game, depth=0, progress_factor=1):
        nonlocal calls, depth_max, progress, progress_update, update_increment
        calls += 1
        depth_max = max(depth, depth_max)
        solved = False
        while not solved:
            solved = True  # assume solved
            edited = False  # if no edits, either done or stuck
            for i in range(game.n):
                for j in range(game.n):
                    if game.grid[i][j] == 0:
                        solved = False
                        options = game.candidates[i][j]
                        if len(options) == 0:
                            progress += progress_factor
                            return False  # this call is going nowhere
                        elif len(options) == 1:  # Step 1
                            game.place_and_erase(
                                i, j, list(options)[0])  # Step 2
                            # game.flush_candidates() # full grid cleaning
                            edited = True
            if not edited:  # changed nothing in this round -> either done or stuck
                if solved:
                    progress += progress_factor
                    solution_set.append(grid2str(game.grid.copy()))
                    return True
                else:
                    # Find the box with the least number of options and take a guess
                    # The place_and_erase() call changes this dynamically
                    # remove this comment later
                    min_guesses = (game.n + 1, -1)
                    for i in range(game.n):
                        for j in range(game.n):
                            options = game.candidates[i][j]
                            if len(options) < min_guesses[0] and len(options) > 1:
                                min_guesses = (len(options), (i, j))
                    i, j = min_guesses[1]
                    options = game.candidates[i][j]
                    # backtracking check point:
                    progress_factor *= (1 / len(options))
                    for y in options:
                        game_next = deepcopy(game)
                        game_next.place_and_erase(i, j, y)
                        # game_next.flush_candidates() # full grid cleaning
                        solved = solve(
                            game_next, depth=depth + 1, progress_factor=progress_factor)
                        if solved and not all_solutions:
                            break  # return 1 solution
                        if verbose and progress > progress_update:
                            print("%.1f" % (progress * 100), end='...')
                            progress_update = (
                                                      (progress // update_increment) + 1) * update_increment
                        if len(solution_set) > MAX_SOLUTIONS:
                            break
                    return solved
        return solved

    calls, depth_max = 0, 0
    progress, update_increment, progress_update = 0.0, 0.01, 0.01
    solution_set = []

    game = Sudoku(grid, is_X_Sudoku=is_X_Sudoku)
    game.flush_candidates()  # check for obvious candidates

    possible, message = game.check_possible()
    if not possible:
        print('Error on board. %s' % message)
        info = {
            'calls': calls,
            'max depth': depth_max,
            'nsolutions': len(solution_set),
        }
        return solution_set, False, info

    if verbose:
        print("solving: ", end='')
    solve(game, depth=0)
    if verbose:
        print("100.0")
    solved = (len(solution_set) >= 1)

    info = {
        'calls': calls,
        'max depth': depth_max,
        'nsolutions': len(solution_set),
    }
    return solution_set, solved, info


def count_solutions(puzzle):
    grid = deepcopy(puzzle)
    print("*******************")
    print(grid2str(grid))
    ## make multiple solutions
    nonempty = get_nonempty(grid)
    for ij in random.sample(nonempty, k=0):  # k=number of values to set to zero
        i = ij // 9
        j = ij % 9
        grid[i][j] = 0

    # solution = solution if 'solution' in locals() else None

    verbose = False
    all_solutions = True

    t0 = time.time()
    nclues = 81 - grid2str(grid).count('.') - grid2str(grid).count('0')
    print("num clues: %d" % nclues)
    ## solve
    solution_set, done, info = solveSudoku(
        grid,
        verbose=verbose,
        all_solutions=all_solutions
    )
    # solver_solution, done, info = solveSudokuBrute(puzzle)
    deltaT = time.time() - t0
    print("total time: %.5fs" % (deltaT))
    # for key in ['calls', 'max depth', 'nsolutions']:
    #     print("%-14s: %d" % (key, info[key]))

    if len(solution_set) == 1:
        print("This puzzle has an unique solution")
        print(*solution_set, sep="\n")
    elif len(solution_set) <= MAX_SOLUTIONS:
        print("This puzzle has %d distinct solutions" % len(solution_set))
    else:
        print("This puzzle has at least %d solutions" % MAX_SOLUTIONS)
