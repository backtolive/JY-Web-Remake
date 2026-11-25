import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { readOriginalEventSlot } from '../../packages/game-data/src/original-event-slots.ts';
import { readOriginalRoleInt16 } from '../../packages/game-data/src/original-role-records.ts';
import { bindOriginal581SlotAdapter } from '../../tools/extractor/original-event-581-adapter.mjs';
import { createOriginal581Session, executeOriginal581Session, restoreOriginal581Session,
  serializeOriginal581Session } from '../../tools/extractor/original-event-581-session.mjs';

const names = ['KDEF.IDX', 'KDEF.GRP', 'ALLDEF.GRP', 'ALLSIN.GRP', 'RANGER.IDX', 'RANGER.GRP'];
const available = names.every(name => existsSync(`original/dos/${name}`));
const sources = async () => Object.fromEntries(await Promise.all(names.map(async name =>
  [name, new Uint8Array(await readFile(`original/dos/${name}`))])));

test('event 581 partial session saves and restores both verified states',
  { skip: !available && 'Original data is local and excluded from the repository.' }, async () => {
    const context = await bindOriginal581SlotAdapter(await sources());
    const ready = createOriginal581Session(context);
    const restoredReady = restoreOriginal581Session(context, serializeOriginal581Session(context, ready));
    assert.deepEqual(restoredReady, ready);
    const completed = executeOriginal581Session(context, restoredReady);
    assert.deepEqual(readOriginalEventSlot(context.table, completed.overlay, 32, 2),
      [0, 0, -1, -1, -1, -1, -1, -1, 0, 30, 21]);
    assert.deepEqual(completed.party.roles, [0, 49, -1, -1, -1, -1]);
    assert.deepEqual([34, 36, 80, 82, 84, 86, 88, 128].map(offset =>
      readOriginalRoleInt16(context.roleTable, completed.roles, 49, offset)),
    [238, 238, 2, 321, 321, 44, 50, 15]);
    assert.deepEqual(restoreOriginal581Session(context,
      serializeOriginal581Session(context, completed)), completed);
    assert.equal(ready.status, 'ready');
    assert.deepEqual(ready.party.roles, [0, -1, -1, -1, -1, -1]);
    assert.deepEqual(ready.location,
      { sceneId: 53, sceneName: '擂鼓山', slotId: 2, arrayIndex1: 18, arrayIndex2: 24 });
    assert.equal(Object.keys(ready.overlay.records).length, 0);
    assert.equal(Object.keys(ready.roles.records).length, 0);
    const full = createOriginal581Session(context, [0, 1, 2, 3, 4, 5]);
    const blocked = executeOriginal581Session(context, full);
    assert.equal(blocked.status, 'blocked-full-party');
    assert.equal(Object.keys(blocked.overlay.records).length, 0);
    assert.equal(Object.keys(blocked.roles.records).length, 0);
    assert.deepEqual(restoreOriginal581Session(context,
      serializeOriginal581Session(context, blocked)), blocked);
  });

test('event 581 partial session rejects stale, polluted and repeated execution atomically',
  { skip: !available && 'Original data is local and excluded from the repository.' }, async () => {
    const context = await bindOriginal581SlotAdapter(await sources());
    const ready = createOriginal581Session(context);
    const readyRaw = serializeOriginal581Session(context, ready);
    const completed = executeOriginal581Session(context, ready);
    assert.throws(() => executeOriginal581Session(context, completed), /ALREADY_COMPLETED/);
    const stale = JSON.parse(readyRaw);
    stale.contentLock.eventRecordSha256 = 'f'.repeat(64);
    assert.throws(() => restoreOriginal581Session(context, JSON.stringify(stale)), /CONTENT_MISMATCH/);
    const wrongParty = JSON.parse(readyRaw);
    wrongParty.state.party.roles = [0, 1, -1, -1, -1, -1];
    assert.throws(() => restoreOriginal581Session(context, JSON.stringify(wrongParty)), /_STATE/);
    assert.throws(() => createOriginal581Session(context, [0, 1, -1, -1, -1, -1]), /UNVERIFIED_PARTY/);
    const polluted = JSON.parse(readyRaw);
    polluted.state.overlay.records['32/2'] = [1, 2, 789, -1, -1, 2718, 2718, 2718, 0, 30, 21];
    assert.throws(() => restoreOriginal581Session(context, JSON.stringify(polluted)), /_SLOT/);
    const pollutedRole = JSON.parse(serializeOriginal581Session(context, completed));
    pollutedRole.state.roles.records['49'][42]++;
    assert.throws(() => restoreOriginal581Session(context, JSON.stringify(pollutedRole)), /ROLE_SCOPE/);
    assert.throws(() => restoreOriginal581Session(context, '{'), /_JSON/);
    assert.equal(serializeOriginal581Session(context, ready), readyRaw);
    assert.equal(ready.status, 'ready');
  });
