/** Versioned external-command event slice. The host reports outcomes; content owns state effects. */
import { Ajv } from 'ajv';
import { canonical, contentHash } from './content.ts';
import { nextRandom } from './runtime.ts';
import { applyDecisionPlan, applyDecisionTransaction, createDecisionState, evaluateDecision, readDecisionValue, validateDecisionState } from './decision.ts';
import type { DecisionPlan, DecisionSchema, DecisionState, DecisionChange, DecisionCondition, DecisionEffect,
  DecisionRef } from './decision.ts';
import { decisionDomainsSchema, decisionStateSchema, decisionPlanSchema, decisionConditionSchema,
  decisionEffectSchema } from './decision-schema.ts';
import { controlledCommandSchema, controlledResultSchema, controlledEventContentSchema,
  controlledEventSaveSchema } from './controlled-event-schema.ts';

export type ControlledCommand = { kind: 'battle'; encounterId: string } |
  { kind: 'animation'; animationId: string } |
  { kind: 'transition'; destination: { mapId: string; x: number; y: number; sceneId?: number } } |
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
  /** CanEquip thresholds (Community Implementation, kys_main.pas CanEquip). A positive value
   * requires the role attribute >= value; a negative value caps it at -value. `mpType` is the
   * MP-nature rule (both < 2 must match). The engine reads the role attribute via the
   * equipment declaration's roleAttributes binding; it keeps no naming of its own. */
  canEquip?: { mp?: number; attack?: number; speed?: number; aptitude?: number; mpType?: number;
    usePoi?: number; medicine?: number; medPoi?: number; fist?: number; sword?: number;
    knife?: number; unusual?: number; hidWeapon?: number;
    /** If >= 0, only that role can equip (overrides all other checks). */
    onlyPracRole?: number;
    /** Magic ID taught by this item; 0 = no magic. If > 0 and role has >= 10 magics, reject. */
    magic?: number };
  stackable: boolean; maxStack?: number;
  useDialogueRef?: string; useConditions?: DecisionCondition[]; useEffects?: DecisionEffect[]; useCommand?: string;
}
/** One declared equipment state binding: a domain plus a key template whose {role}/{slot}/{item}
 * placeholders are substituted at dispatch. Substituted keys must land in the domain's allowedKeys. */
export interface EquipmentBinding { domain: string; key: string }
/** Equipment/practice state for the EQUIP/PRACTICE host commands. The original (community Pascal
 * UseItem) writes the per-role slot and the per-item "user" binding; the content declares where
 * each lives, the engine keeps zero naming conventions. */
