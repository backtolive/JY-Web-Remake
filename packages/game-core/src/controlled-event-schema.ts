import { decisionDomainsSchema, decisionStateSchema, decisionPlanSchema, decisionConditionSchema,
  decisionEffectSchema } from './decision-schema.ts';
import { decisionEventContentSchema } from './decision-event-schema.ts';

const id = { type: 'string', pattern: '^[a-z][a-z0-9.-]*:[a-z0-9][a-z0-9._/-]*$', maxLength: 160 };
const object = (properties: Record<string, unknown>, required = Object.keys(properties)) =>
  ({ type: 'object', properties, required, additionalProperties: false });
const array = (items: unknown, maxItems = 10000) => ({ type: 'array', items, maxItems });
const location = object({ mapId: id, x: { type: 'integer', minimum: 0 }, y: { type: 'integer', minimum: 0 } });
/** Transition destination: location + optional sceneId written to the sceneTransition ref. */
const transitionDestination = { ...location, properties: { ...location.properties,
  sceneId: { type: 'integer', minimum: 0, maximum: 1_000_000 } } };
/** Static reference to the "currently used item" state; target of the USE_ITEM host command. */
const currentItemRef = { $ref: `${decisionStateSchema.$id}#/definitions/reference` };
/** Equipment state declaration: domain name + key template per binding. Templates use
 * {role}/{slot}/{item} placeholders substituted at dispatch; keys must land in allowedKeys. */
const equipmentBinding = object({ domain: id, key: { type: 'string', minLength: 1, maxLength: 160 } });
/** CanEquip threshold: a single declared `Need*` value (Community Implementation, kys_main.pas
 * CanEquip). Positive = the role attribute must be >= value; negative = <= -value (a cap).
 * mpType is the MP-nature rule (both < 2 must match), not a signed threshold. */
const canEquip = {
  type: 'object',
  properties: {
    mp: { type: 'integer', minimum: -1_000_000, maximum: 1_000_000 },
    attack: { type: 'integer', minimum: -1_000_000, maximum: 1_000_000 },
    speed: { type: 'integer', minimum: -1_000_000, maximum: 1_000_000 },
    aptitude: { type: 'integer', minimum: -1_000_000, maximum: 1_000_000 },
    mpType: { type: 'integer', minimum: 0, maximum: 1_000_000 },
    // Skill/knowledge attributes (kys_type.pas TItem Need* fields).
    usePoi: { type: 'integer', minimum: -1_000_000, maximum: 1_000_000 },
    medicine: { type: 'integer', minimum: -1_000_000, maximum: 1_000_000 },
    medPoi: { type: 'integer', minimum: -1_000_000, maximum: 1_000_000 },
    fist: { type: 'integer', minimum: -1_000_000, maximum: 1_000_000 },
    sword: { type: 'integer', minimum: -1_000_000, maximum: 1_000_000 },
    knife: { type: 'integer', minimum: -1_000_000, maximum: 1_000_000 },
    unusual: { type: 'integer', minimum: -1_000_000, maximum: 1_000_000 },
    hidWeapon: { type: 'integer', minimum: -1_000_000, maximum: 1_000_000 },
    // OnlyPracRole (kys_type.pas TItem@136): if >= 0, only that role can equip (overrides all).
    onlyPracRole: { type: 'integer', minimum: -1, maximum: 1_000_000 },
    // Magic (kys_type.pas TItem@72): magic ID taught by this item; 0 = no magic.
    // If > 0 and the role already has >= 10 magics, the item is rejected.
    magic: { type: 'integer', minimum: 0, maximum: 1_000_000 },
  },
  additionalProperties: false,
};
const equipmentDecl = object({
  slots: equipmentBinding,      // per-role equipment slot: {role}/{slot}
  practice: equipmentBinding,   // per-role practice slot: {role}
  itemUser: equipmentBinding,   // per-item "who uses this": {item}
  // Optional: where each CanEquip role attribute lives, so the engine stays naming-free. The
  // key template uses {role}; it is required only when an item declares canEquip thresholds.
  roleAttributes: {
    type: 'object',
    properties: { mp: equipmentBinding, attack: equipmentBinding, speed: equipmentBinding,
      aptitude: equipmentBinding, mpType: equipmentBinding,
      usePoi: equipmentBinding, medicine: equipmentBinding, medPoi: equipmentBinding,
      fist: equipmentBinding, sword: equipmentBinding, knife: equipmentBinding,
      unusual: equipmentBinding, hidWeapon: equipmentBinding, magicCount: equipmentBinding,
      // Magic level rule (kys_main.pas:4729-4734): per-role magic ID array (10 slots) and
      // per-role magic level array (10 slots). Key template uses {role} and {i} (0..9).
      magicIds: equipmentBinding, magicLevels: equipmentBinding },
    additionalProperties: false,
  },
}, ['slots', 'practice', 'itemUser']);
export const controlledCommandSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#', $id: 'https://jy-web-remake.local/schema/controlled-command-v1.json',
  oneOf: [
    object({ kind: { const: 'battle' }, encounterId: id }),
    object({ kind: { const: 'animation' }, animationId: id }),
    object({ kind: { const: 'transition' }, destination: transitionDestination }),
    object({ kind: { const: 'selection' }, candidates: { ...array(id, 32), minItems: 1 } }),
  ],
};
export const controlledResultSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#', $id: 'https://jy-web-remake.local/schema/controlled-result-v1.json',
  oneOf: [
    object({ schemaVersion: { const: 1 }, requestId: { type: 'string', minLength: 1, maxLength: 256 }, kind: { const: 'battle' }, outcome: { enum: ['victory', 'defeat', 'escape'] } }),
    object({ schemaVersion: { const: 1 }, requestId: { type: 'string', minLength: 1, maxLength: 256 }, kind: { const: 'animation' }, outcome: { const: 'completed' } }),
    object({ schemaVersion: { const: 1 }, requestId: { type: 'string', minLength: 1, maxLength: 256 }, kind: { const: 'transition' }, outcome: { const: 'completed' } }),
    object({ schemaVersion: { const: 1 }, requestId: { type: 'string', minLength: 1, maxLength: 256 }, kind: { const: 'selection' }, selectedId: id }),
  ],
};
const outcome = object({ id: { type: 'string', minLength: 1, maxLength: 160 }, target: { type: 'integer', minimum: 0 },
  plan: { $ref: decisionPlanSchema.$id } }, ['id', 'target']);
