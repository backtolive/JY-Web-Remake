import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolveControlledEventContent, createControlledEventState, dispatchControlledEvent,
  readDecisionValue, restoreControlledEventSave, serializeControlledEventSave } from '../../packages/game-core/src/index.ts';
import { controlledCommandSchema, controlledResultSchema, controlledEventContentSchema,
  controlledEventSaveSchema } from '../../packages/game-core/src/controlled-event-schema.ts';
import { controlledEventSaveKey, loadControlledEvent, saveControlledEvent } from '../../apps/web/src/storage.ts';

const item = { domain: 'mock:inventory', key: 'mock:item/pass' };
const flag = { domain: 'mock:flags', key: 'mock:quest/won' };
const party = { domain: 'mock:party', key: 'mock:members' };
const lit = value => ({ kind: 'literal', value });
const read = ref => ({ kind: 'read', ref });
const plan = effects => ({ schemaVersion: 1, cases: [], otherwise: effects });
const contentSource = {
  schemaVersion: 3, id: 'mock', version: '2.0.0', classification: 'mock',
  entry: { mapId: 'mock:map/start', x: 1, y: 2 },
  decision: { schemaVersion: 1, domains: {
    'mock:inventory': { kind: 'integer', default: 1, min: 0, max: 9, allowedKeys: [item.key] },
    'mock:flags': { kind: 'boolean', default: false, allowedKeys: [flag.key] },
    'mock:party': { kind: 'list', default: [], maxItems: 2, unique: true,
      allowedKeys: [party.key], allowedValues: ['mock:friend/a', 'mock:friend/b'] },
    'mock:current-item': { kind: 'integer', default: 0, min: -1, max: 1000,
      allowedKeys: ['mock:item/current'] },
    'mock:equip': { kind: 'integer', default: -1, min: -1, max: 100,
      allowedKeys: ['mock:equip/0/0', 'mock:equip/0/1', 'mock:equip/1/0', 'mock:equip/1/1'] },
    'mock:practice': { kind: 'integer', default: -1, min: -1, max: 100,
      allowedKeys: ['mock:practice/0', 'mock:practice/1'] },
    'mock:item-user': { kind: 'integer', default: -1, min: -1, max: 100,
      allowedKeys: ['mock:item-user/7', 'mock:item-user/8'] },
  } },
  dialogues: { 'mock:dialogue/start': { speaker: 'Guide', text: 'Ready?' } },
  currentItem: { domain: 'mock:current-item', key: 'mock:item/current' },
  equipment: {
    slots: { domain: 'mock:equip', key: 'mock:equip/{role}/{slot}' },
    practice: { domain: 'mock:practice', key: 'mock:practice/{role}' },
    itemUser: { domain: 'mock:item-user', key: 'mock:item-user/{item}' },
  },
  events: { 'mock:event/quest': { steps: [
    { op: 'say', dialogueId: 'mock:dialogue/start' },
    { op: 'invoke', command: { kind: 'battle', encounterId: 'mock:battle/one' }, outcomes: [
      { id: 'victory', target: 2, plan: plan([
        { op: 'add', target: item, amount: lit(-1) },
        { op: 'set', target: flag, value: lit(true) },
      ]) },
      { id: 'defeat', target: 5 }, { id: 'escape', target: 5 },
    ] },
    { op: 'invoke', command: { kind: 'animation', animationId: 'mock:animation/door' },
      outcomes: [{ id: 'completed', target: 3 }] },
    { op: 'invoke', command: { kind: 'transition', destination: { mapId: 'mock:map/inside', x: 3, y: 4 } },
      outcomes: [{ id: 'completed', target: 4 }] },
    { op: 'invoke', command: { kind: 'selection', candidates: ['mock:friend/a', 'mock:friend/b'] },
      outcomes: [
        { id: 'mock:friend/a', target: 5, plan: plan([{ op: 'listAdd', target: party, value: lit('mock:friend/a') }]) },
        { id: 'mock:friend/b', target: 5, plan: plan([{ op: 'listAdd', target: party, value: lit('mock:friend/b') }]) },
      ] },
    { op: 'end' },
  ] } },
};
const memory = () => { const values = new Map(); return { values,
  getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }; };
