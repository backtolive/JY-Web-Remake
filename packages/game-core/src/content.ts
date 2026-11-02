import { Ajv } from 'ajv';
import { contentSchema, saveSchema, stateSchema } from './schema.ts';
import { RUNTIME_VERSION } from './types.ts';
import type { ContentPackage, ResolvedContent, Condition, GameMap, GameState, SaveEnvelope } from './types.ts';

const ajv = new Ajv({ allErrors: true, strict: true });
export const validatePackageSchema = ajv.compile<ContentPackage>(contentSchema);
export const validateSaveSchema = ajv.compile<SaveEnvelope>(saveSchema);
export const validateStateSchema = ajv.compile<GameState>(stateSchema);

export interface Diagnostic { code: string; path: string; message: string }
export class ContentError extends Error {
  readonly diagnostics: Diagnostic[];
  constructor(diagnostics: Diagnostic[]) {
    super(diagnostics.map(d => `${d.code} ${d.path}: ${d.message}`).join('\n'));
    this.name = 'ContentError'; this.diagnostics = diagnostics;
  }
}
export function fail(code: string, path: string, message: string): never {
  throw new ContentError([{ code, path, message }]);
}

/** Stable serialization used for content identity; JSON data only, bounded nesting. */
export function canonical(value: unknown, depth = 0): string {
  if (depth > 32) throw new Error('JSON_DEPTH_LIMIT');
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(v => canonical(v, depth + 1)).join(',') + ']';
  if (typeof value === 'object' && value && [Object.prototype, null].includes(Object.getPrototypeOf(value))) {
    return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical((value as Record<string, unknown>)[key], depth + 1)).join(',') + '}';
  }
  throw new Error('NON_JSON_VALUE');
}
export async function contentHash(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(canonical(value));
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), x => x.toString(16).padStart(2, '0')).join('');
}
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
export function isInside(map: GameMap, x: number, y: number) {
  return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < map.width && y < map.height;
}
export function isBlocked(map: GameMap, x: number, y: number) {
  return !isInside(map, x, y) || map.blocked.includes(y * map.width + x) || map.npcs.some(npc => npc.x === x && npc.y === y);
}