/** Static item metadata plus optional declarative use contract. The use layer reuses the
 * decision condition/effect schemas; `useCommand` (script) and the declarative fields are
 * mutually exclusive — one source of truth per item. */
const itemDefinition = object({
  name: { type: 'string', minLength: 1, maxLength: 64 },
  alias: { type: 'string', minLength: 1, maxLength: 64 },
  description: { type: 'string', minLength: 0, maxLength: 512 },
  imageRef: id,
  category: { type: 'string', minLength: 1, maxLength: 64 },
  equipSlot: { type: 'string', minLength: 1, maxLength: 64 },
  canEquip: canEquip,
  stackable: { type: 'boolean' },
  maxStack: { type: 'integer', minimum: 1, maximum: 1_000_000 },
  useDialogueRef: id,
  useConditions: array({ $ref: `${decisionConditionSchema.$id}#/definitions/condition` }, 32),
  useEffects: array({ $ref: `${decisionEffectSchema.$id}#/definitions/effect` }, 32),
  useCommand: id,
}, ['name', 'stackable']);
const weightedOutcome = object({ id: id, target: { type: 'integer', minimum: 0 },
  weight: { type: 'integer', minimum: 1, maximum: 1000000 }, plan: { $ref: decisionPlanSchema.$id } },
  ['id', 'target', 'weight']);
