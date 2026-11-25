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

test('Generic converter keeps a no-op for uninterpreted effects and records it in diagnostics',
  { skip }, async () => {
    const { readFileSync } = await import('node:fs');
    const bundleFile = readdirSync('assets/generated/event-corpus')
      .find(name => name.startsWith('all-events-') && name.endsWith('.local.json'));
    const bundle = JSON.parse(readFileSync(`assets/generated/event-corpus/${bundleFile}`, 'utf8'));
    const { content, diagnostics } = buildOriginalEventsContent();
    // Opcode 33 (skill learn) has community-source evidence but its skill-array effect is
    // not modeled in this slice, so it maps to a no-op decide and is recorded in diagnostics.
    const rows = diagnostics.eventDiagnostics.flatMap(row => row.uninterpreted
      .filter(note => note.note === 'skill-learn-uninterpreted').map(note => ({ ...note, eventId: row.eventId })));
    assert.ok(rows.length > 0);
    for (const row of rows) {
      const event = bundle.events.find(candidate => candidate.eventId === row.eventId);
      const stepIndex = event.instructions.findIndex(instruction => instruction.wordOffset === row.wordOffset);
      const steps = content.events[`original.jy.events:event/${row.eventId}`].steps;
      assert.equal(steps[stepIndex].op, 'decide');
      assert.deepEqual(steps[stepIndex].plan, { schemaVersion: 1, cases: [], otherwise: [] });
    }
  });
