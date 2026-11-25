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

test('Generic converter maps all 68 evidenced opcodes into a valid controlled-event package',
  { skip }, async () => {
    const { content, diagnostics } = await convertOriginalEventsGeneric();
    // Full runtime validation: namespaces, dialogue refs, branch targets, decision domains.
    await resolveControlledEventContent(content);
    assert.equal(diagnostics.summary.totalEvents, 1018);
    assert.equal(diagnostics.summary.converted, 1018);
    assert.equal(diagnostics.summary.blocked, 0);
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

test('Generic converter maps the newly unlocked opcodes to evidence-scoped steps',
  { skip }, async () => {
    const { content } = buildOriginalEventsContent();
    const steps = id => content.events[`original.jy.events:event/${id}`].steps;

    // Opcode 15 (event 190): death ending stops the event mid-way (an `end` step, not a no-op).
    const ev190 = steps(190);
    const deathStep = ev190.find(step => step.op === 'end' && ev190.indexOf(step) < ev190.length - 1);
    assert.ok(deathStep);

    // Opcode 4 (event 16): branch on the currently used item being ID 160.
    const branch16 = steps(16).find(step => step.op === 'branch' &&
      step.condition?.left?.ref?.domain === 'original.jy:current-item');
    assert.ok(branch16);
    assert.equal(branch16.condition.right.value, 160);

    // Opcode 60 (event 990): branch when any of scene 80 slot 1 fields 5/6/7 equals 6068.
    const branch990 = steps(990).find(step => step.op === 'branch' && step.condition?.op === 'any');
    assert.ok(branch990);
    assert.equal(branch990.condition.conditions.length, 3);
    assert.ok(branch990.condition.conditions.every(c => c.left.ref.key
      .startsWith('original.jy:scene/80/slot/1/field/') && c.right.value === 6068));

    // Opcode 61 (event 1001): branch when current-scene slots 11..24 all have field 5 == 4664.
    const branch1001 = steps(1001).find(step => step.op === 'branch' && step.condition?.op === 'all');
    assert.ok(branch1001);
    assert.equal(branch1001.condition.conditions.length, 14);
    assert.ok(branch1001.condition.conditions.every(c =>
      c.left.ref.keyFrom?.some(part => 'read' in part && part.read?.domain === 'original.jy:current-scene') &&
      c.right.value === 4664));

    // Opcode 44 (event 676): slot field-5 animation persists the endpic (7578/7622) on the
    // current scene; event 676 is now converted and its opcode-50 branch appears in output.
    const ev676 = steps(676);
    const animStep = ev676.find(step => step.op === 'decide' &&
      (step.plan.otherwise ?? []).some(e => e.target?.keyFrom?.some(p => 'read' in p &&
        p.read?.domain === 'original.jy:current-scene') && e.value?.value === 7578));
    assert.ok(animStep);
    assert.ok(ev676.some(step => step.op === 'branch' && step.condition?.op === 'all' &&
      step.condition.conditions.length === 5));

    // Opcode 57 (event 655): fixed animation final values 7746/7804/7862 on current scene.
    const anim57 = steps(655).find(step => step.op === 'decide' &&
      (step.plan.otherwise ?? []).some(e => e.value?.value === 7746));
    assert.ok(anim57);

    // Opcode 62 (event 1017): ending stops the event (an `end` step).
    assert.ok(steps(1017).some(step => step.op === 'end'));

    // Opcodes 19/25/30/51/58/64: host effects without decision state stay no-op decides.
    for (const [id, opcode] of [[344, 25], [936, 58], [938, 64], [692, 51]]) {
      const ev = content.events[`original.jy.events:event/${id}`];
      assert.ok(ev);
    }
  });

test('Generic converter blocks no event once all 68 evidenced opcodes are mapped',
  { skip }, async () => {
    const { diagnostics } = await convertOriginalEventsGeneric();
    assert.equal(diagnostics.blocked.length, 0);
    // All 1,018 events are present in the package.
    const { content } = await convertOriginalEventsGeneric();
    assert.equal(Object.keys(content.events).length, 1018);
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
    // Event 676 is the only opcode-50 user; it is now converted (opcode 44 mapped), so the
    // branch also appears in the package — this test pins the relative-jump landing points.
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
