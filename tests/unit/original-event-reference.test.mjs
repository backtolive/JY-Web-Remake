import test from 'node:test';
import assert from 'node:assert/strict';
import { openOriginalEventSlotTable, createOriginalEventSlotOverlay, updateOriginalEventSlot } from '../../packages/game-data/src/original-event-slots.ts';
import { resolveOriginalEventAtCell } from '../../packages/game-data/src/original-event-reference.ts';

test('Mock event layer resolves the current overlaid ID, including disabled and secondary fields', async () => {
  const raw = new Uint8Array(4400);
  const record = new DataView(raw.buffer);
  record.setInt16(2 * 22 + 2 * 2, -1, true);
  record.setInt16(2 * 22 + 3 * 2, 9, true);
  record.setInt16(2 * 22 + 4 * 2, -1, true);
  const table = await openOriginalEventSlotTable(raw);
  const layers = Array.from({ length: 6 }, () => Array(4096).fill(-1));
  layers[3][1 * 64 + 2] = 2;
  const scene = { id: 0, eventCapacity: 1, layers };
  const base = createOriginalEventSlotOverlay(table);
  assert.equal(resolveOriginalEventAtCell(scene, table, base, 0, 0, 2, 20), null);
  assert.equal(resolveOriginalEventAtCell(scene, table, base, 2, 1, 2, 20), null);
  assert.deepEqual(resolveOriginalEventAtCell(scene, table, base, 2, 1, 3, 20),
    { sceneId: 0, slotId: 2, field: 3, eventId: 9, canonicalId: 'original.jy:event/9' });
  const changed = updateOriginalEventSlot(table, base, 0, 2, [[2, 12], [3, -1]]);
  assert.deepEqual(resolveOriginalEventAtCell(scene, table, changed, 2, 1, 2, 20),
    { sceneId: 0, slotId: 2, field: 2, eventId: 12, canonicalId: 'original.jy:event/12' });
  assert.equal(resolveOriginalEventAtCell(scene, table, changed, 2, 1, 3, 20), null);
  assert.equal(resolveOriginalEventAtCell(scene, table, base, 2, 1, 2, 20), null);
  assert.throws(() => resolveOriginalEventAtCell(scene, table, changed, 2, 1, 2, 12), /REFERENCE_ID/);
  assert.throws(() => resolveOriginalEventAtCell(scene, table, changed, 64, 1, 2, 20), /CELL/);
  assert.throws(() => resolveOriginalEventAtCell(scene, table, changed, 2, 1, 5, 20), /REFERENCE_FIELD/);
  layers[3][1 * 64 + 2] = 200;
  assert.throws(() => resolveOriginalEventAtCell(scene, table, changed, 2, 1, 2, 20), /LAYER_SLOT/);
});
