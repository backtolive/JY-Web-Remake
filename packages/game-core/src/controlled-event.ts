/** Versioned external-command event slice. The host reports outcomes; content owns state effects. */
import { Ajv } from 'ajv';
import { canonical, contentHash } from './content.ts';
import { nextRandom } from './runtime.ts';
import { applyDecisionPlan, applyDecisionTransaction, createDecisionState, evaluateDecision, validateDecisionState } from './decision.ts';
import type { DecisionPlan, DecisionSchema, DecisionState, DecisionChange, DecisionCondition, DecisionEffect,
  DecisionRef } from './decision.ts';
import { decisionDomainsSchema, decisionStateSchema, decisionPlanSchema, decisionConditionSchema,
  decisionEffectSchema } from './decision-schema.ts';
import { controlledCommandSchema, controlledResultSchema, controlledEventContentSchema,
  controlledEventSaveSchema } from './controlled-event-schema.ts';

export type ControlledCommand = { kind: 'battle'; encounterId: string } |
  { kind: 'animation'; animationId: string } |
  { kind: 'transition'; destination: { mapId: string; x: number; y: number } } |
  { kind: 'selection'; candidates: string[] };
export type ControlledResult = { schemaVersion: 1; requestId: string; kind: 'battle'; outcome: 'victory' | 'defeat' | 'escape' } |
  { schemaVersion: 1; requestId: string; kind: 'animation' | 'transition'; outcome: 'completed' } |
  { schemaVersion: 1; requestId: string; kind: 'selection'; selectedId: string };
export interface ControlledRequest { schemaVersion: 1; requestId: string; command: ControlledCommand }
type Step = { op: 'say'; dialogueId: string } | { op: 'choice'; options: { id: string; text: string; target: number }[] } |
  { op: 'decide'; plan: DecisionPlan } | { op: 'branch'; condition: DecisionCondition; yes: number; no: number } |
  { op: 'invoke'; command: ControlledCommand;
    outcomes: { id: string; target: number; plan?: DecisionPlan }[] } |
  { op: 'roll'; outcomes: { id: string; target: number; weight: number; plan?: DecisionPlan }[] } | { op: 'end' };
export interface ItemDefinition {
  name: string; alias?: string; description?: string; imageRef?: string;
  category?: string; equipSlot?: string;
  stackable: boolean; maxStack?: number;
  useDialogueRef?: string; useConditions?: DecisionCondition[]; useEffects?: DecisionEffect[]; useCommand?: string;
}
export interface ControlledEventContent {
  schemaVersion: 3; id: string; version: string; classification: 'mock' | 'original-derived';
  entry: { mapId: string; x: number; y: number }; decision: DecisionSchema;
  dialogues: Record<string, { speaker: string; text: string }>;
  events: Record<string, { steps: Step[] }>;
  items?: Record<string, ItemDefinition>;
  currentItem?: DecisionRef;
}
export interface ResolvedControlledEventContent {
  identity: { id: string; version: string; sha256: string }; data: ControlledEventContent;
}
export interface ControlledEventState {
  schemaVersion: 2; location: { mapId: string; x: number; y: number }; decision: DecisionState;
  cursor: { eventId: string; pc: number; waiting: 'dialogue' | 'choice' | 'external' } | null;
  rngState: number; nextRequest: number; pending: ControlledRequest | null;
}
export type ControlledEventAction = { type: 'START'; eventId: string } | { type: 'CONTINUE' } |
  { type: 'CHOOSE'; optionId: string } | { type: 'RESOLVE'; result: ControlledResult } |
  /** Host item-menu selection: writes the declared current-item ref. Original flow: the menu
   * sets CurItem before a scene event runs; the event script (opcode 4) branches on it. */
  { type: 'USE_ITEM'; itemId: number };
export type ControlledEventNotice = { type: 'DIALOGUE' | 'CHOICE' | 'REQUEST' | 'DECISION_APPLIED' | 'EVENT_ENDED';
  id?: string; request?: ControlledRequest; changes?: DecisionChange[] };
const ajv = new Ajv({ strict: true, allErrors: true });
for (const schema of [decisionDomainsSchema, decisionStateSchema, decisionPlanSchema, decisionConditionSchema,
  decisionEffectSchema, controlledCommandSchema]) ajv.addSchema(schema);
