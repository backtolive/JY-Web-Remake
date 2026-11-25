import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { readOriginalRoleInt16, updateOriginalRoleInt16 } from
  '../../packages/game-data/src/original-role-records.ts';
import { applyOriginal289ObservedRole, bindOriginal289RoleAdapter,
  createOriginal289RoleState } from '../../tools/extractor/original-event-289-role-adapter.mjs';
import { createOriginal289RoleSession, executeOriginal289RoleSession,
  restoreOriginal289RoleSession, serializeOriginal289RoleSession } from
  '../../tools/extractor/original-event-289-role-session.mjs';

const names = ['KDEF.IDX', 'KDEF.GRP', 'RANGER.IDX', 'RANGER.GRP'];
const available = names.every(name => existsSync(`original/dos/${name}`));
const sources = async () => Object.fromEntries(await Promise.all(names.map(async name =>
  [name, new Uint8Array(await readFile(`original/dos/${name}`))])));
const values = (context, overlay) => [28, 126, 146, 166, 174].map(offset =>
  readOriginalRoleInt16(context.roleTable, overlay, 36, offset));

test('event 289 role slice applies only the five DOS-observed fields',
  { skip: !available && 'Original data is local and excluded from the repository.' }, async () => {
    const context = await bindOriginal289RoleAdapter(await sources());
    const source = createOriginal289RoleState(context);
    assert.deepEqual(values(context, source), [2, 31, 0, -1, 0]);
    assert.deepEqual(values(context, applyOriginal289ObservedRole(context, source)), [2, 60, 100, 78, 1]);
    const sexZero = createOriginal289RoleState(context, { syntheticSexZero: true });
    assert.deepEqual(values(context, sexZero), [0, 31, 0, -1, 0]);
    assert.deepEqual(values(context, applyOriginal289ObservedRole(context, sexZero)), [2, 60, 100, 78, 1]);
  });

test('event 289 role slice checkpoints both DOS-observed preconditions',
  { skip: !available && 'Original data is local and excluded from the repository.' }, async () => {
    const context = await bindOriginal289RoleAdapter(await sources());
    for (const precondition of ['source-sex-2', 'synthetic-sex-0']) {
      const ready = createOriginal289RoleSession(context, precondition);
      assert.deepEqual(restoreOriginal289RoleSession(context,
        serializeOriginal289RoleSession(context, ready)), ready);
      const completed = executeOriginal289RoleSession(context, ready);
      assert.deepEqual(values(context, completed.roles), [2, 60, 100, 78, 1]);
      assert.deepEqual(restoreOriginal289RoleSession(context,
        serializeOriginal289RoleSession(context, completed)), completed);
      assert.throws(() => executeOriginal289RoleSession(context, completed), /ALREADY_COMPLETED/);
    }
  });

test('event 289 role slice rejects changed source and unrelated precondition writes',
  { skip: !available && 'Original data is local and excluded from the repository.' }, async () => {
    const input = await sources(), context = await bindOriginal289RoleAdapter(input);
    const changed = { ...input, 'KDEF.GRP': new Uint8Array(input['KDEF.GRP']) };
    changed['KDEF.GRP'][46380] ^= 1;
    await assert.rejects(() => bindOriginal289RoleAdapter(changed), /SOURCE:KDEF.GRP/);
    const source = createOriginal289RoleState(context);
    const polluted = updateOriginalRoleInt16(context.roleTable, source, 36, [[42, 99]]);
    assert.throws(() => applyOriginal289ObservedRole(context, polluted), /PRECONDITION/);
    assert.deepEqual(values(context, source), [2, 31, 0, -1, 0]);
  });
