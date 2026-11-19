import test from 'node:test';
import assert from 'node:assert/strict';
import {
  openOriginalEventSlotTable, createOriginalEventSlotOverlay,
  originalEventSlotFieldSourceOffset, readOriginalEventSlot, updateOriginalEventSlot,
} from '../../packages/game-data/src/original-event-slots.ts';

test('Mock original event-slot overlay keeps source bytes and applies explicit writes atomically', async () => {
  const source = new Uint8Array(4400);
  const offset = 2 * 22;
  const view = new DataView(source.buffer);
  [1, 2, -1, 123, 456, 3000, 3002, 3002, 0, 30, 21]
    .forEach((value, field) => view.setInt16(offset + field * 2, value, true));
  const table = await openOriginalEventSlotTable(source);
  const initial = createOriginalEventSlotOverlay(table);
  source[offset + 4] = 99; // caller's source buffer cannot alter the opened table
  assert.equal(readOriginalEventSlot(table, initial, 0, 2)[2], -1);
  assert.equal(originalEventSlotFieldSourceOffset(table, 0, 2, 3), offset + 6);

  const next = updateOriginalEventSlot(table, initial, 0, 2, [[2, 862], [3, -1], [4, -1]]);
  assert.deepEqual(readOriginalEventSlot(table, next, 0, 2),
    [1, 2, 862, -1, -1, 3000, 3002, 3002, 0, 30, 21]);
  assert.equal(readOriginalEventSlot(table, initial, 0, 2)[3], 123);
  assert.equal(source[offset + 4], 99); // no write back to caller's source
  assert.deepEqual(readOriginalEventSlot(table, JSON.parse(JSON.stringify(next)), 0, 2),
    readOriginalEventSlot(table, next, 0, 2));
  const another = updateOriginalEventSlot(table, next, 0, 2, [[5, 2718]]);
  assert.equal(readOriginalEventSlot(table, another, 0, 2)[5], 2718);
  assert.equal(readOriginalEventSlot(table, next, 0, 2)[5], 3000);
  const otherSlot = updateOriginalEventSlot(table, next, 0, 3, [[2, 900]]);
  otherSlot.records['0/2'][2] = 1;
  assert.equal(readOriginalEventSlot(table, next, 0, 2)[2], 862);

  for (const writes of [[[2, 8], [2, 9]], [[11, 1]], [[0, 32768]], [[0, 0.5]], []]) {
    assert.throws(() => updateOriginalEventSlot(table, next, 0, 2, writes), /ORIGINAL_EVENT_SLOT_WRITES/);
  }
  assert.deepEqual(readOriginalEventSlot(table, next, 0, 2),
    [1, 2, 862, -1, -1, 3000, 3002, 3002, 0, 30, 21]);
  assert.throws(() => readOriginalEventSlot(table, { ...next, sourceSha256: '0'.repeat(64) }, 0, 2), /OVERLAY/);
  assert.throws(() => readOriginalEventSlot(table, { ...next, records: { ...next.records, '0/999': Array(11).fill(0) } }, 0, 2), /OVERLAY/);
  assert.throws(() => readOriginalEventSlot(table, { ...next, records: { ...next.records, '0/2': [1] } }, 0, 2), /RECORD/);
  assert.throws(() => readOriginalEventSlot(table, next, 1, 2), /ADDRESS/);
});

test('Mock original event-slot source size is bounded', async () => {
  await assert.rejects(openOriginalEventSlotTable(new Uint8Array(22)), /TABLE_SIZE/);
});
