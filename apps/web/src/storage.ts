import { restoreSave, serializeSave } from '@jy/game-core';
import type { GameState, ResolvedContent } from '@jy/game-core';
import { restoreOriginalEventSlotCheckpoint, serializeOriginalEventSlotCheckpoint } from '../../../packages/game-data/src/original-event-checkpoint.ts';
import type { OriginalEventContentLock } from '../../../packages/game-data/src/original-event-checkpoint.ts';
import type { OriginalEventSlotOverlay, OriginalEventSlotTable } from '../../../packages/game-data/src/original-event-slots.ts';
import { restoreDecisionEventSave, serializeDecisionEventSave } from '@jy/game-core';
import type { DecisionEventState, ResolvedDecisionEventContent } from '@jy/game-core';
import { restoreControlledEventSave, serializeControlledEventSave } from '@jy/game-core';
import type { ControlledEventState, ResolvedControlledEventContent } from '@jy/game-core';
import { migrateLegacySave, restoreUnifiedSession, serializeUnifiedSession } from '@jy/game-core';
import type { UnifiedSessionContent, UnifiedSessionState } from '@jy/game-core';

export interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void }
export function saveKey(content: ResolvedContent) {
  return 'jy.web.save.v1:' + content.identities.map(pkg => pkg.id).join('|');
}
export function saveGame(storage: StorageLike, content: ResolvedContent, state: GameState) {
  const key = saveKey(content), raw = serializeSave(content, state);
  // Validate first; a failed backup or main write never removes the old main slot.
  restoreSave(content, raw);
  const old = storage.getItem(key);
  if (old !== null) storage.setItem(key + ':backup', old);
  storage.setItem(key, raw);
  return raw;
}
export function loadGame(storage: StorageLike, content: ResolvedContent, backup = false) {
  const raw = storage.getItem(saveKey(content) + (backup ? ':backup' : ''));
  if (raw === null) throw new Error(backup ? '還沒有備份存檔。' : '這個內容組合還沒有本機存檔。');
  return restoreSave(content, raw);
}

/** Separate checkpoint key: this is event-slot state, never presented as a complete game save. */
export function originalEventSlotCheckpointKey(lock: OriginalEventContentLock) {
  return 'jy.web.original.event-slots.v1:' + lock.base.id;
}
export function saveOriginalEventSlotCheckpoint(storage: StorageLike, table: OriginalEventSlotTable,
  lock: OriginalEventContentLock, overlay: OriginalEventSlotOverlay) {
  const key = originalEventSlotCheckpointKey(lock);
  const raw = serializeOriginalEventSlotCheckpoint(table, lock, overlay);
  restoreOriginalEventSlotCheckpoint(table, lock, raw);
  const old = storage.getItem(key);
  if (old !== null) storage.setItem(key + ':backup', old);
  storage.setItem(key, raw);
  return raw;
}
export function loadOriginalEventSlotCheckpoint(storage: StorageLike, table: OriginalEventSlotTable,
  lock: OriginalEventContentLock, backup = false) {
  const raw = storage.getItem(originalEventSlotCheckpointKey(lock) + (backup ? ':backup' : ''));
  if (raw === null) throw new Error(backup ? '還沒有原版事件槽備份。' : '還沒有原版事件槽 checkpoint。');
  return restoreOriginalEventSlotCheckpoint(table, lock, raw);
}

/** Separate v2 Mock decision-event save; legacy v1 slots are never overwritten. */
export function decisionEventSaveKey(content: ResolvedDecisionEventContent) {
  return 'jy.web.decision-event.save.v2:' + content.identity.id + ':' + content.identity.version + ':' + content.identity.sha256;
}
export function saveDecisionEvent(storage: StorageLike, content: ResolvedDecisionEventContent, state: DecisionEventState) {
  const key = decisionEventSaveKey(content), raw = serializeDecisionEventSave(content, state);
  restoreDecisionEventSave(content, raw);
  const old = storage.getItem(key);
  if (old !== null) storage.setItem(key + ':backup', old);
  storage.setItem(key, raw);
  return raw;
}
export function loadDecisionEvent(storage: StorageLike, content: ResolvedDecisionEventContent, backup = false) {
  const raw = storage.getItem(decisionEventSaveKey(content) + (backup ? ':backup' : ''));
  if (raw === null) throw new Error('DECISION_EVENT_SAVE_MISSING');
  return restoreDecisionEventSave(content, raw);
}

/** v3 controlled-command checkpoints are isolated by exact content identity. */
export function controlledEventSaveKey(content: ResolvedControlledEventContent) {
  return 'jy.web.controlled-event.save.v3:' + content.identity.id + ':' + content.identity.version + ':' + content.identity.sha256;
}
export function saveControlledEvent(storage: StorageLike, content: ResolvedControlledEventContent, state: ControlledEventState) {
  const key = controlledEventSaveKey(content), raw = serializeControlledEventSave(content, state);
  restoreControlledEventSave(content, raw);
  const old = storage.getItem(key);
  if (old !== null) storage.setItem(key + ':backup', old);
  storage.setItem(key, raw);
  return raw;
}
export function loadControlledEvent(storage: StorageLike, content: ResolvedControlledEventContent, backup = false) {
  const raw = storage.getItem(controlledEventSaveKey(content) + (backup ? ':backup' : ''));
  if (raw === null) throw new Error('CONTROLLED_EVENT_SAVE_MISSING');
  return restoreControlledEventSave(content, raw);
}

/** Unified v4 Mock session; v1 and v3 keys remain intact until explicit migration. */
export function unifiedSaveKey(content: UnifiedSessionContent) {
  return 'jy.web.session.v4:' + content.controlled.identity.id + ':' + content.controlled.identity.sha256;
}
export function saveUnifiedSession(storage: StorageLike, content: UnifiedSessionContent, state: UnifiedSessionState) {
  const key = unifiedSaveKey(content), raw = serializeUnifiedSession(content, state);
  restoreUnifiedSession(content, raw);
  const old = storage.getItem(key);
  if (old !== null) storage.setItem(key + ':backup', old);
  storage.setItem(key, raw);
  return raw;
}
export function loadUnifiedSession(storage: StorageLike, content: UnifiedSessionContent, backup = false) {
  const raw = storage.getItem(unifiedSaveKey(content) + (backup ? ':backup' : ''));
  if (raw === null) throw new Error('UNIFIED_SESSION_SAVE_MISSING');
  return restoreUnifiedSession(content, raw);
}
export function migrateStoredLegacySave(storage: StorageLike, content: UnifiedSessionContent) {
  const old = storage.getItem(saveKey(content.host));
  if (old === null) throw new Error('LEGACY_SAVE_MISSING');
  const state = migrateLegacySave(content, old);
  const raw = saveUnifiedSession(storage, content, state);
  // The v1 key is never changed by this operation.
  return { state, raw };
}
