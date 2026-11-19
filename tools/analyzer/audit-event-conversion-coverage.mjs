/** Static per-event conversion readiness. Never executes original instructions. */
import { readFile, mkdir, realpath, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseIdxGrpIndex, readIdxGrpResource } from '../../packages/game-data/src/idx-grp.ts';
import { decodeTalk, readDialogueOnlyEvent } from '../../packages/game-data/src/original.ts';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sha = value => createHash('sha256').update(value).digest('hex');
const fail = code => { throw new Error(`EVENT_COVERAGE_${code}`); };
const sourceNames = ['KDEF.IDX', 'KDEF.GRP', 'TALK.IDX', 'TALK.GRP', 'ALLDEF.GRP', 'RANGER.IDX', 'RANGER.GRP'];
const observed673Hashes = {
  'KDEF.IDX': 'bf02eccf1dab01fd0ae033cdf807f56b978a71a6c2ab9be05e366239b485104b',
  'KDEF.GRP': '135c5e097a7fe561ee931046e1bebf55de9b469678e3d111d8e9f2c6bb600e06',
  'TALK.IDX': 'ac0cd18601ca1eb8aae2b0e2203c0082bcc14353ee66bfb6bc98e4e79ce92495',
  'TALK.GRP': '5cde11862ed7a52ffd45920e8f19ff21a5065bfe4c02036c524a504a5cb91811',
  'ALLDEF.GRP': '3633122f6a43f0b5dd390c2fa2516766d735a064ca955c8766b73232230a4480',
  'RANGER.IDX': '52c1545c8c0aa4d7919916ae840fb15f2772c567811ab9b9056e55b2e17ff92c',
  'RANGER.GRP': '07b99e3c1676e18691f00d6dfe713121faa6f7429e43666bc83e1568cecb68ab',
};
const exactHash = (corpus, name, bytes) => {
  const input = corpus.inputs?.find(row => row.sourceFile === name);
  if (!input || input.byteLength !== bytes.length || input.sha256 !== sha(bytes)) fail(`SOURCE:${name}`);
};

