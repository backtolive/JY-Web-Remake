/** Exact scene-layer cell transition observed before event 274's following dialogue. */
import { createHash } from 'node:crypto';
import { parseIdxGrpIndex, readIdxGrpResource } from '../../packages/game-data/src/idx-grp.ts';
import { createOriginalSceneLayerOverlay, openOriginalSceneLayerTable,
  readOriginalSceneLayerCell, updateOriginalSceneLayerCells } from
  '../../packages/game-data/src/original-scene-layers.ts';
const hashes = { idx: 'bf02eccf1dab01fd0ae033cdf807f56b978a71a6c2ab9be05e366239b485104b',
  grp: '135c5e097a7fe561ee931046e1bebf55de9b469678e3d111d8e9f2c6bb600e06',
  sin: '830ae313ccabe310a16d330eac83647a9c81a6c23efce6069ca87dc653f0e154' };
const eventHash = 'ba1c5fb7d3c54efe577117b2161952ba0163b834db346128d0034a96d4a9b3af';
const cell = 12 * 64 + 22;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = code => { throw new Error(`ORIGINAL274_LAYER_${code}`); };
export async function bindOriginal274LayerAdapter(sources) {
  if (sha(sources['KDEF.IDX']) !== hashes.idx || sha(sources['KDEF.GRP']) !== hashes.grp ||
      sha(sources['ALLSIN.GRP']) !== hashes.sin) fail('SOURCE');
  const range = parseIdxGrpIndex(sources['KDEF.IDX'], sources['KDEF.GRP'].length)[274];
  if (!range || range.sourceOffset !== 43550 || range.byteLength !== 28) fail('RANGE');
  const raw = readIdxGrpResource(sources['KDEF.GRP'], range),
    view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  if (sha(raw) !== eventHash || JSON.stringify(Array.from({ length: 6 }, (_, index) =>
      view.getInt16((6 + index) * 2, true))) !== JSON.stringify([17, -2, 1, 12, 22, 2898]))
    fail('INSTRUCTION');
  const table = await openOriginalSceneLayerTable(sources['ALLSIN.GRP']);
  const base = createOriginalSceneLayerOverlay(table);
  if (readOriginalSceneLayerCell(table, base, 32, 1, cell) !== 0) fail('PRECONDITION');
  return Object.freeze({ adapterVersion: 1, eventId: 274, eventSha256: eventHash,
    table, sceneId: 32, layer: 1, cell, arrayIndex1: 12, arrayIndex2: 22 });
}
export function createOriginal274LayerState(context) {
  if (context?.eventId !== 274 || context.eventSha256 !== eventHash) fail('CONTEXT');
  return createOriginalSceneLayerOverlay(context.table);
}
export function applyOriginal274ObservedLayer(context, previous) {
  if (Object.keys(previous?.records ?? {}).length ||
      readOriginalSceneLayerCell(context.table, previous, 32, 1, cell) !== 0) fail('PRECONDITION');
  return updateOriginalSceneLayerCells(context.table, previous, [[32, 1, cell, 2898]]);
}
