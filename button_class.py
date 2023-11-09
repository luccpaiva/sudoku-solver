import pygame as pg


class Button:
    def __init__(self, x, y, width, height, text=None, colour=(73, 73, 73), highlighted_colour=(189, 189, 189)):
        self.image = pg.Surface((width, height))
        self.pos = (x, y)
        self.rect = self.image.get_rect()
        self.rect.topleft = self.pos
        self.text = text
        self.colour = colour
        self.highlighted_colour = highlighted_colour
        self.highlighted = False
        self.width = width
        self.height = height

    def update(self, mouse):
        if self.rect.collidepoint(mouse):
            self.highlighted = True
        else:
            self.highlighted = False

    def draw(self, window):
        self.image.fill(self.highlighted_colour if self.highlighted else self.colour)
        if self.text:
            self.drawText(self.text)
        window.blit(self.image, self.pos)

    def drawText(self, text):
        font = pg.font.SysFont("arial", 20, bold=1)
        text = font.render(text, True, (0, 0, 0))
        width, height = text.get_size()
        x = (self.width - width) // 2
        y = (self.height - height) // 2
        self.image.blit(text, (x, y))
