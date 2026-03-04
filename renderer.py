import pygame as pg
import settings
import utils
from settings import (
    CELL_SIZE, MINI_CELL_SIZE, GRID_SIZE, GRID_POS,
    STT_LIST_POS, STT_RESULT_POS, STRATEGY_LIST_SIZE, STRATEGY_TEXT_SIZE,
    THICK_LINE, BLACK, WHITE, BLUE, LIGHTRED, DARKBLUE, DARKBLUE2,
    DARKGRAY, GREEN, LIGHTGREEN, YELLOW, DARKMODE, RED,
)


def _expand_display_label(label: str) -> list[str]:
    """Expand a display label into the strategy names it covers.
    Examples:
        'X-Wing'              → ['X-Wing']
        'Naked Pairs/Triples' → ['Naked Pairs', 'Naked Triples']
        'Naked/Hidden Quads'  → ['Naked Quads', 'Hidden Quads']
    """
    if '/' not in label:
        return [label]
    parts = label.split(' ')
    slash_idx = next(i for i, p in enumerate(parts) if '/' in p)
    variants = parts[slash_idx].split('/')
    return [' '.join(parts[:slash_idx] + [v] + parts[slash_idx + 1:]) for v in variants]


class Renderer:
    def __init__(self, window: pg.Surface):
        self.window = window

        # Cached fonts
        self.board_num_font = pg.font.SysFont('Arial', CELL_SIZE // 2)
        self.coord_font = pg.font.SysFont('Arial', 25)
        self.cand_font = pg.font.SysFont('Arial', CELL_SIZE // 3)
        self.stt_font = pg.font.SysFont('Consolas', 17)
        self.stt_bold_font = pg.font.SysFont('Consolas', 17, bold=True)

    # TOP-LEVEL DRAW CALLS
    # ///////////////////////////////////////////////////////////////
    def draw_frame(self, board, strategy_result, selected, game_state, basic_stt_list, tough_stt_list, buttons):
        from settings import GameState
        self.window.fill(DARKMODE)

        for button in buttons:
            button.draw(self.window)

        if selected:
            self.draw_highlight(board, selected)

        if game_state == GameState.STRATEGY_SUCCESSFUL and strategy_result:
            self.draw_highlight_cells(strategy_result)
            self.draw_highlight_candidates(strategy_result)
            self.draw_solved_text(strategy_result)

        self.draw_board_numbers(board)
        self.draw_candidates_numbers(board)
        self.draw_grid()
        self.draw_strategy_list(strategy_result, basic_stt_list, tough_stt_list)

        pg.display.flip()

    # BOARD DRAWING
    # ///////////////////////////////////////////////////////////////
    def draw_board_numbers(self, board):
        full_board = {**{coord: (value, BLUE) for coord, value in board.solved.items()},
                      **{coord: (value, LIGHTRED) for coord, value in board.puzzle.items()}}

        for (row, col), (value, color) in full_board.items():
            pos = [GRID_POS[0] + (col * CELL_SIZE), GRID_POS[1] + (row * CELL_SIZE)]
            self._text_to_screen(str(value), pos, 'board_num_size', color)

    def draw_candidates_numbers(self, board):
        for (row, col), candidates in board.unsolved.items():
            for candidate in candidates:
                pos = [
                    GRID_POS[0] + (col * CELL_SIZE) + ((candidate - 1) % 3 * MINI_CELL_SIZE),
                    GRID_POS[1] + (row * CELL_SIZE) + ((candidate - 1) // 3 * MINI_CELL_SIZE)
                ]
                self._text_to_screen(str(candidate), pos, 'cand_size', WHITE)

    def draw_highlight(self, board, pos):
        col, row = pos

        self._draw_rect(DARKBLUE, (GRID_POS[0], GRID_POS[1] + col * CELL_SIZE), (GRID_SIZE, CELL_SIZE))
        self._draw_rect(DARKBLUE, (GRID_POS[0] + row * CELL_SIZE, GRID_POS[1]), (CELL_SIZE, GRID_SIZE))
        self._draw_rect(DARKBLUE,
                        (GRID_POS[0] + (row // 3 * 3 * CELL_SIZE), GRID_POS[1] + (col // 3 * 3 * CELL_SIZE)),
                        (3 * CELL_SIZE, 3 * CELL_SIZE))

        current_num = board.solved.get((col, row))
        if current_num:
            for (i, j), num in board.solved.items():
                if num == current_num and (i, j) != (row, col):
                    self._draw_rect(DARKGRAY,
                                    (GRID_POS[0] + j * CELL_SIZE, GRID_POS[1] + i * CELL_SIZE),
                                    (CELL_SIZE, CELL_SIZE))

        self._draw_rect(DARKGRAY,
                        (GRID_POS[0] + row * CELL_SIZE, GRID_POS[1] + col * CELL_SIZE),
                        (CELL_SIZE, CELL_SIZE))

    def draw_grid(self):
        pg.draw.rect(self.window, BLACK, (GRID_POS[0], GRID_POS[1], GRID_SIZE, GRID_SIZE), 2)
        for i in range(9):
            pg.draw.line(self.window, DARKBLUE2,
                         (GRID_POS[0] + (i * CELL_SIZE), GRID_POS[1]),
                         (GRID_POS[0] + (i * CELL_SIZE), GRID_POS[1] + GRID_SIZE),
                         2 if i % 3 == 0 else 1)
            pg.draw.line(self.window, DARKBLUE2,
                         (GRID_POS[0], GRID_POS[1] + (i * CELL_SIZE)),
                         (GRID_POS[0] + GRID_SIZE, GRID_POS[1] + (i * CELL_SIZE)),
                         2 if i % 3 == 0 else 1)

            pos = [GRID_POS[0] + (i * CELL_SIZE), GRID_POS[1] - 55]
            self._text_to_screen(str(i + 1), pos, 'coord_size', WHITE)

            pos = [GRID_POS[0] - 55, GRID_POS[1] + (i * CELL_SIZE)]
            self._text_to_screen(utils.int2char(i), pos, 'coord_size', WHITE)

        pg.draw.rect(self.window, BLACK, (STT_LIST_POS[0], STT_LIST_POS[1], *STRATEGY_LIST_SIZE), THICK_LINE)
        pg.draw.rect(self.window, BLACK, (STT_RESULT_POS[0], STT_RESULT_POS[1], *STRATEGY_TEXT_SIZE), THICK_LINE)

    # STRATEGY RESULT DRAWING
    # ///////////////////////////////////////////////////////////////
    def draw_highlight_cells(self, strategy_result):
        if strategy_result.highlight_cells:
            for (row, col) in strategy_result.highlight_cells:
                pos = [GRID_POS[0] + (col * CELL_SIZE), GRID_POS[1] + (row * CELL_SIZE)]
                pg.draw.rect(self.window, LIGHTGREEN, (pos[0], pos[1], CELL_SIZE, CELL_SIZE))

    def draw_highlight_candidates(self, strategy_result):
        if strategy_result.highlight_candidates:
            for (row, col), candidate in strategy_result.highlight_candidates:
                pos = [
                    GRID_POS[0] + (col * CELL_SIZE) + ((candidate - 1) % 3) * MINI_CELL_SIZE + MINI_CELL_SIZE // 2,
                    GRID_POS[1] + (row * CELL_SIZE) + ((candidate - 1) // 3) * MINI_CELL_SIZE + MINI_CELL_SIZE // 2
                ]
                pg.draw.circle(self.window, GREEN, pos, MINI_CELL_SIZE // 2)

        if strategy_result.eliminated_candidates:
            for (row, col), candidate in strategy_result.eliminated_candidates:
                pos = [
                    GRID_POS[0] + (col * CELL_SIZE) + ((candidate - 1) % 3) * MINI_CELL_SIZE + MINI_CELL_SIZE // 2,
                    GRID_POS[1] + (row * CELL_SIZE) + ((candidate - 1) // 3) * MINI_CELL_SIZE + MINI_CELL_SIZE // 2
                ]
                pg.draw.circle(self.window, YELLOW, pos, MINI_CELL_SIZE // 2)

    def draw_solved_text(self, strategy_result):
        pos = [STT_LIST_POS[0] + 10, STT_LIST_POS[1] + 230]
        for solved_cell_text in strategy_result.description:
            pos[1] += 25
            self._text_to_screen(solved_cell_text, pos, 'stt_size', WHITE)

    def draw_strategy_list(self, strategy_result, basic_stt_list, tough_stt_list):
        successful_name = strategy_result.name if strategy_result else None
        # Naked Singles is not shown in the list; don't print NO for anything before it
        should_print_no = bool(strategy_result) and successful_name != 'Naked Singles'

        should_print_no = self._draw_strategy_section(
            'Basic Strategies', basic_stt_list,
            [STT_LIST_POS[0] + 10, STT_LIST_POS[1] + 10],
            successful_name, should_print_no,
        )
        self._draw_strategy_section(
            'Tough Strategies', tough_stt_list,
            [STT_LIST_POS[0] + 280, STT_LIST_POS[1] + 10],
            successful_name, should_print_no,
        )

    def _draw_strategy_section(self, title, strats, start_pos, successful_name, should_print_no) -> bool:
        """Draw one strategy column. Returns the updated should_print_no flag for the next section."""
        pos_list = [start_pos[0], start_pos[1] + 10]
        pos_indicator = [start_pos[0] + 220, start_pos[1] + 10]

        self._text_to_screen(title, pos_list, 'stt_size', WHITE)
        pos_list[1] += 10
        pos_indicator[1] += 10

        for strategy in strats:
            pos_list[1] += 25
            pos_indicator[1] += 25

            is_active = successful_name in _expand_display_label(strategy)
            style = 'stt_size_bold' if is_active else 'stt_size'
            self._text_to_screen(strategy, pos_list, style, WHITE)

            if is_active:
                self._text_to_screen('YES', pos_indicator, 'stt_size_bold', GREEN)
                should_print_no = False
            elif should_print_no:
                self._text_to_screen('NO', pos_indicator, 'stt_size_bold', RED)

        return should_print_no

    # PRIMITIVE DRAW HELPERS
    # ///////////////////////////////////////////////////////////////
    def _draw_rect(self, color, pos, size):
        pg.draw.rect(self.window, color, (*pos, *size))

    def _text_to_screen(self, text, pos, size, colour):
        max_width = settings.STRATEGY_TEXT_SIZE[0]
        y_offset = 0

        def wrap_text(text, font):
            words = text.split(' ')
            lines, current_line = [], []
            for word in words:
                current_line.append(word)
                if font.size(' '.join(current_line))[0] > max_width:
                    current_line.pop()
                    lines.append(' '.join(current_line))
                    current_line = [word]
            if current_line:
                lines.append(' '.join(current_line))
            return lines

        match size:
            case 'board_num_size':
                rendered = self.board_num_font.render(text, True, colour)
                pos[0] += (CELL_SIZE - rendered.get_width()) // 2
                pos[1] += (CELL_SIZE - rendered.get_height()) // 2
                self.window.blit(rendered, pos)

            case 'coord_size':
                rendered = self.coord_font.render(text, True, colour)
                pos[0] += (CELL_SIZE - rendered.get_width()) // 2
                pos[1] += (CELL_SIZE - rendered.get_height()) // 2
                self.window.blit(rendered, pos)

            case 'cand_size':
                rendered = self.cand_font.render(text, True, colour)
                pos[0] += (MINI_CELL_SIZE - rendered.get_width()) // 2
                pos[1] += (MINI_CELL_SIZE - rendered.get_height()) // 2
                self.window.blit(rendered, pos)

            case 'stt_size':
                font = self.stt_font
                for line in wrap_text(text, font):
                    self.window.blit(font.render(line, True, colour), (pos[0], pos[1] + y_offset))
                    y_offset += font.size(text)[1]

            case 'stt_size_bold':
                font = self.stt_bold_font
                for line in wrap_text(text, font):
                    self.window.blit(font.render(line, True, colour), (pos[0], pos[1] + y_offset))
                    y_offset += font.size(text)[1]
