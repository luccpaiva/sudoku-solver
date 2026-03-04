from dataclasses import dataclass, field
from typing import Optional


@dataclass
class StratHandler:
    name: str
    success: bool
    solved_cells: Optional[list] = field(default=None)
    highlight_cells: Optional[list] = field(default=None)
    highlight_candidates: Optional[list] = field(default=None)
    eliminated_candidates: Optional[list] = field(default=None)
    description: Optional[list] = field(default=None)