export function auditEventConversionCoverage(corpus, files) {
  if (corpus?.schemaVersion !== 1 || corpus.converterVersion !== '0.3.0' ||
      corpus.executable !== false || !Array.isArray(corpus.events) || !Array.isArray(corpus.talks) ||
      !Array.isArray(corpus.eventReferences) || !Array.isArray(corpus.invalidEventReferences) ||
      corpus.layoutSource?.commit !== '1d439afe76dae41c821065c3a33c1c6709dc7fce') fail('CORPUS');
  for (const name of sourceNames)
    exactHash(corpus, name, files[name]);
  const eventRanges = parseIdxGrpIndex(files['KDEF.IDX'], files['KDEF.GRP'].length);
  const talkRanges = parseIdxGrpIndex(files['TALK.IDX'], files['TALK.GRP'].length);
  const rangerRanges = parseIdxGrpIndex(files['RANGER.IDX'], files['RANGER.GRP'].length);
  if (eventRanges.length !== corpus.events.length || talkRanges.length !== corpus.talks.length ||
      corpus.events.length !== corpus.summary?.events || corpus.talks.length !== corpus.summary?.dialogues) fail('COUNT');
  const sceneRange = rangerRanges[3];
  if (rangerRanges.length !== 6 || !sceneRange || sceneRange.byteLength % 52 ||
      files['ALLDEF.GRP'].length < sceneRange.byteLength / 52 * 4400) fail('SCENE_LAYOUT');
  const allDef = new DataView(files['ALLDEF.GRP'].buffer, files['ALLDEF.GRP'].byteOffset,
    files['ALLDEF.GRP'].byteLength);
  const expectedRefs = [], expectedInvalidRefs = [];
  for (let sceneId = 0; sceneId < sceneRange.byteLength / 52; sceneId++) for (let slotId = 0; slotId < 200; slotId++) {
    const sourceOffset = sceneId * 4400 + slotId * 22 + 4;
    const eventId = allDef.getInt16(sourceOffset, true);
    if (eventId < 0) continue;
    const row = { sceneId, slotId, eventId, sourceFile: 'ALLDEF.GRP', sourceOffset };
    (eventId < eventRanges.length ? expectedRefs : expectedInvalidRefs).push(row);
  }
  if (JSON.stringify(corpus.eventReferences) !== JSON.stringify(expectedRefs) ||
      JSON.stringify(corpus.invalidEventReferences) !== JSON.stringify(expectedInvalidRefs)) fail('INITIAL_REFERENCES');
  const talkStatus = corpus.talks.map((talk, id) => {
    const range = talkRanges[id], raw = readIdxGrpResource(files['TALK.GRP'], range);
    if (talk.talkId !== id || talk.sourceOffset !== range.sourceOffset ||
        talk.byteLength !== range.byteLength || talk.sha256 !== sha(raw) ||
        talk.rawBase64 !== Buffer.from(raw).toString('base64')) fail(`TALK:${id}`);
    const decoded = decodeTalk(raw);
    return { exists: true, readable: talk.decoded && !decoded.hasUnknownControls };
  });
  const references = new Map();
  for (const ref of corpus.eventReferences) {
    if (!Number.isInteger(ref.eventId) || ref.eventId < 0 || ref.eventId >= eventRanges.length) fail('REFERENCE');
    references.set(ref.eventId, (references.get(ref.eventId) ?? 0) + 1);
  }
  const byOpcode = new Map(), signatureCounts = new Map(), opcode3Profiles = new Map();
  const events = corpus.events.map((event, id) => {
    const range = eventRanges[id], raw = readIdxGrpResource(files['KDEF.GRP'], range);
    if (event.eventId !== id || event.sourceOffset !== range.sourceOffset ||
        event.byteLength !== range.byteLength || event.sha256 !== sha(raw) ||
        event.rawBase64 !== Buffer.from(raw).toString('base64') || raw.length % 2) fail(`EVENT:${id}`);
    const words = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
    let at = 0, dialogueRefsValid = true, dialoguePreviewParametersValid = true;
    const opcodes = new Set();
    for (const [index, row] of event.instructions.entries()) {
      if (row.wordOffset !== at || row.sourceByteOffset !== range.sourceOffset + at * 2 ||
          row.opcode !== words.getInt16(at * 2, true)) fail(`INSTRUCTION:${id}:${index}`);
      if (row.opcode === -1) {
        if (index !== event.instructions.length - 1 || at !== raw.length / 2 - 1 || row.kind !== 'terminator')
          fail(`TERMINATOR:${id}`);
        at++;
        continue;
      }
      const next = event.instructions[index + 1];
      if (!next || row.kind !== 'instruction' || !Array.isArray(row.args) ||
          next.wordOffset !== at + row.args.length + 1 ||
          row.args.some((value, offset) => value !== words.getInt16((at + 1 + offset) * 2, true)))
        fail(`ARGUMENTS:${id}:${index}`);
      if (row.opcode === 1) {
        const ref = row.dialogueRef;
        if (!ref || ref.talkId !== row.args[0] || !talkStatus[ref.talkId]?.exists) dialogueRefsValid = false;
        if (!ref || ref.portraitId !== row.args[1] || ref.side !== row.args[2] ||
            ref.portraitId < 0 || ![0,1,2].includes(ref.side) || !talkStatus[ref.talkId]?.readable)
          dialoguePreviewParametersValid = false;
      }
      opcodes.add(row.opcode);
      if (row.opcode === 3) {
        const pattern = row.args.map(value => value === -2 ? '-2' : value === -1 ? '-1' :
          value === 0 ? '0' : value > 0 ? '+' : 'other-negative').join(',');
        const profile = opcode3Profiles.get(pattern) ?? { pattern, occurrences: 0, eventIds: new Set() };
        profile.occurrences++; profile.eventIds.add(id); opcode3Profiles.set(pattern, profile);
      }
      const count = byOpcode.get(row.opcode) ?? { opcode: row.opcode, occurrences: 0, events: 0 };
      count.occurrences++;
      byOpcode.set(row.opcode, count);
      at = next.wordOffset;
    }
    if (at !== raw.length / 2) fail(`LENGTH:${id}`);
    const boundaries = new Set(event.instructions.map(row => row.wordOffset));
    boundaries.add(raw.length / 2);
    const candidateBranchIssues = event.instructions.filter(row => row.opcode !== 50 &&
      row.candidateBranchTargets?.some(target => !Number.isInteger(target) || !boundaries.has(target)))
      .map(row => ({ opcode: row.opcode, wordOffset: row.wordOffset }));
    for (const opcode of opcodes) byOpcode.get(opcode).events++;
    const signature = [...opcodes].sort((a,b) => a-b).join(',');
    signatureCounts.set(signature, (signatureCounts.get(signature) ?? 0) + 1);
    let preview = false, previewReason = 'EFFECT_OR_CONTROL';
    try {
      const parsed = readDialogueOnlyEvent(files['KDEF.IDX'], files['KDEF.GRP'], id);
      if (!parsed.dialogues.length) previewReason = 'NO_DIALOGUE';
      else if (!dialogueRefsValid || !dialoguePreviewParametersValid) previewReason = 'DIALOGUE_PREVIEW_PARAMETERS';
      else { preview = true; previewReason = null; }
    } catch (cause) { previewReason = cause instanceof Error ? cause.message.split(':')[0] : 'READER_ERROR'; }
    const scopedRuntime = id === 673 && event.sha256 === '342fdafe0835fcf976d445c40db8d0c2dcd5ca7ab7f32df04c5cc85257feb275' &&
      sourceNames.every(name => corpus.inputs.find(row => row.sourceFile === name)?.sha256 === observed673Hashes[name]);
    return { eventId: id, sourceOffset: range.sourceOffset, byteLength: range.byteLength, sha256: event.sha256,
      instructionCount: event.instructions.length - 1, opcodeSignature: signature,
      currentInteractionReferences: references.get(id) ?? 0, candidateLayoutValid: true,
      dialogueRefsValid, dialoguePreviewParametersValid,
      candidateBranchTargetsValid: candidateBranchIssues.length === 0,
      candidateBranchIssues, previewEligible: preview, previewReason,
      runtimeStatus: scopedRuntime ? 'source-locked-observed-path-only' : 'no-source-locked-rule-adapter',
      nonDialogueOpcodes: [...opcodes].filter(opcode => ![0, 1, 7].includes(opcode)).sort((a,b)=>a-b) };
  });
  if (events.length !== corpus.summary.events ||
      events.reduce((count, row) => count + row.instructionCount + 1, 0) !== corpus.summary.instructions) fail('SUMMARY');
  const summary = { events: events.length, candidateLayoutValid: events.length,
    dialogueRefsValid: events.filter(e => e.dialogueRefsValid).length,
    dialoguePreviewParametersValid: events.filter(e => e.dialoguePreviewParametersValid).length,
    candidateBranchTargetsValid: events.filter(e => e.candidateBranchTargetsValid).length,
    previewEligible: events.filter(e => e.previewEligible).length,
    previewReasonCounts: Object.fromEntries([...new Set(events.map(e => e.previewReason ?? 'eligible'))]
      .sort().map(reason => [reason,events.filter(e => (e.previewReason ?? 'eligible') === reason).length])),
    sourceLockedObservedPaths: events.filter(e => e.runtimeStatus === 'source-locked-observed-path-only').length,
    noSourceLockedRuleAdapter: events.filter(e => e.runtimeStatus === 'no-source-locked-rule-adapter').length,
    currentInteractionReferences: corpus.eventReferences.length,
    invalidCurrentInteractionReferences: corpus.invalidEventReferences.length,
    distinctOpcodeSignatures: signatureCounts.size,
    topNonDialogueOpcodes: [...byOpcode.values()].filter(row => ![0,1,7].includes(row.opcode))
      .sort((a,b)=>b.events-a.events||a.opcode-b.opcode).slice(0,12),
    topSignatures: [...signatureCounts].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,12)
      .map(([opcodes,count])=>({opcodes,count})),
    opcode3ParameterProfiles: opcode3Profiles.size,
    topOpcode3Profiles: [...opcode3Profiles.values()].sort((a,b)=>b.eventIds.size-a.eventIds.size||
      b.occurrences-a.occurrences||a.pattern.localeCompare(b.pattern)).slice(0,10)
      .map(row=>({pattern:row.pattern,occurrences:row.occurrences,events:row.eventIds.size,
        firstEventId:Math.min(...row.eventIds)})),
  };
  return { auditVersion: 1, classification: 'static-candidate-and-scoped-runtime-coverage',
    sourceLock: Object.fromEntries(corpus.inputs.map(row => [row.sourceFile,row.sha256])),
    layoutSource: corpus.layoutSource, summary, events,
    limitations: [
      'Every event was checked statically; only a source-locked observed path in event 673 has an executable adapter.',
      'FishEdit instruction boundaries are candidate structure, not original DOS execution proof.',
      'Preview eligibility is the narrow dialogue-only reader, not natural reachability or all-branch safety.',
      'Current interaction references do not include dynamic event writes, automatic or item triggers.',
    ] };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    if (process.argv.length !== 4) fail('USAGE: <corpus.local.json> <original-directory>');
    const corpus = JSON.parse(await readFile(process.argv[2], 'utf8'));
    const files = Object.fromEntries(await Promise.all(sourceNames.map(async name =>
      [name, new Uint8Array(await readFile(path.join(process.argv[3], name)))])));
    const report = auditEventConversionCoverage(corpus, files);
    const root = await realpath(path.join(project, 'assets/generated'));
    const output = path.join(root, 'event-coverage');
    await mkdir(output, { recursive: true });
    const actual = await realpath(output), relative = path.relative(root, actual);
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) fail('OUTPUT_PATH');
    const raw = JSON.stringify(report, null, 2) + '\n';
    const destination = path.join(actual, `event-coverage-${sha(raw).slice(0,16)}.local.json`);
    try { await writeFile(destination, raw, { flag: 'wx' }); }
    catch (cause) { if (cause.code !== 'EEXIST' || await readFile(destination,'utf8') !== raw) throw cause; }
    console.log(JSON.stringify({ destination, summary: report.summary }, null, 2));
  } catch (cause) { console.error(cause.message); process.exitCode = 1; }
}