const resolve = (request, result) => ({ type: 'RESOLVE', result: { schemaVersion: 1, requestId: request.requestId, ...result } });

test('Mock controlled event survives each pause and applies only content-authored effects', async () => {
  const content = await resolveControlledEventContent(contentSource), storage = memory();
  const initial = createControlledEventState(content);
  const speech = dispatchControlledEvent(content, initial, { type: 'START', eventId: 'mock:event/quest' });
  assert.equal(speech.notices[0].type, 'DIALOGUE');
  const battle = dispatchControlledEvent(content, speech.state, { type: 'CONTINUE' });
  assert.equal(battle.notices[0].type, 'REQUEST');
  const request = battle.state.pending;
  assert.deepEqual(request.command, { kind: 'battle', encounterId: 'mock:battle/one' });
  saveControlledEvent(storage, content, battle.state);
  assert.deepEqual(loadControlledEvent(storage, content), battle.state);
  const win = dispatchControlledEvent(content, loadControlledEvent(storage, content),
    resolve(request, { kind: 'battle', outcome: 'victory' }));
  assert.equal(readDecisionValue(content.data.decision, win.state.decision, item), 0);
  assert.equal(readDecisionValue(content.data.decision, win.state.decision, flag), true);
  assert.equal(win.state.pending.command.kind, 'animation');
  const animation = dispatchControlledEvent(content, win.state,
    resolve(win.state.pending, { kind: 'animation', outcome: 'completed' }));
  assert.equal(animation.state.pending.command.kind, 'transition');
  assert.deepEqual(animation.state.location, initial.location);
  const moved = dispatchControlledEvent(content, animation.state,
    resolve(animation.state.pending, { kind: 'transition', outcome: 'completed' }));
  assert.deepEqual(moved.state.location, { mapId: 'mock:map/inside', x: 3, y: 4 });
  assert.equal(moved.state.pending.command.kind, 'selection');
  const finished = dispatchControlledEvent(content, moved.state,
    resolve(moved.state.pending, { kind: 'selection', selectedId: 'mock:friend/b' }));
  assert.equal(finished.state.cursor, null);
  assert.equal(finished.state.pending, null);
  assert.deepEqual(readDecisionValue(content.data.decision, finished.state.decision, party), ['mock:friend/b']);
  assert.equal(finished.notices.at(-1).type, 'EVENT_ENDED');
  assert.equal(readDecisionValue(content.data.decision, battle.state.decision, item), 1);
});

test('Stale, malformed and failed results keep the exact pending checkpoint', async () => {
  const content = await resolveControlledEventContent(contentSource), storage = memory();
  const battle = dispatchControlledEvent(content,
    dispatchControlledEvent(content, createControlledEventState(content),
      { type: 'START', eventId: 'mock:event/quest' }).state, { type: 'CONTINUE' }).state;
  const old = saveControlledEvent(storage, content, battle), request = battle.pending;
  const before = JSON.stringify(battle);
  assert.throws(() => dispatchControlledEvent(content, battle,
    resolve({ ...request, requestId: 'old' }, { kind: 'battle', outcome: 'victory' })), /RESULT_MISMATCH/);
  assert.throws(() => dispatchControlledEvent(content, battle,
    resolve(request, { kind: 'battle', outcome: 'victory', effects: [] })), /RESULT_SCHEMA/);
  assert.throws(() => dispatchControlledEvent(content, battle,
    resolve(request, { kind: 'selection', selectedId: 'mock:friend/a' })), /RESULT_MISMATCH/);
  assert.equal(JSON.stringify(battle), before);
  assert.equal(storage.getItem(controlledEventSaveKey(content)), old);
  const changed = structuredClone(contentSource); changed.version = '2.0.1';
  const other = await resolveControlledEventContent(changed);
  assert.notEqual(controlledEventSaveKey(content), controlledEventSaveKey(other));
  assert.throws(() => restoreControlledEventSave(other, old), /CONTENT_MISMATCH/);
  const tampered = JSON.parse(old); tampered.state.pending.requestId = 'other';
  assert.throws(() => restoreControlledEventSave(content, JSON.stringify(tampered)), /STATE_PENDING/);
  assert.deepEqual(loadControlledEvent(storage, content), battle);
});

