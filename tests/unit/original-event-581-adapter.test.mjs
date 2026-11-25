import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { readOriginalEventSlot, updateOriginalEventSlot } from
  '../../packages/game-data/src/original-event-slots.ts';
import { readOriginalRoleInt16, updateOriginalRoleInt16 } from
  '../../packages/game-data/src/original-role-records.ts';
import { bindOriginal581SlotAdapter, createOriginal581SlotState,
  applyOriginal581ObservedRole, applyOriginal581ObservedSlot,
  createOriginal581RoleState } from '../../tools/extractor/original-event-581-adapter.mjs';

const names = ['KDEF.IDX', 'KDEF.GRP', 'ALLDEF.GRP', 'ALLSIN.GRP', 'RANGER.IDX', 'RANGER.GRP'];
const available = names.every(name => existsSync(`original/dos/${name}`));
const sources = async () => Object.fromEntries(await Promise.all(names.map(async name =>
  [name, new Uint8Array(await readFile(`original/dos/${name}`))])));

test('event 581 adapter atomically applies only the source-locked eight-field result',
  { skip: !available && 'Original data is local and excluded from the repository.' }, async () => {
    const context = await bindOriginal581SlotAdapter(await sources());
    const initial = createOriginal581SlotState(context);
    const next = applyOriginal581ObservedSlot(context, initial);
    assert.deepEqual(readOriginalEventSlot(context.table, initial, 32, 2),
      [1, 2, -1, -1, -1, 2718, 2718, 2718, 0, 30, 21]);
    assert.deepEqual(readOriginalEventSlot(context.table, next, 32, 2),
      [0, 0, -1, -1, -1, -1, -1, -1, 0, 30, 21]);
    assert.deepEqual(Object.keys(next.records), ['32/2']);
    const initialRole = createOriginal581RoleState(context);
    const nextRole = applyOriginal581ObservedRole(context, initialRole);
    assert.deepEqual([34, 36, 80, 82, 84, 86, 88, 128].map(offset =>
      readOriginalRoleInt16(context.roleTable, initialRole, 49, offset)),
    [38, 38, 1, 21, 21, 14, 30, 0]);
    assert.deepEqual([34, 36, 80, 82, 84, 86, 88, 128].map(offset =>
      readOriginalRoleInt16(context.roleTable, nextRole, 49, offset)),
    [238, 238, 2, 321, 321, 44, 50, 15]);
    assert.deepEqual(Object.keys(nextRole.records), ['49']);
  });

test('event 581 adapter rejects changed source or precondition without changing prior state',
  { skip: !available && 'Original data is local and excluded from the repository.' }, async () => {
    const input = await sources();
    const context = await bindOriginal581SlotAdapter(input);
    const initial = createOriginal581SlotState(context);
    const rawBefore = JSON.stringify(initial);
    const changed = { ...input, 'KDEF.GRP': new Uint8Array(input['KDEF.GRP']) };
    changed['KDEF.GRP'][89018] ^= 1;
    await assert.rejects(() => bindOriginal581SlotAdapter(changed), /EVENT581_SLOT_SOURCE/);
    const polluted = updateOriginalEventSlot(context.table, initial, 32, 2, [[2, 789]]);
    assert.throws(() => applyOriginal581ObservedSlot(context, polluted), /_PRECONDITION/);
    const initialRole = createOriginal581RoleState(context);
    const pollutedRole = updateOriginalRoleInt16(context.roleTable, initialRole, 49, [[42, 92]]);
    assert.throws(() => applyOriginal581ObservedRole(context, pollutedRole), /ROLE_PRECONDITION/);
    assert.equal(JSON.stringify(initial), rawBefore);
    assert.deepEqual(readOriginalEventSlot(context.table, initial, 32, 2),
      [1, 2, -1, -1, -1, 2718, 2718, 2718, 0, 30, 21]);
  });
