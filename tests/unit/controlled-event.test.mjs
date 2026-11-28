import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolveControlledEventContent, createControlledEventState, dispatchControlledEvent,
  readDecisionValue, resolveBattle, restoreControlledEventSave, serializeControlledEventSave } from '../../packages/game-core/src/index.ts';
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

test('EQUIP/PRACTICE apply the CanEquip gate and mutual unbinding', async () => {
  const source = structuredClone(contentSource);
  // Role attribute domains + CanEquip bindings (the engine stays naming-free).
  source.decision.domains['mock:role/mp'] = { kind: 'integer', default: 0, min: -1000, max: 1000,
    allowedKeys: ['mock:role/0', 'mock:role/1'] };
  source.equipment.roleAttributes = { mp: { domain: 'mock:role/mp', key: 'mock:role/{role}' } };
  source.items = {
    'mock:item/7': { name: 'Sword', stackable: true, canEquip: { mp: 10 } },
    'mock:item/8': { name: 'Manual', stackable: true },
  };
  const content = await resolveControlledEventContent(source);
  const equipRef = (role, slot) => ({ domain: 'mock:equip', key: `mock:equip/${role}/${slot}` });
  const userRef = itemId => ({ domain: 'mock:item-user', key: `mock:item-user/${itemId}` });
  const fresh = createControlledEventState(content);
  // CanEquip gate: item 7 needs mp 10; fresh state has mp 0 -> rejected before any write.
  assert.throws(() => dispatchControlledEvent(content, fresh, { type: 'EQUIP', itemId: 7, role: 0, slot: 0 }),
    /EQUIP_CONDITION/);
  assert.equal(readDecisionValue(content.data.decision, fresh.decision, equipRef(0, 0)), -1);
  // Seed mp 10 -> passes; the write lands atomically.
  const seeded = structuredClone(fresh);
  seeded.decision.values['mock:role/mp'] = { 'mock:role/0': 10 };
  const r1 = dispatchControlledEvent(content, seeded, { type: 'EQUIP', itemId: 7, role: 0, slot: 0 });
  assert.equal(readDecisionValue(content.data.decision, r1.state.decision, equipRef(0, 0)), 7);
  assert.equal(readDecisionValue(content.data.decision, r1.state.decision, userRef(7)), 0);
  // Item 8 has no canEquip -> always equippable; equipping it over slot 0 unbinds item 7.
  const r2 = dispatchControlledEvent(content, r1.state, { type: 'EQUIP', itemId: 8, role: 0, slot: 0 });
  assert.equal(readDecisionValue(content.data.decision, r2.state.decision, equipRef(0, 0)), 8);
  assert.equal(readDecisionValue(content.data.decision, r2.state.decision, userRef(7)), -1);
  assert.equal(readDecisionValue(content.data.decision, r2.state.decision, userRef(8)), 0);
  // A negative threshold is a cap (mp <= -need): mp 10 fails a cap of -5.
  const capSource = structuredClone(source);
  capSource.items['mock:item/7'].canEquip = { mp: -5 };
  const capContent = await resolveControlledEventContent(capSource);
  assert.throws(() => dispatchControlledEvent(capContent, seeded, { type: 'EQUIP', itemId: 7, role: 0, slot: 0 }),
    /EQUIP_CONDITION/);
  const capOk = structuredClone(fresh);
  capOk.decision.values['mock:role/mp'] = { 'mock:role/0': 3 };
  const capPass = dispatchControlledEvent(capContent, capOk, { type: 'EQUIP', itemId: 7, role: 0, slot: 0 });
  assert.equal(readDecisionValue(capContent.data.decision, capPass.state.decision, equipRef(0, 0)), 7);
  // An item with canEquip but no roleAttributes binding is a content error.
  const noAttrs = structuredClone(source); delete noAttrs.equipment.roleAttributes;
  const content2 = await resolveControlledEventContent(noAttrs);
  assert.throws(() => dispatchControlledEvent(content2, createControlledEventState(content2),
    { type: 'EQUIP', itemId: 7, role: 0, slot: 0 }), /EQUIP_NO_ATTRIBUTES/);
});

