
class StratHandler:
    def __init__(self, strategy_name: str, success, solved_cells, highlight_cells, highlight_candidates,
                 eliminated_candidates, description):

        self.name = strategy_name
        self.success = success
        self.solved_cells = solved_cells  # List of cells that were solved
        self.highlight_cells = highlight_cells  # List of cells to highlight
        self.highlight_candidates = highlight_candidates  # List of candidates to highlight
        self.eliminated_candidates = eliminated_candidates  # List of eliminated candidates
        self.description = description
