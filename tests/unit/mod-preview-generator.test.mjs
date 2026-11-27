import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  resolveContent, createGame, serializeSave, restoreSave, validatePackageSchema,
} from '../../packages/game-core/src/index.ts';

const here = dirname(fileURLToPath(import.meta.url));
const tool = resolve(here, '../../tools/extractor/prepare-mod-preview.mjs');
const baseFile = resolve(here, '../fixtures/mock-wuxia-package.json');
const base = JSON.parse(readFileSync(baseFile, 'utf8'));

function generate() {
  const out = mkdtempSync(join(tmpdir(), 'mod-preview-'));
  const summary = JSON.parse(execFileSync(process.execPath, [tool, baseFile, out], { encoding: 'utf8' }));
  const bundle = JSON.parse(readFileSync(summary.destination, 'utf8'));
  return { bundle, out };
}

test('MOD generator: produces a valid mod package that resolves with the base', () => {
  const { bundle } = generate();
  const mod = bundle.package;
  assert.equal(validatePackageSchema(mod), true, 'MOD must pass the content schema');
  assert.equal(mod.manifest.kind, 'mod');
  assert.deepEqual(mod.manifest.dependencies, [{ id: 'mock.wuxia', version: '0.1.0' }]);
  assert.equal(mod.manifest.priority, 10);
  assert.ok(mod.patches.length === 1 && mod.items.length === 1 && mod.dialogues.length === 1);
  // Patch must target a real base dialogue with a locked precondition.
  assert.equal(mod.patches[0].target, base.dialogues[0].id);
  assert.equal(mod.patches[0].expectedText, base.dialogues[0].text);
});

test('MOD generator: resolved content applies the patch and adds MOD content', async () => {
  const { bundle } = generate();
  const content = await resolveContent([base, bundle.package]);
  assert.deepEqual(
    content.identities.map(x => `${x.id}@${x.version}`),
    ['mock.wuxia@0.1.0', 'mock.wuxia.mod@0.1.0'],
  );
  assert.equal(content.dialogues['mock.wuxia:talk/welcome'].text, `${base.dialogues[0].text}（MOD 已載入）`);
  assert.ok(content.items['mock.wuxia.mod:item/bonus'], 'MOD-added item must be present');
  assert.ok(content.dialogues['mock.wuxia.mod:talk/bonus'], 'MOD-added dialogue must be present');
});

test('MOD generator: save preserves MOD identities and restore rejects content mismatch', async () => {
  const { bundle } = generate();
  const content = await resolveContent([base, bundle.package]);
  const state = createGame(content);
  const save = serializeSave(content, state);
  const envelope = JSON.parse(save);
  assert.deepEqual(envelope.content.map(c => c.id), ['mock.wuxia', 'mock.wuxia.mod']);
  for (const identity of envelope.content) assert.match(identity.sha256, /^[a-f0-9]{64}$/);
  assert.deepEqual(restoreSave(content, save), state);
  // Restoring the same save against a base-only resolution must fail with a content mismatch.
  const baseOnly = await resolveContent([base]);
  assert.throws(() => restoreSave(baseOnly, save), error =>
    error.diagnostics?.some(issue => issue.code === 'SAVE_CONTENT_MISMATCH'));
});

test('MOD generator: rejects a non-base input package', () => {
  const modOnly = JSON.parse(readFileSync(resolve(here, '../fixtures/mock-greeting-mod.json'), 'utf8'));
  const out = mkdtempSync(join(tmpdir(), 'mod-preview-'));
  const modFile = join(out, 'mod.json');
  // Write the mod as if it were a base to exercise the BASE_KIND guard.
  writeFileSync(modFile, JSON.stringify(modOnly), 'utf8');
  assert.throws(
    () => execFileSync(process.execPath, [tool, modFile, out], { encoding: 'utf8', stdio: 'pipe' }),
    error => /BASE_KIND/.test(error.stderr ?? ''),
  );
  assert.ok(existsSync(out));
});
