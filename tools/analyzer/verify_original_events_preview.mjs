// Temporary verification: exercise the standalone controlled-event runtime against the
// generated original.jy.events package, the same way the Web preview does.
import { readFileSync, readdirSync } from 'node:fs';
import { resolveControlledEventContent, createControlledEventState, dispatchControlledEvent } from
  '../../packages/game-core/src/controlled-event.ts';

const file = readdirSync('assets/generated/original-events')
  .find(name => name.startsWith('original-events-') && name.endsWith('.local.json') && !name.includes('.diagnostics.'));
const content = await resolveControlledEventContent(JSON.parse(readFileSync(`assets/generated/original-events/${file}`, 'utf8')));
const events = Object.keys(content.data.events);
console.log('events:', events.length, 'dialogues:', Object.keys(content.data.dialogues).length);

function pick(predicate, label) {
  for (const id of events) if (predicate(content.data.events[id].steps)) return id;
  throw new Error(`no event for ${label}`);
}
/** Drive an event to completion, choosing the first option and a fixed battle outcome. */
function drive(id) {
  let state = createControlledEventState(content);
  ({ state } = dispatchControlledEvent(content, state, { type: 'START', eventId: id }));
  let guard = 0;
  while (state.cursor && guard++ < 5000) {
    const step = content.data.events[state.cursor.eventId].steps[state.cursor.pc];
    if (step.op === 'say') ({ state } = dispatchControlledEvent(content, state, { type: 'CONTINUE' }));
    else if (step.op === 'choice') ({ state } = dispatchControlledEvent(content, state, { type: 'CHOOSE', optionId: step.options[0].id }));
    else if (step.op === 'invoke') {
      if (step.command.kind === 'battle') ({ state } = dispatchControlledEvent(content, state,
        { type: 'RESOLVE', result: { schemaVersion: 1, requestId: state.pending.requestId, kind: 'battle', outcome: 'victory' } }));
      else if (step.command.kind === 'selection') ({ state } = dispatchControlledEvent(content, state,
        { type: 'RESOLVE', result: { schemaVersion: 1, requestId: state.pending.requestId, kind: 'selection', selectedId: step.command.candidates[0] } }));
      else ({ state } = dispatchControlledEvent(content, state,
        { type: 'RESOLVE', result: { schemaVersion: 1, requestId: state.pending.requestId, kind: step.command.kind, outcome: 'completed' } }));
    } else throw new Error(`unexpected step ${step.op} in ${id}`);
  }
  return !state.cursor;
}
const cases = {
  dialogue: pick(s => s.some(x => x.op === 'say'), 'dialogue'),
  choice: pick(s => s.some(x => x.op === 'choice'), 'choice'),
  branch: pick(s => s.some(x => x.op === 'branch'), 'branch'),
  battle: pick(s => s.some(x => x.op === 'invoke' && x.command.kind === 'battle'), 'battle'),
};
for (const [label, id] of Object.entries(cases)) {
  console.log(label, 'event', id.split('/').pop(), 'ended:', drive(id));
}
// Drive every convertible event to confirm none throws and all reach a terminal state.
let ok = 0;
for (const id of events) if (drive(id)) ok++;
console.log(`drove all ${events.length} events; ${ok} reached a terminal state`);
if (ok !== events.length) throw new Error('some events did not terminate');
console.log('OK');
