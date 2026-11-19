/** Isolated v1 event slice; v0.1 content, runtime and saves remain readable as-is. */
import { Ajv } from 'ajv';
import { canonical, contentHash } from './content.ts';
import { applyDecisionPlan, createDecisionState, validateDecisionState } from './decision.ts';
import type { DecisionPlan, DecisionSchema, DecisionState, DecisionChange } from './decision.ts';
import { decisionDomainsSchema, decisionStateSchema, decisionPlanSchema } from './decision-schema.ts';
import { decisionEventContentSchema, decisionEventSaveSchema } from './decision-event-schema.ts';

export type DecisionEventStep = { op: 'say'; dialogueId: string } |
  { op: 'choice'; options: { id: string; text: string; target: number }[] } |
  { op: 'decide'; plan: DecisionPlan } | { op: 'end' };
export interface DecisionEventContent {
  schemaVersion: 1; id: string; version: string; classification: 'mock' | 'original-derived';
  entry: { mapId: string; x: number; y: number }; decision: DecisionSchema;
  dialogues: Record<string, { speaker: string; text: string }>;
  events: Record<string, { steps: DecisionEventStep[] }>;
}
export interface ResolvedDecisionEventContent {
  identity: { id: string; version: string; sha256: string };
  data: DecisionEventContent;
}
export interface DecisionEventState {
  schemaVersion: 1; location: { mapId: string; x: number; y: number };
  decision: DecisionState;
  cursor: { eventId: string; pc: number; waiting: 'dialogue' | 'choice' } | null;
}
export type DecisionEventCommand = { type: 'START'; eventId: string } |
  { type: 'CONTINUE' } | { type: 'CHOOSE'; optionId: string };
export type DecisionEventNotice = { type: 'DIALOGUE' | 'CHOICE' | 'DECISION_APPLIED' | 'EVENT_ENDED'; id?: string; changes?: DecisionChange[] };
const ajv = new Ajv({ strict: true, allErrors: true });
for (const schema of [decisionDomainsSchema, decisionStateSchema, decisionPlanSchema]) ajv.addSchema(schema);
const validContent = ajv.compile(decisionEventContentSchema);
const validSave = ajv.compile(decisionEventSaveSchema);
function fail(code: string): never { throw new Error(`DECISION_EVENT_${code}`); }
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}

export async function resolveDecisionEventContent(input: unknown): Promise<ResolvedDecisionEventContent> {
  if (!validContent(input)) fail('CONTENT_SCHEMA');
  const data = JSON.parse(canonical(input)) as DecisionEventContent;
  createDecisionState(data.decision);
  for (const [eventId, event] of Object.entries(data.events)) {
    if (!eventId.startsWith(data.id + ':')) fail('EVENT_NAMESPACE');
    for (const [pc, step] of event.steps.entries()) {
      if (step.op === 'say' && !Object.hasOwn(data.dialogues, step.dialogueId)) fail('DIALOGUE_REFERENCE');
      if (step.op === 'choice') {
        if (new Set(step.options.map(option => option.id)).size !== step.options.length) fail('OPTION_DUPLICATE');
        if (step.options.some(option => option.target >= event.steps.length)) fail('JUMP_TARGET');
      }
      if (step.op === 'decide' && pc === event.steps.length - 1) fail('FALLTHROUGH');
      if (step.op === 'say' && pc === event.steps.length - 1) fail('FALLTHROUGH');
    }
  }
  for (const dialogueId of Object.keys(data.dialogues)) if (!dialogueId.startsWith(data.id + ':')) fail('DIALOGUE_NAMESPACE');
  const identity = { id: data.id, version: data.version, sha256: await contentHash(data) };
  return freeze({ identity, data });
}

