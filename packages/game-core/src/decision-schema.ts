const id = { type: 'string', pattern: '^[a-z][a-z0-9.-]*:[a-z0-9][a-z0-9._/-]*$', maxLength: 160 };
const object = (properties: Record<string, unknown>, required = Object.keys(properties)) =>
  ({ type: 'object', properties, required, additionalProperties: false });
const array = (items: unknown, maxItems = 10000) => ({ type: 'array', items, maxItems });
const ref = (name: string) => ({ $ref: `#/definitions/${name}` });
const op = (name: string, properties: Record<string, unknown>) => object({ op: { const: name }, ...properties });
const keyPart = { oneOf: [
  object({ literal: { type: 'string', minLength: 1, maxLength: 64 } }),
  object({ read: ref('reference') }),
] };
const definitions = {
  value: { oneOf: [
    { type: 'integer', minimum: -1_000_000_000, maximum: 1_000_000_000 },
    { type: 'boolean' }, { type: 'string', maxLength: 1024 },
    array({ type: 'string', maxLength: 160 }),
  ] },
  reference: object({ domain: id, key: id, keyFrom: array(keyPart, 8) }, ['domain']),
  operand: { oneOf: [object({ kind: { const: 'literal' }, value: ref('value') }),
    object({ kind: { const: 'read' }, ref: ref('reference') })] },
  condition: { oneOf: [
    op('compare', { left: ref('operand'), relation: { enum: ['eq', 'ne', 'lt', 'le', 'gt', 'ge'] }, right: ref('operand') }),
    op('contains', { list: ref('operand'), value: ref('operand') }),
    op('listSize', { list: ref('operand'), relation: { enum: ['eq', 'ne', 'lt', 'le', 'gt', 'ge'] }, value: ref('operand') }),
    op('all', { conditions: { ...array(ref('condition'), 32), minItems: 1 } }),
    op('any', { conditions: { ...array(ref('condition'), 32), minItems: 1 } }),
    op('not', { condition: ref('condition') }),
  ] },
  effect: { oneOf: [
    op('set', { target: ref('reference'), value: ref('operand') }),
    op('add', { target: ref('reference'), amount: ref('operand') }),
    op('listAdd', { target: ref('reference'), value: ref('operand') }),
    op('listRemove', { target: ref('reference'), value: ref('operand') }),
    op('patchList', { target: ref('reference'),
      entries: { ...array(object({ index: { type: 'integer', minimum: 0, maximum: 10000 }, value: ref('operand') }), 64), minItems: 1 } }),
    op('require', { condition: ref('condition') }),
  ] },
  domain: object({ kind: { enum: ['integer', 'boolean', 'string', 'list'] }, default: ref('value'),
    min: { type: 'integer', minimum: -1_000_000_000, maximum: 1_000_000_000 },
    max: { type: 'integer', minimum: -1_000_000_000, maximum: 1_000_000_000 },
    maxItems: { type: 'integer', minimum: 0, maximum: 10000 }, unique: { type: 'boolean' },
    allowedKeys: array(id, 100000), allowedValues: array({ type: 'string', maxLength: 160 }, 100000) },
    ['kind', 'default', 'allowedKeys']),
};
const header = { $schema: 'http://json-schema.org/draft-07/schema#', definitions };
export const decisionDomainsSchema = { ...header, $id: 'https://jy-web-remake.local/schema/decision-domains-v1.json',
  ...object({ schemaVersion: { const: 1 },
    domains: { type: 'object', propertyNames: id, additionalProperties: ref('domain'), maxProperties: 128 },
    invariants: array(ref('condition'), 128) }, ['schemaVersion', 'domains']) };
export const decisionStateSchema = { ...header, $id: 'https://jy-web-remake.local/schema/decision-state-v1.json',
  ...object({ schemaVersion: { const: 1 }, revision: { type: 'integer', minimum: 0 },
    values: { type: 'object', propertyNames: id, additionalProperties: {
      type: 'object', propertyNames: id, additionalProperties: ref('value'), maxProperties: 100000,
    }, maxProperties: 128 } }) };
export const decisionTransactionSchema = { ...header, $id: 'https://jy-web-remake.local/schema/decision-transaction-v1.json',
  ...object({ schemaVersion: { const: 1 }, guards: array(ref('condition'), 10000),
    effects: { ...array(ref('effect'), 10000), minItems: 1 } }) };
export const decisionPlanSchema = { ...header, $id: 'https://jy-web-remake.local/schema/decision-plan-v1.json',
  ...object({ schemaVersion: { const: 1 }, cases: array(object({ when: ref('condition'), effects: array(ref('effect'), 10000) }), 64),
    otherwise: array(ref('effect'), 10000) }) };
export const decisionConditionSchema = { ...header, $id: 'https://jy-web-remake.local/schema/decision-condition-v1.json',
  ...ref('condition') };
