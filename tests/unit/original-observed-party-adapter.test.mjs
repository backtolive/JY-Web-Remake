import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { applyOriginalObservedParty, bindOriginalObservedParty,
  createOriginalObservedPartyState } from '../../tools/extractor/original-observed-party-adapter.mjs';

const names = ['KDEF.IDX', 'KDEF.GRP'];
const available = names.every(name => existsSync(`original/dos/${name}`));
const sources = async () => Object.fromEntries(await Promise.all(names.map(async name =>
  [name, new Uint8Array(await readFile(`original/dos/${name}`))])));

test('event 950 removes role 1 and event 932 clears the exact sampled companions',
  { skip: !available && 'Original data is local and excluded from the repository.' }, async () => {
    const input = await sources();
    for (const [eventId, before, after] of [
      [950, [0, 1, -1, -1, -1, -1], [0, -1, -1, -1, -1, -1]],
      [932, [0, 1, 49, -1, -1, -1], [0, -1, -1, -1, -1, -1]],
    ]) {
      const context = bindOriginalObservedParty(input, eventId);
      const state = createOriginalObservedPartyState(context);
      assert.deepEqual(state.roles, before);
      assert.deepEqual(applyOriginalObservedParty(context, state).roles, after);
      assert.deepEqual(state.roles, before);
    }
  });

test('party cases reject unknown arrangements and changed source',
  { skip: !available && 'Original data is local and excluded from the repository.' }, async () => {
    const input = await sources(), context = bindOriginalObservedParty(input, 950);
    const state = createOriginalObservedPartyState(context);
    assert.throws(() => applyOriginalObservedParty(context,
      { ...state, roles: [0, 49, -1, -1, -1, -1] }), /PRECONDITION/);
    assert.throws(() => bindOriginalObservedParty(input, 581), /_CASE/);
    const changed = { ...input, 'KDEF.GRP': new Uint8Array(input['KDEF.GRP']) };
    changed['KDEF.GRP'][113462] ^= 1;
    assert.throws(() => bindOriginalObservedParty(changed, 950), /SOURCE:KDEF.GRP/);
  });
