// Survey the RANGER item table UnKnow7 field (offset 88): community Pascal UseItem
// (kys_main.pas) calls CallEvent(UnKnow7) directly for type-0 items when it is > 0.
// Read-only probe; also lists the type/equipType/user fields for context.
import { readFileSync } from 'node:fs';

const buf = readFileSync('original/dos/RANGER.GRP');
const TABLE = 59076, SIZE = 190, COUNT = 200;
const big5 = new TextDecoder('big5');
const text = (off, len) => {
  const raw = buf.subarray(off, off + len);
  const end = raw.indexOf(0);
  const bytes = end === -1 ? raw : raw.subarray(0, end);
  return bytes.length ? big5.decode(bytes) : '';
};
const i16 = off => buf.readInt16LE(off);

let bound = 0;
const rows = [];
for (let id = 0; id < COUNT; id++) {
  const off = TABLE + id * SIZE;
  const name = text(off + 2, 20);
  const type = i16(off + 82);
  const unKnow7 = i16(off + 88);
  if (unKnow7 > 0) { bound++; rows.push(`item ${id} "${name}" type=${type} UnKnow7=${unKnow7}`); }
}
console.log(`items with UnKnow7 > 0: ${bound}`);
for (const row of rows) console.log(row);
// Also print the key DOS-observation items explicitly.
for (const id of [0, 57, 78, 110, 138, 144, 160, 174]) {
  const off = TABLE + id * SIZE;
  console.log(`key item ${id} "${text(off + 2, 20)}": type=${i16(off + 82)} equipType=${i16(off + 78)} user=${i16(off + 76)} UnKnow7=${i16(off + 88)}`);
}
