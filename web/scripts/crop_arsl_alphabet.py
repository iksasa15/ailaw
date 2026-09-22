"""Equal-grid crop tuned for the 349x573 ArSL alphabet chart."""
from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFont

src = Path(
    r"C:\Users\A7MED\.cursor\projects\c-Users-A7MED-Desktop-ailaw\assets"
    r"\c__Users_A7MED_AppData_Roaming_Cursor_User_workspaceStorage_"
    r"ae07213762aaa1e5a5f5129e830d4bb3_images_images-de521212-4274-4bbc-9cbf-774b7954ffdc.jpg"
)
img = Image.open(src).convert("RGB")
w, h = img.size

# Calibrated by inspecting the chart (title under ~10%, thin outer margin)
LEFT = 0.045 * w
RIGHT = 0.955 * w
TOP = 0.122 * h
BOTTOM = 0.978 * h

letters = [
    "أ", "ب", "ت", "ث", "ج",
    "ح", "خ", "د", "ذ", "ر",
    "ز", "س", "ش", "ص", "ض",
    "ط", "ظ", "ع", "غ", "ف",
    "ق", "ك", "ل", "م", "ن",
    "ه", "و", "ي", "ة", "لا",
]
names = {
    "أ": "alef", "ب": "ba", "ت": "ta", "ث": "tha", "ج": "jeem",
    "ح": "ha", "خ": "kha", "د": "dal", "ذ": "dhal", "ر": "ra",
    "ز": "zay", "س": "seen", "ش": "sheen", "ص": "sad", "ض": "dad",
    "ط": "tah", "ظ": "zah", "ع": "ain", "غ": "ghain", "ف": "fa",
    "ق": "qaf", "ك": "kaf", "ل": "lam", "م": "meem", "ن": "noon",
    "ه": "haa", "و": "waw", "ي": "ya", "ة": "ta_marbuta", "لا": "la",
}

out = Path(r"c:\Users\A7MED\Desktop\ailaw\web\public\signs\alphabet")
out.mkdir(parents=True, exist_ok=True)

cols, rows = 5, 6
cell_w = (RIGHT - LEFT) / cols
cell_h = (BOTTOM - TOP) / rows

# Debug overlay
dbg = img.copy()
draw = ImageDraw.Draw(dbg)

manifest = {}
for i, letter in enumerate(letters):
    r, c = divmod(i, cols)
    # chart is right-to-left within each row (أ on the right)
    col = cols - 1 - c
    x0 = LEFT + col * cell_w + cell_w * 0.07
    y0 = TOP + r * cell_h + cell_h * 0.06
    x1 = LEFT + (col + 1) * cell_w - cell_w * 0.07
    y1 = TOP + (r + 1) * cell_h - cell_h * 0.05
    tile = img.crop((int(x0), int(y0), int(x1), int(y1)))
    tile = tile.resize((200, 260), Image.Resampling.LANCZOS)
    fname = f"{names[letter]}.jpg"
    tile.save(out / fname, quality=92)
    manifest[letter] = f"/signs/alphabet/{fname}"
    draw.rectangle([x0, y0, x1, y1], outline=(255, 0, 0), width=1)

dbg.save(out / "_debug_grid.jpg", quality=90)

# contact sheet all
sheet = Image.new("RGB", (200 * 5, 260 * 6), (255, 255, 255))
for i, letter in enumerate(letters):
    r, c = divmod(i, cols)
    t = Image.open(out / f"{names[letter]}.jpg")
    sheet.paste(t, (c * 200, r * 260))
sheet.save(out / "_preview_all.jpg", quality=85)

(out / "manifest.json").write_text(
    json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
)
print("done", len(manifest))
