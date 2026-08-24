from pathlib import Path
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "build" / "icon.ico"
SIZE = 256

image = Image.new("RGBA", (SIZE, SIZE), (8, 11, 18, 0))
draw = ImageDraw.Draw(image)

margin = 14
bounds = (margin, margin, SIZE - margin, SIZE - margin)
draw.ellipse(bounds, fill=(243, 247, 252, 255), outline=(8, 11, 18, 255), width=12)
draw.pieslice(bounds, 180, 360, fill=(255, 77, 54, 255))
draw.rectangle((margin + 3, 118, SIZE - margin - 3, 138), fill=(8, 11, 18, 255))
draw.ellipse((91, 91, 165, 165), fill=(243, 247, 252, 255), outline=(8, 11, 18, 255), width=12)
draw.ellipse((113, 113, 143, 143), fill=(174, 226, 255, 255), outline=(8, 11, 18, 255), width=6)

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
image.save(OUTPUT, format="ICO", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
print(OUTPUT)