const validContent = ajv.compile(controlledEventContentSchema);
const validSave = ajv.compile(controlledEventSaveSchema);
const validResult = ajv.compile(controlledResultSchema);
const validCondition = ajv.compile(decisionConditionSchema);
const validEffect = ajv.compile(decisionEffectSchema);
function fail(code: string, detail?: string): never { throw new Error(`CONTROLLED_EVENT_${code}${detail ? `:${detail}` : ''}`); }
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
function outcomeIds(command: ControlledCommand): string[] {
  switch (command.kind) {
    case 'battle': return ['victory', 'defeat', 'escape'];
    case 'animation': case 'transition': return ['completed'];
    case 'selection': return command.candidates;
  }
}
export async function resolveControlledEventContent(input: unknown): Promise<ResolvedControlledEventContent> {
  if (!validContent(input)) fail('CONTENT_SCHEMA');
  const data = JSON.parse(canonical(input)) as ControlledEventContent;
  createDecisionState(data.decision);
  for (const [eventId, event] of Object.entries(data.events)) {
    if (!eventId.startsWith(data.id + ':')) fail('EVENT_NAMESPACE');
    for (const [pc, step] of event.steps.entries()) {
      if (step.op === 'say' && !Object.hasOwn(data.dialogues, step.dialogueId)) fail('DIALOGUE_REFERENCE');
      if ((step.op === 'say' || step.op === 'decide') && pc === event.steps.length - 1) fail('FALLTHROUGH');
      if (step.op === 'choice') {
        if (new Set(step.options.map(option => option.id)).size !== step.options.length) fail('OPTION_DUPLICATE');
        if (step.options.some(option => option.target >= event.steps.length)) fail('JUMP_TARGET');
      }
      if (step.op === 'branch') {
        if (step.yes >= event.steps.length || step.no >= event.steps.length) fail('JUMP_TARGET');
      }
      if (step.op === 'invoke') {
        const permitted = outcomeIds(step.command), actual = step.outcomes.map(outcome => outcome.id);
        if (new Set(permitted).size !== permitted.length || new Set(actual).size !== actual.length ||
          actual.length !== permitted.length || actual.some(id => !permitted.includes(id))) fail('OUTCOME_SET');
        if (step.outcomes.some(outcome => outcome.target >= event.steps.length)) fail('JUMP_TARGET');
      }
      if (step.op === 'roll') {
        if (new Set(step.outcomes.map(outcome => outcome.id)).size !== step.outcomes.length) fail('OUTCOME_SET');
        if (step.outcomes.some(outcome => outcome.target >= event.steps.length)) fail('JUMP_TARGET');
      }
    }
  }
  for (const dialogueId of Object.keys(data.dialogues)) if (!dialogueId.startsWith(data.id + ':')) fail('DIALOGUE_NAMESPACE');
  for (const [itemId, item] of Object.entries(data.items ?? {})) {
    if (!itemId.startsWith(data.id + ':')) fail('ITEM_NAMESPACE');
    if (item.useCommand && (item.useConditions?.length || item.useEffects?.length))
      fail('ITEM_USE_CONFLICT', itemId);
    if (!item.stackable && item.maxStack !== undefined) fail('ITEM_STACK_CONFLICT', itemId);
    if (item.useDialogueRef && !Object.hasOwn(data.dialogues, item.useDialogueRef)) fail('ITEM_DIALOGUE_REFERENCE', itemId);
    if (item.useCommand && !Object.hasOwn(data.events, item.useCommand)) fail('ITEM_EVENT_REFERENCE', itemId);
    for (const condition of item.useConditions ?? []) if (!validCondition(condition)) fail('ITEM_CONDITION', itemId);
    for (const effect of item.useEffects ?? []) if (!validEffect(effect)) fail('ITEM_EFFECT', itemId);
  }
  if (data.currentItem) {
    const domain = data.decision.domains[data.currentItem.domain];
    if (!domain) fail('CURRENT_ITEM_DOMAIN');
    if (data.currentItem.keyFrom?.length || data.currentItem.key === undefined) fail('CURRENT_ITEM_REF');
    if (!domain.allowedKeys.includes(data.currentItem.key)) fail('CURRENT_ITEM_REF');
  }
  const identity = { id: data.id, version: data.version, sha256: await contentHash(data) };
  return freeze({ identity, data });
}
export function createControlledEventState(content: ResolvedControlledEventContent, seed = 1): ControlledEventState {
  const state: ControlledEventState = { schemaVersion: 2, location: structuredClone(content.data.entry),
    decision: createDecisionState(content.data.decision), cursor: null, rngState: seed, nextRequest: 0, pending: null };
  validateControlledEventState(content, state);
  return state;
}
export function validateControlledEventState(content: ResolvedControlledEventContent, state: ControlledEventState): void {
  if (!validSave({ schemaVersion: 3, runtimeVersion: '0.3.0', content: content.identity, state })) fail('STATE_SCHEMA');
  validateDecisionState(content.data.decision, state.decision);
  if (state.cursor) {
    const step = content.data.events[state.cursor.eventId]?.steps[state.cursor.pc];
    if (!step || (state.cursor.waiting === 'dialogue' && step.op !== 'say') ||
      (state.cursor.waiting === 'choice' && step.op !== 'choice') ||
      (state.cursor.waiting === 'external' && step.op !== 'invoke')) fail('STATE_CURSOR');
    if (state.cursor.waiting === 'external') {
      if (!state.pending || step.op !== 'invoke' || state.pending.command.kind !== step.command.kind ||
        canonical(state.pending.command) !== canonical(step.command) ||
        state.pending.requestId !== `${state.cursor.eventId}/${state.cursor.pc}/${state.nextRequest}`) fail('STATE_PENDING');
    } else if (state.pending) fail('STATE_PENDING');
  } else if (state.pending) fail('STATE_PENDING');
}
/** A command commits at each pause/end. A failed RESOLVE leaves the pending checkpoint untouched. */
export function dispatchControlledEvent(content: ResolvedControlledEventContent, previous: ControlledEventState,
  action: ControlledEventAction, budget = 1000): { state: ControlledEventState; notices: ControlledEventNotice[] } {
  validateControlledEventState(content, previous);
  if (!Number.isInteger(budget) || budget < 1 || budget > 10000) fail('BUDGET');
  const state = structuredClone(previous), notices: ControlledEventNotice[] = [];
  if (action.type === 'START') {
    if (state.cursor || !Object.hasOwn(content.data.events, action.eventId)) fail('START');
    state.cursor = { eventId: action.eventId, pc: 0, waiting: 'dialogue' };
  } else if (action.type === 'CONTINUE') {
    if (!state.cursor || state.cursor.waiting !== 'dialogue') fail('CONTINUE');
    state.cursor.pc++;
  } else if (action.type === 'CHOOSE') {
    if (!state.cursor || state.cursor.waiting !== 'choice') fail('CHOOSE');
    const step = content.data.events[state.cursor.eventId]!.steps[state.cursor.pc]!;
    if (step.op !== 'choice') fail('CURSOR');
    const option = step.options.find(item => item.id === action.optionId);
    if (!option) fail('OPTION');
    state.cursor.pc = option.target;
  } else if (action.type === 'RESOLVE') {
    if (!state.cursor || state.cursor.waiting !== 'external' || !state.pending) fail('RESOLVE');
    if (!validResult(action.result)) fail('RESULT_SCHEMA');
    if (action.result.requestId !== state.pending.requestId || action.result.kind !== state.pending.command.kind) fail('RESULT_MISMATCH');
    const step = content.data.events[state.cursor.eventId]!.steps[state.cursor.pc]!;
    if (step.op !== 'invoke') fail('CURSOR');
    const resultId = action.result.kind === 'selection' ? action.result.selectedId : action.result.outcome;
    const outcome = step.outcomes.find(row => row.id === resultId);
    if (!outcome) fail('RESULT_OUTCOME');
    if (outcome.plan) {
      const applied = applyDecisionPlan(content.data.decision, state.decision, outcome.plan, budget);
      state.decision = applied.state;
      if (applied.changes.length) notices.push({ type: 'DECISION_APPLIED', changes: applied.changes });
    }
    if (step.command.kind === 'transition') state.location = structuredClone(step.command.destination);
    state.pending = null;
    state.cursor.pc = outcome.target;
  } else if (action.type === 'USE_ITEM') {
    // Host item-menu selection between events: writes the declared current-item ref. The
    // original does not consume the item here; consumption is an effect of the event script.
    if (state.cursor) fail('USE_ITEM_BUSY');
    const target = content.data.currentItem;
    if (!target) fail('NO_CURRENT_ITEM');
    if (!Number.isInteger(action.itemId)) fail('USE_ITEM_VALUE');
    const applied = applyDecisionTransaction(content.data.decision, state.decision,
      { schemaVersion: 1, guards: [], effects: [{ op: 'set', target, value: { kind: 'literal', value: action.itemId } }] }, budget);
    state.decision = applied.state;
    if (applied.changes.length) notices.push({ type: 'DECISION_APPLIED', changes: applied.changes });
  } else fail('ACTION');
  for (let count = 0; state.cursor; count++) {
    if (count >= budget) fail('BUDGET');
    const cursor = state.cursor;
    const step = content.data.events[cursor.eventId]?.steps[cursor.pc];
    if (!step) fail('PC');
    if (step.op === 'say') { cursor.waiting = 'dialogue'; notices.push({ type: 'DIALOGUE', id: step.dialogueId }); break; }
    if (step.op === 'choice') { cursor.waiting = 'choice'; notices.push({ type: 'CHOICE', id: cursor.eventId }); break; }
    if (step.op === 'invoke') {
      if (state.nextRequest >= 1000000000) fail('REQUEST_LIMIT');
      state.nextRequest++;
      state.pending = { schemaVersion: 1, requestId: `${cursor.eventId}/${cursor.pc}/${state.nextRequest}`,
        command: structuredClone(step.command) };
      cursor.waiting = 'external';
      notices.push({ type: 'REQUEST', request: structuredClone(state.pending) }); break;
    }
    if (step.op === 'decide') {
      const applied = applyDecisionPlan(content.data.decision, state.decision, step.plan, budget - count);
      state.decision = applied.state;
      if (applied.changes.length) notices.push({ type: 'DECISION_APPLIED', changes: applied.changes });
      cursor.pc++;
    } else if (step.op === 'branch') {
      const target = evaluateDecision(content.data.decision, state.decision, step.condition, budget - count) ? step.yes : step.no;
      cursor.pc = target;
    } else if (step.op === 'roll') {
      const result = nextRandom(state.rngState);
      const total = step.outcomes.reduce((sum, outcome) => sum + outcome.weight, 0);
      let point = Math.floor(result.value * total);
      const selected = step.outcomes.find(outcome => { point -= outcome.weight; return point < 0; });
      if (!selected) fail('ROLL');
      state.rngState = result.seed;
      if (selected.plan) {
        const applied = applyDecisionPlan(content.data.decision, state.decision, selected.plan, budget - count);
        state.decision = applied.state;
        if (applied.changes.length) notices.push({ type: 'DECISION_APPLIED', changes: applied.changes });
      }
      cursor.pc = selected.target;
    } else if (step.op === 'end') { state.cursor = null; notices.push({ type: 'EVENT_ENDED' }); }
  }
  validateControlledEventState(content, state);
  return { state, notices };
}
export function serializeControlledEventSave(content: ResolvedControlledEventContent, state: ControlledEventState): string {
  validateControlledEventState(content, state);
  const save = { schemaVersion: 3, runtimeVersion: '0.3.0', content: content.identity, state };
  return canonical(save);
}
export function restoreControlledEventSave(content: ResolvedControlledEventContent, raw: string): ControlledEventState {
  if (typeof raw !== 'string' || raw.length > 8_000_000) fail('SAVE_LIMIT');
  let save: unknown;
  try { save = JSON.parse(raw); } catch { fail('SAVE_JSON'); }
  if (!validSave(save)) fail('SAVE_SCHEMA');
  const value = save as { content: ResolvedControlledEventContent['identity']; state: ControlledEventState };
  if (canonical(value.content) !== canonical(content.identity)) fail('CONTENT_MISMATCH');
  validateControlledEventState(content, value.state);
  return structuredClone(value.state);
}