export interface EquipmentDeclaration {
  /** Per-role equipment slot (Pascal Rrole[r].Equip[p]); template uses {role} and {slot}. */
  slots: EquipmentBinding;
  /** Per-role practiced manual (Pascal Rrole[r].PracticeMagic); template uses {role}. */
  practice: EquipmentBinding;
  /** Per-item "currently used by role" (Pascal Ritem[i].User); template uses {item}. */
  itemUser: EquipmentBinding;
  /** Where each CanEquip role attribute lives (template uses {role}). Required only when an
   * item declares canEquip thresholds; the engine stays naming-free. */
  roleAttributes?: { mp?: EquipmentBinding; attack?: EquipmentBinding; speed?: EquipmentBinding;
    aptitude?: EquipmentBinding; mpType?: EquipmentBinding;
    usePoi?: EquipmentBinding; medicine?: EquipmentBinding; medPoi?: EquipmentBinding;
    fist?: EquipmentBinding; sword?: EquipmentBinding; knife?: EquipmentBinding;
    unusual?: EquipmentBinding; hidWeapon?: EquipmentBinding; magicCount?: EquipmentBinding };
}
export interface ControlledEventContent {
  schemaVersion: 3; id: string; version: string; classification: 'mock' | 'original-derived';
  entry: { mapId: string; x: number; y: number }; decision: DecisionSchema;
  dialogues: Record<string, { speaker: string; text: string }>;
  events: Record<string, { steps: Step[] }>;
  items?: Record<string, ItemDefinition>;
  currentItem?: DecisionRef;
  equipment?: EquipmentDeclaration;
  /** Where the current scene ID lives; written when a transition command resolves.
   * The engine stays naming-free: content declares the domain + key. */
  sceneTransition?: DecisionRef;
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
  { type: 'USE_ITEM'; itemId: number } |
  /** Host equipment selection (Pascal UseItem type 1): writes the per-role slot and the
   * per-item user binding. Slot comes from the host (item EquipType, clamped 0..1). */
  { type: 'EQUIP'; itemId: number; role: number; slot: number } |
  /** Host practice selection (Pascal UseItem type 2): writes the per-role practice slot and
   * the per-item user binding. */
  { type: 'PRACTICE'; itemId: number; role: number };
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
/** Substitute {role}/{slot}/{item} placeholders in a declared key template and verify the
 * concrete key is permitted by the target domain. */
function substituteKey(template: string, values: Record<string, number>, binding: string,
  domains: Record<string, { allowedKeys: string[] }>, domain: string): string {
  const key = template.replace(/\{([a-z]+)\}/g, (match, name) => {
    const value = values[name] ?? -1;
    if (!Number.isInteger(value) || value < 0) fail('EQUIPMENT_TEMPLATE', binding);
    return String(value);
  });
  if (!domains[domain]?.allowedKeys.includes(key)) fail('EQUIPMENT_KEY', binding);
  return key;
}
/** CanEquip gate (Community Implementation, kys_main.pas CanEquip). A positive threshold
 * requires the role attribute >= value; a negative one caps it at -value. `mpType` is the
 * MP-nature rule (both < 2 must match). Reads the role attribute via the declared binding so
 * the engine keeps no naming of its own; an item with thresholds but no binding is a content
 * error (EQUIP_NO_ATTRIBUTES). */
function canEquipGate(schema: DecisionSchema, state: DecisionState, declaration: EquipmentDeclaration,
  item: ItemDefinition | undefined, role: number): void {
  const canEquip = item?.canEquip;
  if (!canEquip) return;
  const attrs = declaration.roleAttributes;
  if (!attrs) fail('EQUIP_NO_ATTRIBUTES');
  const readAttr = (attr: string): number => {
    const binding = attrs[attr as keyof typeof attrs];
    if (!binding) return 0;
    const key = substituteKey(binding.key, { role }, `roleAttributes.${attr}`, schema.domains, binding.domain);
    return readDecisionValue(schema, state, { domain: binding.domain, key }) as number;
  };
  for (const attr of ['mp', 'attack', 'speed', 'aptitude', 'usePoi', 'medicine', 'medPoi',
    'fist', 'sword', 'knife', 'unusual', 'hidWeapon'] as const) {
    const need = canEquip[attr];
    if (typeof need !== 'number') continue;
    const value = readAttr(attr);
    if (need >= 0 ? value < need : value > -need) fail('EQUIP_CONDITION', attr);
  }
  const mpType = canEquip.mpType;
  if (typeof mpType === 'number') {
    const value = readAttr('mpType');
    if (value < 2 && mpType < 2 && value !== mpType) fail('EQUIP_CONDITION', 'mpType');
  }
  // OnlyPracRole (kys_main.pas:4714-4718): if >= 0, overrides all previous checks.
  // The role must match; a match forces pass, a mismatch forces fail.
  const onlyPracRole = canEquip.onlyPracRole;
  if (typeof onlyPracRole === 'number' && onlyPracRole >= 0) {
    if (role !== onlyPracRole) fail('EQUIP_CONDITION', 'onlyPracRole');
    return; // Match: all previous checks are void, pass.
  }
  // Magic count (kys_main.pas:4720-4726): if the item teaches a magic (Magic > 0)
  // and the role already has >= 10 magics, reject.
  const magic = canEquip.magic;
  if (typeof magic === 'number' && magic > 0) {
    const count = readAttr('magicCount');
    if (count >= 10) fail('EQUIP_CONDITION', 'magicCount');
  }
}
/** Mutual unbinding (Community Implementation, kys_main.pas UseItem type 1/2): before the new
 * binding, clear the target slot of the item's previous user and clear the user of the slot's
 * previous item. Structural invariant of the equipment binding — applied atomically with the
 * two writes, not per-item content. Reads the current (pre-write) values. */
function unbindingEffects(schema: DecisionSchema, state: DecisionState, declaration: EquipmentDeclaration,
  binding: EquipmentBinding, slotKey: string, userKey: string, role: number, slot: number, itemId: number): DecisionEffect[] {
  const effects: DecisionEffect[] = [];
  const prevUser = readDecisionValue(schema, state, { domain: declaration.itemUser.domain, key: userKey }) as number;
  if (Number.isInteger(prevUser) && prevUser >= 0) {
    const prevSlotKey = substituteKey(binding.key, { role: prevUser, slot, item: itemId },
      binding === declaration.practice ? 'practice' : 'slots', schema.domains, binding.domain);
    effects.push({ op: 'set', target: { domain: binding.domain, key: prevSlotKey }, value: { kind: 'literal', value: -1 } });
  }
  const prevItem = readDecisionValue(schema, state, { domain: binding.domain, key: slotKey }) as number;
  if (Number.isInteger(prevItem) && prevItem >= 0) {
    const prevItemUserKey = substituteKey(declaration.itemUser.key, { role, item: prevItem },
      'itemUser', schema.domains, declaration.itemUser.domain);
    effects.push({ op: 'set', target: { domain: declaration.itemUser.domain, key: prevItemUserKey }, value: { kind: 'literal', value: -1 } });
  }
  return effects;
}
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
  if (data.sceneTransition) {
    const domain = data.decision.domains[data.sceneTransition.domain];
    if (!domain) fail('SCENE_TRANSITION_DOMAIN');
    if (data.sceneTransition.keyFrom?.length || data.sceneTransition.key === undefined) fail('SCENE_TRANSITION_REF');
    if (!domain.allowedKeys.includes(data.sceneTransition.key)) fail('SCENE_TRANSITION_REF');
  }
  if (data.equipment) {
    const checkBinding = (binding: string, row: EquipmentBinding, allowed: string[]) => {
      if (!row || !data.decision.domains[row.domain]) fail('EQUIPMENT_DOMAIN', binding);
      for (const match of row.key.matchAll(/\{([a-z]+)\}/g))
        if (!allowed.includes(match[1] ?? '')) fail('EQUIPMENT_TEMPLATE', binding);
    };
    checkBinding('slots', data.equipment.slots, ['role', 'slot']);
    checkBinding('practice', data.equipment.practice, ['role']);
    checkBinding('itemUser', data.equipment.itemUser, ['item']);
    for (const [attr, row] of Object.entries(data.equipment.roleAttributes ?? {}))
      checkBinding(`roleAttributes.${attr}`, row, ['role']);
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
    if (step.command.kind === 'transition') {
      // Write the current scene ID to the declared ref (content declares where it lives).
      const sceneRef = content.data.sceneTransition;
      const sceneId = step.command.destination.sceneId;
      if (sceneRef && typeof sceneId === 'number') {
        const applied = applyDecisionTransaction(content.data.decision, state.decision,
          { schemaVersion: 1, guards: [], effects: [
            { op: 'set', target: sceneRef, value: { kind: 'literal', value: sceneId } },
          ] }, budget);
        state.decision = applied.state;
        if (applied.changes.length) notices.push({ type: 'DECISION_APPLIED', changes: applied.changes });
      }
      // Location state excludes sceneId (it's a decision-state concern, not a location field).
      const { sceneId: _omit, ...dest } = step.command.destination;
      state.location = structuredClone(dest);
    }
    state.pending = null;
    state.cursor.pc = outcome.target;
  } else if (action.type === 'USE_ITEM' || action.type === 'EQUIP' || action.type === 'PRACTICE') {
    // Host item/equipment/practice menu selection between events: the menu is closed while an
    // event runs. The original does not consume the item here; consumption is an effect of the
    // event script (Pascal UseItem writes CurItem, then the per-role slot + per-item user).
    if (state.cursor) fail('USE_ITEM_BUSY');
    if (action.type === 'USE_ITEM') {
      const target = content.data.currentItem;
      if (!target) fail('NO_CURRENT_ITEM');
      if (!Number.isInteger(action.itemId)) fail('USE_ITEM_VALUE');
      const applied = applyDecisionTransaction(content.data.decision, state.decision,
        { schemaVersion: 1, guards: [], effects: [{ op: 'set', target, value: { kind: 'literal', value: action.itemId } }] }, budget);
      state.decision = applied.state;
      if (applied.changes.length) notices.push({ type: 'DECISION_APPLIED', changes: applied.changes });
    } else {
      const declaration = content.data.equipment;
      if (!declaration) fail('NO_EQUIPMENT');
      if (!Number.isInteger(action.itemId) || !Number.isInteger(action.role) ||
        (action.type === 'EQUIP' && !Number.isInteger(action.slot))) fail('EQUIPMENT_VALUE');
      const slot = action.type === 'EQUIP' ? action.slot : 0;
      const binding = action.type === 'EQUIP' ? declaration.slots : declaration.practice;
      const slotKey = substituteKey(binding.key, { role: action.role, slot, item: action.itemId },
        action.type, content.data.decision.domains, binding.domain);
      const userKey = substituteKey(declaration.itemUser.key, { role: action.role, item: action.itemId },
        'itemUser', content.data.decision.domains, declaration.itemUser.domain);
      // CanEquip gate: content-declared thresholds (RANGER Need*) checked against the role's
      // live attributes. Fails before any state change (Pascal CanEquip guards the write).
      const itemDefinition = content.data.items?.[`${content.data.id}:item/${action.itemId}`];
      canEquipGate(content.data.decision, state.decision, declaration, itemDefinition, action.role);
      // Mutual unbinding (structural invariant) + the two writes, applied atomically.
      const effects: DecisionEffect[] = [
        ...unbindingEffects(content.data.decision, state.decision, declaration, binding, slotKey, userKey,
          action.role, slot, action.itemId),
        { op: 'set', target: { domain: binding.domain, key: slotKey }, value: { kind: 'literal', value: action.itemId } },
        { op: 'set', target: { domain: declaration.itemUser.domain, key: userKey }, value: { kind: 'literal', value: action.role } },
      ];
      const applied = applyDecisionTransaction(content.data.decision, state.decision, { schemaVersion: 1, guards: [], effects }, budget);
      state.decision = applied.state;
      if (applied.changes.length) notices.push({ type: 'DECISION_APPLIED', changes: applied.changes });
    }
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