export async function resolveContent(input: unknown[], settings: Record<string, string | boolean | number> = {}): Promise<ResolvedContent> {
  if (!Array.isArray(input) || input.length < 1 || input.length > 128) fail('PACKAGE_LIMIT', '/', 'Provide 1–128 packages');
  const copies = JSON.parse(canonical(input)) as unknown[];
  const packages: ContentPackage[] = [];
  for (const [i, value] of copies.entries()) {
    if (!validatePackageSchema(value)) throw new ContentError((validatePackageSchema.errors ?? []).map(error =>
      ({ code: 'SCHEMA', path: `/packages/${i}${error.instancePath}`, message: error.message ?? 'Invalid content' })));
    packages.push(value);
  }
  const byId = new Map<string, ContentPackage>();
  for (const pkg of packages) {
    const id = pkg.manifest.id;
    if (byId.has(id)) fail('DUPLICATE_PACKAGE', id, 'Package ID must be unique');
    byId.set(id, pkg);
    if (pkg.manifest.runtimeVersion !== RUNTIME_VERSION) fail('RUNTIME_VERSION', id, 'Runtime mismatch');
  }
  const bases = packages.filter(pkg => pkg.manifest.kind === 'base');
  if (bases.length !== 1 || !bases[0]!.entry) fail('BASE_PACKAGE', '/', 'Exactly one base package with entry is required');
  if (bases[0]!.patches.length || bases[0]!.manifest.dependencies.length) fail('BASE_PACKAGE', bases[0]!.manifest.id, 'Base cannot patch or depend on mods');
  for (const pkg of packages) {
    const seen = new Set<string>();
    for (const dep of pkg.manifest.dependencies) {
      if (seen.has(dep.id)) fail('DUPLICATE_DEPENDENCY', pkg.manifest.id, dep.id);
      seen.add(dep.id);
      if (!byId.has(dep.id)) fail('MISSING_DEPENDENCY', pkg.manifest.id, dep.id);
      if (byId.get(dep.id)!.manifest.version !== dep.version) fail('DEPENDENCY_VERSION', pkg.manifest.id, dep.id);
    }
    if (pkg.manifest.kind === 'mod' && pkg.entry) fail('MOD_ENTRY', pkg.manifest.id, 'Mods cannot replace entry');
  }
  const sorted: ContentPackage[] = [], remaining = new Set(packages);
  const loaded = new Set<string>();
  while (remaining.size) {
    const ready = [...remaining].filter(pkg => pkg.manifest.dependencies.every(dep => loaded.has(dep.id)))
      .sort((a, b) => a.manifest.priority - b.manifest.priority || (a.manifest.id < b.manifest.id ? -1 : a.manifest.id > b.manifest.id ? 1 : 0));
    if (!ready.length) fail('DEPENDENCY_CYCLE', '/', [...remaining].map(pkg => pkg.manifest.id).sort().join(', '));
    const next = ready[0]!;
    remaining.delete(next); loaded.add(next.manifest.id); sorted.push(next);
  }
  function dependsOn(pkg: ContentPackage, id: string, seen = new Set<string>()): boolean {
    if (seen.has(pkg.manifest.id)) return false;
    seen.add(pkg.manifest.id);
    return pkg.manifest.dependencies.some(dep => dep.id === id || dependsOn(byId.get(dep.id)!, id, seen));
  }
  for (const pkg of packages) if (pkg.manifest.kind === 'mod' && !dependsOn(pkg, bases[0]!.manifest.id)) {
    fail('BASE_DEPENDENCY', pkg.manifest.id, 'Mod must depend on the selected base');
  }
  const maps: Record<string, GameMap> = {}, dialogues: ResolvedContent['dialogues'] = {},
    events: ResolvedContent['events'] = {}, items: ResolvedContent['items'] = {};
  const owner = new Map<string, ContentPackage>(), allIds = new Set<string>();
  function define<T extends { id: string }>(registry: Record<string, T>, rows: T[], pkg: ContentPackage) {
    for (const row of rows) {
      if (!row.id.startsWith(pkg.manifest.id + ':')) fail('NAMESPACE', row.id, 'Definitions must use their package namespace');
      if (allIds.has(row.id)) fail('DUPLICATE_ID', row.id, 'Definitions cannot silently override');
      allIds.add(row.id); registry[row.id] = row; owner.set(row.id, pkg);
    }
  }
  for (const pkg of sorted) {
    define(maps, pkg.maps, pkg); define(dialogues, pkg.dialogues, pkg);
    define(events, pkg.events, pkg); define(items, pkg.items, pkg);
  }
  const patched = new Set<string>();
  for (const pkg of sorted) for (const patch of pkg.patches) {
    if (patched.has(patch.target)) fail('PATCH_CONFLICT', patch.target, 'Multiple patches to the same target');
    const target = dialogues[patch.target];
    if (!target) fail('PATCH_TARGET', patch.target, 'Dialogue target not found');
    if (!dependsOn(pkg, owner.get(patch.target)!.manifest.id)) fail('PATCH_DEPENDENCY', patch.target, 'Declare target package dependency');
    if (target.text !== patch.expectedText) fail('PATCH_PRECONDITION', patch.target, 'Target text changed');
    (dialogues as Record<string, typeof target>)[patch.target] = { ...target, text: patch.text };
    patched.add(patch.target);
  }
  function requireRef(registry: object, id: string, location: string) {
    if (!Object.hasOwn(registry, id)) fail('MISSING_REFERENCE', location, id);
    const fromOwner = owner.get(location.split('#')[0]!);
    const targetOwner = owner.get(id);
    if (fromOwner && targetOwner && fromOwner !== targetOwner && !dependsOn(fromOwner, targetOwner.manifest.id)) {
      fail('REFERENCE_DEPENDENCY', location, id);
    }
  }
  function checkCondition(condition: Condition, location: string, depth = 0) {
    if (depth > 16) fail('CONDITION_DEPTH', location, 'Maximum condition depth is 16');
    if (condition.op === 'itemAtLeast') requireRef(items, condition.itemId, location);
    if (condition.op === 'all' || condition.op === 'any') condition.conditions.forEach(c => checkCondition(c, location, depth + 1));
    if (condition.op === 'not') checkCondition(condition.condition, location, depth + 1);
  }
  const npcIds = new Set<string>();
  for (const map of Object.values(maps)) {
    if (new Set(map.blocked).size !== map.blocked.length || map.blocked.some(cell => cell >= map.width * map.height)) fail('BLOCKED_CELL', map.id, 'Invalid or duplicate blocked cell');
    const occupied = new Set<string>();
    for (const npc of map.npcs) {
      if (!npc.id.startsWith(owner.get(map.id)!.manifest.id + ':') || npcIds.has(npc.id) || allIds.has(npc.id)) fail('NPC_ID', npc.id, 'Invalid namespace or duplicate ID');
      npcIds.add(npc.id);
      if (!isInside(map, npc.x, npc.y) || map.blocked.includes(npc.y * map.width + npc.x)) fail('NPC_POSITION', npc.id, 'NPC outside walkable grid');
      const cell = `${npc.x},${npc.y}`;
      if (occupied.has(cell)) fail('NPC_POSITION', npc.id, 'NPC overlap');
      occupied.add(cell); requireRef(events, npc.eventId, map.id);
    }
    for (const portal of map.portals) {
      requireRef(maps, portal.mapId, map.id);
      if (isBlocked(map, portal.x, portal.y) || isBlocked(maps[portal.mapId]!, portal.toX, portal.toY)) fail('PORTAL_POSITION', map.id, 'Portal source or destination blocked');
      const cell = `${portal.x},${portal.y}`;
      if (occupied.has(cell)) fail('PORTAL_POSITION', map.id, 'Overlapping portal or NPC');
      occupied.add(cell);
    }
  }
  for (const event of Object.values(events)) event.steps.forEach((step, index) => {
    const location = `${event.id}#steps/${index}`;
    const jump = (target: number) => { if (target >= event.steps.length) fail('JUMP_TARGET', location, 'Target outside event'); };
    if (step.op === 'say') requireRef(dialogues, step.dialogueId, location);
    if (step.op === 'giveItem') requireRef(items, step.itemId, location);
    if (step.op === 'if') { checkCondition(step.condition, location); jump(step.onTrue); jump(step.onFalse); }
    if (step.op === 'choice') step.options.forEach(option => jump(option.target));
  });
  const entry = bases[0]!.entry!;
  if (!maps[entry.mapId] || isBlocked(maps[entry.mapId]!, entry.x, entry.y)) fail('ENTRY_POSITION', '/', 'Entry outside walkable map');
  const identities = await Promise.all(sorted.map(async pkg => ({ id: pkg.manifest.id, version: pkg.manifest.version,
    sha256: await contentHash(pkg), kind: pkg.manifest.kind, priority: pkg.manifest.priority })));
  const settingsCopy = JSON.parse(canonical(settings));
  // Reuse the actual save schema for configuration shape, rather than a second validator.
  if (!validateSaveSchema({ schemaVersion: 1, runtimeVersion: RUNTIME_VERSION, content: identities, settings: settingsCopy,
    state: { ...entry, flags: {}, inventory: {}, cursor: null, rngState: 1 } })) fail('SETTINGS', '/', 'Invalid settings');
  return freeze({ identities, settings: settingsCopy, maps, dialogues, events, items, entry });
}

export function assertState(content: ResolvedContent, state: unknown): asserts state is GameState {
  if (!validateStateSchema(state)) fail('STATE_SCHEMA', '/state', 'Malformed game state');
  const map = content.maps[state.mapId];
  if (!map || isBlocked(map, state.x, state.y)) fail('STATE_POSITION', '/state', 'Invalid map or player position');
  for (const id of Object.keys(state.inventory)) if (!content.items[id]) fail('STATE_ITEM', '/state/inventory', id);
  if (state.cursor) {
    const event = content.events[state.cursor.eventId];
    const step = event?.steps[state.cursor.pc];
    if (!step) fail('STATE_CURSOR', '/state/cursor', 'Unknown event or step');
    if ((state.cursor.waiting === 'dialogue' && step.op !== 'say') || (state.cursor.waiting === 'choice' && step.op !== 'choice') || state.cursor.waiting === null) {
      fail('STATE_CURSOR', '/state/cursor', 'Only matching suspended dialogue or choice may be persisted');
    }
  }
}
