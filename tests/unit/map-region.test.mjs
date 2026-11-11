import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { extractMapRegion, regionResourceIds, unmappedRegionResources, assembleRegion } from '../../packages/game-data/src/map-region.ts';

function makeScene(values = {}) {
  const layers = Array.from({ length: 6 }, () => Array(4096).fill(0));
  for (const [layer, cells] of Object.entries(values)) {
    for (const [index, value] of Object.entries(cells)) layers[Number(layer)][Number(index)] = value;
  }
  return { id: 1, layers };
}

test('Mock region: extracts absolute and relative coordinates plus all six layer values', () => {
  const scene = makeScene({ 0: { 65: 70 }, 1: { 65: 2288 }, 3: { 65: 2 }, 4: { 65: 4 } });
  const region = extractMapRegion(scene, 1, 1, 2, 2);
  assert.equal(region.sceneId, 1);
  assert.equal(region.cells.length, 4);
  assert.deepEqual(region.cells[0], { x: 1, y: 1, relativeX: 0, relativeY: 0, layers: {
    groundTileId: 70, buildingTileId: 2288, objectTileId: 0, eventSlot: 2, buildingHeight: 4, objectHeight: 0,
  } });
  assert.equal(region.blocked.includes(0), true);
});

test('Mock region: rejects invalid bounds and non-integer sizes', () => {
  const scene = makeScene();
  assert.throws(() => extractMapRegion(scene, 60, 0, 8, 8), /REGION_BOUNDS/);
  assert.throws(() => extractMapRegion(scene, 0, 0, 0, 8), /REGION_SIZE/);
  assert.throws(() => extractMapRegion(scene, 0.5, 0, 8, 8), /REGION_ORIGINX_INTEGER/);
});

test('Mock region: resource IDs exclude zero, include unique layer-qualified keys', () => {
  const scene = makeScene({ 0: { 0: 70, 1: 4 }, 1: { 0: 2288 } });
  const region = extractMapRegion(scene, 0, 0, 2, 2);
  assert.deepEqual(regionResourceIds(region).map(ref => ref.key), ['buildingTileId:2288', 'groundTileId:4', 'groundTileId:70']);
});

test('Mock region: unmapped resources are diagnosed without being silently skipped', () => {
  const scene = makeScene({ 0: { 0: 70, 1: 4 } });
  const region = extractMapRegion(scene, 0, 0, 2, 1);
  const mapping = { version: '0.1.0', layers: { groundTileId: { '70': { kind: 'tile', color: '#fff', height: 0.1 } } }, fallback: undefined };
  assert.deepEqual(unmappedRegionResources(region, mapping).map(ref => ref.key), ['groundTileId:4']);
});

test('Mock region: strict assembly rejects unmapped IDs and non-strict records diagnostics', () => {
  const scene = makeScene({ 0: { 0: 70, 1: 4 } });
  const region = extractMapRegion(scene, 0, 0, 2, 1);
  const mapping = { version: '0.1.0', layers: { groundTileId: { '70': { kind: 'tile', color: '#fff', height: 0.1 } } } };
  assert.throws(() => assembleRegion(region, mapping), /UNMAPPED_RESOURCE:groundTileId:4/);
  const assembled = assembleRegion(region, mapping, { strict: false });
  assert.equal(assembled.unmapped.length, 1);
  assert.equal(assembled.diagnostics[0], 'UNMAPPED_RESOURCE:groundTileId:4');
  assert.equal(assembled.cells[1].assets.length, 0);
});

test('Mock region: assembly maps source IDs to Mock assets and preserves logical/world coordinates', () => {
  const scene = makeScene({ 0: { 259: 70 }, 4: { 259: 4 } });
  const region = extractMapRegion(scene, 3, 4, 1, 1);
  const mapping = { version: '0.2.0', layers: { groundTileId: { '70': { kind: 'tile', color: '#abc', height: 0.12, label: 'mock' } } } };
  const assembled = assembleRegion(region, mapping);
  assert.equal(assembled.version, '0.2.0');
  assert.equal(assembled.cells[0].logicalX, 3);
  assert.equal(assembled.cells[0].logicalY, 4);
  assert.equal(assembled.cells[0].world.x, 3);
  assert.equal(assembled.cells[0].world.z, 4);
  assert.equal(assembled.cells[0].assets[0].asset.label, 'mock');
  assert.equal(assembled.unmapped.length, 0);
});

test('Real original 8x8 region: committed Mock mapping covers every source tile ID when original data is present', async () => {
  let exists = true;
  try { await readFile('F:/github/JY-Web-Remake/original/dos/RANGER.IDX'); } catch { exists = false; }
  if (!exists) return;
  const { readOriginalScene } = await import('../../packages/game-data/src/original.ts');
  const { readFile } = await import('node:fs/promises');
  const path = (await import('node:path')).default;
  const input = 'F:/github/JY-Web-Remake/original/dos';
  const idx = await readFile(path.join(input, 'RANGER.IDX'));
  const grp = await readFile(path.join(input, 'RANGER.GRP'));
  const sin = await readFile(path.join(input, 'ALLSIN.GRP'));
  const def = await readFile(path.join(input, 'ALLDEF.GRP'));
  const scene = readOriginalScene(idx, grp, sin, def, 1);
  const region = extractMapRegion(scene, 13, 28, 8, 8);
  const mapping = JSON.parse(await readFile('F:/github/JY-Web-Remake/tests/fixtures/map-region-mock-assets.json', 'utf8'));
  assert.equal(unmappedRegionResources(region, mapping).length, 0);
  const assembled = assembleRegion(region, mapping);
  assert.equal(assembled.diagnostics.length, 0);
});
