/** Source-locked projection of one observed event 581 branch, not an opcode 3 interpreter. */
import { readFile, mkdir, realpath, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseIdxGrpIndex, readIdxGrpResource } from '../../packages/game-data/src/idx-grp.ts';
import { createOriginalEventSlotOverlay, openOriginalEventSlotTable, readOriginalEventSlot,
  updateOriginalEventSlot } from '../../packages/game-data/src/original-event-slots.ts';
import { canonical } from '../../packages/game-core/src/content.ts';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sha = value => createHash('sha256').update(value).digest('hex');
const pinned = {
  'KDEF.IDX': 'bf02eccf1dab01fd0ae033cdf807f56b978a71a6c2ab9be05e366239b485104b',
  'KDEF.GRP': '135c5e097a7fe561ee931046e1bebf55de9b469678e3d111d8e9f2c6bb600e06',
  'ALLDEF.GRP': '3633122f6a43f0b5dd390c2fa2516766d735a064ca955c8766b73232230a4480',
};
const recordHash = 'ac27f3fee143440e3d3af716d1b460e703959545f58d7f93a604c3a7f5e74386';
const beforeExpected = [1,2,-1,-1,-1,2718,2718,2718,0,30,21];
const afterObserved = [0,0,-1,-1,-1,-1,-1,-1,0,30,21];
const argsExpected = [-2,2,0,0,-1,-1,-1,-1,-1,-1,-2,-2,-2];
const equal = (a,b) => Array.isArray(a) && a.length === b.length && a.every((value,i) => value === b[i]);
const fail = code => { throw new Error(`EVENT581_SLOT_${code}`); };

export async function compareObserved581Slot(sources) {
  for (const [name, expected] of Object.entries(pinned))
    if (!(sources[name] instanceof Uint8Array) || sha(sources[name]) !== expected) fail(`SOURCE:${name}`);
  const ranges = parseIdxGrpIndex(sources['KDEF.IDX'], sources['KDEF.GRP'].length);
  const range = ranges[581];
  if (!range || range.sourceOffset !== 88988 || range.byteLength !== 106) fail('EVENT_RANGE');
  const raw = readIdxGrpResource(sources['KDEF.GRP'], range);
  if (sha(raw) !== recordHash) fail('EVENT_HASH');
  const words = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  const readWord = at => words.getInt16(at * 2, true);
  const args = Array.from({length:13},(_,i)=>readWord(16+i));
  if (readWord(14) !== 14 || readWord(15) !== 3 || !equal(args,argsExpected) ||
      readWord(29) !== 0 || readWord(30) !== 13) fail('CANDIDATE_SEGMENT');
  const table = await openOriginalEventSlotTable(sources['ALLDEF.GRP']);
  const base = createOriginalEventSlotOverlay(table);
  const before = readOriginalEventSlot(table,base,32,2);
  if (!equal(before,beforeExpected)) fail('PRECONDITION');
  // Candidate positional projection for this exact observed segment. Does not interpret -2 globally.
  const writes = Array.from({length:8},(_,field)=>[field,args[field+2]]);
  const projected = readOriginalEventSlot(table,updateOriginalEventSlot(table,base,32,2,writes),32,2);
  if (!equal(projected,afterObserved)) fail('OBSERVED_MISMATCH');
  return { comparisonVersion: 1, classification: 'source-locked-observed-segment-comparison',
    sourceHashes: pinned,
    eventRecord: { eventId: 581, sourceFile: 'KDEF.GRP', sourceOffset: range.sourceOffset,
      byteLength: range.byteLength, sha256: recordHash },
    candidateInstruction: { opcode: 3, wordOffset: 15,
      sourceByteOffset: range.sourceOffset + 30, args, target: { sceneId: 32, slotId: 2 },
      fieldProjection: writes },
    observed: { evidence: 'docs/validation/opcode-20-dos-observation.md',
      onePersonTeam: { before, after: afterObserved },
      fullTeam: { before, after: beforeExpected } },
    projectedOnePersonAfter: projected,
    limitations: [
      'One-person and full-team are separate sampled DOS states, not a general opcode 20 branch rule.',
      'The observed interval includes opcode 14 before the candidate opcode 3 and opcode 0/13 after it; no intervening memory snapshot isolates opcode 3.',
      'Only fields 0, 1 and 5–7 have changed before/after values here; unchanged -1 fields do not prove write-versus-preserve.',
      'No runtime rule for the other events sharing this parameter shape is enabled.',
    ] };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    if (process.argv.length !== 3) fail('USAGE: <original-directory>');
    const sources = Object.fromEntries(await Promise.all(Object.keys(pinned).map(async name =>
      [name,new Uint8Array(await readFile(path.join(process.argv[2],name)))])));
    const result = await compareObserved581Slot(sources);
    const root = await realpath(path.join(project,'assets/generated'));
    const output = path.join(root,'event-comparisons');
    await mkdir(output,{recursive:true});
    const actual = await realpath(output), relative = path.relative(root,actual);
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) fail('OUTPUT_PATH');
    const raw = canonical(result) + '\n';
    const destination = path.join(actual,`event-581-slot-${sha(raw).slice(0,16)}.local.json`);
    try { await writeFile(destination,raw,{flag:'wx'}); }
    catch (cause) { if (cause.code !== 'EEXIST' || await readFile(destination,'utf8') !== raw) throw cause; }
    console.log(destination);
  } catch (cause) { console.error(cause.message); process.exitCode = 1; }
}
