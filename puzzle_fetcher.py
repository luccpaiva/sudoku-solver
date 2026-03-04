import requests
from bs4 import BeautifulSoup

_WEBSUDOKU_IDS = [
    f'f{r}{c}' for r in range(9) for c in range(9)
]

_SUDOKU9X9_IDS = [f'c{i}' for i in range(81)]


def fetch_from_websudoku(difficulty: str) -> str:
    """Fetch a puzzle from websudoku.com. difficulty should be '1'–'4'."""
    html_doc = requests.get(f'https://nine.websudoku.com/?level={difficulty}').content
    soup = BeautifulSoup(html_doc, 'html.parser')

    board_str = ''
    for cid in _WEBSUDOKU_IDS:
        cell = str(soup.find('input', id=cid))
        if 'value' in cell:
            board_str += cell.split('"')[-2]
        else:
            board_str += '.'

    return board_str


def fetch_from_sudoku9x9(difficulty: str) -> str:
    """Fetch a puzzle from sudoku9x9.com. Use 'Evil' for expert level."""
    if difficulty == 'Evil':
        url = 'https://sudoku9x9.com/expert.php'
    else:
        url = f'https://sudoku9x9.com/?level={difficulty}'

    html_doc = requests.get(url).content
    soup = BeautifulSoup(html_doc, 'html.parser')

    board_str = ''
    for cid in _SUDOKU9X9_IDS:
        cell = soup.find('p', {'class': 'rp1', 'id': cid})
        if cell and cell.get_text().isdigit():
            board_str += cell.get_text()
        else:
            board_str += '.'

    return board_str
