import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { compareObserved581Slot } from '../../tools/extractor/compare-original-event-581-slot.mjs';

const names = ['KDEF.IDX','KDEF.GRP','ALLDEF.GRP'];
const originalAvailable = names.every(name => existsSync(`original/dos/${name}`));
const sources = async () => Object.fromEntries(await Promise.all(names.map(async name =>
  [name,new Uint8Array(await readFile(`original/dos/${name}`))])));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

test('event 581 observed one-person slot diff matches only its pinned candidate projection',
  { skip: !originalAvailable && 'Original data is local and excluded from the repository.' }, async () => {
    const input = await sources(), originalHash = sha(input['ALLDEF.GRP']);
    const result = await compareObserved581Slot(input);
    assert.deepEqual(result.observed.onePersonTeam.before,[1,2,-1,-1,-1,2718,2718,2718,0,30,21]);
    assert.deepEqual(result.projectedOnePersonAfter,[0,0,-1,-1,-1,-1,-1,-1,0,30,21]);
    assert.deepEqual(result.observed.fullTeam.after,result.observed.onePersonTeam.before);
    assert.equal(result.candidateInstruction.wordOffset,15);
    assert.equal(result.candidateInstruction.sourceByteOffset,89018);
    assert.equal(sha(input['ALLDEF.GRP']),originalHash);
  });

test('event 581 comparison rejects altered source and altered observed precondition',
  { skip: !originalAvailable && 'Original data is local and excluded from the repository.' }, async () => {
    const input = await sources();
    const changedScript = { ...input, 'KDEF.GRP': new Uint8Array(input['KDEF.GRP']) };
    changedScript['KDEF.GRP'][88988+30] ^= 1;
    await assert.rejects(()=>compareObserved581Slot(changedScript),/EVENT581_SLOT_SOURCE:KDEF.GRP/);
    const changedSlot = { ...input, 'ALLDEF.GRP': new Uint8Array(input['ALLDEF.GRP']) };
    changedSlot['ALLDEF.GRP'][32*4400+2*22] ^= 1;
    await assert.rejects(()=>compareObserved581Slot(changedSlot),/EVENT581_SLOT_SOURCE:ALLDEF.GRP/);
    assert.deepEqual((await compareObserved581Slot(input)).projectedOnePersonAfter,
      [0,0,-1,-1,-1,-1,-1,-1,0,30,21]);
  });
