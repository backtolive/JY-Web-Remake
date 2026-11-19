/** One canonical player location, with legacy world state and controlled-event continuation. */
import { Ajv } from 'ajv';
import { assertState, canonical } from './content.ts';
import { createGame, dispatch, restoreSave } from './runtime.ts';
import { createControlledEventState, dispatchControlledEvent, validateControlledEventState } from './controlled-event.ts';
import type { ControlledEventAction, ControlledEventState, ControlledEventNotice } from './controlled-event.ts';
import type { BoundControlledEventContent } from './controlled-host.ts';
import type { Command, GameState, ResolvedContent } from './types.ts';
import { decisionStateSchema } from './decision-schema.ts';
import { controlledCommandSchema } from './controlled-event-schema.ts';
import { unifiedSessionSaveSchema } from './unified-session-schema.ts';

export type UnifiedEventState = Omit<ControlledEventState, 'location'>;
export interface UnifiedSessionState {
  schemaVersion: 1; mode: 'world' | 'controlled'; game: GameState; event: UnifiedEventState;
}
export interface UnifiedSessionContent { host: ResolvedContent; controlled: BoundControlledEventContent }
const ajv = new Ajv({ strict: true, allErrors: true });
for (const schema of [decisionStateSchema, controlledCommandSchema]) ajv.addSchema(schema);
const validSave = ajv.compile(unifiedSessionSaveSchema);
function fail(code: string): never { throw new Error(`UNIFIED_SESSION_${code}`); }
function location(game: GameState) { return { mapId: game.mapId, x: game.x, y: game.y }; }
function asControlled(state: UnifiedSessionState): ControlledEventState {
  return { ...structuredClone(state.event), location: location(state.game) };
}
function withControlled(previous: UnifiedSessionState, event: ControlledEventState): UnifiedSessionState {
  const { location: nextLocation, ...continuation } = event;
  return { ...previous, game: { ...previous.game, ...nextLocation }, event: continuation };
}
function lock(content: UnifiedSessionContent) {
  return { host: { content: content.host.identities, settings: content.host.settings },
    controlled: content.controlled.identity };
}
export function validateUnifiedSession(content: UnifiedSessionContent, state: UnifiedSessionState): void {
  if (!validSave({ schemaVersion: 4, runtimeVersion: '0.4.0', ...lock(content), state })) fail('STATE_SCHEMA');
  assertState(content.host, state.game);
  validateControlledEventState(content.controlled, asControlled(state));
  if (state.mode === 'controlled' && state.game.cursor) fail('CONCURRENT_CURSOR');
  if (state.mode === 'world' && state.event.cursor) fail('MODE_CURSOR');
}
export function createUnifiedSession(content: UnifiedSessionContent, game = createGame(content.host, 42)): UnifiedSessionState {
  const { location: _unused, ...event } = createControlledEventState(content.controlled, game.rngState);
  const state: UnifiedSessionState = { schemaVersion: 1, mode: 'world', game: structuredClone(game), event };
  validateUnifiedSession(content, state);
  return state;
}
/** Explicit v1 migration preflight. Caller writes only a separate v4 key after this succeeds. */
export function migrateLegacySave(content: UnifiedSessionContent, raw: string): UnifiedSessionState {
  return createUnifiedSession(content, restoreSave(content.host, raw));
}
export function dispatchUnifiedWorld(content: UnifiedSessionContent, previous: UnifiedSessionState,
  command: Command) {
  validateUnifiedSession(content, previous);
  if (previous.mode !== 'world') fail('MODE');
  const result = dispatch(content.host, previous.game, command);
  const state = { ...previous, game: result.state };
  validateUnifiedSession(content, state);
  return { state, notifications: result.notifications };
}
export function enterUnifiedControlled(content: UnifiedSessionContent, previous: UnifiedSessionState,
  eventId: string): { state: UnifiedSessionState; notices: ControlledEventNotice[] } {
  validateUnifiedSession(content, previous);
  if (previous.mode !== 'world' || previous.game.cursor || previous.event.cursor) fail('BUSY');
  const event = createControlledEventState(content.controlled, previous.event.rngState);
  event.location = location(previous.game);
  const started = dispatchControlledEvent(content.controlled, event, { type: 'START', eventId });
  const state: UnifiedSessionState = { ...withControlled(previous, started.state), mode: 'controlled' };
  validateUnifiedSession(content, state);
  return { state, notices: started.notices };
}
export function dispatchUnifiedControlled(content: UnifiedSessionContent, previous: UnifiedSessionState,
  action: Exclude<ControlledEventAction, { type: 'START' }>): { state: UnifiedSessionState; notices: ControlledEventNotice[] } {
  validateUnifiedSession(content, previous);
  if (previous.mode !== 'controlled') fail('MODE');
  const result = dispatchControlledEvent(content.controlled, asControlled(previous), action);
  const state = withControlled(previous, result.state);
  validateUnifiedSession(content, state);
  return { state, notices: result.notices };
}
export function leaveUnifiedControlled(content: UnifiedSessionContent, previous: UnifiedSessionState): UnifiedSessionState {
  validateUnifiedSession(content, previous);
  if (previous.mode !== 'controlled' || previous.event.cursor) fail('BUSY');
  const state: UnifiedSessionState = { ...previous, mode: 'world' };
  validateUnifiedSession(content, state);
  return state;
}
export function serializeUnifiedSession(content: UnifiedSessionContent, state: UnifiedSessionState): string {
  validateUnifiedSession(content, state);
  return canonical({ schemaVersion: 4, runtimeVersion: '0.4.0', ...lock(content), state });
}
export function restoreUnifiedSession(content: UnifiedSessionContent, raw: string): UnifiedSessionState {
  if (typeof raw !== 'string' || raw.length > 8_000_000) fail('SAVE_LIMIT');
  let value: unknown;
  try { value = JSON.parse(raw); } catch { fail('SAVE_JSON'); }
  if (!validSave(value)) fail('SAVE_SCHEMA');
  const save = value as { host: ReturnType<typeof lock>['host']; controlled: ReturnType<typeof lock>['controlled'];
    state: UnifiedSessionState };
  const expected = lock(content);
  if (canonical(save.host) !== canonical(expected.host) ||
      canonical(save.controlled) !== canonical(expected.controlled)) fail('CONTENT_MISMATCH');
  validateUnifiedSession(content, save.state);
  return structuredClone(save.state);
}
