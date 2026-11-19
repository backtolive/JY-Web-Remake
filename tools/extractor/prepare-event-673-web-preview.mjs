/** Local scene 32 probe bundle; the observed event adapter is mandatory at runtime. */
import { readFile, mkdir, realpath, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readOriginalScene } from '../../packages/game-data/src/original.ts';
import { scenePassability } from '../../packages/game-data/src/scene-passability.ts';
import { resolveContent, canonical } from '../../packages/game-core/src/content.ts';
import { convertVerifiedEvent673, readEvent673Sources } from './compare-original-event-673.mjs';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sha = value => createHash('sha256').update(value).digest('hex');
export async function prepareEvent673WebPreview(directory) {
  const sources = await readEvent673Sources(directory);
  const converted = await convertVerifiedEvent673(sources);
  const mapBytes = new Uint8Array(await readFile(path.join(directory, 'ALLSIN.GRP')));
  const scene = readOriginalScene(sources['RANGER.IDX'], sources['RANGER.GRP'], mapBytes,
    sources['ALLDEF.GRP'], 32);
  const eventCell = scene.layers[3].flatMap((slot, cell) => slot === 0 ? [cell] : []);
  if (eventCell.length !== 1 || eventCell[0] !== 25 * 64 + 31 || scene.eventFields[0][2] !== 673)
    throw new Error('EVENT673_SCENE_REFERENCE');
  const npc = { id: 'original.jy.observed673:npc/0', x: 31, y: 25,
    eventId: 'original.jy.observed673:event/673' };
  const blocked = [];
  for (let cell = 0; cell < 4096; cell++) {
    if (cell !== eventCell[0] && scenePassability(scene.layers[0][cell], scene.layers[1][cell],
      scene.layers[3][cell], scene.eventFields).blocked) blocked.push(cell);
  }
  const entry = { mapId: 'original.jy.observed673:map/32', x: 31, y: 24 };
  if (blocked.includes(entry.y * 64 + entry.x)) throw new Error('EVENT673_ENTRY_BLOCKED');
  const pkg = { manifest: { id: 'original.jy.observed673', version: '0.1.0', schemaVersion: 1,
    runtimeVersion: '0.1.0', kind: 'base', classification: 'original-derived',
    license: 'User-supplied original content; local probe only; not for redistribution.',
    ruleset: 'observed-event673-sample-v1', priority: 0, dependencies: [] },
    entry, maps: [{ id: entry.mapId, name: scene.name, width: 64, height: 64,
      blocked, npcs: [npc], portals: [] }], dialogues: [],
    // The Web adapter intercepts this reference. Without the attached observedEvent673 data, import must fail.
    events: [{ id: npc.eventId, steps: [{ op: 'end' }] }], items: [], patches: [] };
  await resolveContent([pkg]);
  return { package: pkg, observedEvent673: { schemaVersion: 1, npcId: npc.id,
    content: converted.content, provenance: converted.provenance,
    allDefBase64: Buffer.from(sources['ALLDEF.GRP']).toString('base64'),
    rangerIndexBase64: Buffer.from(sources['RANGER.IDX']).toString('base64'),
    rangerGroupBase64: Buffer.from(sources['RANGER.GRP']).toString('base64') },
  presentation: { mapId: entry.mapId, width: 64, height: 64, layers: scene.layers,
    layerMeaning: ['groundTileId','buildingTileId','objectTileId','eventSlot','buildingHeight','objectHeight'],
    visualPolicy: 'Original tile IDs retained; placeholder scene rendering only.' },
  provenance: { sceneId: 32, eventId: 673, eventSlotId: 0, eventCell: { x: 31, y: 25 },
    entryPolicy: 'Adjacent walkable test position, not original spawn.',
    precondition: 'Sampled DOS protagonist aptitude 72, not base RANGER.GRP aptitude 50.',
    sources: { ...converted.provenance.sourceHashes, 'ALLSIN.GRP': sha(mapBytes) },
    evidence: 'docs/validation/opcode-34-dos-observation.md',
    limitations: 'Single observed event path; no original save import, natural reachability, other events or scene changes.' } };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    if (process.argv.length !== 3) throw new Error('Usage: node tools/extractor/prepare-event-673-web-preview.mjs <original-directory>');
    const bundle = await prepareEvent673WebPreview(process.argv[2]);
    const output = path.join(project, 'assets/generated/mvp');
    await mkdir(output, { recursive: true });
    const root = await realpath(path.join(project, 'assets/generated')), actual = await realpath(output);
    const relative = path.relative(root, actual);
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('EVENT673_OUTPUT_PATH');
    const name = `original-event-673-${sha(Buffer.from(canonical(bundle))).slice(0,16)}.local.json`;
    const destination = path.join(actual, name);
    try { await writeFile(destination, JSON.stringify(bundle) + '\n', { flag: 'wx' }); }
    catch (cause) {
      if (cause.code !== 'EEXIST' || canonical(JSON.parse(await readFile(destination, 'utf8'))) !== canonical(bundle)) throw cause;
    }
    console.log(destination);
  } catch (cause) { console.error(cause.message); process.exitCode = 1; }
}
