import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createDecisionState, applyDecisionTransaction, evaluateDecision,
  applyDecisionPlan, readDecisionValue } from '../../packages/game-core/src/decision.ts';
import { decisionDomainsSchema, decisionStateSchema, decisionTransactionSchema,
  decisionPlanSchema, decisionConditionSchema } from '../../packages/game-core/src/decision-schema.ts';

const schema = { schemaVersion: 1, domains: {
  'mock:inventory': { kind: 'integer', default: 0, min: 0, max: 99, allowedKeys: ['mock:item/medicine'] },
  'mock:stats': { kind: 'integer', default: 0, min: 0, max: 100, allowedKeys: ['mock:hero/attack'] },
  'mock:flags': { kind: 'boolean', default: false, allowedKeys: ['mock:quest/complete'] },
  'mock:party': { kind: 'list', default: [], maxItems: 6, unique: true, allowedKeys: ['mock:active'],
    allowedValues: ['mock:hero', 'mock:companion'] },
  'mock:bindings': { kind: 'string', default: '', allowedKeys: ['mock:scene/32/slot/2'],
    allowedValues: ['', 'mock:event/next', 'mock:event/paid', 'mock:event/insufficient'] },
} };
const ref = (domain, key) => ({ domain: `mock:${domain}`, key: `mock:${key}` });
const literal = value => ({ kind: 'literal', value });
const read = reference => ({ kind: 'read', ref: reference });
const item = ref('inventory', 'item/medicine');
const attack = ref('stats', 'hero/attack');
const joined = ref('party', 'active');
const flag = ref('flags', 'quest/complete');
const binding = ref('bindings', 'scene/32/slot/2');

test('Mock JSON decision combines item, stat, member and flag guards with atomic effects', () => {
  let initial = createDecisionState(schema);
  initial = applyDecisionTransaction(schema, initial, { schemaVersion: 1, guards: [], effects: [
    { op: 'set', target: item, value: literal(3) },
    { op: 'set', target: attack, value: literal(20) },
    { op: 'listAdd', target: joined, value: literal('mock:hero') },
  ] }).state;
  const transaction = JSON.parse(JSON.stringify({ schemaVersion: 1, guards: [
    { op: 'compare', left: read(item), relation: 'ge', right: literal(2) },
    { op: 'contains', list: read(joined), value: literal('mock:hero') },
    { op: 'compare', left: read(attack), relation: 'ge', right: literal(20) },
    { op: 'compare', left: read(flag), relation: 'eq', right: literal(false) },
  ], effects: [
    { op: 'add', target: item, amount: literal(-2) },
    { op: 'listAdd', target: joined, value: literal('mock:companion') },
    { op: 'add', target: attack, amount: literal(5) },
    { op: 'set', target: flag, value: literal(true) },
    { op: 'set', target: binding, value: literal('mock:event/next') },
    { op: 'require', condition: { op: 'compare', left: read(item), relation: 'eq', right: literal(1) } },
  ] }));
  const result = applyDecisionTransaction(schema, initial, transaction);
  assert.equal(result.state.revision, initial.revision + 1);
  assert.equal(readDecisionValue(schema, result.state, item), 1);
  assert.equal(readDecisionValue(schema, initial, item), 3);
  assert.deepEqual(readDecisionValue(schema, result.state, joined), ['mock:hero', 'mock:companion']);
  assert.equal(readDecisionValue(schema, result.state, attack), 25);
  assert.equal(readDecisionValue(schema, result.state, flag), true);
  assert.equal(readDecisionValue(schema, result.state, binding), 'mock:event/next');
  assert.equal(result.changes.length, 5);
  assert.equal(evaluateDecision(schema, result.state,
    { op: 'not', condition: { op: 'compare', left: read(flag), relation: 'eq', right: literal(false) } }), true);
  assert.deepEqual(JSON.parse(JSON.stringify(result.state)), result.state);
  assert.throws(() => evaluateDecision(schema, result.state,
    { op: 'all', conditions: [{ op: 'compare', left: read(flag), relation: 'eq', right: literal(true) }] }, 1),
  /DECISION_BUDGET/);
});

