import test from 'node:test';
import assert from 'node:assert/strict';
import { openOriginalEventSlotTable, createOriginalEventSlotOverlay, updateOriginalEventSlot,
  readOriginalEventSlot } from '../../packages/game-data/src/original-event-slots.ts';
import { serializeOriginalEventSlotCheckpoint, restoreOriginalEventSlotCheckpoint } from '../../packages/game-data/src/original-event-checkpoint.ts';
import { originalEventSlotCheckpointKey, saveOriginalEventSlotCheckpoint,
  loadOriginalEventSlotCheckpoint } from '../../apps/web/src/storage.ts';

const hash = value => value.repeat(64);
const clone = value => structuredClone(value);
function lock(table) {
  return {
    base: { id: 'original.jy', version: '0.1.0', sha256: hash('a') },
    ruleset: { id: 'original.rules', version: '0.1.0', sha256: hash('b') },
    mods: [
      { id: 'original.extra', version: '1.0.0', sha256: hash('c'), priority: 1 },
      { id: 'original.music', version: '2.0.0', sha256: hash('d'), priority: 2 },
    ],
    loadOrder: ['original.jy', 'original.extra', 'original.music'],
    settings: { difficulty: 'normal', sound: true },
    sourceHashes: {
      'ALLDEF.GRP': table.sha256, 'ALLSIN.GRP': hash('1'), 'KDEF.IDX': hash('2'),
      'KDEF.GRP': hash('3'), 'TALK.IDX': hash('4'), 'TALK.GRP': hash('5'),
      'RANGER.IDX': hash('6'), 'RANGER.GRP': hash('7'),
    },
  };
}

test('Mock event-slot checkpoint restores only with exact source, rules, MOD order and settings', async () => {
  const table = await openOriginalEventSlotTable(new Uint8Array(4400));
  const identity = lock(table);
  const initial = createOriginalEventSlotOverlay(table);
  const changed = updateOriginalEventSlot(table, initial, 0, 2, [[2, 862], [3, -1]]);
  const raw = serializeOriginalEventSlotCheckpoint(table, identity, changed);
  const restored = restoreOriginalEventSlotCheckpoint(table, identity, raw);
  assert.deepEqual(readOriginalEventSlot(table, restored, 0, 2), readOriginalEventSlot(table, changed, 0, 2));
  restored.records['0/2'][2] = 10;
  assert.equal(readOriginalEventSlot(table, changed, 0, 2)[2], 862);
  assert.equal(readOriginalEventSlot(table, initial, 0, 2)[2], 0);
  for (const modify of [
    l => { l.base.sha256 = hash('e'); },
    l => { l.ruleset.version = '0.2.0'; },
    l => { l.mods.reverse(); l.loadOrder.reverse(); },
    l => { l.settings.difficulty = 'hard'; },
    l => { l.sourceHashes['KDEF.GRP'] = hash('f'); },
  ]) {
    const other = clone(identity); modify(other);
    assert.throws(() => restoreOriginalEventSlotCheckpoint(table, other, raw), /CONTENT_MISMATCH|LOCK/);
  }
  const malformed = JSON.parse(raw);
  malformed.overlay.records['0/2'] = [1];
  assert.throws(() => restoreOriginalEventSlotCheckpoint(table, identity, JSON.stringify(malformed)), /RECORD/);
  const extra = JSON.parse(raw);
  extra.overlay.unrecognized = true;
  assert.throws(() => restoreOriginalEventSlotCheckpoint(table, identity, JSON.stringify(extra)), /OVERLAY/);
  const wrongTable = await openOriginalEventSlotTable(new Uint8Array(8800));
  assert.throws(() => restoreOriginalEventSlotCheckpoint(wrongTable, identity, raw), /LOCK/);
  assert.throws(() => restoreOriginalEventSlotCheckpoint(table, identity, '{'), /JSON/);
});

test('Mock browser event-slot checkpoint keeps the previous main value on validation and storage failure', async () => {
  const table = await openOriginalEventSlotTable(new Uint8Array(4400));
  const identity = lock(table);
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } };
  const first = createOriginalEventSlotOverlay(table);
  const firstRaw = saveOriginalEventSlotCheckpoint(storage, table, identity, first);
  const second = updateOriginalEventSlot(table, first, 0, 2, [[2, 862]]);
  saveOriginalEventSlotCheckpoint(storage, table, identity, second);
  const key = originalEventSlotCheckpointKey(identity);
  assert.equal(values.get(key + ':backup'), firstRaw);
  assert.equal(readOriginalEventSlot(table, loadOriginalEventSlotCheckpoint(storage, table, identity), 0, 2)[2], 862);
  assert.equal(readOriginalEventSlot(table, loadOriginalEventSlotCheckpoint(storage, table, identity, true), 0, 2)[2], 0);
  const old = values.get(key);
  const bad = clone(second); bad.sourceSha256 = hash('f');
  assert.throws(() => saveOriginalEventSlotCheckpoint(storage, table, identity, bad), /OVERLAY/);
  assert.equal(values.get(key), old);
  const failing = { getItem: storage.getItem, setItem: () => { throw new Error('quota'); } };
  assert.throws(() => saveOriginalEventSlotCheckpoint(failing, table, identity, second), /quota/);
  assert.equal(values.get(key), old);
});
