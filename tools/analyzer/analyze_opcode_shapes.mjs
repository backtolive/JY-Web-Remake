// Read-only analysis of opcode argument shapes across the full KDEF corpus.
// Not a converter; outputs aggregate shape statistics only (no game content).
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

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

// FishEdit table (pinned commit 1d439af): opcode -> [words, yesSlot, noSlot]
const TABLE = {};
for (const [op, w, y, n] of [
  [0,1,0,0],[1,4,0,0],[2,3,0,0],[3,14,0,0],[4,4,2,3],[5,3,1,2],[6,5,2,3],[7,1,0,0],[8,2,0,0],
  [9,3,1,2],[10,2,0,0],[11,3,1,2],[12,1,0,0],[13,1,0,0],[14,1,0,0],[15,2,0,0],[16,4,2,3],[17,6,0,0],
  [18,4,2,3],[19,3,0,0],[20,3,1,2],[21,2,0,0],[22,1,0,0],[23,3,0,0],[24,1,0,0],[25,5,0,0],[26,6,0,0],
  [27,4,0,0],[28,6,2,3],[29,6,2,3],[30,5,0,0],[31,4,2,3],[32,3,0,0],[33,4,0,0],[34,3,0,0],[35,5,0,0],
  [36,4,2,3],[37,2,0,0],[38,5,0,0],[39,2,0,0],[40,2,0,0],[41,4,0,0],[42,3,1,2],[43,4,2,3],[44,7,0,0],
  [45,3,0,0],[46,3,0,0],[47,3,0,0],[48,3,0,0],[49,3,0,0],[50,8,0,0],[51,1,0,0],[52,1,0,0],[53,1,0,0],
  [54,1,0,0],[55,5,3,4],[56,2,0,0],[57,1,0,0],[58,1,0,0],[59,1,0,0],[60,6,2,3],[61,3,0,0],[62,7,0,0],
  [63,3,0,0],[64,1,0,0],[65,1,0,0],[66,2,0,0],[67,2,0,0],
]) TABLE[op] = { words: w, yes: y, no: n };

const shapes = new Map(); // opcode -> Map(shapeKey -> {count, events: Set})
const eventsWith = new Map(); // opcode -> Set(eventId)
let totalInstructions = 0;
for (let eventId = 0; eventId < ranges.length; eventId++) {
  const words = wordsOf(ranges[eventId]);
  let cursor = 0;
  while (cursor < words.length) {
    const op = words[cursor];
    if (op === -1) break;
    const row = TABLE[op];
    if (!row) { console.log(`UNKNOWN_OPCODE event=${eventId} word=${cursor} op=${op}`); break; }
    const args = words.slice(cursor + 1, cursor + row.words);
    totalInstructions++;
    if (!eventsWith.has(op)) eventsWith.set(op, new Set());
    eventsWith.get(op).add(eventId);
    const key = args.join(',');
    if (!shapes.has(op)) shapes.set(op, new Map());
    const m = shapes.get(op);
    if (!m.has(key)) m.set(key, { count: 0, events: new Set() });
    const cell = m.get(key);
    cell.count++; cell.events.add(eventId);
    cursor += row.words;
  }
}

console.log(JSON.stringify({
  totalInstructions,
  perOpcode: Object.fromEntries([...eventsWith.entries()].sort((a, b) => a[0] - b[0])
    .map(([op, set]) => [op, { events: set.size,
      topShapes: [...shapes.get(op).entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 8)
        .map(([shape, v]) => ({ shape, count: v.count, events: v.events.size })) }]))
}, null, 1));
