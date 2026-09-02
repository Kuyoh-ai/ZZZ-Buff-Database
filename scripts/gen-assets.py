# favicon PNG / OGP 画像を public/ に生成する。実行: python scripts/gen-assets.py (Playwright + Chromium が必要)
import os
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets")
PUB = os.path.join(ROOT, "public")
os.makedirs(PUB, exist_ok=True)

FAV_HTML = """<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@1,900&display=swap" rel="stylesheet">
<style>body{margin:0;background:transparent}img,svg{display:block}</style></head>
<body><div id="w" style="width:%dpx;height:%dpx">%s</div></body></html>"""

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    # OG image
    pg = b.new_page(viewport={"width": 1200, "height": 630}, device_scale_factor=1)
    pg.goto("file:///" + os.path.join(S, "og-template.html").replace("\\", "/"))
    pg.wait_for_load_state("networkidle"); pg.wait_for_timeout(800)
    pg.screenshot(path=os.path.join(PUB, "og.png"), clip={"x": 0, "y": 0, "width": 1200, "height": 630})
    print("og.png")
    # favicon PNGs from SVG (inline so fonts load)
    svg = open(os.path.join(PUB, "favicon.svg"), encoding="utf8").read()
    for size, name in [(32, "favicon-32.png"), (192, "icon-192.png"), (512, "icon-512.png"), (180, "apple-touch-icon.png")]:
        pg = b.new_page(viewport={"width": size, "height": size}, device_scale_factor=1)
        s2 = svg.replace('viewBox="0 0 64 64"', f'viewBox="0 0 64 64" width="{size}" height="{size}"')
        pg.set_content(FAV_HTML % (size, size, s2)); pg.wait_for_load_state("networkidle"); pg.wait_for_timeout(500)
        pg.screenshot(path=os.path.join(PUB, name), omit_background=True, clip={"x": 0, "y": 0, "width": size, "height": size})
        print(name)
    b.close()
