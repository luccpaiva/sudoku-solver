# FPS
# ///////////////////////////////////////////////////////////////
FPS = 5

# GAME STATES
# ///////////////////////////////////////////////////////////////
IDLE = "idle"
STRATEGY_SUCCESSFUL = "strategy_successful"
BOARD_UPDATING = "board_updating"

# COLOURS
# ///////////////////////////////////////////////////////////////
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
RED = (255, 73, 73)
GREEN = (33, 133, 0)
LIGHTBLUE = (237, 244, 255)
BLUE = (51, 125, 255)
LIGHTRED = (255, 73, 73)
LIGHTYELLOW = (251, 252, 187)
YELLOW = (153, 153, 0)
LIGHTGREEN = (51, 161, 88)
DARKBLUE = (113, 120, 129)
LIGHTGRAY = (237, 237, 237)
DARKGRAY = (201, 201, 201)
DARKBLUE2 = (37, 79, 39)
LOCKEDCELLCOLOUR = (234, 239, 242)
INCORRECTCELLCOLOUR = (195, 121, 121)
DARKMODE = (34, 36, 38)

# WINDOW SIZE
# ///////////////////////////////////////////////////////////////
WIDTH = 1300
HEIGHT = 750

# POSITIONS
# ///////////////////////////////////////////////////////////////
GRID_POS = (40, 90)
CELL_SIZE = 70
MINI_CELL_SIZE = CELL_SIZE // 3
GRID_SIZE = CELL_SIZE * 9
STT_LIST_POS = (GRID_POS[0] + GRID_SIZE + 10, GRID_POS[1])
STT_RESULT_POS = (STT_LIST_POS[0], STT_LIST_POS[1] + 245)
COORD_OFFSET = 55
STRATEGY_LIST_SIZE = (600, 230)
STRATEGY_TEXT_SIZE = (600, 385)
THICK_LINE = 2
THIN_LINE = 1

BUTTON_PROPERTIES = [
    {"x": GRID_POS[0], "y": 5, "width": 70, "height": 40, "colour": (27, 142, 207), "text": 'Check'},
    {"x": 152, "y": 5, "width": 70, "height": 40, "colour": DARKGRAY, "text": 'Load'},
    {"x": 264, "y": 5, "width": 70, "height": 40, "colour": (117, 172, 112), "text": 'Easy'},
    {"x": 376, "y": 5, "width": 70, "height": 40, "colour": (204, 197, 110), "text": 'Medium'},
    {"x": 488, "y": 5, "width": 70, "height": 40, "colour": (199, 129, 48), "text": 'Hard'},
    {"x": 600, "y": 5, "width": 70, "height": 40, "colour": (207, 68, 68), "text": 'Evil'},
    {"x": 720, "y": 5, "width": 140, "height": 40, "colour": LIGHTGRAY, "text": 'Solution Count'},
    {"x": 890, "y": 5, "width": 70, "height": 40, "colour": LIGHTGRAY, "text": 'Solve'},
    {"x": 1000, "y": 5, "width": 100, "height": 40, "colour": LIGHTGRAY, "text": 'Next Step'}
]
