import { readFile, mkdir, writeFile, realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseIdxGrpIndex, readIdxGrpResource } from '../../packages/game-data/src/idx-grp.ts';
import { decodeTalk, readOriginalScene, readDialogueOnlyEvent, ORIGINAL_PARSER_VERSION } from '../../packages/game-data/src/original.ts';
import { resolveContent, canonical } from '../../packages/game-core/src/content.ts';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const names = ['RANGER.IDX', 'RANGER.GRP', 'ALLSIN.GRP', 'ALLDEF.GRP', 'KDEF.IDX', 'KDEF.GRP', 'TALK.IDX', 'TALK.GRP'];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

/** Explicit community-derived, read-only slice: scene 1 / slot 2 / event 668 only. */
export async function prepareOriginalSlice(input) {
  const data = Object.fromEntries(await Promise.all(names.map(async name => [name, await readFile(path.join(input, name))])));
  const scene = readOriginalScene(data['RANGER.IDX'], data['RANGER.GRP'], data['ALLSIN.GRP'], data['ALLDEF.GRP'], 1);
  if (scene.eventFields[2][2] !== 668) throw new Error('SLICE_VERSION_MISMATCH: scene1/slot2 no longer refers to event668');
  const event = readDialogueOnlyEvent(data['KDEF.IDX'], data['KDEF.GRP'], 668);
  if (!event.dialogues.length) throw new Error('EMPTY_SLICE_EVENT');
  const ranges = parseIdxGrpIndex(data['TALK.IDX'], data['TALK.GRP'].length);
  const namespace = 'original.jy.slice';
  const prefix = value => `${namespace}:${value}`;
  const cells = scene.layers[3].flatMap((value, cell) => value === 2 ? [cell] : []);
  if (cells.length !== 1) throw new Error('SLICE_EVENT_POSITION: expected exactly one slot2 cell');
  const cell = cells[0];
  const blocked = [];
  for (let cellId = 0; cellId < 4096; cellId++) {
    const ground = scene.layers[0][cellId], slot = scene.layers[3][cellId];
    const terrain = (ground >= 358 && ground <= 362) || [522, 1022, 1348].includes(ground) || (ground >= 1324 && ground <= 1330);
    // Other event cells are conservatively inaccessible: their scripts are outside this slice.
    // The selected NPC occupies/blocks its cell in the core instead of duplicating a static blocker.
    if (cellId !== cell && (scene.layers[1][cellId] !== 0 || terrain || slot >= 0)) blocked.push(cellId);
  }
  const npc = { id: prefix('npc/2'), x: cell % 64, y: Math.floor(cell / 64), eventId: prefix('event/668') };
  const adjacent = [[npc.x - 1, npc.y], [npc.x + 1, npc.y], [npc.x, npc.y - 1], [npc.x, npc.y + 1]]
    .find(([x,y]) => x >= 0 && y >= 0 && x < 64 && y < 64 && !blocked.includes(y * 64 + x));
  if (!adjacent) throw new Error('SLICE_NO_WALKABLE_ENTRY');
  const dialogues = new Map();
  for (const ref of event.dialogues) {
    if (!ranges[ref.talkId]) throw new Error('SLICE_DIALOGUE_REF');
    const talk = decodeTalk(readIdxGrpResource(data['TALK.GRP'], ranges[ref.talkId]));
    if (talk.hasUnknownControls) throw new Error('SLICE_UNKNOWN_TEXT_CONTROL');
    dialogues.set(ref.talkId, { id: prefix(`talk/${ref.talkId}`), text: talk.displayText, speaker: `portrait:${ref.portraitId}` });
  }
  const pkg = {
    manifest: { id: namespace, version: '0.1.0', schemaVersion: 1, runtimeVersion: '0.1.0', kind: 'base',
      classification: 'original-derived', license: 'User-supplied original content; local research only; not for redistribution.',
      ruleset: 'community-grid-slice-v1', priority: 0, dependencies: [] },
    entry: { mapId: prefix('map/1'), x: adjacent[0], y: adjacent[1] },
    maps: [{ id: prefix('map/1'), name: scene.name, width: 64, height: 64, blocked, npcs: [npc], portals: [] }],
    dialogues: [...dialogues.values()],
    events: [{ id: prefix('event/668'), steps: [...event.dialogues.map(ref => ({ op: 'say', dialogueId: prefix(`talk/${ref.talkId}`) })), { op: 'end' }] }],
    items: [], patches: [],
  };
  await resolveContent([pkg]);
  for (const name of names) if (hash(await readFile(path.join(input, name))) !== hash(data[name])) throw new Error(`SOURCE_CHANGED:${name}`);
  return { package: pkg,
    presentation: { mapId: prefix('map/1'), width: 64, height: 64, layers: scene.layers,
      layerMeaning: ['groundTileId','buildingTileId','objectTileId','eventSlot','buildingHeight','objectHeight'],
      visualPolicy: 'IDs and original heights retained for placeholder rendering; no original images exported, no inferred 3D building geometry' },
    provenance: { parserVersion: ORIGINAL_PARSER_VERSION, confidence: 'Community Implementation',
    sourceCommit: '4d225cb9b7b9a3ac46a796ecb0acde525ef72acc', sceneId: 1, slotId: 2, eventId: 668,
    coordinateConvention: 'grid x=arrayIndex2; grid y=arrayIndex1; preview convention, not DOS axis fidelity',
    entryPolicy: 'Adjacent walkable cell selected for preview; not an original spawn or save position',
    excludedEventSlots: scene.eventFields.flatMap((fields, slot) => fields[2] >= 0 && slot !== 2 ? [slot] : []),
    sources: names.map(name => ({ sourceFile: name, byteLength: data[name].length, sha256: hash(data[name]) })),
    sceneRecordOffset: scene.sourceOffset, mapBlockOffset: scene.id * 49152, eventSlotOffset: scene.id * 4400 + 2 * 22,
    dialogues: event.dialogues.map(ref => ({ ...ref, sourceOffset: ranges[ref.talkId].sourceOffset,
      byteLength: ranges[ref.talkId].byteLength, codec: 'WHATWG Big5' })),
    limitations: 'Local preview slice, no original rule verification; opcode0 presentation omitted explicitly, all state-changing opcodes rejected; other events blocked, portals not inferred.' } };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    if (process.argv.length !== 3) throw new Error('Usage: node tools/extractor/prepare-mvp.mjs <original-directory>');
    const bundle = await prepareOriginalSlice(process.argv[2]);
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