const base = decisionEventContentSchema.properties;
const step = { oneOf: [
  object({ op: { const: 'say' }, dialogueId: id }),
  object({ op: { const: 'choice' }, options: { ...array(object({ id, text: { type: 'string', maxLength: 1024 }, target: { type: 'integer', minimum: 0 } }), 16), minItems: 1 } }),
  object({ op: { const: 'decide' }, plan: { $ref: decisionPlanSchema.$id } }),
  object({ op: { const: 'branch' }, condition: { $ref: decisionConditionSchema.$id },
    yes: { type: 'integer', minimum: 0 }, no: { type: 'integer', minimum: 0 } }),
  object({ op: { const: 'invoke' }, command: { $ref: controlledCommandSchema.$id }, outcomes: { ...array(outcome, 32), minItems: 1 } }),
  object({ op: { const: 'roll' }, outcomes: { ...array(weightedOutcome, 32), minItems: 1 } }),
  object({ op: { const: 'end' } }),
] };
export const controlledEventContentSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#', $id: 'https://jy-web-remake.local/schema/controlled-event-content-v3.json',
  ...object({ ...base, schemaVersion: { const: 3 }, decision: { $ref: decisionDomainsSchema.$id },
    events: { type: 'object', propertyNames: id, additionalProperties: object({ steps: { ...array(step), minItems: 1 } }), maxProperties: 10000 },
    // Optional: content without item definitions remains valid.
    items: { type: 'object', propertyNames: id, additionalProperties: itemDefinition, maxProperties: 100000 },
    // Optional: declares which decision ref the USE_ITEM host command writes to.
    currentItem: currentItemRef,
    // Optional: equipment/practice state for the EQUIP/PRACTICE host commands.
    equipment: equipmentDecl,
    // Optional: where the current scene ID lives; written when a transition resolves.
    sceneTransition: currentItemRef,
    // Optional: scene slot → event ID mapping (ALLDEF.GRP field 0). Read-only reference
    // for simulating NPC interactions in the preview. Keys are "scene/slot" strings.
    sceneSlots: { type: 'object', propertyNames: { type: 'string', pattern: '^\\d+/\\d+$' },
      additionalProperties: { type: 'integer', minimum: 0, maximum: 10000 }, maxProperties: 20000 },
    // Optional: per-role magic ID and level arrays (RANGER.GRP role table). Read-only
    // reference for seeding the CanEquip magic level rule. Keys are role ID strings.
    roleMagic: { type: 'object', propertyNames: { type: 'string', pattern: '^\\d+$' },
      additionalProperties: object({
        magicIds: { ...array({ type: 'integer', minimum: -1, maximum: 1_000_000 }, 10) },
        magicLevels: { ...array({ type: 'integer', minimum: -1, maximum: 1_000_000 }, 10) },
      }, ['magicIds', 'magicLevels']), maxProperties: 400 },
    // Optional: per-role base attributes (RANGER.GRP community TRole offsets). Read-only
    // seed for the character attribute panel. Keys are role ID strings.
    roleAttributes: { type: 'object', propertyNames: { type: 'string', pattern: '^\\d+$' },
      additionalProperties: object({
        level: { type: 'integer', minimum: -1, maximum: 1_000_000 },
        currentHp: { type: 'integer', minimum: -1, maximum: 1_000_000 },
        maxHp: { type: 'integer', minimum: -1, maximum: 1_000_000 },
        currentMp: { type: 'integer', minimum: -1, maximum: 1_000_000 },
        maxMp: { type: 'integer', minimum: -1, maximum: 1_000_000 },
        attack: { type: 'integer', minimum: -1, maximum: 1_000_000 },
        speed: { type: 'integer', minimum: -1, maximum: 1_000_000 },
        aptitude: { type: 'integer', minimum: -1, maximum: 1_000_000 },
      }, ['level', 'currentHp', 'maxHp', 'currentMp', 'maxMp', 'attack', 'speed', 'aptitude']),
      maxProperties: 400 } },
    ['schemaVersion', 'id', 'version', 'classification', 'entry', 'decision', 'dialogues', 'events']),
};
const request = object({ schemaVersion: { const: 1 }, requestId: { type: 'string', minLength: 1, maxLength: 256 },
  command: { $ref: controlledCommandSchema.$id } });
const cursor = { anyOf: [{ type: 'null' }, object({ eventId: id, pc: { type: 'integer', minimum: 0 },
  waiting: { enum: ['dialogue', 'choice', 'external'] } })] };
export const controlledEventSaveSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#', $id: 'https://jy-web-remake.local/schema/controlled-event-save-v3.json',
  ...object({ schemaVersion: { const: 3 }, runtimeVersion: { const: '0.3.0' },
    content: object({ id: base.id, version: { type: 'string' }, sha256: { type: 'string', pattern: '^[a-f0-9]{64}$' } }),
    state: object({ schemaVersion: { const: 2 }, location, decision: { $ref: decisionStateSchema.$id },
      cursor, rngState: { type: 'integer', minimum: 1, maximum: 0xffffffff },
      nextRequest: { type: 'integer', minimum: 0, maximum: 1000000000 },
      pending: { anyOf: [{ type: 'null' }, request] } }) }),
};