export function createDecisionEventState(content: ResolvedDecisionEventContent): DecisionEventState {
  const state: DecisionEventState = { schemaVersion: 1, location: structuredClone(content.data.entry),
    decision: createDecisionState(content.data.decision), cursor: null };
  validateDecisionEventState(content, state);
  return state;
}
export function validateDecisionEventState(content: ResolvedDecisionEventContent, state: DecisionEventState): void {
  if (!validSave({ schemaVersion: 2, runtimeVersion: '0.2.0', content: content.identity, state })) fail('STATE_SCHEMA');
  if (!state || state.schemaVersion !== 1 || !state.location ||
      !/^[a-z][a-z0-9.-]*:[a-z0-9][a-z0-9._/-]*$/.test(state.location.mapId) ||
      !Number.isInteger(state.location.x) || state.location.x < 0 || !Number.isInteger(state.location.y) || state.location.y < 0) fail('STATE_LOCATION');
  validateDecisionState(content.data.decision, state.decision);
  if (state.cursor) {
    const step = content.data.events[state.cursor.eventId]?.steps[state.cursor.pc];
    if (!step || (state.cursor.waiting === 'dialogue' && step.op !== 'say') ||
        (state.cursor.waiting === 'choice' && step.op !== 'choice') ||
        !['dialogue', 'choice'].includes(state.cursor.waiting)) fail('STATE_CURSOR');
  }
}
/** One command is atomic. A pause is an explicit serializable commit boundary. */
export function dispatchDecisionEvent(content: ResolvedDecisionEventContent, previous: DecisionEventState,
  command: DecisionEventCommand, budget = 1000): { state: DecisionEventState; notices: DecisionEventNotice[] } {
  validateDecisionEventState(content, previous);
  if (!Number.isInteger(budget) || budget < 1 || budget > 10000) fail('BUDGET');
  const state = structuredClone(previous), notices: DecisionEventNotice[] = [];
  if (command.type === 'START') {
    if (state.cursor || !Object.hasOwn(content.data.events, command.eventId)) fail('START');
    state.cursor = { eventId: command.eventId, pc: 0, waiting: 'dialogue' };
  } else if (command.type === 'CONTINUE') {
    if (!state.cursor || state.cursor.waiting !== 'dialogue') fail('CONTINUE');
    state.cursor.pc++;
  } else if (command.type === 'CHOOSE') {
    if (!state.cursor || state.cursor.waiting !== 'choice') fail('CHOOSE');
    const step = content.data.events[state.cursor.eventId]!.steps[state.cursor.pc]!;
    if (step.op !== 'choice') fail('CURSOR');
    const option = step.options.find(item => item.id === command.optionId);
    if (!option) fail('OPTION');
    state.cursor.pc = option.target;
  } else fail('COMMAND');
  for (let count = 0; state.cursor; count++) {
    if (count >= budget) fail('BUDGET');
    const cursor = state.cursor;
    const step = content.data.events[cursor.eventId]?.steps[cursor.pc];
    if (!step) fail('PC');
    if (step.op === 'say') {
      cursor.waiting = 'dialogue'; notices.push({ type: 'DIALOGUE', id: step.dialogueId }); break;
    }
    if (step.op === 'choice') {
      cursor.waiting = 'choice'; notices.push({ type: 'CHOICE', id: cursor.eventId }); break;
    }
    if (step.op === 'decide') {
      const result = applyDecisionPlan(content.data.decision, state.decision, step.plan, budget - count);
      state.decision = result.state;
      if (result.changes.length) notices.push({ type: 'DECISION_APPLIED', changes: result.changes });
      cursor.pc++;
    } else if (step.op === 'end') { state.cursor = null; notices.push({ type: 'EVENT_ENDED' }); }
  }
  validateDecisionEventState(content, state);
  return { state, notices };
}

/** Exact content identity preflight; this never mutates the old save. */
export function serializeDecisionEventSave(content: ResolvedDecisionEventContent, state: DecisionEventState): string {
  validateDecisionEventState(content, state);
  const save = { schemaVersion: 2, runtimeVersion: '0.2.0', content: content.identity, state };
  if (!validSave(save)) fail('SAVE_SCHEMA');
  return canonical(save);
}
export function restoreDecisionEventSave(content: ResolvedDecisionEventContent, raw: string): DecisionEventState {
  if (typeof raw !== 'string' || raw.length > 8_000_000) fail('SAVE_LIMIT');
  let save: unknown;
  try { save = JSON.parse(raw); } catch { fail('SAVE_JSON'); }
  if (!validSave(save)) fail('SAVE_SCHEMA');
  const value = save as { content: ResolvedDecisionEventContent['identity']; state: DecisionEventState };
  if (canonical(value.content) !== canonical(content.identity)) fail('CONTENT_MISMATCH');
  validateDecisionEventState(content, value.state);
  return structuredClone(value.state);
}
