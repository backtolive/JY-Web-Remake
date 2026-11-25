// Read-only probe answering: is ALLDEF.GRP the source of item images?
// Evidence gathered:
//  1. ALLDEF.GRP structure: 100 scene blocks x 4,400B = 200 slots x 22B (11 int16
//     fields). Field stats show a sparse structured table (event refs, coords,
//     animation numbers), not an image byte stream.
//  2. Community sources agree item icons live in the map-pic atlas, not ALLDEF:
//     - kys_type.pas:302 ITEM_BEGIN_PIC = 3501 (item start pic in MPic atlas)
//     - kys_main.pas:4345 DrawMPic(ITEM_BEGIN_PIC + itemNumber, ...)
//     - jyconst.lua:601-602 LoadThingPic: 0 = read from mmap/smap/wmap at
//       StartThingPic + thing[id]; 1 = standalone thing.idx/thing.grp
//     - The local DOS directory has no thing.grp; the map pics are the split
//       MMAP / SMP000-083 (+SDX) / WMP000-025 (+WDX) files.
//  3. Index-file entry counts must cover 3501 + 200 items = 3701 entries for the
//     atlas mode to hold item icons.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const sha = buf => createHash('sha256').update(buf).digest('hex');
const dos = name => readFileSync(`original/dos/${name}`);

// 1. ALLDEF.GRP structure.
const alldef = dos('ALLDEF.GRP');
console.log(`ALLDEF.GRP ${alldef.length} bytes sha256 ${sha(alldef).slice(0, 16)}…`);
console.log(`pinned 3633122f6a43f0b5dd390c2fa2516766d735a064ca955c8766b73232230a4480`);
const SCENES = 100, SLOTS = 200, FIELDS = 11;
if (alldef.length !== SCENES * SLOTS * FIELDS * 2) { console.log('STRUCTURE_MISMATCH'); process.exit(1); }
const stats = Array.from({ length: FIELDS }, () => ({ min: Infinity, max: -Infinity, neg: 0, zero: 0 }));
const field2 = {}; // event-reference field histogram (counts)
for (let s = 0; s < SCENES; s++) for (let sl = 0; sl < SLOTS; sl++) {
  for (let f = 0; f < FIELDS; f++) {
    const v = alldef.readInt16LE((s * SLOTS + sl) * 22 + f * 2);
    const row = stats[f];
    if (v < row.min) row.min = v;
    if (v > row.max) row.max = v;
    if (v < 0) row.neg++;
    if (v === 0) row.zero++;
  }
  const e = alldef.readInt16LE((s * SLOTS + sl) * 22 + 4); // field 2
  if (e > 0) field2[e] = (field2[e] ?? 0) + 1;
}
console.log('field min/max/neg/zero:');
stats.forEach((row, f) => console.log(`  f${f}: [${row.min}..${row.max}] neg=${row.neg} zero=${row.zero}`));
const field2Entries = Object.keys(field2).length;
const field2InRange = Object.values(field2).every(() => true) &&
  Object.keys(field2).every(id => Number(id) <= 1018);
console.log(`field2 (event refs) distinct positive ids: ${field2Entries}, all <= 1018: ${field2InRange}`);

// 2. Index files: entry count and offset validity.
const probeIdx = (idxName, grpName) => {
  const idx = dos(idxName);
  const entries = Math.floor(idx.length / 4);
  const offsets = Array.from({ length: entries }, (_, i) => idx.readUInt32LE(i * 4));
  const maxOffset = Math.max(...offsets);
  const last = offsets[entries - 1];
  const size = grpName ? dos(grpName).length : null;
  console.log(`${idxName}: ${entries} entries, first=${offsets[0]}, last=${last}, max=${maxOffset}${size ? `, ${grpName}=${size}B, valid=${maxOffset < size}` : ''}`);
  return entries;
};
const sd0 = probeIdx('SDX000', 'SMP000');
probeIdx('MMAP.IDX', 'MMAP.GRP');
probeIdx('WDX000', 'WMP000');
probeIdx('HDGRP.IDX', 'HDGRP.GRP');
probeIdx('KEND.IDX', 'KEND.GRP');
console.log(`SDX000 entries ${sd0} >= 3701 (3501 + 200 items): ${sd0 >= 3701}`);
console.log(sd0 >= 3701
  ? 'CONCLUSION: ALLDEF is the scene event-slot table; item icons live in the map-pic atlas (scene: SMP/SDX, index >= 3501 per community Pascal ITEM_BEGIN_PIC)'
  : 'CONCLUSION: ALLDEF is the scene event-slot table; atlas coverage for item icons UNCONFIRMED');
