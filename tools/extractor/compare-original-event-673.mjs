/** Scoped source-to-runtime comparison for one observed DOS path, not an opcode 3/34 rule. */
import { createHash } from 'node:crypto';
import { readFile, mkdir, realpath, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseIdxGrpIndex, readIdxGrpResource } from '../../packages/game-data/src/idx-grp.ts';
import { decodeTalk, ORIGINAL_PARSER_VERSION } from '../../packages/game-data/src/original.ts';
import { openOriginalEventSlotTable, createOriginalEventSlotOverlay, readOriginalEventSlot,
  updateOriginalEventSlot } from '../../packages/game-data/src/original-event-slots.ts';
import { openOriginalRoleTable, createOriginalRoleOverlay, readOriginalRoleInt16,
  originalRoleFieldSourceOffset } from '../../packages/game-data/src/original-role-records.ts';
import { createDecisionEventState, dispatchDecisionEvent, resolveDecisionEventContent,
  restoreDecisionEventSave, serializeDecisionEventSave } from '../../packages/game-core/src/decision-event.ts';
import { readDecisionValue } from '../../packages/game-core/src/decision.ts';
import { canonical } from '../../packages/game-core/src/content.ts';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const pinned = {
  'KDEF.IDX': 'bf02eccf1dab01fd0ae033cdf807f56b978a71a6c2ab9be05e366239b485104b',
  'KDEF.GRP': '135c5e097a7fe561ee931046e1bebf55de9b469678e3d111d8e9f2c6bb600e06',
  'TALK.IDX': 'ac0cd18601ca1eb8aae2b0e2203c0082bcc14353ee66bfb6bc98e4e79ce92495',
  'TALK.GRP': '5cde11862ed7a52ffd45920e8f19ff21a5065bfe4c02036c524a504a5cb91811',
  'ALLDEF.GRP': '3633122f6a43f0b5dd390c2fa2516766d735a064ca955c8766b73232230a4480',
  'RANGER.IDX': '52c1545c8c0aa4d7919916ae840fb15f2772c567811ab9b9056e55b2e17ff92c',
  'RANGER.GRP': '07b99e3c1676e18691f00d6dfe713121faa6f7429e43666bc83e1568cecb68ab',
};
const recordHash = '342fdafe0835fcf976d445c40db8d0c2dcd5ca7ab7f32df04c5cc85257feb275';
const namespace = 'original.jy.comparison673';
const statRef = { domain: 'original.jy:stats', key: 'original.jy:hero/aptitude' };
const slotRef = { domain: 'original.jy:event-slots', key: 'original.jy:scene/32/slot/0/field/2' };
const literal = value => ({ kind: 'literal', value });
const read = ref => ({ kind: 'read', ref });
const equals = (ref, value) => ({ op: 'compare', left: read(ref), relation: 'eq', right: literal(value) });
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

export async function readEvent673Sources(directory) {
  return Object.fromEntries(await Promise.all(Object.keys(pinned).map(async name =>
    [name, new Uint8Array(await readFile(path.join(directory, name)))])));
}

