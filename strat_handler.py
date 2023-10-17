Cell = tuple[int, int]
BoardType = dict[Cell, int]


class StratHandler:
    def __init__(self, name: str, success, solved_candidates: list[Cell], description: list[str]):
        self.name = name
        self.success = success
        self.solved_candidates = solved_candidates  # List of solved candidates

        self.description = description
