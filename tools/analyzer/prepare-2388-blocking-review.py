import base64
import hashlib
import json
from pathlib import Path

root = Path('assets/generated')
world_path = root / 'world-preview/world-fa9af52a0d2428da.local.json'
review = root / 'world-asset-review'
raw = world_path.read_bytes()
world = json.loads(raw)
catalogue = json.loads((review / 'catalogue.local.json').read_bytes())
assert hashlib.sha256(raw).hexdigest() == catalogue['worldSha256']
grid = world['package']['maps'][0]
width, height = grid['width'], grid['height']
blocked = set(grid['blocked'])
owners = {}
targets = []
for item in catalogue['instances']:
    anchor = (item['anchor']['x'], item['anchor']['y'])
    tile = item['tileValue']
    if tile == 2388:
        targets.append(anchor)
    for y, row in enumerate(item['mask'], item['bounds']['minY']):
        for x, flag in enumerate(row, item['bounds']['minX']):
            if flag == '1':
                assert (x, y) not in owners
                owners[x, y] = (anchor, tile)

cards = []
for ax, ay in targets:
    counts = dict(own=0, other=0, unknown=0)
    cells = []
    for y in range(ay - 5, ay + 6):
        for x in range(ax - 5, ax + 6):
            owner = owners.get((x, y))
            if not (0 <= x < width and 0 <= y < height):
                kind, label = 'outside', '圖外'
            elif y * width + x not in blocked:
                kind, label = 'open', '可走'
            elif owner and owner[0] == (ax, ay):
                kind, label = 'own', '阻擋，指向此山'
            elif owner:
                kind, label = 'other', f'阻擋，指向 {owner[1]} 錨點 {owner[0]}'
            else:
                kind, label = 'unknown', '阻擋，圖錄無對應錨點'
            if kind in counts:
                counts[kind] += 1
            marker = '★' if (x, y) == (ax, ay) else ''
            cells.append(f'<span class="{kind}" title="({x}, {y}) {label}">{marker}</span>')
    card = f'<article><h2>座標 ({ax}, {ay})</h2><p>指向此山 {counts["own"]} 格 · 指向其他物件 {counts["other"]} 格 · 無對應 {counts["unknown"]} 格</p><div class="grid">{"".join(cells)}</div></article>'
    cards.append((counts['other'] + counts['unknown'], -counts['own'], ax, ay, card))

cards.sort()
html = """<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><title>2388 山體通行格圖</title>
<style>
body{font:16px system-ui;background:#f6f7f4;color:#17221a;margin:24px}header{max-width:820px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));gap:16px}article{background:white;padding:16px;border-radius:10px}h2{margin:0;font-size:19px}article p{font-size:13px}.grid{display:grid;grid-template-columns:repeat(11,23px);gap:2px}.grid span{height:23px;text-align:center}.open{background:#dcebd7}.own{background:#bc3d37;color:white}.other{background:#7250a1;color:white}.unknown{background:#536476;color:white}.outside{background:#20262c}.legend span{display:inline-block;padding:3px 8px;margin:2px}
</style>
<header><h1>2388 山體通行格圖</h1>
<img alt="2388 山體原圖" width="108" height="102" src="../world-preview/images-fa9af52a0d2428da/tile-2388-resource-1194.png">
<p>每張圖以 ★ 為該次放置的錨點。向右是 X 增加，向下是 Y 增加。游標移到格子可看座標與錨點。</p>
<p class="legend"><span class="open">可走</span><span class="own">阻擋，指向此山</span><span class="other">阻擋，指向其他錨點</span><span class="unknown">阻擋，無對應錨點</span><span class="outside" style="color:white">圖外</span></p>
<p>先看其他阻擋格最少的案例。紫格的資料只記一個錨點，兩個物件是否共用該格仍待確認。通行顏色來自目前 Web 世界預覽的判定。</p></header><main>"""
assert len(cards) == 93
(review / 'building-2388-blocking.local.html').write_text(html + ''.join(card[-1] for card in cards) + '</main></html>', encoding='utf-8')
print([card[:4] for card in cards[:10]])
