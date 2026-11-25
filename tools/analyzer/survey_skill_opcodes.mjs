// Survey corpus usage of opcodes 33, 35, 41, 50: event counts, arg distributions.
import { readFileSync, readdirSync } from 'node:fs';

const file = readdirSync('assets/generated/event-corpus')
  .find(name => name.startsWith('all-events-') && name.endsWith('.local.json'));
const corpus = JSON.parse(readFileSync(`assets/generated/event-corpus/${file}`, 'utf8'));
const events = corpus.events ?? corpus;
const list = Array.isArray(events) ? events : Object.values(events);

for (const target of [33, 35, 41, 50]) {
  const hits = [];
  for (const event of list) {
    for (const ins of event.instructions ?? []) {
      if (ins.opcode === target) hits.push({ event: event.id ?? event.eventId, args: ins.args });
    }
  }
  console.log(`\nopcode ${target}: ${hits.length} instructions`);
  const byEvent = new Map();
  for (const h of hits) byEvent.set(h.event, (byEvent.get(h.event) ?? 0) + 1);
  console.log(`  events: ${byEvent.size}`);
  for (const h of hits.slice(0, 12)) console.log(`  ${h.event} args=${JSON.stringify(h.args)}`);
  if (target === 35) {
    const inRange = hits.filter(h => Number.isInteger(h.args[1]) && h.args[1] >= 0 && h.args[1] <= 9);
    console.log(`  magiclistnum in 0..9: ${inRange.length} / out-of-range: ${hits.length - inRange.length}`);
    const dist = {};
    for (const h of hits) dist[JSON.stringify(h.args[1])] = (dist[JSON.stringify(h.args[1])] ?? 0) + 1;
    console.log(`  magiclistnum dist: ${JSON.stringify(dist)}`);
  }
  if (target === 33) {
    const dist = {};
    for (const h of hits) dist[JSON.stringify(h.args[2])] = (dist[JSON.stringify(h.args[2])] ?? 0) + 1;
    console.log(`  dismode dist: ${JSON.stringify(dist)}`);
  }
  if (target === 50) {
    for (const h of hits) console.log(`  50 ${h.event} list0=${h.args[0] > 128 ? 'DYNAMIC(>128)' : '50e'} args=${JSON.stringify(h.args)}`);
  }
}