test('Mock decision rejects late failure without changing the previous state', () => {
  const initial = createDecisionState(schema);
  const before = JSON.stringify(initial);
  const tx = effects => ({ schemaVersion: 1, guards: [], effects });
  assert.throws(() => applyDecisionTransaction(schema, initial, tx([
    { op: 'add', target: item, amount: literal(1) },
    { op: 'add', target: item, amount: literal(-2) },
  ])), /DECISION_VALUE_RANGE/);
  assert.throws(() => applyDecisionTransaction(schema, initial, tx([
    { op: 'set', target: flag, value: literal(true) },
    { op: 'require', condition: { op: 'compare', left: read(flag), relation: 'eq', right: literal(false) } },
  ])), /DECISION_REQUIRE/);
  assert.throws(() => applyDecisionTransaction(schema, initial, tx([
    { op: 'listRemove', target: joined, value: literal('mock:absent') },
  ])), /DECISION_LIST_MISSING/);
  assert.throws(() => applyDecisionTransaction(schema, initial, tx([
    { op: 'listAdd', target: joined, value: literal('mock:unknown-person') },
  ])), /DECISION_VALUE_RANGE/);
  assert.throws(() => applyDecisionTransaction(schema, initial, tx([
    { op: 'set', target: binding, value: literal('mock:event/missing') },
  ])), /DECISION_VALUE_RANGE/);
  assert.throws(() => applyDecisionTransaction(schema, initial, tx([
    { op: 'listAdd', target: joined, value: literal('mock:hero') },
    { op: 'listAdd', target: joined, value: literal('mock:hero') },
  ])), /DECISION_LIST_DUPLICATE/);
  assert.throws(() => applyDecisionTransaction(schema, initial, tx([
    { op: 'set', target: ref('unknown', 'some/key'), value: literal(1) },
  ])), /DECISION_DOMAIN/);
  assert.throws(() => applyDecisionTransaction(schema, initial, tx([{ op: 'add', target: item, amount: literal(1) }]), 0), /DECISION_BUDGET/);
  assert.equal(JSON.stringify(initial), before);
});

test('Mock JSON plan selects a branch and keeps its effects in one transaction', () => {
  const initial = applyDecisionTransaction(schema, createDecisionState(schema),
    { schemaVersion: 1, guards: [], effects: [{ op: 'set', target: item, value: literal(2) }] }).state;
  const plan = JSON.parse(JSON.stringify({ schemaVersion: 1, cases: [
    { when: { op: 'compare', left: read(item), relation: 'ge', right: literal(3) },
      effects: [{ op: 'set', target: flag, value: literal(true) }] },
    { when: { op: 'compare', left: read(item), relation: 'ge', right: literal(2) },
      effects: [{ op: 'add', target: item, amount: literal(-2) },
        { op: 'set', target: binding, value: literal('mock:event/paid') }] },
  ], otherwise: [{ op: 'set', target: binding, value: literal('mock:event/insufficient') }] }));
  const result = applyDecisionPlan(schema, initial, plan);
  assert.equal(result.selectedCase, 1);
  assert.equal(readDecisionValue(schema, result.state, item), 0);
  assert.equal(readDecisionValue(schema, result.state, binding), 'mock:event/paid');
  assert.equal(readDecisionValue(schema, initial, item), 2);
  assert.throws(() => applyDecisionPlan(schema, initial, plan, 3), /DECISION_BUDGET/);
});

test('Shared decision schemas reject undeclared JSON fields and restrict declared keys', async () => {
  for (const [name, value] of [
    ['decision-domains.schema.json', decisionDomainsSchema],
    ['decision-state.schema.json', decisionStateSchema],
    ['decision-transaction.schema.json', decisionTransactionSchema],
    ['decision-plan.schema.json', decisionPlanSchema],
    ['decision-condition.schema.json', decisionConditionSchema],
  ]) assert.deepEqual(JSON.parse(await readFile(`schemas/${name}`, 'utf8')), value);
  const initial = createDecisionState(schema);
  assert.throws(() => applyDecisionTransaction(schema, initial,
    { schemaVersion: 1, guards: [], effects: [{ op: 'set', target: flag, value: literal(true), eval: 'x' }] }),
  /DECISION_TRANSACTION_SCHEMA/);
  const limited = structuredClone(schema);
  limited.domains['mock:flags'].allowedKeys = ['mock:quest/complete'];
  assert.throws(() => applyDecisionTransaction(limited, createDecisionState(limited),
    { schemaVersion: 1, guards: [], effects: [{ op: 'set', target: ref('flags', 'unknown'), value: literal(true) }] }),
  /DECISION_KEY/);
  const noop = applyDecisionPlan(schema, initial, { schemaVersion: 1, cases: [], otherwise: [] });
  assert.equal(noop.selectedCase, 'otherwise');
  assert.deepEqual(noop.state, initial);
});

test('Mock cross-domain invariant rejects HP above maximum without committing earlier changes', () => {
  const constrained = structuredClone(schema);
  constrained.domains['mock:stats'].allowedKeys.push('mock:hero/max-hp');
  constrained.invariants = [{ op: 'compare', left: read(ref('stats', 'hero/attack')),
    relation: 'le', right: read(ref('stats', 'hero/max-hp')) }];
  const initial = createDecisionState(constrained);
  assert.throws(() => applyDecisionTransaction(constrained, initial, { schemaVersion: 1, guards: [], effects: [
    { op: 'set', target: flag, value: literal(true) },
    { op: 'set', target: attack, value: literal(10) },
  ] }), /DECISION_INVARIANT/);
  assert.equal(readDecisionValue(constrained, initial, flag), false);
  assert.equal(readDecisionValue(constrained, initial, attack), 0);
});

