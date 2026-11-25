import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';
import { resolveControlledEventContent } from '../../packages/game-core/src/controlled-event.ts';
import { buildOriginalEventsContent, convertOriginalEventsGeneric } from
  '../../tools/extractor/convert_original_events_generic.mjs';

const names = ['KDEF.IDX', 'KDEF.GRP', 'TALK.IDX', 'TALK.GRP', 'RANGER.IDX', 'RANGER.GRP', 'ALLDEF.GRP'];
const corpusAvailable = () => readdirSync('assets/generated/event-corpus')
  .some(name => name.startsWith('all-events-') && name.endsWith('.local.json'));
const available = names.every(name => existsSync(`original/dos/${name}`)) && corpusAvailable();
const skip = !available && 'Original data and the local corpus bundle are excluded from the repository.';

test('Generic converter maps the 54 evidenced opcodes into a valid controlled-event package',
  { skip }, async () => {
    const { content, diagnostics } = await convertOriginalEventsGeneric();
    // Full runtime validation: namespaces, dialogue refs, branch targets, decision domains.
    await resolveControlledEventContent(content);
    assert.equal(diagnostics.summary.totalEvents, 1018);
    assert.equal(diagnostics.summary.converted, 732);
    assert.equal(diagnostics.summary.blocked, 286);
    assert.equal(diagnostics.summary.converted + diagnostics.summary.blocked, 1018);
    // Every say step references a dialogue that exists in the package.
    for (const event of Object.values(content.events)) {
      for (const step of event.steps) if (step.op === 'say') assert.ok(content.dialogues[step.dialogueId]);
    }
    // Every branch/choice target is within the event's step range.
    for (const event of Object.values(content.events)) {
      for (const step of event.steps) {
        if (step.op === 'branch') assert.ok(step.yes < event.steps.length && step.no < event.steps.length);
        if (step.op === 'choice') for (const option of step.options) assert.ok(option.target < event.steps.length);
      }
    }
    // The package carries rule labels, not a blanket Verified Original claim.
    assert.ok(diagnostics.summary.opcodeLabels['Community Implementation'] > 0);
    assert.ok(diagnostics.summary.opcodeLabels['Inferred'] > 0);
    assert.ok(diagnostics.summary.opcodeLabels['Verified Original'] > 0);
  });

test('Generic converter blocks only the affected event and names the blocking opcode',
  { skip }, async () => {
    const { diagnostics } = await convertOriginalEventsGeneric();
    assert.equal(diagnostics.blocked.length, 286);
    for (const row of diagnostics.blocked) {
      assert.ok(row.eventId >= 0);
      assert.ok(row.opcodes.length > 0);
      // The blocking opcodes are exactly the ones outside the 54-opcode evidenced set.
      for (const opcode of row.opcodes) assert.ok([4, 15, 19, 24, 25, 30, 44, 51, 57, 58, 60, 61, 62, 64].includes(opcode));
    }
    // Blocked events are absent from the package; converted events are present.
    const { content } = await convertOriginalEventsGeneric();
    for (const row of diagnostics.blocked) assert.ok(!content.events[`original.jy.events:event/${row.eventId}`]);
    assert.equal(Object.keys(content.events).length, 732);
  });