test('Late decision failure keeps battle result unapplied and request available for retry', async () => {
  const changed = structuredClone(contentSource);
  changed.decision.domains['mock:inventory'].default = 0;
  const content = await resolveControlledEventContent(changed);
  const battle = dispatchControlledEvent(content,
    dispatchControlledEvent(content, createControlledEventState(content),
      { type: 'START', eventId: 'mock:event/quest' }).state, { type: 'CONTINUE' }).state;
  const before = JSON.stringify(battle);
  assert.throws(() => dispatchControlledEvent(content, battle,
    resolve(battle.pending, { kind: 'battle', outcome: 'victory' })), /DECISION_VALUE_RANGE/);
  assert.equal(JSON.stringify(battle), before);
  assert.equal(battle.cursor.waiting, 'external');
});

test('USE_ITEM host command writes the declared current-item ref between events', async () => {
  const content = await resolveControlledEventContent(contentSource);
  const currentRef = { domain: 'mock:current-item', key: 'mock:item/current' };
  const fresh = createControlledEventState(content);
  const used = dispatchControlledEvent(content, fresh, { type: 'USE_ITEM', itemId: 7 });
  assert.equal(readDecisionValue(content.data.decision, used.state.decision, currentRef), 7);
  assert.equal(used.notices[0].type, 'DECISION_APPLIED');
  assert.equal(used.notices[0].changes[0].after, 7);
  // While an event is active the menu is closed: the command is rejected, state untouched.
  const active = dispatchControlledEvent(content, used.state, { type: 'START', eventId: 'mock:event/quest' });
  assert.throws(() => dispatchControlledEvent(content, active.state, { type: 'USE_ITEM', itemId: 8 }), /USE_ITEM_BUSY/);
  // Out-of-range and non-integer item ids are rejected without changing state.
  assert.throws(() => dispatchControlledEvent(content, used.state, { type: 'USE_ITEM', itemId: 2000 }), /DECISION_VALUE_RANGE/);
  assert.throws(() => dispatchControlledEvent(content, used.state, { type: 'USE_ITEM', itemId: 1.5 }), /USE_ITEM_VALUE/);
  // Content without a declared current-item ref rejects the command at dispatch.
  const noRef = structuredClone(contentSource); delete noRef.currentItem;
  const bare = await resolveControlledEventContent(noRef);
  assert.throws(() => dispatchControlledEvent(bare, createControlledEventState(bare),
    { type: 'USE_ITEM', itemId: 1 }), /NO_CURRENT_ITEM/);
  // A declared ref outside the domain key set, or an unknown domain, fails resolution.
  const badRef = structuredClone(contentSource);
  badRef.currentItem = { domain: 'mock:current-item', key: 'mock:item/other' };
  await assert.rejects(resolveControlledEventContent(badRef), /CURRENT_ITEM_REF/);
  const badDomain = structuredClone(contentSource);
  badDomain.currentItem = { domain: 'mock:missing', key: 'mock:item/current' };
  await assert.rejects(resolveControlledEventContent(badDomain), /CURRENT_ITEM_DOMAIN/);
  // The write survives a save/restore round trip.
  const restored = restoreControlledEventSave(content, serializeControlledEventSave(content, used.state));
  assert.equal(readDecisionValue(content.data.decision, restored.decision, currentRef), 7);
});

