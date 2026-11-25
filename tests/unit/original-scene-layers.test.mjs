import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { openOriginalSceneLayerTable, createOriginalSceneLayerOverlay,
  readOriginalSceneLayerCell, updateOriginalSceneLayerCells } from
  '../../packages/game-data/src/original-scene-layers.ts';

test('Mock scene-layer overlay preserves source and updates only explicit cells', async () => {
  const bytes = new Uint8Array(49152), view = new DataView(bytes.buffer);
  view.setInt16((1 * 4096 + 790) * 2, 7, true);
  const table = await openOriginalSceneLayerTable(bytes), base = createOriginalSceneLayerOverlay(table);
  const next = updateOriginalSceneLayerCells(table, base, [[0, 1, 790, 2898]]);
  assert.equal(readOriginalSceneLayerCell(table, base, 0, 1, 790), 7);
  assert.equal(readOriginalSceneLayerCell(table, next, 0, 1, 790), 2898);
  assert.equal(Object.keys(base.records).length, 0);
  assert.throws(() => updateOriginalSceneLayerCells(table, base, [[0, 1, 790, 1], [0, 1, 790, 2]]), /WRITES/);
});

test('Local scene 32 layer 1 cell (12,22) is the observed zero precondition',
  { skip: !existsSync('original/dos/ALLSIN.GRP') && 'Original data is local.' }, async () => {
    const table = await openOriginalSceneLayerTable(new Uint8Array(await readFile('original/dos/ALLSIN.GRP')));
    assert.equal(table.sha256, '830ae313ccabe310a16d330eac83647a9c81a6c23efce6069ca87dc653f0e154');
    assert.equal(readOriginalSceneLayerCell(table, createOriginalSceneLayerOverlay(table),
      32, 1, 12 * 64 + 22), 0);
  });
