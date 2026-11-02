import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseIdxGrpIndex, readIdxGrpResource } from '../../packages/game-data/src/idx-grp.ts';
import { inspectIdxGrp } from '../../tools/extractor/inspect-idx-grp.mjs';

function mockIndex(ends) {
  const bytes = Buffer.alloc(ends.length * 4);
  ends.forEach((end, id) => bytes.writeUInt32LE(end, id * 4));
  return bytes;
}

test('Mock golden: preserves empty resources, exact offsets, view boundaries and independent bytes', () => {
  const backing = Buffer.concat([Buffer.from([99]), mockIndex([0, 2, 2, 5]), Buffer.from([99])]);
  const group = Buffer.from([10, 11, 12, 13, 14]);
  const ranges = parseIdxGrpIndex(backing.subarray(1, -1), group.length);
  assert.deepEqual(ranges, [
    { resourceId: 0, indexByteOffset: 0, sourceOffset: 0, byteLength: 0 },
    { resourceId: 1, indexByteOffset: 4, sourceOffset: 0, byteLength: 2 },
    { resourceId: 2, indexByteOffset: 8, sourceOffset: 2, byteLength: 0 },
    { resourceId: 3, indexByteOffset: 12, sourceOffset: 2, byteLength: 3 },
  ]);
  assert.deepEqual([...readIdxGrpResource(group, ranges[3])], [12, 13, 14]);
  const copy = readIdxGrpResource(group, ranges[1]);
  copy[0] = 255;
  assert.equal(group[0], 10);
  assert.deepEqual(parseIdxGrpIndex(new Uint8Array(), 0), []);
  assert.equal(readIdxGrpResource(group, ranges[0]).length, 0);
});

test('Mock malformed input: rejects truncation, bounds, descending/padded index and unclaimed bytes', () => {
  const rejects = (fn, code) => assert.throws(fn, error => error.code === code);
  rejects(() => parseIdxGrpIndex(new Uint8Array(3), 0), 'UNALIGNED_INDEX');
  rejects(() => parseIdxGrpIndex(mockIndex([6]), 5), 'OFFSET_OUT_OF_BOUNDS');
  rejects(() => parseIdxGrpIndex(mockIndex([5, 0]), 5), 'DECREASING_OFFSET');
  rejects(() => parseIdxGrpIndex(mockIndex([4]), 5), 'UNCOVERED_GROUP');
  rejects(() => parseIdxGrpIndex(new Uint8Array(), 5), 'UNCOVERED_GROUP');
  rejects(() => parseIdxGrpIndex(new Uint8Array(), -1), 'INVALID_GROUP_SIZE');
  rejects(() => parseIdxGrpIndex(new Uint8Array(), 0x100000000), 'INVALID_GROUP_SIZE');
  rejects(() => parseIdxGrpIndex(new Uint8Array(4_000_004), 0), 'INDEX_LIMIT');
  for (const [sourceOffset, byteLength] of [[-1, 1], [0, -1], [4, 2], [0.5, 1], [NaN, 1]]) {
    rejects(() => readIdxGrpResource(new Uint8Array(5), { sourceOffset, byteLength }), 'INVALID_RANGE');
  }
});

test('Mock inspection: reproducible provenance, no payload export, inputs unchanged, CLI failure is explicit', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'jy-idx-mock-'));
  try {
    const idx = path.join(root, 'MOCK.IDX'), grp = path.join(root, 'MOCK.GRP');
    const index = mockIndex([2, 3]), group = Buffer.from('abc');
    await writeFile(idx, index);
    await writeFile(grp, group);
    const result = await inspectIdxGrp(idx, grp);
    assert.deepEqual(await inspectIdxGrp(idx, grp), result);
    assert.equal(result.inputs.group.sha256, 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    assert.equal(result.resources[1].sourceOffset, 2);
    assert.equal('bytes' in result.resources[0], false);
    assert.deepEqual(await readFile(idx), index);
    assert.deepEqual(await readFile(grp), group);
    await writeFile(idx, mockIndex([3, 0]));
    const cli = spawnSync(process.execPath, ['tools/extractor/inspect-idx-grp.mjs', idx, grp], { encoding: 'utf8' });
    assert.equal(cli.status, 1);
    assert.equal(cli.stdout, '');
    assert.equal(JSON.parse(cli.stderr).error, 'DECREASING_OFFSET');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
