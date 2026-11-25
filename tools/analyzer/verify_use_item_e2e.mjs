// End-to-end check of the USE_ITEM host command against the generated original package:
// use item 160, start scene event 16, expect the opcode-4 positive-arm dialogue.
// Read-only over assets/generated/original-events (git-ignored local output).
import { readdirSync, readFileSync } from 'node:fs';
import { resolveControlledEventContent, createControlledEventState, dispatchControlledEvent }
  from '../../packages/game-core/src/controlled-event.ts';

const file = readdirSync('assets/generated/original-events')
  .find(name => name.startsWith('original-events-') && name.endsWith('.local.json') && !name.includes('.diagnostics.'));
if (!file) { console.error('PACKAGE_MISSING'); process.exit(1); }
const content = await resolveControlledEventContent(JSON.parse(readFileSync(`assets/generated/original-events/${file}`, 'utf8')));
const eventId = 'original.jy.events:event/16';
const drive = async itemId => {
  let state = createControlledEventState(content);
  if (itemId !== null) ({ state } = dispatchControlledEvent(content, state, { type: 'USE_ITEM', itemId }));
  ({ state } = dispatchControlledEvent(content, state, { type: 'START', eventId }));
  const dialogues = [];
  let guard = 0;
  while (state.cursor && guard++ < 200) {
    const step = content.data.events[state.cursor.eventId].steps[state.cursor.pc];
    if (step.op === 'say') {
      dialogues.push(content.data.dialogues[step.dialogueId].text);
      ({ state } = dispatchControlledEvent(content, state, { type: 'CONTINUE' }));
    } else if (step.op === 'choice')
      ({ state } = dispatchControlledEvent(content, state, { type: 'CHOOSE', optionId: step.options[0].id }));
    else if (step.op === 'invoke') {
      const result = step.command.kind === 'battle'
        ? { schemaVersion: 1, requestId: state.pending.requestId, kind: 'battle', outcome: 'victory' }
        : step.command.kind === 'selection'
          ? { schemaVersion: 1, requestId: state.pending.requestId, kind: 'selection', selectedId: step.command.candidates[0] }
          : { schemaVersion: 1, requestId: state.pending.requestId, kind: step.command.kind, outcome: 'completed' };
      ({ state } = dispatchControlledEvent(content, state, { type: 'RESOLVE', result }));
    } else ({ state } = dispatchControlledEvent(content, state, { type: 'CONTINUE' }));
  }
  return dialogues;
};
const with160 = await drive(160);
const with0 = await drive(0);
console.log('item 160 dialogues:', JSON.stringify(with160, null, 1));
console.log('item 0 dialogues:', JSON.stringify(with0, null, 1));
const ok = with160.some(text => text.includes('我一定是瘋了')) && !with0.some(text => text.includes('我一定是瘋了'));
console.log(ok ? 'OK: opcode-4 positive arm fires only for item 160' : 'MISMATCH');
process.exit(ok ? 0 : 1);