test('CanEquip magic level rule: same magic at level < 900 overrides to pass', async () => {
  const source = structuredClone(contentSource);
  // MP domain for the threshold gate.
  source.decision.domains['mock:role/mp'] = { kind: 'integer', default: 0, min: -1000, max: 1000,
    allowedKeys: ['mock:role/0', 'mock:role/1'] };
  // Magic ID and level array domains (10 slots per role).
  const magicIdKeys = Array.from({ length: 10 }, (_, i) => `mock:role/magic-0-${i}`);
  const magicLevelKeys = Array.from({ length: 10 }, (_, i) => `mock:role/mag-level-0-${i}`);
  source.decision.domains['mock:role/magic-ids'] = { kind: 'integer', default: 0, min: 0, max: 10000,
    allowedKeys: magicIdKeys };
  source.decision.domains['mock:role/magic-levels'] = { kind: 'integer', default: 0, min: 0, max: 10000,
    allowedKeys: magicLevelKeys };
  source.equipment.roleAttributes = {
    mp: { domain: 'mock:role/mp', key: 'mock:role/{role}' },
    magicIds: { domain: 'mock:role/magic-ids', key: 'mock:role/magic-{role}-{i}' },
    magicLevels: { domain: 'mock:role/magic-levels', key: 'mock:role/mag-level-{role}-{i}' },
  };
  // Item 7 needs mp 10 AND teaches magic 5. Without the level override, mp 0 fails.
  source.items = {
    'mock:item/7': { name: 'Sword', stackable: true, canEquip: { mp: 10, magic: 5 } },
  };
  const content = await resolveControlledEventContent(source);
  const equipRef = (role, slot) => ({ domain: 'mock:equip', key: `mock:equip/${role}/${slot}` });
  const fresh = createControlledEventState(content);
  // Fresh state: mp 0, no magics -> mp gate fails, no level override -> rejected.
  assert.throws(() => dispatchControlledEvent(content, fresh, { type: 'EQUIP', itemId: 7, role: 0, slot: 0 }),
    /EQUIP_CONDITION/);
  // Role has magic 5 at level 500 (< 900) -> override to pass despite mp 0.
  const seeded = structuredClone(fresh);
  seeded.decision.values['mock:role/magic-ids'] = { 'mock:role/magic-0-0': 5 };
  seeded.decision.values['mock:role/magic-levels'] = { 'mock:role/mag-level-0-0': 500 };
  const r1 = dispatchControlledEvent(content, seeded, { type: 'EQUIP', itemId: 7, role: 0, slot: 0 });
  assert.equal(readDecisionValue(content.data.decision, r1.state.decision, equipRef(0, 0)), 7);
  // Role has magic 5 at level 900 (>= 900) -> no override; mp gate still applies.
  const seeded900 = structuredClone(fresh);
  seeded900.decision.values['mock:role/magic-ids'] = { 'mock:role/magic-0-0': 5 };
  seeded900.decision.values['mock:role/magic-levels'] = { 'mock:role/mag-level-0-0': 900 };
  assert.throws(() => dispatchControlledEvent(content, seeded900, { type: 'EQUIP', itemId: 7, role: 0, slot: 0 }),
    /EQUIP_CONDITION/);
  // Role has a different magic (3) at level 500 -> no match; mp gate still applies.
  const seededOther = structuredClone(fresh);
  seededOther.decision.values['mock:role/magic-ids'] = { 'mock:role/magic-0-0': 3 };
  seededOther.decision.values['mock:role/magic-levels'] = { 'mock:role/mag-level-0-0': 500 };
  assert.throws(() => dispatchControlledEvent(content, seededOther, { type: 'EQUIP', itemId: 7, role: 0, slot: 0 }),
    /EQUIP_CONDITION/);
  // Magic in slot 7 (not slot 0) at level 100 -> still matches (scans all 10 slots).
  const seededSlot7 = structuredClone(fresh);
  seededSlot7.decision.values['mock:role/magic-ids'] = { 'mock:role/magic-0-7': 5 };
  seededSlot7.decision.values['mock:role/magic-levels'] = { 'mock:role/mag-level-0-7': 100 };
  const r2 = dispatchControlledEvent(content, seededSlot7, { type: 'EQUIP', itemId: 7, role: 0, slot: 0 });
  assert.equal(readDecisionValue(content.data.decision, r2.state.decision, equipRef(0, 0)), 7);
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

test('Transition resolution writes the scene ID to the declared sceneTransition ref', async () => {
  const source = structuredClone(contentSource);
  // Declare a current-scene domain + sceneTransition ref.
  source.decision.domains['mock:scene'] = { kind: 'integer', default: 0, min: 0, max: 1000,
    allowedKeys: ['mock:scene/current'] };
  source.sceneTransition = { domain: 'mock:scene', key: 'mock:scene/current' };
  // Build an event with a transition invoke step.
  source.events['mock:event/transition'] = { steps: [
    { op: 'invoke', command: { kind: 'transition', destination: { mapId: 'mock:map/5', x: 10, y: 20, sceneId: 5 } },
      outcomes: [{ id: 'completed', target: 1 }] },
    { op: 'end' },
  ] };
  const content = await resolveControlledEventContent(source);
  const state = createControlledEventState(content);
  const started = dispatchControlledEvent(content, state, { type: 'START', eventId: 'mock:event/transition' });
  assert.equal(started.state.pending?.command.kind, 'transition');
  // Resolve the transition: the scene ID should be written to the declared ref.
  const resolved = dispatchControlledEvent(content, started.state,
    { type: 'RESOLVE', result: { schemaVersion: 1, requestId: started.state.pending.requestId, kind: 'transition', outcome: 'completed' } });
  assert.equal(readDecisionValue(content.data.decision, resolved.state.decision,
    { domain: 'mock:scene', key: 'mock:scene/current' }), 5);
  assert.equal(resolved.state.location.mapId, 'mock:map/5');
});

// ── resolveBattle (Community Implementation) ──────────────────────────────

test('resolveBattle: player wins when attack is high and enemy hp is low', () => {
  const result = resolveBattle(
    { hp: 100, attack: 50, defense: 10 },
    { hp: 30, attack: 10, defense: 5 },
  );
  assert.equal(result, 'victory');
});

test('resolveBattle: player loses when enemy is much stronger', () => {
  const result = resolveBattle(
    { hp: 20, attack: 5, defense: 2 },
    { hp: 200, attack: 80, defense: 50 },
  );
  assert.equal(result, 'defeat');
});

test('resolveBattle: minimum damage is 1 even when defense exceeds attack', () => {
  // Player attack 5, enemy defense 100 → damage = max(1, 5-100) = 1
  // Enemy hp 2 → player needs 2 rounds; enemy attack 3, player defense 100 → damage = 1
  // Player hp 3 → player survives 3 rounds → victory
  const result = resolveBattle(
    { hp: 3, attack: 5, defense: 100 },
    { hp: 2, attack: 3, defense: 100 },
  );
  assert.equal(result, 'victory');
});

test('resolveBattle: simultaneous kill → player wins (player attacks first)', () => {
  // Both would die this round, but player attacks first
  const result = resolveBattle(
    { hp: 10, attack: 50, defense: 0 },
    { hp: 10, attack: 50, defense: 0 },
  );
  assert.equal(result, 'victory');
});

test('resolveBattle: equal stats → player wins (attacker advantage)', () => {
  const result = resolveBattle(
    { hp: 100, attack: 20, defense: 10 },
    { hp: 100, attack: 20, defense: 10 },
  );
  assert.equal(result, 'victory');
});
