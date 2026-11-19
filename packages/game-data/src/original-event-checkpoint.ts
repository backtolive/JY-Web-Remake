import { readOriginalEventSlot } from './original-event-slots.ts';
import type { OriginalEventSlotOverlay, OriginalEventSlotTable } from './original-event-slots.ts';

export const ORIGINAL_EVENT_CHECKPOINT_VERSION = '0.1.0';
const sourceNames = ['ALLDEF.GRP', 'ALLSIN.GRP', 'KDEF.IDX', 'KDEF.GRP',
  'TALK.IDX', 'TALK.GRP', 'RANGER.IDX', 'RANGER.GRP'] as const;
type SourceName = typeof sourceNames[number];
type Setting = string | boolean | number;
export interface OriginalComponentIdentity { id: string; version: string; sha256: string }
export interface OriginalModIdentity extends OriginalComponentIdentity { priority: number }
export interface OriginalEventContentLock {
  base: OriginalComponentIdentity;
  ruleset: OriginalComponentIdentity;
  mods: OriginalModIdentity[];
  loadOrder: string[];
  settings: Record<string, Setting>;
  sourceHashes: Record<SourceName, string>;
}
export interface OriginalEventSlotCheckpoint {
  format: 'original-event-slots';
  schemaVersion: 1;
  adapterVersion: typeof ORIGINAL_EVENT_CHECKPOINT_VERSION;
  contentLock: OriginalEventContentLock;
  overlay: OriginalEventSlotOverlay;
}

function canonical(value: unknown, depth = 0): string {
  if (depth > 16) throw new Error('ORIGINAL_CHECKPOINT_DEPTH');
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(item => canonical(item, depth + 1)).join(',') + ']';
  if (typeof value === 'object' && value && [Object.prototype, null].includes(Object.getPrototypeOf(value))) {
    return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical((value as Record<string, unknown>)[key], depth + 1)).join(',') + '}';
  }
  throw new Error('ORIGINAL_CHECKPOINT_JSON');
}

function exactKeys(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).sort().join('|') === [...keys].sort().join('|');
}
function identity(value: unknown, mod = false): value is OriginalComponentIdentity {
  if (!exactKeys(value, mod ? ['id', 'version', 'sha256', 'priority'] : ['id', 'version', 'sha256'])) return false;
  return typeof value.id === 'string' && /^[a-z][a-z0-9.-]{0,79}$/.test(value.id) &&
    typeof value.version === 'string' && /^\d+\.\d+\.\d+$/.test(value.version) &&
    typeof value.sha256 === 'string' && /^[a-f0-9]{64}$/.test(value.sha256) &&
    (!mod || (Number.isInteger(value.priority) && (value.priority as number) >= -10000 && (value.priority as number) <= 10000));
}
function checkLock(lock: OriginalEventContentLock, table: OriginalEventSlotTable) {
  if (!exactKeys(lock, ['base', 'ruleset', 'mods', 'loadOrder', 'settings', 'sourceHashes']) ||
      !identity(lock.base) || !identity(lock.ruleset) || !Array.isArray(lock.mods) || lock.mods.length > 127 ||
      !lock.mods.every(mod => identity(mod, true)) || !Array.isArray(lock.loadOrder) ||
      lock.loadOrder.length !== lock.mods.length + 1 || lock.loadOrder[0] !== lock.base.id ||
      lock.mods.some((mod, index) => lock.loadOrder[index + 1] !== mod.id) ||
      new Set([lock.base.id, ...lock.mods.map(mod => mod.id)]).size !== lock.mods.length + 1 ||
      !exactKeys(lock.sourceHashes, sourceNames) ||
      Object.values(lock.sourceHashes).some(hash => typeof hash !== 'string' || !/^[a-f0-9]{64}$/.test(hash)) ||
      lock.sourceHashes['ALLDEF.GRP'] !== table.sha256 ||
      !lock.settings || typeof lock.settings !== 'object' || Array.isArray(lock.settings) ||
      Object.keys(lock.settings).length > 128 ||
      Object.entries(lock.settings).some(([key, value]) => !/^[a-z][a-z0-9._-]*$/.test(key) ||
        !(typeof value === 'boolean' || (typeof value === 'string' && value.length <= 1024) ||
          (typeof value === 'number' && Number.isFinite(value))))) {
    throw new Error('ORIGINAL_CHECKPOINT_LOCK');
  }
}

function checkOverlay(table: OriginalEventSlotTable, overlay: OriginalEventSlotOverlay) {
  // The read validates the entire sparse overlay, including every record key and field.
  readOriginalEventSlot(table, overlay, 0, 0);
}

/** This checkpoint contains event slots only; it is not a complete game save. */
export function serializeOriginalEventSlotCheckpoint(table: OriginalEventSlotTable,
  lock: OriginalEventContentLock, overlay: OriginalEventSlotOverlay): string {
  checkLock(lock, table);
  checkOverlay(table, overlay);
  const checkpoint: OriginalEventSlotCheckpoint = {
    format: 'original-event-slots', schemaVersion: 1, adapterVersion: ORIGINAL_EVENT_CHECKPOINT_VERSION,
    contentLock: structuredClone(lock), overlay: structuredClone(overlay),
  };
  return canonical(checkpoint);
}

/** Pure preflight: no storage write or mutation of the old checkpoint. */
export function restoreOriginalEventSlotCheckpoint(table: OriginalEventSlotTable,
  expectedLock: OriginalEventContentLock, raw: string): OriginalEventSlotOverlay {
  if (typeof raw !== 'string' || raw.length > 8_000_000) throw new Error('ORIGINAL_CHECKPOINT_SIZE');
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error('ORIGINAL_CHECKPOINT_JSON'); }
  if (!exactKeys(parsed, ['format', 'schemaVersion', 'adapterVersion', 'contentLock', 'overlay']) ||
      parsed.format !== 'original-event-slots' || parsed.schemaVersion !== 1 ||
      parsed.adapterVersion !== ORIGINAL_EVENT_CHECKPOINT_VERSION) {
    throw new Error('ORIGINAL_CHECKPOINT_FORMAT');
  }
  checkLock(expectedLock, table);
  checkLock(parsed.contentLock as OriginalEventContentLock, table);
  if (canonical(parsed.contentLock) !== canonical(expectedLock)) throw new Error('ORIGINAL_CHECKPOINT_CONTENT_MISMATCH');
  const overlay = parsed.overlay as OriginalEventSlotOverlay;
  checkOverlay(table, overlay);
  return structuredClone(overlay);
}