test('keyFrom composes dynamic keys from literal and read parts joined with a slash', () => {
  const dynamic = { schemaVersion: 1, domains: {
    'mock:slots': { kind: 'list', default: [], maxItems: 8, allowedKeys: [
      'mock:scene/1/slot/1', 'mock:scene/1/slot/2', 'mock:scene/2/slot/1', 'mock:scene/2/slot/2'] },
    'mock:cursor': { kind: 'integer', default: 1, min: 1, max: 3, allowedKeys: ['mock:cursor/scene', 'mock:cursor/slot'] },
  } };
  const scene = { domain: 'mock:cursor', key: 'mock:cursor/scene' };
  const slot = { domain: 'mock:cursor', key: 'mock:cursor/slot' };
  const dynamicRef = { domain: 'mock:slots', keyFrom: [
    { literal: 'mock:scene' }, { read: scene }, { literal: 'slot' }, { read: slot } ] };
  const initial = createDecisionState(dynamic);
  // Reads the key resolved from the cursor scene/slot (both default to 1).
  assert.deepEqual(readDecisionValue(dynamic, initial, dynamicRef), []);
  // patchList writes through the dynamic key.
  const applied = applyDecisionTransaction(dynamic, initial, { schemaVersion: 1, guards: [], effects: [
    { op: 'patchList', target: dynamicRef, entries: [{ index: 0, value: literal('mock:thing/one') }] },
  ] });
  assert.equal(applied.state.values['mock:slots']['mock:scene/1/slot/1'][0], 'mock:thing/one');
  // A different cursor resolves to a different, still-allowed key.
  const moved = applyDecisionTransaction(dynamic, initial, { schemaVersion: 1, guards: [], effects: [
    { op: 'set', target: scene, value: literal(2) },
  ] });
  assert.equal(moved.state.values['mock:slots']?.['mock:scene/2/slot/1'], undefined);
  // A composed key outside the allowed set is rejected.
  const off = applyDecisionTransaction(dynamic, initial, { schemaVersion: 1, guards: [], effects: [
    { op: 'set', target: slot, value: literal(2) },
    { op: 'set', target: scene, value: literal(2) },
  ] });
  const cornerRef = { domain: 'mock:slots', keyFrom: [
    { literal: 'mock:scene' }, { read: scene }, { literal: 'slot' }, { read: slot } ] };
  assert.equal(readDecisionValue(dynamic, off.state, cornerRef).length, 0);
  // A composed key outside the allowed set is rejected on read.
  const outside = applyDecisionTransaction(dynamic, initial, { schemaVersion: 1, guards: [], effects: [
    { op: 'set', target: scene, value: literal(3) },
  ] });
  assert.throws(() => readDecisionValue(dynamic, outside.state, cornerRef), /DECISION_KEY/);
});

test('patchList writes per-index entries into a list and pads sparse slots within the cap', () => {
  const sparse = { schemaVersion: 1, domains: {
    'mock:slots': { kind: 'list', default: [], maxItems: 4, allowedKeys: ['mock:slot/1'] },
  } };
  const slot = ref('slots', 'slot/1');
  const initial = createDecisionState(sparse);
  const applied = applyDecisionTransaction(sparse, initial, { schemaVersion: 1, guards: [], effects: [
    { op: 'patchList', target: slot, entries: [
      { index: 0, value: literal('a') }, { index: 3, value: literal('d') },
    ] },
  ] });
  assert.deepEqual(applied.state.values['mock:slots']['mock:slot/1'], ['a', '0', '0', 'd']);
  assert.throws(() => applyDecisionTransaction(sparse, initial, { schemaVersion: 1, guards: [], effects: [
    { op: 'patchList', target: slot, entries: [{ index: 5, value: literal('x') }] },
  ] }), /DECISION_PATCH_INDEX/);
});

test('listSize compares a list operand against a numeric threshold', () => {
  const sized = { schemaVersion: 1, domains: {
    'mock:party': { kind: 'list', default: [], maxItems: 6, allowedKeys: ['mock:members'] },
  } };
  const members = ref('party', 'members');
  const initial = createDecisionState(sized);
  const full = applyDecisionTransaction(sized, initial, { schemaVersion: 1, guards: [], effects: [
    { op: 'listAdd', target: members, value: literal('mock:member/a') },
  ] });
  assert.equal(evaluateDecision(sized, full.state, { op: 'listSize', list: read(members), relation: 'eq', value: literal(1) }, 1), true);
  assert.equal(evaluateDecision(sized, full.state, { op: 'listSize', list: read(members), relation: 'ge', value: literal(6) }, 1), false);
  assert.throws(() => evaluateDecision(sized, full.state,
    { op: 'listSize', list: read(members), relation: 'eq', value: literal('six') }, 1), /DECISION_LISTSIZE_TYPE/);
});
