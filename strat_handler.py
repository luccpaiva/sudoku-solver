Cell = tuple[int, int]
BoardType = dict[Cell, int]


class StratHandler:
    def __init__(self, name: str, description: list[str], success: bool = False, solved_cells: list[Cell] = None,
                 solved_candidates: list[Cell] = None):

        self.name = name
        self.success = success
        # some strats solve the cells (like naked singles), others solve the candidates (like naked pairs)
        self.solved_cells = solved_cells  # List of solved cells
        self.solved_candidates = solved_candidates  # List of solved candidates

        self.description = description
