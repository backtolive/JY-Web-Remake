// Survey -2 (current scene) writes in the corpus: opcodes, slot/field combos, event counts.
import { readFileSync, readdirSync } from 'node:fs';

const file = readdirSync('assets/generated/event-corpus')
  .find(name => name.startsWith('all-events-') && name.endsWith('.local.json'));
const corpus = JSON.parse(readFileSync(`assets/generated/event-corpus/${file}`, 'utf8'));
const events = corpus.events ?? corpus;
const list = Array.isArray(events) ? events : Object.values(events);

// Opcodes that write scene slots: 3 (slotWrite, fields 0-7), 26 (slotAdd, fields 2-4), 27 (slotSet567, fields 5-7).
const combos = new Set();
const byOpcode = { 3: 0, 26: 0, 27: 0 };
const eventsWithMinus2 = new Set();
const explicitScenes = new Set();

for (const event of list) {
  for (const ins of event.instructions ?? []) {
    const [a0, a1] = ins.args;
    if (ins.opcode === 3 && a0 === -2) {
      byOpcode[3]++; eventsWithMinus2.add(event.id ?? event.eventId);
      for (let field = 0; field < 8; field++) if (typeof ins.args[2 + field] === 'number' && ins.args[2 + field] !== -2)
        combos.add(`slot/${a1}/field/${field}`);
    } else if (ins.opcode === 3 && typeof a0 === 'number' && a0 !== -2) {
      explicitScenes.add(a0);
    }
    if (ins.opcode === 26 && a0 === -2) {
      byOpcode[26]++; eventsWithMinus2.add(event.id ?? event.eventId);
      for (const field of [2, 3, 4]) combos.add(`slot/${a1}/field/${field}`);
    } else if (ins.opcode === 26 && typeof a0 === 'number' && a0 !== -2) {
      explicitScenes.add(a0);
    }
    if (ins.opcode === 27) {
      // opcode 27 [enum, begin, end] writes to 'current' scene slot a0, fields 5-7.
      byOpcode[27]++;
      eventsWithMinus2.add(event.id ?? event.eventId);
      combos.add(`slot/${a0}/field/5`); combos.add(`slot/${a0}/field/6`); combos.add(`slot/${a0}/field/7`);
    }
  }
}
console.log('opcode -2 write counts:', JSON.stringify(byOpcode));
console.log('events with -2 writes:', eventsWithMinus2.size);
console.log('distinct slot/field combos:', combos.size);
console.log('combos:', [...combos].sort().join(', '));
console.log('explicit scenes (non -2):', [...explicitScenes].sort((a, b) => a - b).join(', '));
console.log('explicit scene count:', explicitScenes.size);
