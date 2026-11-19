import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveDecisionEventContent, createDecisionEventState, dispatchDecisionEvent,
  restoreDecisionEventSave, applyDecisionTransaction, readDecisionValue } from '../../packages/game-core/src/index.ts';
import { decisionEventSaveKey, saveDecisionEvent, loadDecisionEvent } from '../../apps/web/src/storage.ts';

const item = { domain: 'mock:inventory', key: 'mock:item/medicine' };
const flag = { domain: 'mock:flags', key: 'mock:quest/paid' };
const party = { domain: 'mock:party', key: 'mock:members' };
const binding = { domain: 'mock:bindings', key: 'mock:scene/entry' };
const lit = value => ({ kind: 'literal', value });
const read = ref => ({ kind: 'read', ref });
const source = {
  schemaVersion: 1, id: 'mock', version: '1.0.0', classification: 'mock',
  entry: { mapId: 'mock:map/start', x: 2, y: 3 },
  decision: { schemaVersion: 1, domains: {
    'mock:inventory': { kind: 'integer', default: 0, min: 0, max: 99, allowedKeys: [item.key] },
    'mock:flags': { kind: 'boolean', default: false, allowedKeys: [flag.key] },
    'mock:party': { kind: 'list', default: [], maxItems: 6, unique: true,
      allowedKeys: [party.key], allowedValues: ['mock:hero', 'mock:friend'] },
    'mock:bindings': { kind: 'string', default: '', allowedKeys: [binding.key],
      allowedValues: ['', 'mock:event/next'] },
  } },
  dialogues: { 'mock:dialogue/offer': { speaker: 'Guide', text: 'Pay for passage?' } },
  events: { 'mock:event/offer': { steps: [
    { op: 'say', dialogueId: 'mock:dialogue/offer' },
    { op: 'choice', options: [{ id: 'mock:option/pay', text: 'Pay', target: 2 },
      { id: 'mock:option/leave', text: 'Leave', target: 4 }] },
    { op: 'decide', plan: { schemaVersion: 1, cases: [{ when: {
      op: 'compare', left: read(item), relation: 'ge', right: lit(2),
    }, effects: [
      { op: 'add', target: item, amount: lit(-2) },
      { op: 'listAdd', target: party, value: lit('mock:friend') },
      { op: 'set', target: flag, value: lit(true) },
      { op: 'set', target: binding, value: lit('mock:event/next') },
    ] }], otherwise: [{ op: 'require', condition: {
      op: 'compare', left: read(item), relation: 'ge', right: lit(2),
    } }] } },
    { op: 'end' }, { op: 'end' },
  ] } },
};
const memory = () => { const values = new Map(); return { values,
  getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }; };

test('Mock v1 event saves at choice and resumes an atomic multi-domain decision', async () => {
  const content = await resolveDecisionEventContent(source), storage = memory();
  let initial = createDecisionEventState(content);
  initial.decision = applyDecisionTransaction(content.data.decision, initial.decision,
    { schemaVersion: 1, guards: [], effects: [{ op: 'set', target: item, value: lit(3) }] }).state;
  const start = dispatchDecisionEvent(content, initial, { type: 'START', eventId: 'mock:event/offer' });
  assert.equal(start.notices[0].type, 'DIALOGUE');
  const paused = dispatchDecisionEvent(content, start.state, { type: 'CONTINUE' });
  assert.equal(paused.notices[0].type, 'CHOICE');
  const saved = saveDecisionEvent(storage, content, paused.state);
  assert.equal(storage.getItem(decisionEventSaveKey(content)), saved);
  assert.throws(() => { content.data.events['mock:event/offer'].steps[0].op = 'end'; }, TypeError);
  const restored = loadDecisionEvent(storage, content);
  assert.deepEqual(restored, paused.state);
  const finished = dispatchDecisionEvent(content, restored, { type: 'CHOOSE', optionId: 'mock:option/pay' });
  assert.equal(finished.state.cursor, null);
  assert.deepEqual(finished.notices.map(notice => notice.type), ['DECISION_APPLIED', 'EVENT_ENDED']);
  assert.equal(readDecisionValue(content.data.decision, finished.state.decision, item), 1);
  assert.equal(readDecisionValue(content.data.decision, finished.state.decision, flag), true);
  assert.deepEqual(readDecisionValue(content.data.decision, finished.state.decision, party), ['mock:friend']);
  assert.equal(readDecisionValue(content.data.decision, finished.state.decision, binding), 'mock:event/next');
  assert.equal(readDecisionValue(content.data.decision, restored.decision, item), 3);
  assert.deepEqual(dispatchDecisionEvent(content, restored, { type: 'CHOOSE', optionId: 'mock:option/leave' }).state.decision,
    restored.decision);
});

test('Failed choice, guard and content preflight leave old state and save intact', async () => {
  const content = await resolveDecisionEventContent(source), storage = memory();
  const initial = createDecisionEventState(content);
  const paused = dispatchDecisionEvent(content,
    dispatchDecisionEvent(content, initial, { type: 'START', eventId: 'mock:event/offer' }).state,
    { type: 'CONTINUE' }).state;
  const old = saveDecisionEvent(storage, content, paused);
  const before = JSON.stringify(paused);
  assert.throws(() => dispatchDecisionEvent(content, paused, { type: 'CHOOSE', optionId: 'mock:option/missing' }), /DECISION_EVENT_OPTION/);
  assert.throws(() => dispatchDecisionEvent(content, paused, { type: 'CHOOSE', optionId: 'mock:option/pay' }), /DECISION_REQUIRE/);
  assert.equal(JSON.stringify(paused), before);
  assert.equal(storage.getItem(decisionEventSaveKey(content)), old);
  const changed = structuredClone(source); changed.version = '1.0.1';
  const other = await resolveDecisionEventContent(changed);
  assert.notEqual(decisionEventSaveKey(other), decisionEventSaveKey(content));
  assert.throws(() => restoreDecisionEventSave(other, old), /DECISION_EVENT_CONTENT_MISMATCH/);
  assert.throws(() => restoreDecisionEventSave(content, '{'), /DECISION_EVENT_SAVE_JSON/);
  assert.equal(storage.getItem(decisionEventSaveKey(content)), old);
  assert.deepEqual(loadDecisionEvent(storage, content), paused);
  const second = saveDecisionEvent(storage, content, initial);
  assert.equal(storage.getItem(decisionEventSaveKey(content) + ':backup'), old);
  assert.equal(storage.getItem(decisionEventSaveKey(content)), second);
  assert.deepEqual(loadDecisionEvent(storage, content, true), paused);
});

test('v1 content rejects missing references, invalid jumps and unsupported steps', async () => {
  const missing = structuredClone(source); missing.events['mock:event/offer'].steps[0].dialogueId = 'mock:dialogue/missing';
  await assert.rejects(resolveDecisionEventContent(missing), /DECISION_EVENT_DIALOGUE_REFERENCE/);
  const jump = structuredClone(source); jump.events['mock:event/offer'].steps[1].options[0].target = 99;
  await assert.rejects(resolveDecisionEventContent(jump), /DECISION_EVENT_JUMP_TARGET/);
  const unsupported = structuredClone(source); unsupported.events['mock:event/offer'].steps[2] = { op: 'eval', code: 'x' };
  await assert.rejects(resolveDecisionEventContent(unsupported), /DECISION_EVENT_CONTENT_SCHEMA/);
});
