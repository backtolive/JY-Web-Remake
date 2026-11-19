/** Original role records: source bytes stay immutable; explicit field writes live in a sparse overlay. */
import { parseIdxGrpIndex } from './idx-grp.ts';

const RECORD_BYTES = 182;
export interface OriginalRoleTable {
  readonly indexSha256: string; readonly groupSha256: string;
  readonly roleCount: number; readonly sectionOffset: number;
}
export interface OriginalRoleOverlay {
  schemaVersion: 1; indexSha256: string; groupSha256: string;
  records: Record<string, number[]>;
}
const sourceBytes = new WeakMap<OriginalRoleTable, Uint8Array>();
const digest = async (bytes: Uint8Array) => {
  const copy = new Uint8Array(bytes.length); copy.set(bytes);
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', copy.buffer)),
    byte => byte.toString(16).padStart(2, '0')).join('');
};
const fail = (code: string): never => { throw new Error(`ORIGINAL_ROLE_${code}`); };
function address(table: OriginalRoleTable, roleId: number, byteOffset = 0) {
  if (!sourceBytes.has(table) || !Number.isInteger(roleId) || roleId < 0 || roleId >= table.roleCount)
    fail('ADDRESS');
  if (!Number.isInteger(byteOffset) || byteOffset < 0 || byteOffset > RECORD_BYTES - 2 || byteOffset % 2)
    fail('FIELD');
}
function validateOverlay(table: OriginalRoleTable, overlay: OriginalRoleOverlay) {
  if (!overlay || overlay.schemaVersion !== 1 || overlay.indexSha256 !== table.indexSha256 ||
      overlay.groupSha256 !== table.groupSha256 || !overlay.records ||
      typeof overlay.records !== 'object' || Array.isArray(overlay.records) ||
      Object.keys(overlay).sort().join('|') !== 'groupSha256|indexSha256|records|schemaVersion' ||
      Object.keys(overlay.records).length > table.roleCount) fail('OVERLAY');
  for (const [key, bytes] of Object.entries(overlay.records)) {
    if (!/^(0|[1-9]\d*)$/.test(key) || Number(key) >= table.roleCount ||
        !Array.isArray(bytes) || bytes.length !== RECORD_BYTES ||
        bytes.some(byte => !Number.isInteger(byte) || byte < 0 || byte > 255)) fail('RECORD');
  }
}
export async function openOriginalRoleTable(index: Uint8Array, group: Uint8Array): Promise<OriginalRoleTable> {
  const ranges = parseIdxGrpIndex(index, group.length);
  const roleRange = ranges[1];
  if (ranges.length !== 6 || !roleRange || roleRange.sourceOffset !== 836 ||
      roleRange.byteLength !== 320 * RECORD_BYTES) fail('LAYOUT');
  const groupCopy = new Uint8Array(group), indexCopy = new Uint8Array(index);
  const table = Object.freeze({ indexSha256: await digest(indexCopy), groupSha256: await digest(groupCopy),
    roleCount: 320, sectionOffset: roleRange!.sourceOffset });
  sourceBytes.set(table, groupCopy);
  return table;
}
export function createOriginalRoleOverlay(table: OriginalRoleTable): OriginalRoleOverlay {
  if (!sourceBytes.has(table)) fail('TABLE');
  return { schemaVersion: 1, indexSha256: table.indexSha256, groupSha256: table.groupSha256, records: {} };
}
export function originalRoleFieldSourceOffset(table: OriginalRoleTable, roleId: number, byteOffset: number) {
  address(table, roleId, byteOffset);
  return table.sectionOffset + roleId * RECORD_BYTES + byteOffset;
}
export function readOriginalRoleRecord(table: OriginalRoleTable, overlay: OriginalRoleOverlay, roleId: number): number[] {
  address(table, roleId); validateOverlay(table, overlay);
  if (Object.hasOwn(overlay.records, String(roleId))) return [...overlay.records[String(roleId)]!];
  const start = originalRoleFieldSourceOffset(table, roleId, 0);
  return Array.from(sourceBytes.get(table)!.subarray(start, start + RECORD_BYTES));
}
export function readOriginalRoleInt16(table: OriginalRoleTable, overlay: OriginalRoleOverlay,
  roleId: number, byteOffset: number): number {
  address(table, roleId, byteOffset);
  const record = readOriginalRoleRecord(table, overlay, roleId);
  const word = record[byteOffset]! | record[byteOffset + 1]! << 8;
  return word >= 0x8000 ? word - 0x10000 : word;
}
/** Writes are resolved byte offsets and signed int16 values; no opcode interpretation occurs here. */
export function updateOriginalRoleInt16(table: OriginalRoleTable, overlay: OriginalRoleOverlay,
  roleId: number, writes: readonly (readonly [number, number])[]): OriginalRoleOverlay {
  const record = readOriginalRoleRecord(table, overlay, roleId);
  if (!Array.isArray(writes) || !writes.length || writes.length > RECORD_BYTES / 2) fail('WRITES');
  const used = new Set<number>();
  for (const write of writes) {
    if (!Array.isArray(write) || write.length !== 2) fail('WRITES');
    const [offset, value] = write;
    address(table, roleId, offset);
    if (used.has(offset) || !Number.isInteger(value) || value < -32768 || value > 32767) fail('WRITES');
    used.add(offset);
    record[offset] = value & 255;
    record[offset + 1] = value >> 8 & 255;
  }
  return { schemaVersion: 1, indexSha256: table.indexSha256, groupSha256: table.groupSha256,
    records: { ...structuredClone(overlay.records), [roleId]: record } };
}
