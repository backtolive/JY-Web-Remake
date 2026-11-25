// Bounds-safe verification of the item-icon block in both atlases (logical 3501..3700).
// Compares world (WDX000/WMP000) vs scene (SDX000/SMP000) decoded pixels to see if they
// are byte-identical, and reports per-icon opaque-pixel counts.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const dos = name => readFileSync(`original/dos/${name}`);
const ITEM_BASE = 3501;
const ICON_SIZE = 1728;
const palette = dos('MMAP.COL');
const rgb = i => [palette[i * 3], palette[i * 3 + 1], palette[i * 3 + 2]];

function makeReader(idxName, grpName) {
  const idx = dos(idxName), grp = dos(grpName);
  const entries = idx.length / 4;
  const off = i => (i < entries ? idx.readInt32LE(i * 4) : null);
  return { idxName, entries, off, grp, sha: createHash('sha256').update(idx).digest('hex').slice(0, 12) };
}

function decode(reader, item) {
  const lo = ITEM_BASE + item;
  const start = reader.off(lo), end = reader.off(lo + 1);
  if (start === null || end === null || end - start !== ICON_SIZE) return null;
  const data = reader.grp.subarray(start, end);
  const w = data.readInt16LE(0), h = data.readInt16LE(2);
  const px = new Uint8Array(w * h * 3);
  let p = 8, opaque = 0;
  for (let y = 0; y < h && p < data.length; y++) {
    const row = data[p++];
    if (row === 0) continue;
    let x = 0;
    while (x < w && p < data.length) {
      x += data[p++];
      if (x >= w) break;
      const solid = data[p++];
      for (let j = 0; j < solid && x < w; j++, p++, x++) {
        const [r, g, b] = rgb(data[p]);
        const o = (y * w + x) * 3;
        px[o] = r; px[o + 1] = g; px[o + 2] = b;
        if (r || g || b) opaque++;
      }
    }
  }
  return { w, h, px, opaque };
}

const W = makeReader('WDX000', 'WMP000');
const S = makeReader('SDX000', 'SMP000');
console.log(`world  ${W.idxName}: ${W.entries} entries (sha ${W.sha})`);
console.log(`scene  ${S.idxName}: ${S.entries} entries (sha ${S.sha})\n`);

let wPresent = 0, sPresent = 0, identical = 0, differing = [];
const opaqueMin = { w: Infinity, s: Infinity }, opaqueMax = { w: 0, s: 0 };
for (let item = 0; item < 200; item++) {
  const w = decode(W, item), s = decode(S, item);
  if (w) { wPresent++; opaqueMin.w = Math.min(opaqueMin.w, w.opaque); opaqueMax.w = Math.max(opaqueMax.w, w.opaque); }
  if (s) { sPresent++; opaqueMin.s = Math.min(opaqueMin.s, s.opaque); opaqueMax.s = Math.max(opaqueMax.s, s.opaque); }
  if (w && s) {
    if (Buffer.compare(Buffer.from(w.px), Buffer.from(s.px)) === 0) identical++;
    else differing.push(item);
  }
}
console.log(`world icons present: ${wPresent}/200 (opaque min ${opaqueMin.w} max ${opaqueMax.w} of 1600)`);
console.log(`scene icons present: ${sPresent}/200 (opaque min ${opaqueMin.s} max ${opaqueMax.s} of 1600)`);
console.log(`world==scene pixel-identical: ${identical}/${wPresent} shared; differing items: [${differing.slice(0, 10)}]${differing.length > 10 ? ` …(+${differing.length - 10})` : ''}`);
console.log('\nDONE');
