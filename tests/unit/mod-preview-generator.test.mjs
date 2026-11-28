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

/** Generate all 3 MODs and return them as an array of { bundle, package }. */
function generateAll() {
  const out = mkdtempSync(join(tmpdir(), 'mod-preview-'));
  const summary = JSON.parse(execFileSync(process.execPath, [tool, baseFile, out], { encoding: 'utf8' }));
  const mods = summary.mods.map(m => {
    const bundle = JSON.parse(readFileSync(m.file, 'utf8'));
    return { ...m, bundle, package: bundle.package };
  });
  return { mods, out };
}

/** Convenience: get just the first MOD (Alpha, priority 10). */
function generate() {
  const { mods } = generateAll();
  return { bundle: mods[0].bundle, mod: mods[0].package, all: mods };
}

test('MOD generator: produces 3 valid mod packages with distinct priorities', () => {
  const { mods } = generateAll();
  assert.equal(mods.length, 3);
  const priorities = mods.map(m => m.priority).sort((a, b) => a - b);
  assert.deepEqual(priorities, [5, 10, 20]);
  for (const { package: mod } of mods) {
    assert.equal(validatePackageSchema(mod), true, `MOD ${mod.manifest.id} must pass schema`);
    assert.equal(mod.manifest.kind, 'mod');
    assert.deepEqual(mod.manifest.dependencies, [{ id: 'mock.wuxia', version: '0.1.0' }]);
  }
  // Alpha patches + adds item; Beta patches + adds event; Gamma adds item only.
  assert.equal(mods[0].package.patches.length, 1);
  assert.equal(mods[0].package.items.length, 1);
  assert.equal(mods[1].package.patches.length, 1);
  assert.equal(mods[1].package.events.length, 1);
  assert.equal(mods[2].package.patches.length, 0);
  assert.equal(mods[2].package.items.length, 1);
});

test('MOD generator: Alpha resolves with base (patch + item added)', async () => {
  const { mod } = generate();
  const content = await resolveContent([base, mod]);
  assert.deepEqual(
    content.identities.map(x => `${x.id}@${x.version}`),
    ['mock.wuxia@0.1.0', 'mock.wuxia.mod-alpha@0.1.0'],
  );
  assert.equal(content.dialogues['mock.wuxia:talk/welcome'].text, `${base.dialogues[0].text}（Alpha 已載入）`);
  assert.ok(content.items['mock.wuxia.mod-alpha:item/bonus'], 'Alpha-added item must be present');
});

test('MOD generator: save preserves MOD identities and restore rejects content mismatch', async () => {
  const { mod } = generate();
  const content = await resolveContent([base, mod]);
  const state = createGame(content);
  const save = serializeSave(content, state);
  const envelope = JSON.parse(save);
  assert.deepEqual(envelope.content.map(c => c.id), ['mock.wuxia', 'mock.wuxia.mod-alpha']);
  for (const identity of envelope.content) assert.match(identity.sha256, /^[a-f0-9]{64}$/);
  assert.deepEqual(restoreSave(content, save), state);
  const baseOnly = await resolveContent([base]);
  assert.throws(() => restoreSave(baseOnly, save), error =>
    error.diagnostics?.some(issue => issue.code === 'SAVE_CONTENT_MISMATCH'));
});

test('MOD generator: rejects a non-base input package', () => {
  const modOnly = JSON.parse(readFileSync(resolve(here, '../fixtures/mock-greeting-mod.json'), 'utf8'));
  const out = mkdtempSync(join(tmpdir(), 'mod-preview-'));
  const modFile = join(out, 'mod.json');
  writeFileSync(modFile, JSON.stringify(modOnly), 'utf8');
  assert.throws(
    () => execFileSync(process.execPath, [tool, modFile, out], { encoding: 'utf8', stdio: 'pipe' }),
    error => /BASE_KIND/.test(error.stderr ?? ''),
  );
  assert.ok(existsSync(out));
});

test('MOD stack: 3 MODs resolve with deterministic priority order (5 < 10 < 20)', async () => {
  const { mods } = generateAll();
  const [alpha, beta, gamma] = mods.map(m => m.package);
  // Alpha + Beta both patch dialogue[0] → conflict. Test non-conflicting subset: Gamma + Alpha.
  const content = await resolveContent([base, gamma, alpha]);
  assert.deepEqual(
    content.identities.map(x => `${x.id}@${x.priority}`),
    ['mock.wuxia@0', 'mock.wuxia.mod-gamma@5', 'mock.wuxia.mod-alpha@10'],
  );
  assert.equal(content.dialogues['mock.wuxia:talk/welcome'].text, `${base.dialogues[0].text}（Alpha 已載入）`);
  assert.ok(content.items['mock.wuxia.mod-gamma:item/trinket'], 'Gamma item present');
  assert.ok(content.items['mock.wuxia.mod-alpha:item/bonus'], 'Alpha item present');
  // All 3 together must fail (Alpha + Beta conflict on same patch target).
  await assert.rejects(
    resolveContent([base, gamma, alpha, beta]),
    error => error.name === 'ContentError' &&
      error.diagnostics.some(issue => issue.code === 'PATCH_CONFLICT'),
  );
});

test('MOD stack: Alpha + Beta (same patch target) fail with PATCH_CONFLICT', async () => {
  const { mods } = generateAll();
  const [alpha, beta] = mods.map(m => m.package);
  assert.equal(alpha.patches[0].target, beta.patches[0].target, 'both must target the same dialogue');
  await assert.rejects(
    resolveContent([base, alpha, beta]),
    error => error.name === 'ContentError' &&
      error.diagnostics.some(issue => issue.code === 'PATCH_CONFLICT' && issue.path === base.dialogues[0].id),
  );
});

test('MOD stack: duplicate MOD id is rejected before resolution', async () => {
  const { mods } = generateAll();
  const alpha = mods[0].package;
  const alphaClone = structuredClone(alpha); // same id
  await assert.rejects(
    resolveContent([base, alpha, alphaClone]),
    error => error.name === 'ContentError' &&
      error.diagnostics.some(issue => issue.code === 'DUPLICATE_PACKAGE' && issue.path === alpha.manifest.id),
  );
});
