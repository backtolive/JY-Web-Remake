import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { readOriginalSceneLayerCell } from '../../packages/game-data/src/original-scene-layers.ts';
import { applyOriginal274ObservedLayer, bindOriginal274LayerAdapter,
  createOriginal274LayerState } from '../../tools/extractor/original-event-274-layer-adapter.mjs';
const names = ['KDEF.IDX', 'KDEF.GRP', 'ALLSIN.GRP'];
const available = names.every(name => existsSync(`original/dos/${name}`));
const sources = async () => Object.fromEntries(await Promise.all(names.map(async name =>
  [name, new Uint8Array(await readFile(`original/dos/${name}`))])));
test('event 274 updates only scene 32 layer 1 array cell (12,22)',
  { skip: !available && 'Original data is local.' }, async () => {
    const context = await bindOriginal274LayerAdapter(await sources());
    const state = createOriginal274LayerState(context), next = applyOriginal274ObservedLayer(context, state);
    assert.equal(readOriginalSceneLayerCell(context.table, state, 32, 1, context.cell), 0);
    assert.equal(readOriginalSceneLayerCell(context.table, next, 32, 1, context.cell), 2898);
    assert.deepEqual(Object.keys(next.records), [`32/1/${12 * 64 + 22}`]);
  });
