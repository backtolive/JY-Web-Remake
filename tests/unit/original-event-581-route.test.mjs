import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { traceOriginal581Route } from '../../tools/extractor/trace-original-event-581-route.mjs';

const names = ['KDEF.IDX', 'KDEF.GRP', 'ALLDEF.GRP', 'ALLSIN.GRP', 'RANGER.IDX', 'RANGER.GRP'];
const available = names.every(name => existsSync(`original/dos/${name}`));
const sources = async () => Object.fromEntries(await Promise.all(names.map(async name =>
  [name, new Uint8Array(await readFile(`original/dos/${name}`))])));

test('event 581 route is source-locked from scene 53 event 533 through dynamic slot writes',
  { skip: !available && 'Original data is local and excluded from the repository.' }, async () => {
    const input = await sources();
    const route = traceOriginal581Route(input);
    assert.deepEqual(route.scene, {
      sceneId: 53, name: '擂鼓山', initialEventSlot: 0, installedEventSlot: 2,
      cells: [
        { slotId: 2, arrayIndex1: 18, arrayIndex2: 24 },
        { slotId: 0, arrayIndex1: 28, arrayIndex2: 16 },
      ],
    });
    assert.deepEqual(route.chain.map(step => [step.writerEventId, step.installedEventId]),
      [[533, 534], [534, 536], [536, 581]]);
    assert.deepEqual(route.sharedBody, {
      sourceEventId: 581, sourceWordOffset: 0, wordLength: 52,
      embeddedEventId: 536, embeddedWordOffset: 160,
      classification: 'source-confirmed-byte-identical; runtime-reachability-unverified',
    });
    const changed = { ...input, 'ALLSIN.GRP': new Uint8Array(input['ALLSIN.GRP']) };
    changed['ALLSIN.GRP'][53 * 49152 + 3 * 8192 + (18 * 64 + 24) * 2] ^= 1;
    assert.throws(() => traceOriginal581Route(changed), /SOURCE:ALLSIN.GRP/);
  });