test('EQUIP/PRACTICE host commands write the declared per-role slot and per-item user', async () => {
  const content = await resolveControlledEventContent(contentSource);
  const equipRef = (role, slot) => ({ domain: 'mock:equip', key: `mock:equip/${role}/${slot}` });
  const practiceRef = role => ({ domain: 'mock:practice', key: `mock:practice/${role}` });
  const userRef = itemId => ({ domain: 'mock:item-user', key: `mock:item-user/${itemId}` });
  const fresh = createControlledEventState(content);
  // EQUIP writes both bindings atomically; the user binding records the role.
  const equipped = dispatchControlledEvent(content, fresh, { type: 'EQUIP', itemId: 7, role: 0, slot: 1 });
  assert.equal(readDecisionValue(content.data.decision, equipped.state.decision, equipRef(0, 1)), 7);
  assert.equal(readDecisionValue(content.data.decision, equipped.state.decision, userRef(7)), 0);
  assert.equal(equipped.notices[0].type, 'DECISION_APPLIED');
  assert.equal(equipped.notices[0].changes.length, 2);
  // PRACTICE writes the per-role practice slot and the user binding.
  const practiced = dispatchControlledEvent(content, equipped.state, { type: 'PRACTICE', itemId: 8, role: 1 });
  assert.equal(readDecisionValue(content.data.decision, practiced.state.decision, practiceRef(1)), 8);
  assert.equal(readDecisionValue(content.data.decision, practiced.state.decision, userRef(8)), 1);
  // While an event is active the menu is closed: both commands are rejected.
  const active = dispatchControlledEvent(content, practiced.state, { type: 'START', eventId: 'mock:event/quest' });
  assert.throws(() => dispatchControlledEvent(content, active.state,
    { type: 'EQUIP', itemId: 7, role: 0, slot: 0 }), /USE_ITEM_BUSY/);
  assert.throws(() => dispatchControlledEvent(content, active.state,
    { type: 'PRACTICE', itemId: 8, role: 0 }), /USE_ITEM_BUSY/);
  // Non-integer values are rejected before any state write.
  assert.throws(() => dispatchControlledEvent(content, fresh,
    { type: 'EQUIP', itemId: 7, role: 0.5, slot: 0 }), /EQUIPMENT_VALUE/);
  assert.throws(() => dispatchControlledEvent(content, fresh,
    { type: 'EQUIP', itemId: 7, role: 0, slot: 'a' }), /EQUIPMENT_VALUE/);
  // A substituted key outside the domain allowedKeys fails; the itemUser binding
  // masks any later value-range check because its key encodes the item id.
  assert.throws(() => dispatchControlledEvent(content, fresh,
    { type: 'EQUIP', itemId: 7, role: 5, slot: 0 }), /EQUIPMENT_KEY/);
  assert.throws(() => dispatchControlledEvent(content, fresh,
    { type: 'PRACTICE', itemId: 500, role: 0 }), /EQUIPMENT_KEY/);
  // Content without an equipment declaration rejects both commands at dispatch.
  const bare = structuredClone(contentSource); delete bare.equipment;
  const noEquip = await resolveControlledEventContent(bare);
  assert.throws(() => dispatchControlledEvent(noEquip, createControlledEventState(noEquip),
    { type: 'EQUIP', itemId: 7, role: 0, slot: 0 }), /NO_EQUIPMENT/);
  assert.throws(() => dispatchControlledEvent(noEquip, createControlledEventState(noEquip),
    { type: 'PRACTICE', itemId: 8, role: 0 }), /NO_EQUIPMENT/);
  // A declared domain that is missing, or an unknown placeholder, fails resolution.
  const badDomain = structuredClone(contentSource);
  badDomain.equipment.slots = { domain: 'mock:missing', key: 'mock:equip/{role}/{slot}' };
  await assert.rejects(resolveControlledEventContent(badDomain), /EQUIPMENT_DOMAIN/);
  const badTemplate = structuredClone(contentSource);
  badTemplate.equipment.itemUser = { domain: 'mock:item-user', key: 'mock:item-user/{player}' };
  await assert.rejects(resolveControlledEventContent(badTemplate), /EQUIPMENT_TEMPLATE/);
  // The writes survive a save/restore round trip.
  const restored = restoreControlledEventSave(content, serializeControlledEventSave(content, practiced.state));
  assert.equal(readDecisionValue(content.data.decision, restored.decision, equipRef(0, 1)), 7);
  assert.equal(readDecisionValue(content.data.decision, restored.decision, practiceRef(1)), 8);
  assert.equal(readDecisionValue(content.data.decision, restored.decision, userRef(8)), 1);
});

