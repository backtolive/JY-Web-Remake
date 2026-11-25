/** Immutable sparse int16 overlay for the 84 original 52-byte scene records. */
import { parseIdxGrpIndex } from './idx-grp.ts';
const RECORD_BYTES = 52;
export interface OriginalSceneRecordTable { indexSha256: string; groupSha256: string; sceneCount: number; sectionOffset: number }
export interface OriginalSceneRecordOverlay { schemaVersion: 1; indexSha256: string; groupSha256: string; records: Record<string, number[]> }
const bytesFor = new WeakMap<OriginalSceneRecordTable, Uint8Array>();
const digest = async (bytes: Uint8Array) => Array.from(new Uint8Array(
  await crypto.subtle.digest('SHA-256', bytes.slice().buffer)), byte => byte.toString(16).padStart(2, '0')).join('');
const fail = (code: string): never => { throw new Error(`ORIGINAL_SCENE_RECORD_${code}`); };
function address(table: OriginalSceneRecordTable, sceneId: number, offset = 0) {
  if (!bytesFor.has(table) || !Number.isInteger(sceneId) || sceneId < 0 || sceneId >= table.sceneCount)
    fail('ADDRESS');
  if (!Number.isInteger(offset) || offset < 0 || offset > RECORD_BYTES - 2 || offset % 2) fail('FIELD');
}
function validate(table: OriginalSceneRecordTable, overlay: OriginalSceneRecordOverlay) {
  if (!overlay || overlay.schemaVersion !== 1 || overlay.indexSha256 !== table.indexSha256 ||
      overlay.groupSha256 !== table.groupSha256 || !overlay.records ||
      typeof overlay.records !== 'object' || Array.isArray(overlay.records)) fail('OVERLAY');
  for (const [key, record] of Object.entries(overlay.records))
    if (!/^(0|[1-9]\d*)$/.test(key) || Number(key) >= table.sceneCount ||
        !Array.isArray(record) || record.length !== RECORD_BYTES ||
        record.some(byte => !Number.isInteger(byte) || byte < 0 || byte > 255)) fail('RECORD');
}
export async function openOriginalSceneRecordTable(index: Uint8Array, group: Uint8Array) {
  const ranges = parseIdxGrpIndex(index, group.length), section = ranges[3];
  if (ranges.length !== 6 || !section || section.sourceOffset !== 97076 ||
      section.byteLength !== 84 * RECORD_BYTES) fail('LAYOUT');
  const indexCopy = index.slice(), groupCopy = group.slice();
  const table = Object.freeze({ indexSha256: await digest(indexCopy), groupSha256: await digest(groupCopy),
    sceneCount: 84, sectionOffset: section!.sourceOffset });
  bytesFor.set(table, groupCopy); return table;
}
export function createOriginalSceneRecordOverlay(table: OriginalSceneRecordTable): OriginalSceneRecordOverlay {
  if (!bytesFor.has(table)) fail('TABLE');
  return { schemaVersion: 1, indexSha256: table.indexSha256, groupSha256: table.groupSha256, records: {} };
}
export function readOriginalSceneRecord(table: OriginalSceneRecordTable,
  overlay: OriginalSceneRecordOverlay, sceneId: number) {
  address(table, sceneId); validate(table, overlay);
  if (Object.hasOwn(overlay.records, String(sceneId))) return [...overlay.records[sceneId]!];
  const start = table.sectionOffset + sceneId * RECORD_BYTES;
  return Array.from(bytesFor.get(table)!.subarray(start, start + RECORD_BYTES));
}
export function readOriginalSceneRecordInt16(table: OriginalSceneRecordTable,
  overlay: OriginalSceneRecordOverlay, sceneId: number, offset: number) {
  address(table, sceneId, offset); const record = readOriginalSceneRecord(table, overlay, sceneId);
  const value = record[offset]! | record[offset + 1]! << 8; return value >= 0x8000 ? value - 0x10000 : value;
}
export function updateOriginalSceneRecordInt16(table: OriginalSceneRecordTable,
  overlay: OriginalSceneRecordOverlay, writes: readonly (readonly [number, number, number])[]) {
  validate(table, overlay);
  if (!Array.isArray(writes) || !writes.length || writes.length > 84 * 26) fail('WRITES');
  const records = structuredClone(overlay.records), used = new Set<string>();
  for (const write of writes) {
    if (!Array.isArray(write) || write.length !== 3) fail('WRITES');
    const [sceneId, offset, value] = write; address(table, sceneId, offset);
    const key = `${sceneId}/${offset}`;
    if (used.has(key) || !Number.isInteger(value) || value < -32768 || value > 32767) fail('WRITES');
    used.add(key); const record = readOriginalSceneRecord(table,
      { ...overlay, records }, sceneId);
    record[offset] = value & 255; record[offset + 1] = value >> 8 & 255; records[sceneId] = record;
  }
  return { schemaVersion: 1 as const, indexSha256: table.indexSha256,
    groupSha256: table.groupSha256, records };
}
