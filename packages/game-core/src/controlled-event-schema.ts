import { decisionDomainsSchema, decisionStateSchema, decisionPlanSchema, decisionConditionSchema,
  decisionEffectSchema } from './decision-schema.ts';
import { decisionEventContentSchema } from './decision-event-schema.ts';

const id = { type: 'string', pattern: '^[a-z][a-z0-9.-]*:[a-z0-9][a-z0-9._/-]*$', maxLength: 160 };
const object = (properties: Record<string, unknown>, required = Object.keys(properties)) =>
  ({ type: 'object', properties, required, additionalProperties: false });
const array = (items: unknown, maxItems = 10000) => ({ type: 'array', items, maxItems });
const location = object({ mapId: id, x: { type: 'integer', minimum: 0 }, y: { type: 'integer', minimum: 0 } });
export const controlledCommandSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#', $id: 'https://jy-web-remake.local/schema/controlled-command-v1.json',
  oneOf: [
    object({ kind: { const: 'battle' }, encounterId: id }),
    object({ kind: { const: 'animation' }, animationId: id }),
    object({ kind: { const: 'transition' }, destination: location }),
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
    items: { type: 'object', propertyNames: id, additionalProperties: itemDefinition, maxProperties: 100000 } },
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
