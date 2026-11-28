// Extract martial arts table from RANGER.GRP (Section 5: 136B × 93).
// Output: JSON with id, name, type, damage[10], range[10], extra flags.
// Usage: node tools/extractor/extract-martial-arts.mjs [output.json]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const RANGER_FILE = resolve('original/dos/RANGER.GRP');
const REC_SIZE = 136;
const COUNT = 93;
const START = 101444;

const buf = readFileSync(RANGER_FILE);
if (buf.length < START + REC_SIZE * COUNT) {
  throw new Error(`RANGER.GRP too small: ${buf.length} < ${START + REC_SIZE * COUNT}`);
}

const big5 = new TextDecoder('big5');
const sha = createHash('sha256').update(buf).digest('hex');

const records = [];
for (let i = 0; i < COUNT; i++) {
  const off = START + i * REC_SIZE;
  const id = buf.readInt16LE(off);
  // Find name end (first 00 00 after offset 2)
  let nameEnd = 2;
  while (nameEnd < REC_SIZE && !(buf[off + nameEnd] === 0 && buf[off + nameEnd + 1] === 0)) {
    nameEnd += 2;
  }
  const name = big5.decode(buf.subarray(off + 2, off + nameEnd));
  const type = buf.readInt16LE(off + 26);
  const damage = [];
  const range = [];
  for (let lvl = 0; lvl < 10; lvl++) {
    damage.push(buf.readInt16LE(off + 36 + lvl * 2));
    range.push(buf.readInt16LE(off + 64 + lvl * 2));
  }
  const extra1 = buf.readInt16LE(off + 84);
  const extra2 = buf.readInt16LE(off + 86);
  records.push({ id, name, type, damage, range, extra1, extra2 });
}

const output = {
  source: { file: RANGER_FILE, sha256: sha, byteLength: buf.length },
  table: { start: START, recordSize: REC_SIZE, count: COUNT },
  records,
};

const outPath = resolve(process.argv[2] ?? 'assets/generated/martial-arts/martial-arts.local.json');
mkdirSync(resolve(outPath, '..'), { recursive: true });
writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({
  destination: outPath,
  count: records.length,
  sha256: sha,
  types: [...new Set(records.map(r => r.type))].sort((a, b) => a - b),
  sample: records.slice(0, 3).map(r => `${r.id}:${r.name}(dmg:${r.damage[0]}..${r.damage[9]},range:${r.range[0]}..${r.range[9]})`),
}));
