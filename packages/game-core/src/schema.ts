const id = { type: 'string', pattern: '^[a-z][a-z0-9.-]*:[a-z0-9][a-z0-9._/-]*$', maxLength: 160 };
const integer = { type: 'integer', minimum: 0, maximum: 1_000_000 };
const text = { type: 'string', maxLength: 16384 };
const object = (properties: Record<string, unknown>, required = Object.keys(properties)) =>
  ({ type: 'object', properties, required, additionalProperties: false });
const array = (items: unknown, maxItems = 10000) => ({ type: 'array', items, maxItems });
const ref = (name: string) => ({ $ref: `#/definitions/${name}` });
const op = (name: string, properties: Record<string, unknown> = {}) => object({ op: { const: name }, ...properties });

export const contentSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#', $id: 'https://jy-web-remake.local/schema/content-v1.json',
  ...object({
    manifest: object({ id: { type: 'string', pattern: '^[a-z][a-z0-9.-]*$', maxLength: 80 },
      version: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+$', maxLength: 32 }, schemaVersion: { const: 1 },
      runtimeVersion: { const: '0.1.0' }, kind: { enum: ['base', 'mod'] }, classification: { enum: ['mock', 'original-derived'] },
      license: { type: 'string', minLength: 1, maxLength: 1024 }, ruleset: { type: 'string', minLength: 1, maxLength: 160 },
      priority: { type: 'integer', minimum: -10000, maximum: 10000 },
      dependencies: array(object({ id: { type: 'string', pattern: '^[a-z][a-z0-9.-]*$' },
        version: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+$' } }), 128) }),
    entry: object({ mapId: id, x: integer, y: integer }), maps: array(ref('map'), 256),
    dialogues: array(object({ id, text, speaker: text })), events: array(object({ id, steps: { ...array(ref('step'), 10000), minItems: 1 } })),
    items: array(object({ id, name: text, description: { ...text, maxLength: 2000 } }, ['id', 'name'])), patches: array(object({ target: id, expectedText: text, text }), 1000),
  }, ['manifest', 'maps', 'dialogues', 'events', 'items', 'patches']),
  definitions: {
    condition: { oneOf: [op('flag', { key: id, equals: { type: 'boolean' } }),
      op('itemAtLeast', { itemId: id, count: integer }),
      object({ op: { enum: ['all', 'any'] }, conditions: { ...array(ref('condition'), 32), minItems: 1 } }),
      op('not', { condition: ref('condition') })] },
    step: { oneOf: [op('say', { dialogueId: id }), op('setFlag', { key: id, value: { type: 'boolean' } }),
      op('giveItem', { itemId: id, amount: { type: 'integer', minimum: -100000, maximum: 100000, not: { const: 0 } } }),
      op('if', { condition: ref('condition'), onTrue: integer, onFalse: integer }),
      op('choice', { options: { ...array(object({ text, target: integer }), 16), minItems: 1 } }), op('end')] },
    map: object({ id, name: text, width: { type: 'integer', minimum: 1, maximum: 512 },
      height: { type: 'integer', minimum: 1, maximum: 512 }, blocked: array(integer, 262144),
      npcs: array(object({ id, x: integer, y: integer, eventId: id }), 1000),
      portals: array(object({ x: integer, y: integer, mapId: id, toX: integer, toY: integer }), 1000) }),
  },
};

const state = object({ mapId: id, x: integer, y: integer,
  rngState: { type: 'integer', minimum: 1, maximum: 0xffffffff },
  flags: { type: 'object', propertyNames: id, additionalProperties: { type: 'boolean' }, maxProperties: 10000 },
  inventory: { type: 'object', propertyNames: id, additionalProperties: integer, maxProperties: 10000 },
  cursor: { anyOf: [{ type: 'null' }, object({ eventId: id, pc: integer, waiting: { enum: ['dialogue', 'choice', null] } })] },
});
export const saveSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#', $id: 'https://jy-web-remake.local/schema/save-v1.json',
  ...object({ schemaVersion: { const: 1 }, runtimeVersion: { const: '0.1.0' },
    content: array(object({ id: { type: 'string' }, version: { type: 'string' },
      sha256: { type: 'string', pattern: '^[a-f0-9]{64}$' }, kind: { enum: ['base', 'mod'] }, priority: { type: 'integer' } }), 128),
    settings: { type: 'object', maxProperties: 128, propertyNames: { type: 'string', pattern: '^[a-z][a-z0-9._-]*$' },
      additionalProperties: { anyOf: [{ type: 'string', maxLength: 1024 }, { type: 'boolean' }, { type: 'number' }] } }, state }),
};
export const stateSchema = { $schema: 'http://json-schema.org/draft-07/schema#', ...state };
