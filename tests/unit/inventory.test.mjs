import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { inventory } from '../../tools/analyzer/inventory.mjs';

test('Mock files: stable hash, nested paths, unknown formats and unchanged input', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'jy-mock-'));
  try {
    await mkdir(path.join(root, 'nested'));
    await writeFile(path.join(root, 'nested', 'MOCK.IDX'), 'abc');
    await writeFile(path.join(root, 'empty.xyz'), '');
    const result = await inventory(root);
    assert.deepEqual(await inventory(root), result);
    assert.equal(result.files.length, 2);
    assert.equal(result.files[1].relativePath, 'nested/MOCK.IDX');
    assert.equal(result.files[1].sha256, 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    assert.equal(result.files[0].formatGuess, 'unknown');
    assert.equal(result.files[1].parseStatus, 'not-parsed');
    assert.equal(await readFile(path.join(root, 'nested', 'MOCK.IDX'), 'utf8'), 'abc');
    const cli = spawnSync(process.execPath, ['tools/analyzer/inventory.mjs', root, path.join(root, 'output.json')]);
    assert.equal(cli.status, 1);
  } finally { await rm(root, { recursive: true, force: true }); }
});