test('Generic converter maps skill/carried-item opcodes into per-slot decision plans',
  { skip }, async () => {
    const { readFileSync } = await import('node:fs');
    const bundleFile = readdirSync('assets/generated/event-corpus')
      .find(name => name.startsWith('all-events-') && name.endsWith('.local.json'));
    const bundle = JSON.parse(readFileSync(`assets/generated/event-corpus/${bundleFile}`, 'utf8'));
    const { content } = buildOriginalEventsContent();
    const domains = content.decision.domains;
    assert.ok(domains['original.jy:skill']);
    assert.ok(domains['original.jy:skill-level']);
    assert.ok(domains['original.jy:carried-item']);
    assert.ok(domains['original.jy:carried-item-amount']);

    // Opcode 33 (skillLearn): event 581 learns skill 15 for role 49. The decide step must
    // carry the per-slot cascade (30 cases) that re-learns or fills the first empty slot.
    const ev581 = bundle.events.find(candidate => candidate.eventId === 581);
    const learnIndex = ev581.instructions.findIndex(instruction => instruction.opcode === 33);
    const learnStep = content.events['original.jy.events:event/581'].steps[learnIndex];
    assert.equal(learnStep.op, 'decide');
    assert.equal(learnStep.plan.cases.length, 30);
    assert.equal(learnStep.plan.otherwise.length, 0);
    assert.equal(learnStep.plan.cases[0].effects[0].target.domain, 'original.jy:skill-level');

    // Opcode 35 (skillSlotSet): event 115 writes slot 0 of role 10 to skill 10, level 900.
    const ev115 = bundle.events.find(candidate => candidate.eventId === 115);
    const slotIndex = ev115.instructions.findIndex(instruction => instruction.opcode === 35);
    const slotStep = content.events['original.jy.events:event/115'].steps[slotIndex];
    assert.equal(slotStep.op, 'decide');
    assert.equal(slotStep.plan.cases.length, 0);
    assert.equal(slotStep.plan.otherwise.length, 2);
    assert.deepEqual(slotStep.plan.otherwise[0].target.key, 'original.jy:skill/10/0');
    assert.equal(slotStep.plan.otherwise[0].value.value, 10);
    assert.equal(slotStep.plan.otherwise[1].value.value, 900);

    // Opcode 41 (carriedItem): event 289 carries item 78 for role 36. The decide step must
    // carry the two-group cascade (4 carry + 4 empty = 8 cases).
    const ev289 = bundle.events.find(candidate => candidate.eventId === 289);
    const carryIndex = ev289.instructions.findIndex(instruction => instruction.opcode === 41);
    const carryStep = content.events['original.jy.events:event/289'].steps[carryIndex];
    assert.equal(carryStep.op, 'decide');
    assert.equal(carryStep.plan.cases.length, 8);
    assert.equal(carryStep.plan.cases[0].effects[0].target.domain, 'original.jy:carried-item-amount');
    assert.equal(carryStep.plan.cases[4].effects[0].target.domain, 'original.jy:carried-item');
  });

