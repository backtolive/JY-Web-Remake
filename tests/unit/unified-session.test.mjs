import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { bindControlledEventHost, createGame, createUnifiedSession, dispatch, dispatchUnifiedControlled,
  dispatchUnifiedWorld, enterUnifiedControlled, leaveUnifiedControlled, migrateLegacySave,
  readDecisionValue, resolveContent, resolveControlledEventContent, restoreUnifiedSession,
  serializeSave, serializeUnifiedSession } from '../../packages/game-core/src/index.ts';
import { unifiedSessionSaveSchema } from '../../packages/game-core/src/unified-session-schema.ts';
import { loadUnifiedSession, migrateStoredLegacySave, saveKey, saveUnifiedSession, unifiedSaveKey } from '../../apps/web/src/storage.ts';

const read = async name => JSON.parse(await readFile(new URL(`../fixtures/${name}`, import.meta.url), 'utf8'));
async function setup(withMod = false) {
  const base = await read('mock-wuxia-package.json');
  const host = await resolveContent(withMod ? [base, await read('mock-greeting-mod.json')] : [base]);
  const controlled = await bindControlledEventHost(
    await resolveControlledEventContent(await read('mock-controlled-event.json')),
    host, await read('mock-controlled-resources.json'));
  return { host, controlled };
}
const resolve = (state, result) => ({ type: 'RESOLVE', result: {
  schemaVersion: 1, requestId: state.event.pending.requestId, ...result,
} });
test('Unified v4 session keeps one player location across world and controlled event, then restores', async () => {
  const content = await setup();
  let state = createUnifiedSession(content);
  assert.equal(state.mode, 'world');
  state = dispatchUnifiedWorld(content, state, { type: 'INTERACT', npcId: 'mock.wuxia:npc/guide' }).state;
  state = dispatchUnifiedWorld(content, state, { type: 'CONTINUE' }).state;
  state = dispatchUnifiedWorld(content, state, { type: 'CHOOSE', option: 0 }).state;
  state = dispatchUnifiedWorld(content, state, { type: 'CONTINUE' }).state;
  assert.equal(state.game.inventory['mock.wuxia:item/coin'], 1);
  state = enterUnifiedControlled(content, state, 'mock.controlled:event/trial').state;
  assert.equal(state.mode, 'controlled');
  assert.equal('location' in state.event, false);
  const pausedDialogue = serializeUnifiedSession(content, state);
  state = restoreUnifiedSession(content, pausedDialogue);
  state = dispatchUnifiedControlled(content, state, { type: 'CONTINUE' }).state;
  const waitingBattle = serializeUnifiedSession(content, state);
  assert.equal(JSON.parse(waitingBattle).state.event.pending.command.kind, 'battle');
  state = restoreUnifiedSession(content, waitingBattle);
  state = dispatchUnifiedControlled(content, state, resolve(state, { kind: 'battle', outcome: 'victory' })).state;
  state = dispatchUnifiedControlled(content, state, resolve(state, { kind: 'animation', outcome: 'completed' })).state;
  assert.equal(state.game.mapId, 'mock.wuxia:map/room');
  state = dispatchUnifiedControlled(content, state, resolve(state, { kind: 'transition', outcome: 'completed' })).state;
  assert.deepEqual([state.game.mapId, state.game.x, state.game.y], ['mock.wuxia:map/yard', 1, 1]);
  state = dispatchUnifiedControlled(content, state, resolve(state,
    { kind: 'selection', selectedId: 'mock.controlled:character/b' })).state;
  assert.equal(state.event.cursor, null);
  state = leaveUnifiedControlled(content, state);
  assert.equal(state.mode, 'world');
  assert.equal(state.game.inventory['mock.wuxia:item/coin'], 1);
  assert.equal(readDecisionValue(content.controlled.data.decision, state.event.decision,
    { domain: 'mock.controlled:flags', key: 'mock.controlled:trial/won' }), true);
  assert.deepEqual(restoreUnifiedSession(content, serializeUnifiedSession(content, state)), state);
});

