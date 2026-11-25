// Build a small trimmed original-events package (a few events + all items) for the web
// preview UI test, which has a 5 MiB file-upload limit. Writes to the git-ignored generated
// folder. The domains stay a superset (extra allowedKeys are harmless); events are trimmed.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolveControlledEventContent } from '../../packages/game-core/src/controlled-event.ts';

const dir = 'assets/generated/original-events';
const file = readdirSync(dir).find(name => name.endsWith('.local.json') && !name.includes('diagnostics'));
const content = JSON.parse(readFileSync(`${dir}/${file}`, 'utf8'));

// Keep a handful of events (incl. event 16 which branches on current item 160) and every item.
const keepEvents = [0, 1, 2, 3, 4, 5, 16];
const events = {};
const dialogues = {};
for (const id of keepEvents) {
  const key = `original.jy.events:event/${id}`;
  if (!content.events[key]) continue;
  events[key] = content.events[key];
  for (const step of content.events[key].steps)
    if (step.op === 'say' && content.dialogues[step.dialogueId]) dialogues[step.dialogueId] = content.dialogues[step.dialogueId];
}
const trimmed = { ...content, events, dialogues };
const resolved = await resolveControlledEventContent(trimmed);
const out = `${dir}/trimmed-preview.local.json`;
writeFileSync(out, JSON.stringify(resolved.data, null, 2) + '\n', 'utf8');
console.log(`events ${Object.keys(events).length}, dialogues ${Object.keys(dialogues).length}, items ${Object.keys(trimmed.items).length}`);
console.log(`sha ${resolved.identity.sha256}`);
console.log(`bytes ${readFileSync(out).length} -> ${out}`);
