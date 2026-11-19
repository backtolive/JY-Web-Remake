import type { OriginalScene } from './original.ts';
import { readOriginalEventSlot } from './original-event-slots.ts';
import type { OriginalEventSlotOverlay, OriginalEventSlotTable } from './original-event-slots.ts';

/** The caller chooses the DOS record field; trigger semantics are not inferred here. */
export type OriginalEventReferenceField = 2 | 3 | 4;
export interface OriginalEventReference {
  sceneId: number;
  slotId: number;
  field: OriginalEventReferenceField;
  eventId: number;
  canonicalId: string;
}

export function resolveOriginalEventAtCell(scene: OriginalScene, table: OriginalEventSlotTable,
  overlay: OriginalEventSlotOverlay, x: number, y: number,
  field: OriginalEventReferenceField, eventCount: number): OriginalEventReference | null {
  if (!Number.isInteger(x) || x < 0 || x >= 64 || !Number.isInteger(y) || y < 0 || y >= 64) {
    throw new Error('ORIGINAL_EVENT_CELL');
  }
  if (field !== 2 && field !== 3 && field !== 4) throw new Error('ORIGINAL_EVENT_REFERENCE_FIELD');
  if (!Number.isInteger(eventCount) || eventCount < 1 || eventCount > 32768) {
    throw new Error('ORIGINAL_EVENT_COUNT');
  }
  if (scene.id >= table.sceneCount || scene.eventCapacity !== table.sceneCount ||
      scene.layers[3]?.length !== 4096) {
    throw new Error('ORIGINAL_EVENT_SCENE_TABLE');
  }
  const slotId = scene.layers[3]![y * 64 + x]!;
  if (slotId === -1) return null;
  if (!Number.isInteger(slotId) || slotId < 0 || slotId >= 200) {
    throw new Error('ORIGINAL_EVENT_LAYER_SLOT');
  }
  const eventId = readOriginalEventSlot(table, overlay, scene.id, slotId)[field]!;
  if (eventId === -1) return null;
  if (eventId < 0 || eventId >= eventCount) throw new Error('ORIGINAL_EVENT_REFERENCE_ID');
  return { sceneId: scene.id, slotId, field, eventId, canonicalId: `original.jy:event/${eventId}` };
}
