# Tiles preview images into one labelled sheet, to compare variants side by side (Python 3 + Pillow).
#   py -3 tools/contact_sheet.py out.png "label=path/a.png" "label=path/b.png" ...
import sys

from PIL import Image, ImageDraw

W, H, COLS = 640, 360, 3


def main():
    out, items = sys.argv[1], [a.split('=', 1) for a in sys.argv[2:]]
    rows = (len(items) + COLS - 1) // COLS
    sheet = Image.new('RGB', (W * COLS, H * rows), (20, 20, 24))
    draw = ImageDraw.Draw(sheet)
    for i, (label, path) in enumerate(items):
        x, y = (i % COLS) * W, (i // COLS) * H
        sheet.paste(Image.open(path).convert('RGB').resize((W, H)), (x, y))
        draw.rectangle([x, y, x + 180, y + 22], fill=(0, 0, 0))
        draw.text((x + 6, y + 5), label, fill=(255, 220, 120))
    sheet.save(out)
    print('wrote', out)


main()
