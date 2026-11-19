import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { bindControlledEventHost, createControlledEventState, dispatchControlledEvent,
  resolveContent, resolveControlledEventContent, serializeControlledEventSave, restoreControlledEventSave } from '../../packages/game-core/src/index.ts';

const read = async name => JSON.parse(await readFile(new URL(`../fixtures/${name}`, import.meta.url), 'utf8'));
async function setup() {
  const [base, event, resources] = await Promise.all([
    read('mock-wuxia-package.json'), read('mock-controlled-event.json'), read('mock-controlled-resources.json'),
  ]);
  return { base, event, resources, host: await resolveContent([base]), controlled: await resolveControlledEventContent(event) };
}
test('Mock controlled Web catalogue binds to actual walkable maps and named assets', async () => {
  const { host, controlled, resources } = await setup();
  const bound = await bindControlledEventHost(controlled, host, resources);
  assert.notEqual(bound.identity.sha256, controlled.identity.sha256);
  assert.throws(() => { bound.resources.encounters['mock.controlled:battle/trial'].name = 'changed'; }, TypeError);
  const start = dispatchControlledEvent(bound, createControlledEventState(bound),
    { type: 'START', eventId: 'mock.controlled:event/trial' });
  assert.equal(start.notices[0].type, 'DIALOGUE');
  const save = serializeControlledEventSave(bound, start.state);
  assert.deepEqual(restoreControlledEventSave(bound, save), start.state);
  assert.throws(() => restoreControlledEventSave(controlled, save), /CONTENT_MISMATCH/);
});
test('Mock controlled binding rejects missing assets, blocked destinations and changed host data', async () => {
  const { base, event, resources, host, controlled } = await setup();
  const missing = structuredClone(resources); delete missing.encounters['mock.controlled:battle/trial'];
  await assert.rejects(bindControlledEventHost(controlled, host, missing), /ENCOUNTER_REFERENCE/);
  const missingAnimation = structuredClone(resources); delete missingAnimation.animations['mock.controlled:animation/door'];
  await assert.rejects(bindControlledEventHost(controlled, host, missingAnimation), /ANIMATION_REFERENCE/);
  const missingCharacter = structuredClone(resources); delete missingCharacter.characters['mock.controlled:character/b'];
  await assert.rejects(bindControlledEventHost(controlled, host, missingCharacter), /CHARACTER_REFERENCE/);
  const blocked = structuredClone(event);
  blocked.events['mock.controlled:event/trial'].steps[3].command.destination.x = 0;
  blocked.events['mock.controlled:event/trial'].steps[3].command.destination.y = 0;
  const parsedBlocked = await resolveControlledEventContent(blocked);
  await assert.rejects(bindControlledEventHost(parsedBlocked, host, resources), /LOCATION/);
  const originalBound = await bindControlledEventHost(controlled, host, resources);
  const changed = structuredClone(base); changed.manifest.version = '0.1.1';
  const changedHost = await resolveContent([changed]);
  const changedBound = await bindControlledEventHost(controlled, changedHost, resources);
  assert.notEqual(originalBound.identity.sha256, changedBound.identity.sha256);
  const configuredHost = await resolveContent([base], { difficulty: 'mock-hard' });
  const configuredBound = await bindControlledEventHost(controlled, configuredHost, resources);
  assert.notEqual(originalBound.identity.sha256, configuredBound.identity.sha256);
});
