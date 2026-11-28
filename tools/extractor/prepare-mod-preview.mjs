// Local-only MOD preview generator. Produces valid MOD content packages that
// depend on a given base package. By default generates 3 MODs with different
// priorities and content to demonstrate multi-MOD stacking (priority ordering,
// conflict detection, content addition).
//
// Usage: node tools/extractor/prepare-mod-preview.mjs <base-package.json> [out-dir]
// The base package must be a kind:"base" ContentPackage (e.g. the Mock fixture
// or a generated original-derived base). Output is git-ignored under
// assets/generated/mod-preview/.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';

const CONVERTER_VERSION = '0.2.0';

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function loadBase(file) {
  const raw = readFileSync(file, 'utf8');
  const parsed = JSON.parse(raw);
  // Support both direct package files and bundle files (with a `package` field).
  const base = parsed.package ?? parsed;
  const manifest = base?.manifest;
  if (!manifest || manifest.kind !== 'base') throw new Error('BASE_KIND: base package must have kind "base"');
  if (manifest.dependencies.length) throw new Error('BASE_DEPENDS: base package cannot declare dependencies');
  if (manifest.runtimeVersion !== '0.1.0') throw new Error('RUNTIME_VERSION: base runtimeVersion must be 0.1.0');
  if (!Array.isArray(base.dialogues) || base.dialogues.length < 1) throw new Error('BASE_DIALOGUES: base must have at least one dialogue to patch');
  return { base, raw, sha: sha256(Buffer.from(raw, 'utf8')) };
}

/** Build a single MOD package. */
function buildMod(base, baseSha, opts) {
  const { id, priority, dialogues, items, events, patches, description } = opts;
  const mod = {
    manifest: {
      id,
      version: '0.1.0',
      schemaVersion: 1,
      runtimeVersion: '0.1.0',
      kind: 'mod',
      classification: base.manifest.classification === 'original-derived' ? 'original-derived' : 'mock',
      license: 'Local MOD preview; derived from a local base package.',
      ruleset: `${base.manifest.ruleset}-mod-v1`,
      priority,
      dependencies: [{ id: base.manifest.id, version: base.manifest.version }],
    },
    maps: [],
    dialogues,
    events,
    items,
    patches,
  };
  return { mod, id, baseSha, description };
}

/** Generate 3 MODs with different priorities and content. */
function buildModSet(base, baseSha) {
  const target = base.dialogues[0];
  const baseId = base.manifest.id;

  const mod1 = buildMod(base, baseSha, {
    id: `${baseId}.mod-alpha`,
    priority: 10,
    description: 'MOD Alpha：劇情增強（patch 對話＋新增物品）',
    dialogues: [
      { id: `${baseId}.mod-alpha:talk/bonus`, speaker: 'MOD 引路人', text: '這是一條由 MOD Alpha 新增的對話，用來驗證內容加入。' },
    ],
    items: [
      { id: `${baseId}.mod-alpha:item/bonus`, name: 'Alpha 獎勵物品', description: '由 MOD Alpha 新增的物品。' },
    ],
    events: [],
    patches: [
      { target: target.id, expectedText: target.text, text: `${target.text}（Alpha 已載入）` },
    ],
  });

  const mod2 = buildMod(base, baseSha, {
    id: `${baseId}.mod-beta`,
    priority: 20,
    description: 'MOD Beta：新冒險（patch 同一對話→與 Alpha 衝突＋新增事件＋對話）',
    dialogues: [
      { id: `${baseId}.mod-beta:talk/quest`, speaker: 'MOD 任務者', text: 'MOD Beta 帶來的新任務對話。' },
    ],
    items: [],
    events: [
      { id: `${baseId}.mod-beta:event/quest`, steps: [
        { op: 'say', dialogueId: `${baseId}.mod-beta:talk/quest` },
        { op: 'end' },
      ] },
    ],
    patches: [
      // Same target as Alpha → PATCH_CONFLICT when both are loaded.
      { target: target.id, expectedText: target.text, text: `${target.text}（Beta 已載入）` },
    ],
  });

  const mod3 = buildMod(base, baseSha, {
    id: `${baseId}.mod-gamma`,
    priority: 5,
    description: 'MOD Gamma：低優先權（新增物品，不 patch）',
    dialogues: [],
    items: [
      { id: `${baseId}.mod-gamma:item/trinket`, name: 'Gamma 小飾品', description: '由 MOD Gamma 新增的低優先權物品。' },
    ],
    events: [],
    patches: [],
  });

  return [mod1, mod2, mod3];
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
  const modSet = buildModSet(base, baseSha);
  mkdirSync(outDir, { recursive: true });

  const results = modSet.map(({ mod, id, description }) => {
    const serialized = JSON.stringify(mod, null, 2);
    const outSha = sha256(Buffer.from(serialized, 'utf8'));
    const target = resolve(outDir, `${id.replace(/\./g, '_')}-${outSha.slice(0, 12)}.local.json`);
    const bundle = {
      package: mod,
      provenance: {
        converterVersion: CONVERTER_VERSION,
        confidence: 'Community Implementation',
        basePackage: { id: base.manifest.id, version: base.manifest.version, sha256: baseSha },
        sourceFile: baseFile,
        notes: [
          `${description}`,
          `相依基礎包 ${base.manifest.id}@${base.manifest.version}。`,
          `Priority: ${mod.manifest.priority}。`,
          `Patches: ${mod.patches.length}, Items: ${mod.items.length}, Dialogues: ${mod.dialogues.length}, Events: ${mod.events.length}。`,
        ],
      },
    };
    writeFileSync(target, JSON.stringify(bundle, null, 2), 'utf8');
    return { file: target, id, priority: mod.manifest.priority, description };
  });

  console.log(JSON.stringify({
    count: results.length,
    baseId: base.manifest.id,
    mods: results,
  }, null, 2));
}

main();
