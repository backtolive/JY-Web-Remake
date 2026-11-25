import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveControlledEventContent } from '../../packages/game-core/src/controlled-event.ts';
import { decisionEffectSchema } from '../../packages/game-core/src/decision-schema.ts';

const lit = value => ({ kind: 'literal', value });
const base = {
  schemaVersion: 3, id: 'mock', version: '1.0.0', classification: 'mock',
  entry: { mapId: 'mock:map/start', x: 0, y: 0 },
  decision: { schemaVersion: 1, domains: {
    'mock:inventory': { kind: 'integer', default: 0, min: 0, max: 99, allowedKeys: ['mock:item/potion'] },
    'mock:flags': { kind: 'boolean', default: false, allowedKeys: ['mock:quest/won'] },
  } },
  dialogues: { 'mock:dialogue/use': { speaker: 'Narrator', text: 'Used the potion.' } },
  events: { 'mock:event/use-flow': { steps: [
    { op: 'say', dialogueId: 'mock:dialogue/use' },
    { op: 'end' },
  ] } },
};
const withItems = items => ({ ...base, items });

test('Static-only item definitions resolve (original-derived style)', async () => {
  const content = await resolveControlledEventContent(withItems({
    'mock:item/potion': { name: 'Potion', alias: 'Healing potion', description: 'Restores some HP.',
      stackable: true, category: 'consumable' },
  }));
  assert.equal(content.data.items['mock:item/potion'].name, 'Potion');
});

test('Declarative use contract reuses decision condition/effect schemas', async () => {
  const content = await resolveControlledEventContent(withItems({
    'mock:item/potion': { name: 'Potion', stackable: true, maxStack: 9,
      useDialogueRef: 'mock:dialogue/use',
      useConditions: [{ op: 'compare', left: { kind: 'read', ref: { domain: 'mock:inventory', key: 'mock:item/potion' } },
        relation: 'le', right: lit(94) }],
      useEffects: [{ op: 'add', target: { domain: 'mock:inventory', key: 'mock:item/potion' }, amount: lit(-1) },
        { op: 'set', target: { domain: 'mock:flags', key: 'mock:quest/won' }, value: lit(true) }],
    },
  }));
  assert.equal(content.data.items['mock:item/potion'].useEffects.length, 2);
});

test('Script use contract references a controlled event', async () => {
  const content = await resolveControlledEventContent(withItems({
    'mock:item/talisman': { name: 'Talisman', stackable: false, useCommand: 'mock:event/use-flow' },
  }));
  assert.equal(content.data.items['mock:item/talisman'].useCommand, 'mock:event/use-flow');
});

test('Item definition violations are rejected at content resolution', async () => {
  const cases = [
    // useCommand is one source of truth: it cannot coexist with declarative fields.
    [{ 'mock:item/a': { name: 'A', stackable: true, useCommand: 'mock:event/use-flow',
      useEffects: [{ op: 'add', target: { domain: 'mock:inventory', key: 'mock:item/potion' }, amount: lit(1) }] } },
      /ITEM_USE_CONFLICT/],
    [{ 'mock:item/b': { name: 'B', stackable: true, useCommand: 'mock:event/use-flow',
      useConditions: [{ op: 'compare', left: lit(1), relation: 'eq', right: lit(1) }] } },
      /ITEM_USE_CONFLICT/],
    [{ 'mock:item/c': { name: 'C', stackable: false, maxStack: 9 } }, /ITEM_STACK_CONFLICT/],
    [{ 'mock:item/d': { name: 'D', stackable: true, useDialogueRef: 'mock:dialogue/missing' } },
      /ITEM_DIALOGUE_REFERENCE/],
    [{ 'mock:item/e': { name: 'E', stackable: true, useCommand: 'mock:event/missing' } }, /ITEM_EVENT_REFERENCE/],
    // Malformed condition/effect structures are rejected by the content schema itself
    // (the standalone ITEM_CONDITION/ITEM_EFFECT checks are defense in depth).
    [{ 'mock:item/f': { name: 'F', stackable: true,
      useConditions: [{ op: 'bogus' }] } }, /CONTENT_SCHEMA/],
    [{ 'mock:item/g': { name: 'G', stackable: true,
      useEffects: [{ op: 'bogus' }] } }, /CONTENT_SCHEMA/],
    [{ 'other:item/h': { name: 'H', stackable: true } }, /ITEM_NAMESPACE/],
    [{ 'mock:item/i': { name: 'I' } }, /CONTENT_SCHEMA/],
  ];
  for (const [items, pattern] of cases) await assert.rejects(resolveControlledEventContent(withItems(items)), pattern);
});

test('Content without items stays valid; decision-effect schema is exported standalone', async () => {
  await resolveControlledEventContent(base);
  assert.equal(decisionEffectSchema.$id, 'https://jy-web-remake.local/schema/decision-effect-v1.json');
  assert.ok(decisionEffectSchema.definitions.effect);
});