test('Versioned command/result/content/save schemas are exported; unknown outcomes are rejected', async () => {
  for (const [name, schema] of [
    ['controlled-command.schema.json', controlledCommandSchema],
    ['controlled-result.schema.json', controlledResultSchema],
    ['controlled-event-content.schema.json', controlledEventContentSchema],
    ['controlled-event-save.schema.json', controlledEventSaveSchema],
  ]) assert.deepEqual(JSON.parse(await readFile(`schemas/${name}`, 'utf8')), schema);
  const missing = structuredClone(contentSource);
  missing.events['mock:event/quest'].steps[1].outcomes.pop();
  await assert.rejects(resolveControlledEventContent(missing), /OUTCOME_SET/);
  const duplicate = structuredClone(contentSource);
  duplicate.events['mock:event/quest'].steps[4].command.candidates[1] = 'mock:friend/a';
  await assert.rejects(resolveControlledEventContent(duplicate), /OUTCOME_SET/);
});

test('Seeded weighted branch replays identically and invalid seed or target is rejected', async () => {
  const source = structuredClone(contentSource);
  source.events['mock:event/quest'].steps = [
    { op: 'roll', outcomes: [
      { id: 'mock:outcome/a', weight: 1, target: 1,
        plan: plan([{ op: 'listAdd', target: party, value: lit('mock:friend/a') }]) },
      { id: 'mock:outcome/b', weight: 3, target: 1,
        plan: plan([{ op: 'listAdd', target: party, value: lit('mock:friend/b') }]) },
    ] }, { op: 'end' },
  ];
  const content = await resolveControlledEventContent(source);
  const first = dispatchControlledEvent(content, createControlledEventState(content, 42),
    { type: 'START', eventId: 'mock:event/quest' });
  const second = dispatchControlledEvent(content, createControlledEventState(content, 42),
    { type: 'START', eventId: 'mock:event/quest' });
  assert.deepEqual(first, second);
  assert.notEqual(first.state.rngState, 42);
  assert.equal(readDecisionValue(content.data.decision, first.state.decision, party).length, 1);
  assert.throws(() => createControlledEventState(content, 0), /STATE_SCHEMA/);
  const bad = structuredClone(source); bad.events['mock:event/quest'].steps[0].outcomes[0].target = 99;
  await assert.rejects(resolveControlledEventContent(bad), /JUMP_TARGET/);
});

test('Branch step jumps on the decision condition and rejects out-of-range targets', async () => {
  const source = structuredClone(contentSource);
  source.events['mock:event/quest'].steps = [
    { op: 'branch', condition: { op: 'compare', left: read(item), relation: 'ge', right: lit(1) }, yes: 1, no: 2 },
    { op: 'say', dialogueId: 'mock:dialogue/start' },
    { op: 'end' },
  ];
  const content = await resolveControlledEventContent(source);
  // Item defaults to 1, so the "yes" arm (say) is taken, pausing for dialogue.
  const taken = dispatchControlledEvent(content, createControlledEventState(content),
    { type: 'START', eventId: 'mock:event/quest' });
  assert.equal(taken.notices[0].type, 'DIALOGUE');
  assert.deepEqual(taken.state.cursor, { eventId: 'mock:event/quest', pc: 1, waiting: 'dialogue' });
  const finished = dispatchControlledEvent(content, taken.state, { type: 'CONTINUE' });
  assert.equal(finished.state.cursor, null);
  assert.equal(finished.notices.at(-1).type, 'EVENT_ENDED');
  // Lower the item so the "no" arm (end) is taken directly.
  const sourceNo = structuredClone(contentSource);
  sourceNo.decision.domains['mock:inventory'].default = 0;
  sourceNo.events['mock:event/quest'].steps = source.events['mock:event/quest'].steps;
  const contentNo = await resolveControlledEventContent(sourceNo);
  const skipped = dispatchControlledEvent(contentNo, createControlledEventState(contentNo),
    { type: 'START', eventId: 'mock:event/quest' });
  assert.equal(skipped.notices.length, 1);
  assert.equal(skipped.notices[0].type, 'EVENT_ENDED');
  const bad = structuredClone(source);
  bad.events['mock:event/quest'].steps[0].yes = 99;
  await assert.rejects(resolveControlledEventContent(bad), /JUMP_TARGET/);
});
