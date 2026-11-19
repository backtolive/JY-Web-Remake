import { decisionDomainsSchema, decisionStateSchema, decisionPlanSchema } from './decision-schema.ts';

const id = { type: 'string', pattern: '^[a-z][a-z0-9.-]*:[a-z0-9][a-z0-9._/-]*$', maxLength: 160 };
const packageId = { type: 'string', pattern: '^[a-z][a-z0-9.-]*$', maxLength: 80 };
const object = (properties: Record<string, unknown>, required = Object.keys(properties)) =>
  ({ type: 'object', properties, required, additionalProperties: false });
const array = (items: unknown, maxItems = 10000) => ({ type: 'array', items, maxItems });
const step = { oneOf: [
  object({ op: { const: 'say' }, dialogueId: id }),
  object({ op: { const: 'choice' }, options: { ...array(object({ id, text: { type: 'string', maxLength: 1024 }, target: { type: 'integer', minimum: 0 } }), 16), minItems: 1 } }),
  object({ op: { const: 'decide' }, plan: { $ref: decisionPlanSchema.$id } }),
  object({ op: { const: 'end' } }),
] };
const cursor = { anyOf: [{ type: 'null' }, object({ eventId: id, pc: { type: 'integer', minimum: 0 }, waiting: { enum: ['dialogue', 'choice'] } })] };
const location = object({ mapId: id, x: { type: 'integer', minimum: 0 }, y: { type: 'integer', minimum: 0 } });
export const decisionEventContentSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#', $id: 'https://jy-web-remake.local/schema/decision-event-content-v1.json',
  ...object({ schemaVersion: { const: 1 }, id: packageId, version: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+$' },
    classification: { enum: ['mock', 'original-derived'] }, entry: location,
    decision: { $ref: decisionDomainsSchema.$id },
    dialogues: { type: 'object', propertyNames: id, additionalProperties: object({ speaker: { type: 'string', maxLength: 1024 }, text: { type: 'string', maxLength: 16384 } }), maxProperties: 10000 },
    events: { type: 'object', propertyNames: id, additionalProperties: object({ steps: { ...array(step), minItems: 1 } }), maxProperties: 10000 } })
};
export const decisionEventSaveSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#', $id: 'https://jy-web-remake.local/schema/decision-event-save-v2.json',
  ...object({ schemaVersion: { const: 2 }, runtimeVersion: { const: '0.2.0' },
    content: object({ id: packageId, version: { type: 'string' }, sha256: { type: 'string', pattern: '^[a-f0-9]{64}$' } }),
    state: object({ schemaVersion: { const: 1 }, location, decision: { $ref: decisionStateSchema.$id }, cursor }) })
};
