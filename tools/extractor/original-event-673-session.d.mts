import type { DecisionEventContent, DecisionEventState, DecisionEventCommand,
  DecisionEventNotice, ResolvedDecisionEventContent } from '../../packages/game-core/src/decision-event.ts';
import type { OriginalEventSlotTable, OriginalEventSlotOverlay } from '../../packages/game-data/src/original-event-slots.ts';
import type { OriginalRoleTable, OriginalRoleOverlay } from '../../packages/game-data/src/original-role-records.ts';

export interface Original673Converted {
  content: DecisionEventContent;
  table: OriginalEventSlotTable;
  roleTable: OriginalRoleTable;
  provenance: { eventId: number; sourceHashes: Record<string, string> };
}
export interface Original673Context {
  content: ResolvedDecisionEventContent;
  table: OriginalEventSlotTable;
  roleTable: OriginalRoleTable;
  sourceHashes: Record<string, string>;
}
export interface Original673State {
  schemaVersion: 1;
  event: DecisionEventState;
  overlay: OriginalEventSlotOverlay;
  roles: OriginalRoleOverlay;
}
export function bindOriginal673Session(converted: Original673Converted): Promise<Original673Context>;
export function validateOriginal673Session(context: Original673Context, state: Original673State): void;
export function createOriginal673Session(context: Original673Context): Original673State;
export function dispatchOriginal673Session(context: Original673Context, previous: Original673State,
  command: DecisionEventCommand): { state: Original673State; notices: DecisionEventNotice[] };
export function serializeOriginal673Session(context: Original673Context, state: Original673State): string;
export function restoreOriginal673Session(context: Original673Context, raw: string): Original673State;
