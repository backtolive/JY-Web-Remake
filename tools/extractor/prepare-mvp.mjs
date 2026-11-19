import { readFile, mkdir, writeFile, realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseIdxGrpIndex, readIdxGrpResource } from '../../packages/game-data/src/idx-grp.ts';
import { decodeTalk, readOriginalScene, readDialogueOnlyEvent, ORIGINAL_PARSER_VERSION } from '../../packages/game-data/src/original.ts';
import { resolveContent, canonical } from '../../packages/game-core/src/content.ts';
import { checkSliceNpcs } from '../validator/check-slice-npcs.mjs';
import { scenePassability } from '../../packages/game-data/src/scene-passability.ts';
import { openOriginalEventSlotTable, createOriginalEventSlotOverlay } from '../../packages/game-data/src/original-event-slots.ts';
import { resolveOriginalEventAtCell } from '../../packages/game-data/src/original-event-reference.ts';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const names = ['RANGER.IDX', 'RANGER.GRP', 'ALLSIN.GRP', 'ALLDEF.GRP', 'KDEF.IDX', 'KDEF.GRP', 'TALK.IDX', 'TALK.GRP'];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

/** Source-derived, read-only dialogue slice for one original scene. */
export async function prepareOriginalSlice(input, { candidate = false, sceneId = 1 } = {}) {
  const data = Object.fromEntries(await Promise.all(names.map(async name => [name, await readFile(path.join(input, name))])));
  const scene = readOriginalScene(data['RANGER.IDX'], data['RANGER.GRP'], data['ALLSIN.GRP'], data['ALLDEF.GRP'], sceneId);
  // --candidate remains accepted for compatibility but no longer changes the selection.
  const table = await openOriginalEventSlotTable(data['ALLDEF.GRP']);
  const overlay = createOriginalEventSlotOverlay(table);
  const eventRanges = parseIdxGrpIndex(data['KDEF.IDX'], data['KDEF.GRP'].length);
  const excluded = [];
  const referencedSlots = [...new Set(scene.layers[3].filter(slotId => slotId >= 0))].sort((a,b)=>a-b);
  const selection = referencedSlots.flatMap(slotId => {
    const cells = scene.layers[3].flatMap((value, cell) => value === slotId ? [cell] : []);
    if (cells.length !== 1) { excluded.push({slotId,reason:'MULTIPLE_CELLS'}); return []; }
    const x = cells[0] % 64, y = Math.floor(cells[0] / 64);
    const ref = resolveOriginalEventAtCell(scene, table, overlay, x, y, 2, eventRanges.length);
    if (!ref) { excluded.push({slotId,reason:'NO_INTERACTION_EVENT'}); return []; }
    try {
      const event = readDialogueOnlyEvent(data['KDEF.IDX'], data['KDEF.GRP'], ref.eventId);
      if (!event.dialogues.length) { excluded.push({slotId,eventId:ref.eventId,reason:'NO_DIALOGUE'}); return []; }
    } catch (cause) {
      const reason = cause instanceof Error ? cause.message : 'UNREADABLE_EVENT';
      if (!/^(UNSUPPORTED_OPCODE|EVENT_DIALOGUE_PARAMETERS|EVENT_TRAILING_DATA)/.test(reason)) throw cause;
      excluded.push({slotId,eventId:ref.eventId,reason}); return [];
    }
    return [{slotId,eventId:ref.eventId,x,y}];
  });
  if (!selection.length) throw new Error(`SLICE_NO_SAFE_DIALOGUE:${sceneId}`);
  const events = [...new Set(selection.map(ref => ref.eventId))].map(eventId => readDialogueOnlyEvent(data['KDEF.IDX'], data['KDEF.GRP'], eventId));
  if (events.some(event => !event.dialogues.length)) throw new Error('EMPTY_SLICE_EVENT');
  const ranges = parseIdxGrpIndex(data['TALK.IDX'], data['TALK.GRP'].length);
  const namespace = sceneId === 1 ? 'original.jy.slice' : `original.jy.scene${sceneId}`;
  const prefix = value => `${namespace}:${value}`;
  const npcs = selection.map(({slotId,eventId,x,y}) =>
    ({ id: prefix(`npc/${slotId}`), x, y, eventId: prefix(`event/${eventId}`) }));
  const npcCells = new Set(npcs.map(npc => npc.y * 64 + npc.x));
  const blocked = [];
  for (let cellId = 0; cellId < 4096; cellId++) {
    const ground = scene.layers[0][cellId], slot = scene.layers[3][cellId];
    // Community Implementation (jinyong-legend SceneCanPass): building layer > 0 is impassable;
    // an event cell is passable only when its event field 0 is 0. Water ground IDs are impassable.
    // The selected NPC occupies/blocks its cell in the core instead of duplicating a static blocker.
    if (!npcCells.has(cellId) && scenePassability(ground,scene.layers[1][cellId],slot,scene.eventFields).blocked) blocked.push(cellId);
  }
  const approaches = npcs.map(npc => {
    const adjacent = [[npc.x - 1, npc.y], [npc.x + 1, npc.y], [npc.x, npc.y - 1], [npc.x, npc.y + 1]]
      .find(([x,y]) => x >= 0 && y >= 0 && x < 64 && y < 64 && !blocked.includes(y * 64 + x) && !npcCells.has(y * 64 + x));
    if (!adjacent) throw new Error(`SLICE_NO_WALKABLE_ENTRY:${npc.id}`);
    return { npcId: npc.id, x: adjacent[0], y: adjacent[1] };
  });
  const adjacent = [approaches[0].x, approaches[0].y];
  const dialogues = new Map();
  for (const ref of events.flatMap(event => event.dialogues)) {
    if (!ranges[ref.talkId]) throw new Error('SLICE_DIALOGUE_REF');
    const talk = decodeTalk(readIdxGrpResource(data['TALK.GRP'], ranges[ref.talkId]));
    if (talk.hasUnknownControls) throw new Error('SLICE_UNKNOWN_TEXT_CONTROL');
    dialogues.set(ref.talkId, { id: prefix(`talk/${ref.talkId}`), text: talk.displayText, speaker: `portrait:${ref.portraitId}` });
  }
  const pkg = {
    manifest: { id: namespace, version: '0.2.0', schemaVersion: 1, runtimeVersion: '0.1.0', kind: 'base',
      classification: 'original-derived', license: 'User-supplied original content; local research only; not for redistribution.',
      ruleset: 'community-grid-slice-v1', priority: 0, dependencies: [] },
    entry: { mapId: prefix(`map/${sceneId}`), x: adjacent[0], y: adjacent[1] },
    maps: [{ id: prefix(`map/${sceneId}`), name: scene.name, width: 64, height: 64, blocked, npcs, portals: [] }],
    dialogues: [...dialogues.values()],
    events: events.map(event => ({ id: prefix(`event/${event.eventId}`), steps: [...event.dialogues.map(ref => ({ op: 'say', dialogueId: prefix(`talk/${ref.talkId}`) })), { op: 'end' }] })),
    items: [], patches: [],
  };
  const content = await resolveContent([pkg]);
  checkSliceNpcs(content);
  for (const name of names) if (hash(await readFile(path.join(input, name))) !== hash(data[name])) throw new Error(`SOURCE_CHANGED:${name}`);
  return { package: pkg,
    presentation: { mapId: prefix(`map/${sceneId}`), width: 64, height: 64, layers: scene.layers,
      layerMeaning: ['groundTileId','buildingTileId','objectTileId','eventSlot','buildingHeight','objectHeight'],
      visualPolicy: 'IDs and original heights retained for placeholder rendering; no original images exported, no inferred 3D building geometry' },
    provenance: { parserVersion: ORIGINAL_PARSER_VERSION, confidence: 'Community Implementation',
    sourceCommit: '4d225cb9b7b9a3ac46a796ecb0acde525ef72acc', sceneId,
    slotId: selection[0].slotId, eventId: selection[0].eventId,
    coordinateConvention: 'grid x=arrayIndex2; grid y=arrayIndex1; preview convention, not DOS axis fidelity',
    entryPolicy: 'Adjacent walkable cell selected for preview; not an original spawn or save position',
    selectedEventSlots: selection.map(({slotId,eventId}) => ({ slotId, eventId,
      referenceField: 2, sourceFile: 'ALLDEF.GRP', sourceSha256: table.sha256,
      sourceOffset: scene.id * 4400 + slotId * 22 + 2 * 2 })),
    previewApproaches: approaches,
    excludedEventSlots: excluded,
    sources: names.map(name => ({ sourceFile: name, byteLength: data[name].length, sha256: hash(data[name]) })),
    sceneRecordOffset: scene.sourceOffset, mapBlockOffset: scene.id * 49152,
    eventSlotOffset: scene.id * 4400 + selection[0].slotId * 22,
    events: events.map(event => ({ eventId: event.eventId, sourceOffset: eventRanges[event.eventId].sourceOffset,
      byteLength: event.raw.length, sha256: hash(event.raw) })),
    dialogues: events.flatMap(event => event.dialogues.map(ref => ({ ...ref, eventId: event.eventId,
      eventByteOffset: eventRanges[event.eventId].sourceOffset + ref.wordOffset * 2, sourceOffset: ranges[ref.talkId].sourceOffset,
      byteLength: ranges[ref.talkId].byteLength, codec: 'WHATWG Big5' }))),
    limitations: 'Local preview slice, no original rule verification; opcode0 presentation omitted explicitly, all state-changing opcodes rejected; other events blocked, portals not inferred.' } };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    if (process.argv.length < 3 || process.argv.length > 5 ||
        (process.argv[3] && process.argv[3] !== '--candidate' && process.argv[3] !== '--scene') ||
        (process.argv[3] === '--candidate' && process.argv.length !== 4) ||
        (process.argv[3] === '--scene' && (!/^\d+$/.test(process.argv[4]??'') || process.argv.length !== 5)))
      throw new Error('Usage: node tools/extractor/prepare-mvp.mjs <original-directory> [--candidate | --scene <id>]');
    const bundle = await prepareOriginalSlice(process.argv[2], { sceneId: process.argv[3] === '--scene' ? Number(process.argv[4]) : 1 });
    const output = path.join(project, 'assets/generated/mvp');
    await mkdir(output, { recursive: true });
    const allowed = await realpath(path.join(project, 'assets/generated'));
    const actual = await realpath(output);
    const relative = path.relative(allowed, actual);
    if (relative.startsWith('..') || path.isAbsolute(relative) || !relative) throw new Error('OUTPUT_OUTSIDE_GENERATED');
    const destination = path.join(actual, `original-slice-${hash(Buffer.from(canonical(bundle))).slice(0,16)}.local.json`);
    try { await writeFile(destination, JSON.stringify(bundle, null, 2) + '\n', { flag: 'wx' }); }
    catch (error) {
      if (error.code !== 'EEXIST' || canonical(JSON.parse(await readFile(destination,'utf8'))) !== canonical(bundle)) throw error;
    }
    console.log(destination);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