test('Unified save rejects stale content, tampered continuation and concurrent cursors without mutation', async () => {
  const content = await setup(), other = await setup(true);
  const original = createUnifiedSession(content);
  const battle = dispatchUnifiedControlled(content,
    enterUnifiedControlled(content, original, 'mock.controlled:event/trial').state,
    { type: 'CONTINUE' }).state;
  const raw = serializeUnifiedSession(content, battle), before = JSON.stringify(battle);
  assert.throws(() => restoreUnifiedSession(other, raw), /CONTENT_MISMATCH/);
  assert.throws(() => dispatchUnifiedWorld(content, battle, { type: 'MOVE', direction: 'west' }), /_MODE/);
  assert.throws(() => leaveUnifiedControlled(content, battle), /_BUSY/);
  assert.throws(() => dispatchUnifiedControlled(content, battle, resolve(battle,
    { kind: 'battle', outcome: 'unknown' })), /RESULT_SCHEMA/);
  const tampered = JSON.parse(raw); tampered.state.event.pending.requestId = 'wrong';
  assert.throws(() => restoreUnifiedSession(content, JSON.stringify(tampered)), /STATE_PENDING/);
  const extra = JSON.parse(raw); extra.state.event.location = { mapId: 'mock.wuxia:map/yard', x: 1, y: 1 };
  assert.throws(() => restoreUnifiedSession(content, JSON.stringify(extra)), /SAVE_SCHEMA/);
  assert.equal(JSON.stringify(battle), before);
});

test('Explicit legacy v1 migration preserves paused world state and leaves original raw unchanged', async () => {
  const content = await setup();
  const paused = dispatch(content.host, createGame(content.host),
    { type: 'INTERACT', npcId: 'mock.wuxia:npc/guide' }).state;
  const old = serializeSave(content.host, paused);
  const migrated = migrateLegacySave(content, old);
  assert.deepEqual(migrated.game, paused);
  assert.equal(migrated.mode, 'world');
  assert.equal(migrated.event.cursor, null);
  assert.deepEqual(restoreUnifiedSession(content, serializeUnifiedSession(content, migrated)), migrated);
  assert.equal(serializeSave(content.host, paused), old);
  const other = await setup(true);
  assert.throws(() => migrateLegacySave(other, old), /SAVE_CONTENT_MISMATCH/);
});

test('Shared v4 Schema matches exported file', async () => {
  assert.deepEqual(JSON.parse(await readFile('schemas/unified-session-save.schema.json', 'utf8')), unifiedSessionSaveSchema);
});

test('Browser v4 storage backs up the prior slot, preserves v1 on migration, and rejects failed writes', async () => {
  const content = await setup(), values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } };
  const old = serializeSave(content.host, createGame(content.host));
  storage.setItem(saveKey(content.host), old);
  const migrated = migrateStoredLegacySave(storage, content);
  const key = unifiedSaveKey(content);
  assert.equal(values.get(saveKey(content.host)), old);
  assert.deepEqual(loadUnifiedSession(storage, content), migrated.state);
  const next = dispatchUnifiedWorld(content, migrated.state, { type: 'MOVE', direction: 'east' }).state;
  saveUnifiedSession(storage, content, next);
  assert.deepEqual(loadUnifiedSession(storage, content), next);
  assert.deepEqual(loadUnifiedSession(storage, content, true), migrated.state);
  const before = storage.getItem(key);
  assert.throws(() => saveUnifiedSession(storage, content, { ...next, mode: 'invalid' }), /STATE_SCHEMA/);
  assert.equal(storage.getItem(key), before);
  const fail = { getItem: storage.getItem, setItem: () => { throw new Error('quota'); } };
  assert.throws(() => saveUnifiedSession(fail, content, next), /quota/);
  assert.equal(storage.getItem(key), before);
});
