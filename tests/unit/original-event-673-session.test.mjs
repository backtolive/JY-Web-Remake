import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readDecisionValue } from '../../packages/game-core/src/decision.ts';
import { readOriginalEventSlot } from '../../packages/game-data/src/original-event-slots.ts';
import { readOriginalRoleInt16 } from '../../packages/game-data/src/original-role-records.ts';
import { readEvent673Sources, convertVerifiedEvent673 } from
  '../../tools/extractor/compare-original-event-673.mjs';
import { bindOriginal673Session, createOriginal673Session, dispatchOriginal673Session,
  restoreOriginal673Session, serializeOriginal673Session } from
  '../../tools/extractor/original-event-673-session.mjs';

const available = ['KDEF.IDX', 'KDEF.GRP', 'TALK.IDX', 'TALK.GRP', 'ALLDEF.GRP',
  'RANGER.IDX', 'RANGER.GRP']
  .every(name => existsSync(`original/dos/${name}`));
const eventId = 'original.jy.comparison673:event/673';
async function setup(converted) {
  return bindOriginal673Session(converted ?? await convertVerifiedEvent673(await readEvent673Sources('original/dos')));
}
function aptitude(context, state) {
  return readDecisionValue(context.content.data.decision, state.event.decision,
    { domain: 'original.jy:stats', key: 'original.jy:hero/aptitude' });
}
function slot(context, state) { return readOriginalEventSlot(context.table, state.overlay, 32, 0)[2]; }
function roleAptitude(context, state) { return readOriginalRoleInt16(context.roleTable, state.roles, 0, 120); }

test('Event 673 adapter commits aptitude and original slot together and restores at dialogue and completion',
  { skip: !available && 'Original data is local and excluded from the repository.' }, async () => {
    const context = await setup(), initial = createOriginal673Session(context);
    let state = dispatchOriginal673Session(context, initial, { type: 'START', eventId }).state;
    assert.notStrictEqual(state.overlay, initial.overlay);
    for (let i = 0; i < 11; i++) {
      if (i === 5) state = restoreOriginal673Session(context, serializeOriginal673Session(context, state));
      state = dispatchOriginal673Session(context, state, { type: 'CONTINUE' }).state;
    }
    assert.deepEqual([aptitude(context, state), slot(context, state)], [72, 673]);
    assert.equal(roleAptitude(context, state), 72);
    const paused = serializeOriginal673Session(context, state);
    const completed = dispatchOriginal673Session(context, state, { type: 'CONTINUE' }).state;
    assert.deepEqual([aptitude(context, completed), slot(context, completed)], [75, 674]);
    assert.equal(roleAptitude(context, completed), 75);
    assert.equal(completed.event.cursor, null);
    assert.deepEqual(restoreOriginal673Session(context, serializeOriginal673Session(context, completed)), completed);
    const extra = JSON.parse(serializeOriginal673Session(context, completed));
    extra.state.overlay.records['32/0'][3] = 22;
    assert.throws(() => restoreOriginal673Session(context, JSON.stringify(extra)), /OVERLAY_SCOPE/);
    const extraRole = JSON.parse(serializeOriginal673Session(context, completed));
    extraRole.state.roles.records['0'][118] = 22;
    assert.throws(() => restoreOriginal673Session(context, JSON.stringify(extraRole)), /ROLE_SCOPE/);
    assert.deepEqual(restoreOriginal673Session(context, paused), state);
    assert.deepEqual([aptitude(context, initial), slot(context, initial)], [72, 673]);
    assert.equal(roleAptitude(context, initial), 72);
    assert.throws(() => dispatchOriginal673Session(context, completed, { type: 'START', eventId }), /_START/);
  });

test('Late invalid effect or changed checkpoint lock leaves the prior state and raw checkpoint intact',
  { skip: !available && 'Original data is local and excluded from the repository.' }, async () => {
    const converted = await convertVerifiedEvent673(await readEvent673Sources('original/dos'));
    const changed = structuredClone(converted.content);
    changed.events[eventId].steps[12].plan.cases[0].effects[1].value.value = 999;
    const context = await setup({ ...converted, content: changed });
    let state = dispatchOriginal673Session(context, createOriginal673Session(context),
      { type: 'START', eventId }).state;
    for (let i = 0; i < 11; i++) state = dispatchOriginal673Session(context, state, { type: 'CONTINUE' }).state;
    const before = serializeOriginal673Session(context, state);
    assert.throws(() => dispatchOriginal673Session(context, state, { type: 'CONTINUE' }), /_EFFECT/);
    assert.equal(serializeOriginal673Session(context, state), before);
    assert.deepEqual([aptitude(context, state), slot(context, state)], [72, 673]);
    const tampered = JSON.parse(before); tampered.state.overlay.records['32/0'] = [1, 0, 674, -1, -1, 7448, 7490, 7448, 20, 31, 25];
    assert.throws(() => restoreOriginal673Session(context, JSON.stringify(tampered)), /_MIRROR/);
    const stale = JSON.parse(before); stale.contentLock.sourceHashes['KDEF.GRP'] = 'f'.repeat(64);
    assert.throws(() => restoreOriginal673Session(context, JSON.stringify(stale)), /CONTENT_MISMATCH/);
    assert.throws(() => restoreOriginal673Session(context, '{'), /_JSON/);
    assert.equal(serializeOriginal673Session(context, state), before);
  });
