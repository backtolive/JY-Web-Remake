// Visual verification: decode item icon 110 (金蛇劍) from the WMP000/WDX000 atlas
// (logical index 3501+110=3611) and item 160 (唐詩選輯, 3501+160=3661), using the
// MMAP.COL 256x3 RGB palette. Format per piccache.c: [w:2][h:2][xoff:2][yoff:2] then
// per row: rowByte, then (transparentCount, solidCount, palIndex x solidCount) runs.
// Output: P6 PPM files in assets/generated/pic-atlas-probe/ (git-ignored local output).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const dos = name => readFileSync(`original/dos/${name}`);
const outDir = 'assets/generated/pic-atlas-probe';
mkdirSync(outDir, { recursive: true });

const palette = dos('MMAP.COL');
const rgb = i => [palette[i * 3], palette[i * 3 + 1], palette[i * 3 + 2]];

function decodeIcon(idxName, grpName, logicalIndex) {
  const idx = dos(idxName);
  const start = idx.readInt32LE(logicalIndex * 4);
  const end = idx.readInt32LE((logicalIndex + 1) * 4);
  const data = dos(grpName).subarray(start, end);
  const w = data.readInt16LE(0), h = data.readInt16LE(2);
  const pixels = new Uint8Array(w * h * 3); // transparent = 0,0,0
  let p = 8;
  for (let y = 0; y < h; y++) {
    if (p >= data.length) break;
    const row = data[p++];
    if (row === 0) continue;
    let x = 0;
    while (x < w && p < data.length) {
      x += data[p++]; // transparent run
      if (x >= w) break;
      const solid = data[p++];
      for (let j = 0; j < solid && x < w; j++, p++, x++) {
        const [r, g, b] = rgb(data[p]);
        const o = (y * w + x) * 3;
        pixels[o] = r; pixels[o + 1] = g; pixels[o + 2] = b;
      }
    }
  }
  return { w, h, pixels };
}

for (const [itemId, label] of [[110, 'jinse-sword-110'], [160, 'tang-poetry-160'], [0, 'kangbeitete-0']]) {
  const { w, h, pixels } = decodeIcon('WDX000', 'WMP000', 3501 + itemId);
  const file = `${outDir}/item-${itemId}-${label}.ppm`;
  writeFileSync(file, Buffer.concat([Buffer.from(`P6\n${w} ${h}\n255\n`), Buffer.from(pixels)]));
  console.log(`item ${itemId} (${label}): ${w}x${h} -> ${file}`);
}
console.log('done');
