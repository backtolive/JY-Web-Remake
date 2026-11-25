// Verify -2 dynamic scene tracking: set current-scene, run a -2-writing event, confirm the
// write lands on the current scene's slot key (not a fixed 'current' placeholder).
import { readFileSync, readdirSync } from 'node:fs';
import { resolveControlledEventContent, createControlledEventState, dispatchControlledEvent } from
  '../../packages/game-core/src/controlled-event.ts';

const file = readdirSync('assets/generated/original-events')
  .find(name => name.startsWith('original-events-') && name.endsWith('.local.json') && !name.includes('.diagnostics.'));
const content = await resolveControlledEventContent(JSON.parse(readFileSync(`assets/generated/original-events/${file}`, 'utf8')));

// Domain checks.
const domains = content.data.decision.domains;
console.log('current-scene domain:', JSON.stringify(domains['original.jy:current-scene']));
const sceneSlots = domains['original.jy:scene-slots'];
console.log('scene-slots allowedKeys count:', sceneSlots.allowedKeys.length);
console.log('has current placeholder key:', sceneSlots.allowedKeys.includes('original.jy:scene/current/slot/0/field/0'));
console.log('has scene-32 key sample:', sceneSlots.allowedKeys.includes('original.jy:scene/32/slot/0/field/0'));

// Find an event with a -2 slotWrite (opcode 3, a0 === -2).
function findMinus2Event() {
  for (const [id, ev] of Object.entries(content.data.events)) {
    for (const step of ev.steps) {
      if (step.op === 'decide') {
        const targets = [...step.plan.cases.map(c => c.effects), step.plan.otherwise].flat();
        if (targets.some(e => e.target?.keyFrom?.some(p => 'read' in p && p.read?.domain === 'original.jy:current-scene')))
          return id;
      }
    }
  }
  return null;
}
const eventId = findMinus2Event();
console.log('\n-2 event:', eventId?.split('/').pop());

// Drive it with current-scene = 32 and inspect the resulting scene-slots values.
function driveWithScene(scene) {
  let state = createControlledEventState(content);
  // Seed the current-scene value before starting.
  state.decision.values['original.jy:current-scene'] = { 'original.jy:scene/current': scene };
  ({ state } = dispatchControlledEvent(content, state, { type: 'START', eventId }));
  let guard = 0;
  while (state.cursor && guard++ < 5000) {
    const step = content.data.events[state.cursor.eventId].steps[state.cursor.pc];
    if (step.op === 'say') ({ state } = dispatchControlledEvent(content, state, { type: 'CONTINUE' }));
    else if (step.op === 'choice') ({ state } = dispatchControlledEvent(content, state, { type: 'CHOOSE', optionId: step.options[0].id }));
    else if (step.op === 'invoke') {
      const result = step.command.kind === 'battle' ? { schemaVersion: 1, requestId: state.pending.requestId, kind: 'battle', outcome: 'victory' }
        : step.command.kind === 'selection' ? { schemaVersion: 1, requestId: state.pending.requestId, kind: 'selection', selectedId: step.command.candidates[0] }
        : { schemaVersion: 1, requestId: state.pending.requestId, kind: step.command.kind, outcome: 'completed' };
      ({ state } = dispatchControlledEvent(content, state, { type: 'RESOLVE', result }));
    } else ({ state } = dispatchControlledEvent(content, state, { type: 'CONTINUE' }));
  }
  return state;
}

const state32 = driveWithScene(32);
const state17 = driveWithScene(17);
const keys32 = Object.keys(state32.decision.values['original.jy:scene-slots'] ?? {});
const keys17 = Object.keys(state17.decision.values['original.jy:scene-slots'] ?? {});
console.log('\nscene 32 slot keys written:', keys32.slice(0, 8));
console.log('scene 17 slot keys written:', keys17.slice(0, 8));
const allUnder32 = keys32.every(k => k.startsWith('original.jy:scene/32/'));
const allUnder17 = keys17.every(k => k.startsWith('original.jy:scene/17/'));
console.log('all scene-32 keys under scene/32:', allUnder32);
console.log('all scene-17 keys under scene/17:', allUnder17);
if (!allUnder32 || !allUnder17) throw new Error('DYNAMIC_SCENE_MISMATCH');
console.log('\nOK: -2 writes track the current scene');
