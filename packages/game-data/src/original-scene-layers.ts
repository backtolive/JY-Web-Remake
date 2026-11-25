/** Immutable sparse overlay for original ALLSIN scene-layer cells. */
const SCENE_BYTES = 49152, LAYER_BYTES = 8192, CELLS = 4096;
export interface OriginalSceneLayerTable { sha256: string; sceneCapacity: number }
export interface OriginalSceneLayerOverlay { schemaVersion: 1; sourceSha256: string; records: Record<string, number> }
const sourceBytes = new WeakMap<OriginalSceneLayerTable, Uint8Array>();
const fail = (code: string): never => { throw new Error(`ORIGINAL_SCENE_LAYER_${code}`); };
const digest = async (bytes: Uint8Array) => Array.from(new Uint8Array(
  await crypto.subtle.digest('SHA-256', bytes.slice().buffer)), byte => byte.toString(16).padStart(2, '0')).join('');
function address(table: OriginalSceneLayerTable, sceneId: number, layer: number, cell: number) {
  if (!sourceBytes.has(table) || !Number.isInteger(sceneId) || sceneId < 0 || sceneId >= table.sceneCapacity ||
      !Number.isInteger(layer) || layer < 0 || layer >= 6 ||
      !Number.isInteger(cell) || cell < 0 || cell >= CELLS) fail('ADDRESS');
  return sceneId * SCENE_BYTES + layer * LAYER_BYTES + cell * 2;
}
function validate(table: OriginalSceneLayerTable, overlay: OriginalSceneLayerOverlay) {
  if (!overlay || overlay.schemaVersion !== 1 || overlay.sourceSha256 !== table.sha256 ||
      !overlay.records || typeof overlay.records !== 'object' || Array.isArray(overlay.records) ||
      Object.keys(overlay).sort().join('|') !== 'records|schemaVersion|sourceSha256') fail('OVERLAY');
  for (const [key, value] of Object.entries(overlay.records)) {
    const match = /^(0|[1-9]\d*)\/(0|[1-5])\/(0|[1-9]\d*)$/.exec(key);
    if (!match || Number(match[1]) >= table.sceneCapacity || Number(match[3]) >= CELLS ||
        !Number.isInteger(value) || value < -32768 || value > 32767) fail('RECORD');
  }
}
export async function openOriginalSceneLayerTable(bytes: Uint8Array): Promise<OriginalSceneLayerTable> {
  if (!(bytes instanceof Uint8Array) || !bytes.length || bytes.length % SCENE_BYTES) fail('LAYOUT');
  const copy = bytes.slice();
  const table = Object.freeze({ sha256: await digest(copy), sceneCapacity: copy.length / SCENE_BYTES });
  sourceBytes.set(table, copy); return table;
}
export function createOriginalSceneLayerOverlay(table: OriginalSceneLayerTable): OriginalSceneLayerOverlay {
  if (!sourceBytes.has(table)) fail('TABLE');
  return { schemaVersion: 1, sourceSha256: table.sha256, records: {} };
}
export function readOriginalSceneLayerCell(table: OriginalSceneLayerTable,
  overlay: OriginalSceneLayerOverlay, sceneId: number, layer: number, cell: number) {
  const offset = address(table, sceneId, layer, cell); validate(table, overlay);
  const key = `${sceneId}/${layer}/${cell}`;
  return Object.hasOwn(overlay.records, key) ? overlay.records[key]! :
    new DataView(sourceBytes.get(table)!.buffer).getInt16(offset, true);
}
export function updateOriginalSceneLayerCells(table: OriginalSceneLayerTable,
  overlay: OriginalSceneLayerOverlay, writes: readonly (readonly [number, number, number, number])[]) {
  validate(table, overlay);
  if (!Array.isArray(writes) || !writes.length || writes.length > 4096) fail('WRITES');
  const records = { ...structuredClone(overlay.records) }, used = new Set<string>();
  for (const write of writes) {
    if (!Array.isArray(write) || write.length !== 4) fail('WRITES');
    const [sceneId, layer, cell, value] = write;
    address(table, sceneId, layer, cell);
    const key = `${sceneId}/${layer}/${cell}`;
    if (used.has(key) || !Number.isInteger(value) || value < -32768 || value > 32767) fail('WRITES');
    used.add(key); records[key] = value;
  }
  return { schemaVersion: 1 as const, sourceSha256: table.sha256, records };
}
