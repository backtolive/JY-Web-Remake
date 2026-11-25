// Probe the RANGER.GRP item table (offset 59076, 190 bytes x 200 records) against the
// community Thing_S layout (jyconst.lua) using known item IDs from the event corpus.
// Read-only: decodes name/description (Big5) and key int fields for a few records.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const file = 'original/dos/RANGER.GRP';
const buf = readFileSync(file);
const sha = createHash('sha256').update(buf).digest('hex');
console.log('RANGER.GRP bytes:', buf.length, 'sha256:', sha.slice(0, 16));

const TABLE = 59076, SIZE = 190, COUNT = 200;
console.log('item table span:', TABLE, '..', TABLE + SIZE * COUNT, '(end ok:', buf.length >= TABLE + SIZE * COUNT, ')');

const text = (off, len) => {
  const raw = buf.subarray(off, off + len);
  const end = raw.indexOf(0);
  const bytes = end === -1 ? raw : raw.subarray(0, end);
  return Buffer.from(bytes).toString('utf16le') === '' ? '' : decodeBig5(bytes);
};
// Big5 decode via TextDecoder if available, else hex dump.
let big5;
try { big5 = new TextDecoder('big5'); } catch { big5 = null; }
function decodeBig5(bytes) {
  if (big5) { try { return big5.decode(bytes); } catch { } }
  return [...bytes].map(b => b.toString(16).padStart(2, '0')).join(' ');
}
const i16 = off => buf.readInt16LE(off);

const records = [0, 57, 78, 110, 138, 144, 160, 174];
for (const id of records) {
  const off = TABLE + id * SIZE;
  const name = text(off + 2, 20);
  const name2 = text(off + 22, 20);
  const desc = text(off + 42, 30);
  console.log(`\nitem ${id}: code=${i16(off)} name="${name}" name2="${name2}"`);
  console.log(`  desc="${desc}"`);
  console.log(`  skill=${i16(off + 72)} anim=${i16(off + 74)} user=${i16(off + 76)} equipType=${i16(off + 78)} showDesc=${i16(off + 80)} type=${i16(off + 82)}`);
  console.log(`  hp+${i16(off + 90)} maxHp+${i16(off + 92)} mp+${i16(off + 100)} maxMp+${i16(off + 102)} atk+${i118safe(off)} speed+${i16(off + 106)}`);
}
function i118safe(off) { return i16(off + 104); }
