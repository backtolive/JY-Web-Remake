import { readFile, mkdir, writeFile, realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readOriginalScene } from '../../packages/game-data/src/original.ts';
import { extractMapRegion, regionResourceIds, MAP_REGION_PARSER_VERSION } from '../../packages/game-data/src/map-region.ts';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const names = ['RANGER.IDX', 'RANGER.GRP', 'ALLSIN.GRP', 'ALLDEF.GRP'];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const input = process.argv[2];
    if (!input) throw new Error('Usage: node tools/extractor/extract-map-region.mjs <original-directory> [originX originY width height]');
    const originX = process.argv[3] === undefined ? 13 : Number(process.argv[3]);
    const originY = process.argv[4] === undefined ? 28 : Number(process.argv[4]);
    const width = process.argv[5] === undefined ? 8 : Number(process.argv[5]);
    const height = process.argv[6] === undefined ? 8 : Number(process.argv[6]);
    const data = Object.fromEntries(await Promise.all(names.map(async name => [name, await readFile(path.join(input, name))])));
    const scene = readOriginalScene(data['RANGER.IDX'], data['RANGER.GRP'], data['ALLSIN.GRP'], data['ALLDEF.GRP'], 1);
    const region = extractMapRegion(scene, originX, originY, width, height);
    const resourceIds = regionResourceIds(region);
    const bundle = {
      region,
      resourceIds,
      provenance: {
        parserVersion: MAP_REGION_PARSER_VERSION,
        confidence: 'Community Implementation',
        sourceCommit: '4d225cb9b7b9a3ac46a796ecb0acde525ef72acc',
        sceneId: 1,
        sceneName: scene.name,
        selectionReason: 'Bytes-selected 8x8 window with non-empty ground/building tile IDs, building height 4 and event slot 2; chosen for layer diversity, not an inferred original camera or spawn position.',
        sourceOffsets: {
          sceneRecordOffset: scene.sourceOffset,
          mapBlockOffset: scene.id * 49152,
          regionFirstCellOffset: (originY * 64 + originX) * 2,
        },
        sources: names.map(name => ({ sourceFile: name, byteLength: data[name].length, sha256: hash(data[name]) })),
      },
      presentation: {
        coordinateConvention: 'grid x=absolute source column; grid y=absolute source row; relativeX/Y are window offsets',
        visualPolicy: 'Source IDs retained; mapping to Mock geometry is separate and must be explicit. No original images exported.',
      },
    };
    for (const name of names) if (hash(await readFile(path.join(input, name))) !== hash(data[name])) throw new Error(`SOURCE_CHANGED:${name}`);
    const output = path.join(project, 'assets/generated/map-regions');
    await mkdir(output, { recursive: true });
    const allowed = await realpath(path.join(project, 'assets/generated'));
    const actual = await realpath(output);
    const relative = path.relative(allowed, actual);
    if (relative.startsWith('..') || path.isAbsolute(relative) || !relative) throw new Error('OUTPUT_OUTSIDE_GENERATED');
    const destination = path.join(actual, `scene1-region-${originX}-${originY}-${width}x${height}-${hash(Buffer.from(JSON.stringify(bundle))).slice(0, 12)}.local.json`);
    try { await writeFile(destination, JSON.stringify(bundle, null, 2) + '\n', { flag: 'wx' }); }
    catch (error) {
      if (error.code !== 'EEXIST') throw error;
      const existing = JSON.parse(await readFile(destination, 'utf8'));
      if (JSON.stringify(existing) !== JSON.stringify(bundle)) throw error;
    }
    console.log(destination);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
