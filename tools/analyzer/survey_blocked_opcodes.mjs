// Survey the 14 blocked opcodes in the corpus: arg shapes, positions, and which events
// would be unlocked if all 14 were mapped.
import { readFileSync, readdirSync } from 'node:fs';

const file = readdirSync('assets/generated/event-corpus')
  .find(name => name.startsWith('all-events-') && name.endsWith('.local.json'));
const corpus = JSON.parse(readFileSync(`assets/generated/event-corpus/${file}`, 'utf8'));
const events = corpus.events ?? corpus;
const list = Array.isArray(events) ? events : Object.values(events);

const BLOCKED = [4, 15, 19, 24, 25, 30, 44, 51, 57, 58, 60, 61, 62, 64];
const shapes = {};
const eventsUsing = {};
for (const op of BLOCKED) { shapes[op] = new Set(); eventsUsing[op] = new Set(); }

let unlockable = 0;
const stillBlockedBy = new Map();
for (const event of list) {
  const blocked = [...new Set(event.instructions
    .filter(ins => ins.opcode !== -1 && BLOCKED.includes(ins.opcode))
    .map(ins => ins.opcode))];
  if (!blocked.length) continue;
  const onlyThese = blocked.every(op => BLOCKED.includes(op));
  if (onlyThese) unlockable++;
  for (const op of blocked) {
    eventsUsing[op].add(event.eventId);
    const ins = event.instructions.find(i => i.opcode === op);
    shapes[op].add(JSON.stringify(ins.args));
  }
}
console.log('events using only blocked opcodes (would unlock if all 14 mapped):', unlockable);
for (const op of BLOCKED) {
  const arr = [...shapes[op]].sort();
  console.log(`\nopcode ${op}: events=${eventsUsing[op].size}`);
  if (arr.length <= 12) console.log('  shapes:', arr.join(' | '));
  else { console.log(`  shapes (${arr.length} distinct), first 12:`); for (const s of arr.slice(0, 12)) console.log('   ', s); }
}
// Positions: is 15/62 always the last instruction before -1?
for (const op of [15, 62]) {
  let last = 0, notLast = 0;
  for (const event of list) {
    const idxs = event.instructions.map((ins, i) => [ins.opcode, i])
      .filter(([o, i]) => o === op);
    for (const [_, i] of idxs) {
      const next = event.instructions[i + 1];
      if (next && next.opcode === -1) last++; else notLast++;
    }
  }
  console.log(`\nopcode ${op}: followed by -1 in ${last}, followed by other in ${notLast}`);
}
