import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { readOriginalRoleInt16, updateOriginalRoleInt16 } from
  '../../packages/game-data/src/original-role-records.ts';
import { applyOriginalObservedRoleScalar, bindOriginalObservedRoleScalar,
  createOriginalObservedRoleScalarState } from
  '../../tools/extractor/original-observed-role-scalar-adapter.mjs';

const names = ['KDEF.IDX', 'KDEF.GRP', 'RANGER.IDX', 'RANGER.GRP'];
const available = names.every(name => existsSync(`original/dos/${name}`));
const sources = async () => Object.fromEntries(await Promise.all(names.map(async name =>
  [name, new Uint8Array(await readFile(`original/dos/${name}`))])));

test('exact event 28 poison-use, 101 reputation and 497 ethics cases update one role field each',
  { skip: !available && 'Original data is local and excluded from the repository.' }, async () => {
    const input = await sources();
    for (const [eventId, roleId, offset, before, after] of
      [[28, 4, 94, 53, 99], [101, 0, 118, 0, 3], [497, 0, 112, 50, 49]]) {
      const context = await bindOriginalObservedRoleScalar(input, eventId);
      const state = createOriginalObservedRoleScalarState(context);
      const next = applyOriginalObservedRoleScalar(context, state);
      assert.equal(readOriginalRoleInt16(context.roleTable, state, roleId, offset), before);
      assert.equal(readOriginalRoleInt16(context.roleTable, next, roleId, offset), after);
      assert.deepEqual(Object.keys(next.records), [String(roleId)]);
    }
  });

test('scalar role cases reject unsupported event, changed source and polluted state',
  { skip: !available && 'Original data is local and excluded from the repository.' }, async () => {
    const input = await sources();
    await assert.rejects(() => bindOriginalObservedRoleScalar(input, 289), /_CASE/);
    const context = await bindOriginalObservedRoleScalar(input, 497);
    const state = createOriginalObservedRoleScalarState(context);
    const polluted = updateOriginalRoleInt16(context.roleTable, state, 0, [[118, 1]]);
    assert.throws(() => applyOriginalObservedRoleScalar(context, polluted), /PRECONDITION/);
    const changed = { ...input, 'KDEF.GRP': new Uint8Array(input['KDEF.GRP']) };
    changed['KDEF.GRP'][75730] ^= 1;
    await assert.rejects(() => bindOriginalObservedRoleScalar(changed, 497), /SOURCE:KDEF.GRP/);
  });
