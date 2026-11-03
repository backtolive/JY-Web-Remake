import { readFile, mkdir, writeFile, realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseIdxGrpIndex, readIdxGrpResource } from '../../packages/game-data/src/idx-grp.ts';
import { readDialogueOnlyEvent, decodeTalk, readOriginalScene, ORIGINAL_PARSER_VERSION } from '../../packages/game-data/src/original.ts';

const names = ['KDEF.IDX', 'KDEF.GRP', 'TALK.IDX', 'TALK.GRP', 'RANGER.IDX', 'RANGER.GRP', 'ALLSIN.GRP', 'ALLDEF.GRP'];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

/** Metadata only. Acceptance describes parser support, never DOS reachability or rule fidelity. */
export function catalogueDialogueEvents(data) {
  const events = parseIdxGrpIndex(data['KDEF.IDX'], data['KDEF.GRP'].length);
  const talks = parseIdxGrpIndex(data['TALK.IDX'], data['TALK.GRP'].length);
  const sceneSections = parseIdxGrpIndex(data['RANGER.IDX'], data['RANGER.GRP'].length);
  if (sceneSections.length !== 6 || sceneSections[3].byteLength % 52) throw new Error('SCENE_RECORD_LAYOUT');
  const references = new Map();
  const invalidSceneReferences = [];
  for (let sceneId = 0; sceneId < sceneSections[3].byteLength / 52; sceneId++) {
    const scene = readOriginalScene(data['RANGER.IDX'], data['RANGER.GRP'], data['ALLSIN.GRP'], data['ALLDEF.GRP'], sceneId);
    for (const [slotId, fields] of scene.eventFields.entries()) {
      // Only the current interaction field is indexed. Item/automatic triggers and dynamic writes are outside scope.
      const eventId = fields[2];
      if (eventId < 0) continue;
      const ref = { sceneId, slotId, sourceFile: 'ALLDEF.GRP', sourceOffset: sceneId * 4400 + slotId * 22 + 4,
        cells: scene.layers[3].flatMap((value, cell) => value === slotId ? [cell] : []) };
      if (!events[eventId]) { invalidSceneReferences.push({ eventId, ...ref }); continue; }
      if (!references.has(eventId)) references.set(eventId, []);
      references.get(eventId).push(ref);
    }
  }
  const entries = events.map(range => {
    const entry = { eventId: range.resourceId, sourceFile: 'KDEF.GRP', sourceOffset: range.sourceOffset,
      byteLength: range.byteLength, sha256: hash(readIdxGrpResource(data['KDEF.GRP'], range)),
      sceneReferences: references.get(range.resourceId) ?? [] };
    try {
      const event = readDialogueOnlyEvent(data['KDEF.IDX'], data['KDEF.GRP'], range.resourceId);
      const dialogues = event.dialogues.map(ref => {
        const talkRange = talks[ref.talkId];
        if (!talkRange) throw new Error(`TALK_REFERENCE:${ref.talkId}@${ref.wordOffset}`);
        const raw = readIdxGrpResource(data['TALK.GRP'], talkRange);
        let talk;
        try { talk = decodeTalk(raw); }
        catch (error) {
          if (error instanceof TypeError && error.code === 'ERR_ENCODING_INVALID_ENCODED_DATA') throw new Error(`TALK_DECODE_ERROR:${ref.talkId}@${ref.wordOffset}`);
          throw error;
        }
        if (talk.hasUnknownControls) throw new Error(`TALK_UNKNOWN_CONTROL:${ref.talkId}@${ref.wordOffset}`);
        return { ...ref, eventByteOffset: range.sourceOffset + ref.wordOffset * 2,
          sourceFile: 'TALK.GRP', sourceOffset: talkRange.sourceOffset, byteLength: talkRange.byteLength,
          sha256: hash(raw), codec: talk.codec };
      });
      return { ...entry, status: dialogues.length ? 'dialogue-only' : 'empty', dialogues };
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      // Unexpected programming errors must fail the run instead of being mistaken for unsupported data.
      if (!/^(EVENT_|UNSUPPORTED_OPCODE:|TALK_)/.test(error.message)) throw error;
      return { ...entry, status: 'rejected', reason: error.message };
    }
  });
  const rejectionCounts = {};
  for (const entry of entries.filter(entry => entry.status === 'rejected')) {
    const category = entry.reason.split('@')[0];
    rejectionCounts[category] = (rejectionCounts[category] ?? 0) + 1;
  }
  return { schemaVersion: 1, catalogueVersion: '0.1.0', parserVersion: ORIGINAL_PARSER_VERSION,
    confidence: 'Community Implementation', sourceCommit: '4d225cb9b7b9a3ac46a796ecb0acde525ef72acc',
    scope: 'Static 0/1/7/-1 subset and current interaction references only; no reachability, conversion, or original-rule verification.',
    sources: names.map(sourceFile => ({ sourceFile, byteLength: data[sourceFile].length, sha256: hash(data[sourceFile]) })),
    summary: { total: entries.length, dialogueOnly: entries.filter(entry => entry.status === 'dialogue-only').length,
      empty: entries.filter(entry => entry.status === 'empty').length, rejected: entries.filter(entry => entry.status === 'rejected').length,
      rejectionCounts, invalidSceneReferences: invalidSceneReferences.length },
    invalidSceneReferences, entries };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    if (process.argv.length !== 3) throw new Error('Usage: node tools/analyzer/catalogue-dialogue-events.mjs <original-directory>');
    const input = path.resolve(process.argv[2]);
    const data = Object.fromEntries(await Promise.all(names.map(async name => [name, await readFile(path.join(input, name))])));
    const report = catalogueDialogueEvents(data);
    for (const name of names) if (hash(await readFile(path.join(input, name))) !== hash(data[name])) throw new Error(`SOURCE_CHANGED:${name}`);
    const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
    const output = path.join(project, 'assets/generated/event-catalogue');
    await mkdir(output, { recursive: true });
    const relative = path.relative(await realpath(path.join(project, 'assets/generated')), await realpath(output));
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('OUTPUT_OUTSIDE_GENERATED');
    const serialized = JSON.stringify(report, null, 2) + '\n';
    const destination = path.join(output, `dialogue-events-${hash(serialized).slice(0, 16)}.local.json`);
    try { await writeFile(destination, serialized, { flag: 'wx' }); }
    catch (error) { if (error.code !== 'EEXIST' || await readFile(destination, 'utf8') !== serialized) throw error; }
    console.log(JSON.stringify({ destination, summary: report.summary }, null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
