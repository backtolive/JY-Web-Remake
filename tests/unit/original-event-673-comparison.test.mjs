import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { readEvent673Sources, convertVerifiedEvent673, compareVerifiedEvent673 } from
  '../../tools/extractor/compare-original-event-673.mjs';

const originalAvailable = ['KDEF.IDX', 'KDEF.GRP', 'TALK.IDX', 'TALK.GRP', 'ALLDEF.GRP',
  'RANGER.IDX', 'RANGER.GRP']
  .every(name => existsSync(`original/dos/${name}`));

test('Local original event 673 conversion replays 12 dialogue pauses and observed state changes',
  { skip: !originalAvailable && 'Original data is local and excluded from the repository.' }, async () => {
    const sources = await readEvent673Sources('original/dos');
    const beforeHash = createHash('sha256').update(sources['KDEF.GRP']).digest('hex');
    const converted = await convertVerifiedEvent673(sources);
    const result = await compareVerifiedEvent673(converted);
    assert.equal(result.dialogueCount, 12);
    assert.deepEqual(result.aptitude, { before: 72, after: 75, source: 'DOS active role record offset 120' });
    assert.deepEqual(result.eventSlot, { sceneId: 32, slotId: 0, field: 2, before: 673, after: 674 });
    assert.equal(converted.provenance.dialogues.length, 12);
    assert.equal(converted.provenance.talkSources.length, 12);
    assert.deepEqual(converted.provenance.roleField, { sourceFile: 'RANGER.GRP', roleId: 0,
      byteOffset: 120, sourceOffset: 956, baseValue: 50, sampledBefore: 72, sampledAfter: 75 });
    assert.equal(createHash('sha256').update(sources['KDEF.GRP']).digest('hex'), beforeHash);
  });

test('Event 673 scoped comparison rejects changed source bytes and a different starting aptitude',
  { skip: !originalAvailable && 'Original data is local and excluded from the repository.' }, async () => {
    const sources = await readEvent673Sources('original/dos');
    const altered = { ...sources, 'KDEF.GRP': new Uint8Array(sources['KDEF.GRP']) };
    altered['KDEF.GRP'][100752 + 74 * 2] ^= 1;
    await assert.rejects(() => convertVerifiedEvent673(altered), /EVENT673_SOURCE_MISMATCH/);
    const converted = await convertVerifiedEvent673(sources);
    const changed = structuredClone(converted.content);
    changed.decision.domains['original.jy:stats'].default = 71;
    await assert.rejects(() => compareVerifiedEvent673({ ...converted, content: changed }), /DECISION_REQUIRE/);
    assert.equal((await compareVerifiedEvent673(converted)).matchesObservedPostconditions, true);
  });