export async function convertVerifiedEvent673(sources) {
  for (const [name, expected] of Object.entries(pinned))
    if (!(sources[name] instanceof Uint8Array) || hash(sources[name]) !== expected)
      throw new Error(`EVENT673_SOURCE_MISMATCH:${name}`);
  const eventRanges = parseIdxGrpIndex(sources['KDEF.IDX'], sources['KDEF.GRP'].length);
  const range = eventRanges[673];
  if (!range || range.sourceOffset !== 100752 || range.byteLength !== 158)
    throw new Error('EVENT673_RECORD_RANGE');
  const raw = readIdxGrpResource(sources['KDEF.GRP'], range);
  if (hash(raw) !== recordHash) throw new Error('EVENT673_RECORD_HASH');
  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  const words = Array.from({ length: raw.length / 2 }, (_, i) => view.getInt16(i * 2, true));
  const talks = [];
  for (let i = 0; i < 12; i++) {
    const at = i * 5;
    if (words[at] !== 1 || words[at + 4] !== 0 || words[at + 1] < 0 ||
        words[at + 2] < 0 || ![0, 1, 2].includes(words[at + 3])) throw new Error('EVENT673_DIALOGUE_LAYOUT');
    talks.push({ talkId: words[at + 1], portraitId: words[at + 2], side: words[at + 3],
      wordOffset: at, sourceByteOffset: range.sourceOffset + at * 2 });
  }
  const expectedTail = [3,-2,-2,-2,-2,674,-1,-1,-2,-2,-2,-2,-2,-2,34,0,3,0,-1];
  if (words.slice(60).join(',') !== expectedTail.join(',')) throw new Error('EVENT673_EFFECT_LAYOUT');
  const table = await openOriginalEventSlotTable(sources['ALLDEF.GRP']);
  const originalSlot = readOriginalEventSlot(table, createOriginalEventSlotOverlay(table), 32, 0);
  if (originalSlot[2] !== 673) throw new Error('EVENT673_INITIAL_SLOT');
  const roleTable = await openOriginalRoleTable(sources['RANGER.IDX'], sources['RANGER.GRP']);
  if (readOriginalRoleInt16(roleTable, createOriginalRoleOverlay(roleTable), 0, 120) !== 50)
    throw new Error('EVENT673_BASE_ROLE');
  const talkRanges = parseIdxGrpIndex(sources['TALK.IDX'], sources['TALK.GRP'].length);
  const dialogues = {}, talkSources = [];
  for (const { talkId, portraitId } of talks) {
    if (!talkRanges[talkId]) throw new Error('EVENT673_TALK_REFERENCE');
    const talkRaw = readIdxGrpResource(sources['TALK.GRP'], talkRanges[talkId]);
    const decoded = decodeTalk(talkRaw);
    if (decoded.hasUnknownControls) throw new Error('EVENT673_TALK_CONTROL');
    dialogues[`${namespace}:talk/${talkId}`] = { speaker: `portrait:${portraitId}`, text: decoded.displayText };
    talkSources.push({ resourceId: talkId, sourceFile: 'TALK.GRP',
      sourceOffset: talkRanges[talkId].sourceOffset, byteLength: talkRanges[talkId].byteLength,
      sha256: hash(talkRaw) });
  }
  const before = { op: 'all', conditions: [equals(statRef, 72), equals(slotRef, 673)] };
  const content = {
    schemaVersion: 1, id: namespace, version: '0.1.0', classification: 'original-derived',
    // Comparison-only coordinate; no scene transition or original position is inferred.
    entry: { mapId: 'original.jy:comparison/scene32', x: 0, y: 0 },
    decision: { schemaVersion: 1, domains: {
      'original.jy:stats': { kind: 'integer', default: 72, min: -32768, max: 32767,
        allowedKeys: [statRef.key] },
      'original.jy:event-slots': { kind: 'integer', default: 673, min: -32768, max: 32767,
        allowedKeys: [slotRef.key] },
    } },
    dialogues,
    events: { [`${namespace}:event/673`]: { steps: [
      ...talks.map(({talkId}) => ({ op: 'say', dialogueId: `${namespace}:talk/${talkId}` })),
      { op: 'decide', plan: { schemaVersion: 1, cases: [{ when: before, effects: [
        { op: 'add', target: statRef, amount: literal(3) },
        { op: 'set', target: slotRef, value: literal(674) },
      ] }], otherwise: [{ op: 'require', condition: before }] } },
      { op: 'end' },
    ] } },
  };
  return { content, table, roleTable, provenance: { converterVersion: '0.1.0', parserVersion: ORIGINAL_PARSER_VERSION,
    sourceHashes: pinned, eventId: 673,
    eventRecord: { sourceFile: 'KDEF.GRP', sourceOffset: range.sourceOffset,
      byteLength: range.byteLength, sha256: recordHash }, dialogues: talks, talkSources,
    roleField: { sourceFile: 'RANGER.GRP', roleId: 0, byteOffset: 120,
      sourceOffset: originalRoleFieldSourceOffset(roleTable, 0, 120), baseValue: 50,
      sampledBefore: 72, sampledAfter: 75 },
    observedEffectWords: { eventSlot: 60, aptitude: 74 },
    evidence: 'docs/validation/opcode-34-dos-observation.md',
    scope: 'Observed protagonist aptitude 72→75 and scene 32 slot 0 event 673→674 only; opcode 0 presentation omitted.' } };
}

