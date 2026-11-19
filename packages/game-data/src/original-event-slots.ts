/** Original-content adapter state. The generic RPG runtime never sees DOS field numbers. */
export const ORIGINAL_EVENT_SLOT_OVERLAY_VERSION = 1;
const FIELDS_PER_SLOT = 11;
const BYTES_PER_SLOT = FIELDS_PER_SLOT * 2;
const SLOTS_PER_SCENE = 200;
const BYTES_PER_SCENE = SLOTS_PER_SCENE * BYTES_PER_SLOT;

export interface OriginalEventSlotTable {
  readonly sha256: string;
  readonly sceneCount: number;
}
const sourceBytes = new WeakMap<OriginalEventSlotTable, Uint8Array>();

/** Serializable; the original ALLDEF.GRP remains separate from mutable save state. */
export interface OriginalEventSlotOverlay {
  schemaVersion: 1;
  sourceSha256: string;
  records: Record<string, number[]>;
}

function slotKey(sceneId: number, slotId: number) { return `${sceneId}/${slotId}`; }

function checkAddress(table: OriginalEventSlotTable, sceneId: number, slotId: number) {
  if (!sourceBytes.has(table) || !Number.isInteger(sceneId) || sceneId < 0 || sceneId >= table.sceneCount ||
      !Number.isInteger(slotId) || slotId < 0 || slotId >= SLOTS_PER_SCENE) {
    throw new Error('ORIGINAL_EVENT_SLOT_ADDRESS');
  }
}

function checkRecord(record: unknown): asserts record is number[] {
  if (!Array.isArray(record) || record.length !== FIELDS_PER_SLOT ||
      record.some(value => !Number.isInteger(value) || value < -32768 || value > 32767)) {
    throw new Error('ORIGINAL_EVENT_SLOT_RECORD');
  }
}

function checkOverlay(table: OriginalEventSlotTable, overlay: OriginalEventSlotOverlay) {
  if (!overlay || overlay.schemaVersion !== ORIGINAL_EVENT_SLOT_OVERLAY_VERSION ||
      overlay.sourceSha256 !== table.sha256 || !overlay.records ||
      typeof overlay.records !== 'object' || Array.isArray(overlay.records) ||
      Object.keys(overlay).sort().join('|') !== 'records|schemaVersion|sourceSha256' ||
      Object.keys(overlay.records).length > table.sceneCount * SLOTS_PER_SCENE) {
    throw new Error('ORIGINAL_EVENT_SLOT_OVERLAY');
  }
  for (const [key, record] of Object.entries(overlay.records)) {
    const match = /^(0|[1-9]\d*)\/(0|[1-9]\d*)$/.exec(key);
    if (!match || Number(match[1]) >= table.sceneCount || Number(match[2]) >= SLOTS_PER_SCENE) {
      throw new Error('ORIGINAL_EVENT_SLOT_OVERLAY');
    }
    checkRecord(record);
  }
}

/** Hash the local source once and copy it so later caller edits cannot change the base. */
export async function openOriginalEventSlotTable(source: Uint8Array): Promise<OriginalEventSlotTable> {
  if (!source.length || source.length % BYTES_PER_SCENE || source.length > 100 * BYTES_PER_SCENE) {
    throw new Error('ORIGINAL_EVENT_SLOT_TABLE_SIZE');
  }
  const bytes = new Uint8Array(source);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const sha256 = Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
  const table = Object.freeze({ sha256, sceneCount: bytes.length / BYTES_PER_SCENE });
  sourceBytes.set(table, bytes);
  return table;
}

export function createOriginalEventSlotOverlay(table: OriginalEventSlotTable): OriginalEventSlotOverlay {
  if (!sourceBytes.has(table)) throw new Error('ORIGINAL_EVENT_SLOT_TABLE');
  return { schemaVersion: ORIGINAL_EVENT_SLOT_OVERLAY_VERSION, sourceSha256: table.sha256, records: {} };
}

export function originalEventSlotFieldSourceOffset(table: OriginalEventSlotTable,
  sceneId: number, slotId: number, field: number): number {
  checkAddress(table, sceneId, slotId);
  if (!Number.isInteger(field) || field < 0 || field >= FIELDS_PER_SLOT) throw new Error('ORIGINAL_EVENT_SLOT_FIELD');
  return sceneId * BYTES_PER_SCENE + slotId * BYTES_PER_SLOT + field * 2;
}

export function readOriginalEventSlot(table: OriginalEventSlotTable, overlay: OriginalEventSlotOverlay,
  sceneId: number, slotId: number): number[] {
  checkAddress(table, sceneId, slotId);
  checkOverlay(table, overlay);
  const key = slotKey(sceneId, slotId);
  if (Object.hasOwn(overlay.records, key)) {
    const record = overlay.records[key];
    checkRecord(record);
    return [...record];
  }
  const offset = originalEventSlotFieldSourceOffset(table, sceneId, slotId, 0);
  const bytes = sourceBytes.get(table)!;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return Array.from({ length: FIELDS_PER_SLOT }, (_, field) => view.getInt16(offset + field * 2, true));
}

/** Apply explicit resolved field writes atomically; this does not interpret opcode sentinels. */
export function updateOriginalEventSlot(table: OriginalEventSlotTable, overlay: OriginalEventSlotOverlay,
  sceneId: number, slotId: number, writes: readonly (readonly [number, number])[]): OriginalEventSlotOverlay {
  const record = readOriginalEventSlot(table, overlay, sceneId, slotId);
  if (!Array.isArray(writes) || !writes.length || writes.length > FIELDS_PER_SLOT) {
    throw new Error('ORIGINAL_EVENT_SLOT_WRITES');
  }
  const fields = new Set<number>();
  for (const write of writes) {
    if (!Array.isArray(write) || write.length !== 2) throw new Error('ORIGINAL_EVENT_SLOT_WRITES');
    const [field, value] = write;
    if (!Number.isInteger(field) || field < 0 || field >= FIELDS_PER_SLOT || fields.has(field) ||
        !Number.isInteger(value) || value < -32768 || value > 32767) {
      throw new Error('ORIGINAL_EVENT_SLOT_WRITES');
    }
    fields.add(field);
    record[field] = value;
  }
  const records = Object.fromEntries(Object.entries(overlay.records).map(([key, values]) => [key, [...values]]));
  records[slotKey(sceneId, slotId)] = record;
  return { schemaVersion: 1, sourceSha256: table.sha256, records };
}
