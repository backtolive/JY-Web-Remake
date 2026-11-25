// Read-only coverage estimate: which events are fully convertible under a candidate opcode set.
import { readFileSync } from 'node:fs';

const root = process.argv[2] ?? 'original/dos';
const read = name => new Uint8Array(readFileSync(`${root}/${name}`));
const idx = read('KDEF.IDX'), grp = read('KDEF.GRP');
function uint32s(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const out = [];
  for (let i = 0; i + 4 <= bytes.byteLength; i += 4) out.push(view.getUint32(i, true));
  return out;
}
const e32 = uint32s(idx);
const ranges = [];
for (let i = 0; i < e32.length; i++) ranges.push([i === 0 ? 0 : e32[i - 1], e32[i]]);
const wordsOf = ([start, end]) => {
  const view = new DataView(grp.buffer, grp.byteOffset, grp.byteLength);
  const out = [];
  for (let i = start; i + 2 <= end; i += 2) out.push(view.getInt16(i, true));
  return out;
};
const TABLE = {};
for (const [op, w] of [
  [0,1],[1,4],[2,3],[3,14],[4,4],[5,3],[6,5],[7,1],[8,2],[9,3],[10,2],[11,3],[12,1],[13,1],[14,1],
  [15,2],[16,4],[17,6],[18,4],[19,3],[20,3],[21,2],[22,1],[23,3],[24,1],[25,5],[26,6],[27,4],
  [28,6],[29,6],[30,5],[31,4],[32,3],[33,4],[34,3],[35,5],[36,4],[37,2],[38,5],[39,2],[40,2],
  [41,4],[42,3],[43,4],[44,7],[45,3],[46,3],[47,3],[48,3],[49,3],[50,8],[51,1],[52,1],[53,1],
  [54,1],[55,5],[56,2],[57,1],[58,1],[59,1],[60,6],[61,3],[62,7],[63,3],[64,1],[65,1],[66,2],[67,2],
]) TABLE[op] = w;

// Candidate supported set (evidence-mapped in this session):
const SUPPORTED = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
  20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42,
  43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65,
  66, 67]);
const blocking = new Map();
let convertible = 0, blockedEvents = 0;
const blockedEventIds = [];
for (let eventId = 0; eventId < ranges.length; eventId++) {
  const words = wordsOf(ranges[eventId]);
  let cursor = 0, ok = true;
  while (cursor < words.length) {
    const op = words[cursor];
    if (op === -1) break;
    if (!TABLE[op]) { ok = false; break; }
    if (!SUPPORTED.has(op)) {
      ok = false;
      if (!blocking.has(op)) blocking.set(op, new Set());
      blocking.get(op).add(eventId);
      break;
    }
    cursor += TABLE[op];
  }
  if (ok) convertible++;
  else { blockedEvents++; blockedEventIds.push(eventId); }
}
console.log(JSON.stringify({
  total: ranges.length, convertible, blockedEvents,
  blockingOpcodeEvents: Object.fromEntries([...blocking.entries()].sort((a, b) => a[0] - b[0])
    .map(([op, set]) => [op, set.size])),
  blockedEventIds: blockedEventIds.slice(0, 60)
}, null, 1));
