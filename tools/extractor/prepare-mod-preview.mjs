// Local-only MOD preview generator. Produces a valid MOD content package that
// depends on a given base package, patches one dialogue, and adds a new item +
// dialogue. This demonstrates the MOD foundation (dependency, priority, patch
// precondition, content addition) without bundling original content.
//
// Usage: node tools/extractor/prepare-mod-preview.mjs <base-package.json> [out-dir]
// The base package must be a kind:"base" ContentPackage (e.g. the Mock fixture
// or a generated original-derived base). Output is git-ignored under
// assets/generated/mod-preview/.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';

const CONVERTER_VERSION = '0.1.0';

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function loadBase(file) {
  const raw = readFileSync(file, 'utf8');
  const base = JSON.parse(raw);
  const manifest = base?.manifest;
  if (!manifest || manifest.kind !== 'base') throw new Error('BASE_KIND: base package must have kind "base"');
  if (manifest.dependencies.length) throw new Error('BASE_DEPENDS: base package cannot declare dependencies');
  if (manifest.runtimeVersion !== '0.1.0') throw new Error('RUNTIME_VERSION: base runtimeVersion must be 0.1.0');
  if (!Array.isArray(base.dialogues) || base.dialogues.length < 1) throw new Error('BASE_DIALOGUES: base must have at least one dialogue to patch');
  return { base, raw, sha: sha256(Buffer.from(raw, 'utf8')) };
}

function buildMod(base, baseSha) {
  const modId = `${base.manifest.id}.mod`;
  const target = base.dialogues[0];
  const mod = {
    manifest: {
      id: modId,
      version: '0.1.0',
      schemaVersion: 1,
      runtimeVersion: '0.1.0',
      kind: 'mod',
      classification: base.manifest.classification === 'original-derived' ? 'original-derived' : 'mock',
      license: 'Local MOD preview; derived from a local base package.',
      ruleset: `${base.manifest.ruleset}-mod-v1`,
      priority: 10,
      dependencies: [{ id: base.manifest.id, version: base.manifest.version }],
    },
    entry: undefined,
    maps: [],
    dialogues: [
      { id: `${modId}:talk/bonus`, speaker: 'MOD 引路人', text: '這是一條由 MOD 新增的對話，用來驗證內容加入。' },
    ],
    events: [],
    items: [
      { id: `${modId}:item/bonus`, name: 'MOD 獎勵物品', description: '由 MOD 新增的物品；驗證 MOD 可加入基礎包沒有定義的內容。' },
    ],
    patches: [
      { target: target.id, expectedText: target.text, text: `${target.text}（MOD 已載入）` },
    ],
  };
  // entry must be absent for mods; drop the key entirely (JSON omits undefined).
  delete mod.entry;
  return { mod, modId, baseSha };
}

function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('Usage: node tools/extractor/prepare-mod-preview.mjs <base-package.json> [out-dir]');
    process.exit(1);
  }
  const baseFile = resolve(args[0]);
  const outDir = resolve(args[1] ?? 'assets/generated/mod-preview');
  const { base, raw, sha: baseSha } = loadBase(baseFile);
  const { mod, modId } = buildMod(base, baseSha);
  const serialized = JSON.stringify(mod, null, 2);
  const outSha = sha256(Buffer.from(serialized, 'utf8'));
  mkdirSync(outDir, { recursive: true });
  const target = resolve(outDir, `mod-${outSha.slice(0, 16)}.local.json`);
  const bundle = {
    package: mod,
    provenance: {
      converterVersion: CONVERTER_VERSION,
      confidence: 'Community Implementation',
      basePackage: { id: base.manifest.id, version: base.manifest.version, sha256: baseSha },
      sourceFile: baseFile,
      notes: [
        `MOD ${modId} 相依基礎包 ${base.manifest.id}@${base.manifest.version}。`,
        `Patch 基礎對話 ${base.dialogues[0].id}（前置預期文字已鎖定）。`,
        `新增 1 物品＋1 對話，驗證 MOD 內容加入。`,
      ],
    },
  };
  writeFileSync(target, JSON.stringify(bundle, null, 2), 'utf8');
  console.log(JSON.stringify({
    destination: target,
    modId,
    baseId: base.manifest.id,
    patches: mod.patches.length,
    items: mod.items.length,
    dialogues: mod.dialogues.length,
    bytes: serialized.length,
  }));
}

main();