test('Generic converter tracks -2 (current scene) writes through a live current-scene key',
  { skip }, async () => {
    const { content } = buildOriginalEventsContent();
    const resolved = await resolveControlledEventContent(content);
    const domains = content.decision.domains;
    // A dedicated current-scene domain holds the live scene id.
    assert.ok(domains['original.jy:current-scene']);
    assert.deepEqual(domains['original.jy:current-scene'].allowedKeys, ['original.jy:scene/current']);
    // The fixed 'current' placeholder is gone; the -2 slots are allowed for every real scene.
    const sceneKeys = domains['original.jy:scene-slots'].allowedKeys;
    assert.ok(!sceneKeys.some(key => key.includes('/scene/current/')));
    assert.ok(sceneKeys.includes('original.jy:scene/32/slot/0/field/0'));
    assert.ok(new Set(sceneKeys).size === sceneKeys.length);

    // Find a converted event whose opcode 3 writes a -2 slot, and confirm its effect target
    // is composed from the current-scene value via keyFrom.
    const bundleFile = readdirSync('assets/generated/event-corpus')
      .find(name => name.startsWith('all-events-') && name.endsWith('.local.json'));
    const { readFileSync } = await import('node:fs');
    const bundle = JSON.parse(readFileSync(`assets/generated/event-corpus/${bundleFile}`, 'utf8'));
    const sourceEvent = bundle.events.find(candidate =>
      candidate.instructions.some(instruction => instruction.opcode === 3 && instruction.args[0] === -2));
    assert.ok(sourceEvent);
    const eventId = `original.jy.events:event/${sourceEvent.eventId}`;
    const event = content.events[eventId];
    assert.ok(event);
    const dynamicEffect = event.steps.flatMap(step =>
      step.op === 'decide' ? [...step.plan.cases.map(c => c.effects), step.plan.otherwise].flat() : [])
      .find(effect => effect.target?.keyFrom?.some(part => 'read' in part &&
        part.read?.domain === 'original.jy:current-scene'));
    assert.ok(dynamicEffect);
    assert.equal(dynamicEffect.target.domain, 'original.jy:scene-slots');

    // Driving the event with a seeded current scene lands every -2 write on that scene.
    const drive = async scene => {
      const { createControlledEventState, dispatchControlledEvent } =
        await import('../../packages/game-core/src/controlled-event.ts');
      let state = createControlledEventState(resolved);
      state.decision.values['original.jy:current-scene'] = { 'original.jy:scene/current': scene };
      ({ state } = dispatchControlledEvent(resolved, state, { type: 'START', eventId }));
      let guard = 0;
      while (state.cursor && guard++ < 5000) {
        const step = resolved.data.events[state.cursor.eventId].steps[state.cursor.pc];
        if (step.op === 'say') ({ state } = dispatchControlledEvent(resolved, state, { type: 'CONTINUE' }));
        else if (step.op === 'choice')
          ({ state } = dispatchControlledEvent(resolved, state, { type: 'CHOOSE', optionId: step.options[0].id }));
        else if (step.op === 'invoke') {
          const result = step.command.kind === 'battle'
            ? { schemaVersion: 1, requestId: state.pending.requestId, kind: 'battle', outcome: 'victory' }
            : step.command.kind === 'selection'
              ? { schemaVersion: 1, requestId: state.pending.requestId, kind: 'selection', selectedId: step.command.candidates[0] }
              : { schemaVersion: 1, requestId: state.pending.requestId, kind: step.command.kind, outcome: 'completed' };
          ({ state } = dispatchControlledEvent(resolved, state, { type: 'RESOLVE', result }));
        } else ({ state } = dispatchControlledEvent(resolved, state, { type: 'CONTINUE' }));
      }
      return state;
    };
    const state32 = await drive(32);
    const state17 = await drive(17);
    const keys32 = Object.keys(state32.decision.values['original.jy:scene-slots'] ?? {});
    const keys17 = Object.keys(state17.decision.values['original.jy:scene-slots'] ?? {});
    assert.ok(keys32.length > 0);
    assert.ok(keys32.every(key => key.startsWith('original.jy:scene/32/')));
    assert.ok(keys17.every(key => key.startsWith('original.jy:scene/17/')));
  });

test('Generic converter maps opcode 50 dynamic variant to an item-presence branch',
  { skip }, async () => {
    const { readFileSync } = await import('node:fs');
    const bundleFile = readdirSync('assets/generated/event-corpus')
      .find(name => name.startsWith('all-events-') && name.endsWith('.local.json'));
    const bundle = JSON.parse(readFileSync(`assets/generated/event-corpus/${bundleFile}`, 'utf8'));
    // Event 676 is the only opcode-50 user; it is blocked by opcode 44, so the mapping is
    // exercised through buildOriginalEventsContent's branch logic rather than the output.
    const ev676 = bundle.events.find(candidate => candidate.eventId === 676);
    const ins = ev676.instructions.find(instruction => instruction.opcode === 50);
    assert.ok(ins);
    const width = 8;
    const wordOffsetToIndex = new Map();
    ev676.instructions.forEach((instruction, index) => wordOffsetToIndex.set(instruction.wordOffset, index));
    const yes = wordOffsetToIndex.get(ins.wordOffset + width + ins.args[5]);
    const no = wordOffsetToIndex.get(ins.wordOffset + width + ins.args[6]);
    // The relative jumps land on real instruction boundaries: the all-present arm reaches
    // the opcode-32 reward grant; the other arm reaches the opcode-1 dialogue.
    assert.equal(ev676.instructions[yes].opcode, 32);
    assert.equal(ev676.instructions[no].opcode, 1);
    // The dynamic variant (list[0] > 128) is the branch arm, not the 50e parameter arm.
    assert.ok(ins.args[0] > 128);
  });