export async function compareVerifiedEvent673(converted) {
  const content = await resolveDecisionEventContent(converted.content);
  const initial = createDecisionEventState(content);
  let state = dispatchDecisionEvent(content, initial, { type: 'START', eventId: `${namespace}:event/673` }).state;
  let observedDialogues = 1;
  for (let i = 0; i < 12; i++) {
    // Round-trip at a pause to verify that the converted path can resume.
    if (i === 5) state = restoreDecisionEventSave(content, serializeDecisionEventSave(content, state));
    const result = dispatchDecisionEvent(content, state, { type: 'CONTINUE' });
    observedDialogues += result.notices.filter(notice => notice.type === 'DIALOGUE').length;
    state = result.state;
  }
  const aptitude = readDecisionValue(content.data.decision, state.decision, statRef);
  const nextEvent = readDecisionValue(content.data.decision, state.decision, slotRef);
  if (state.cursor || observedDialogues !== 12 || aptitude !== 75 || nextEvent !== 674)
    throw new Error('EVENT673_COMPARISON_MISMATCH');
  const original = createOriginalEventSlotOverlay(converted.table);
  const beforeSlot = readOriginalEventSlot(converted.table, original, 32, 0);
  const updated = updateOriginalEventSlot(converted.table, original, 32, 0, [[2, nextEvent]]);
  const afterSlot = readOriginalEventSlot(converted.table, updated, 32, 0);
  if (afterSlot.some((value, field) => value !== (field === 2 ? 674 : beforeSlot[field])))
    throw new Error('EVENT673_SLOT_COMPARISON_MISMATCH');
  return { classification: 'scoped original-derived comparison', eventId: 673,
    contentSha256: content.identity.sha256, dialogueCount: observedDialogues,
    aptitude: { before: 72, after: aptitude, source: 'DOS active role record offset 120' },
    eventSlot: { sceneId: 32, slotId: 0, field: 2, before: beforeSlot[2], after: afterSlot[2] },
    matchesObservedPostconditions: true,
    limitations: 'Comparison-only state. Other opcode 3 fields, opcode 34 limits, opcode 0 display and natural reachability are unverified.' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    if (process.argv.length !== 3) throw new Error('Usage: node tools/extractor/compare-original-event-673.mjs <original-directory>');
    const converted = await convertVerifiedEvent673(await readEvent673Sources(process.argv[2]));
    const comparison = await compareVerifiedEvent673(converted);
    const output = path.join(project, 'assets/generated/event-comparisons');
    await mkdir(output, { recursive: true });
    const root = await realpath(path.join(project, 'assets/generated')), actual = await realpath(output);
    const relative = path.relative(root, actual);
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('EVENT673_OUTPUT_PATH');
    const artifact = { content: converted.content, provenance: converted.provenance, comparison };
    const name = `event-673-${hash(Buffer.from(canonical(artifact))).slice(0,16)}.local.json`;
    const destination = path.join(actual, name);
    try { await writeFile(destination, JSON.stringify(artifact, null, 2) + '\n', { flag: 'wx' }); }
    catch (cause) {
      if (cause.code !== 'EEXIST' || canonical(JSON.parse(await readFile(destination, 'utf8'))) !== canonical(artifact)) throw cause;
    }
    console.log(JSON.stringify({ destination, comparison }, null, 2));
  } catch (cause) { console.error(cause.message); process.exitCode = 1; }
}
