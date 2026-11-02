import { assertState, canonical, fail, isBlocked, validateSaveSchema } from './content.ts';
import { RUNTIME_VERSION } from './types.ts';
import type { Command, Condition, GameState, ResolvedContent, SaveEnvelope } from './types.ts';

export function evaluateCondition(condition: Condition, state: GameState, depth = 0): boolean {
  if (depth > 16) throw new Error('CONDITION_DEPTH');
  switch (condition.op) {
    case 'flag': return (state.flags[condition.key] ?? false) === condition.equals;
    case 'itemAtLeast': return (state.inventory[condition.itemId] ?? 0) >= condition.count;
    case 'all': return condition.conditions.every(c => evaluateCondition(c, state, depth + 1));
    case 'any': return condition.conditions.some(c => evaluateCondition(c, state, depth + 1));
    case 'not': return !evaluateCondition(condition.condition, state, depth + 1);
    default: throw new Error('UNSUPPORTED_CONDITION');
  }
}

/** Explicit injected PRNG state; no Math.random or clock in game logic. */
export function nextRandom(seed: number) {
  if (!Number.isInteger(seed) || seed < 1 || seed > 0xffffffff) throw new Error('INVALID_SEED');
  let next = seed >>> 0;
  next ^= next << 13; next ^= next >>> 17; next ^= next << 5;
  return { seed: next >>> 0, value: (next >>> 0) / 0x100000000 };
}

export function createGame(content: ResolvedContent, seed = 1): GameState {
  const state: GameState = { ...content.entry, flags: {}, inventory: {}, cursor: null, rngState: seed };
  assertState(content, state);
  return state;
}

export interface GameNotification { type: string; id?: string }
export function dispatch(content: ResolvedContent, previous: GameState, command: Command, stepBudget = 1000) {
  assertState(content, previous);
  if (!Number.isInteger(stepBudget) || stepBudget < 1 || stepBudget > 10000) throw new Error('INVALID_STEP_BUDGET');
  const state = structuredClone(previous);
  const notifications: GameNotification[] = [];
  function run() {
    for (let count = 0; state.cursor; count++) {
      if (count >= stepBudget) fail('SCRIPT_BUDGET', state.cursor.eventId, 'Event exceeded step budget; no state committed');
      const cursor = state.cursor;
      const step = content.events[cursor.eventId]?.steps[cursor.pc];
      if (!step) fail('SCRIPT_PC', cursor.eventId, 'Event fell outside steps without end');
      switch (step.op) {
        case 'say': cursor.waiting = 'dialogue'; notifications.push({ type: 'DIALOGUE', id: step.dialogueId }); return;
        case 'choice': cursor.waiting = 'choice'; notifications.push({ type: 'CHOICE', id: cursor.eventId }); return;
        case 'end': state.cursor = null; notifications.push({ type: 'EVENT_ENDED' }); break;
        case 'setFlag': state.flags[step.key] = step.value; cursor.pc++; break;
        case 'giveItem': {
          const amount = (state.inventory[step.itemId] ?? 0) + step.amount;
          if (!Number.isSafeInteger(amount) || amount < 0 || amount > 1_000_000) fail('INVENTORY_RANGE', cursor.eventId, step.itemId);
          state.inventory[step.itemId] = amount; cursor.pc++; break;
        }
        case 'if': cursor.pc = evaluateCondition(step.condition, state) ? step.onTrue : step.onFalse; break;
        default: throw new Error('UNSUPPORTED_STEP');
      }
    }
  }
  switch (command.type) {
    case 'MOVE': {
      if (state.cursor) fail('EVENT_BUSY', '/command', 'Finish current event before moving');
      let dx = 0, dy = 0;
      switch (command.direction) {
        case 'north': dy = -1; break; case 'south': dy = 1; break;
        case 'west': dx = -1; break; case 'east': dx = 1; break;
        default: fail('INVALID_COMMAND', '/direction', 'Unknown movement direction');
      }
      const map = content.maps[state.mapId]!;
      if (isBlocked(map, state.x + dx, state.y + dy)) { notifications.push({ type: 'MOVE_BLOCKED' }); break; }
      state.x += dx; state.y += dy;
      notifications.push({ type: 'PLAYER_MOVED' });
      const portal = map.portals.find(p => p.x === state.x && p.y === state.y);
      if (portal) {
        state.mapId = portal.mapId; state.x = portal.toX; state.y = portal.toY;
        notifications.push({ type: 'MAP_CHANGED', id: state.mapId });
      }
      break;
    }
    case 'INTERACT': {
      if (state.cursor) fail('EVENT_BUSY', '/command', 'Finish current event before interaction');
      const npc = content.maps[state.mapId]!.npcs.find(n => n.id === command.npcId);
      if (!npc || Math.abs(npc.x - state.x) + Math.abs(npc.y - state.y) !== 1) fail('NPC_REACH', '/command', 'NPC must be on an adjacent cell');
      state.cursor = { eventId: npc.eventId, pc: 0, waiting: null };
      notifications.push({ type: 'EVENT_STARTED', id: npc.eventId }); run(); break;
    }
    case 'CONTINUE': {
      if (!state.cursor || state.cursor.waiting !== 'dialogue') fail('NOT_WAITING_DIALOGUE', '/command', 'No dialogue to continue');
      state.cursor.pc++; state.cursor.waiting = null; run(); break;
    }
    case 'CHOOSE': {
      if (!state.cursor || state.cursor.waiting !== 'choice') fail('NOT_WAITING_CHOICE', '/command', 'No choice to select');
      const step = content.events[state.cursor.eventId]!.steps[state.cursor.pc]!;
      if (step.op !== 'choice' || !Number.isInteger(command.option) || command.option < 0 || !step.options[command.option]) fail('CHOICE_OPTION', '/command', 'Invalid option');
      state.cursor.pc = step.options[command.option]!.target; state.cursor.waiting = null; run(); break;
    }
    default: fail('INVALID_COMMAND', '/command', 'Unknown command');
  }
  assertState(content, state);
  return { state, notifications };
}

export function serializeSave(content: ResolvedContent, state: GameState): string {
  assertState(content, state);
  const save: SaveEnvelope = { schemaVersion: 1, runtimeVersion: RUNTIME_VERSION, content: content.identities,
    settings: content.settings, state: structuredClone(state) };
  return canonical(save);
}

/** Pure preflight/restore: no storage writes, migrations, or mutation of old save. */
export function restoreSave(content: ResolvedContent, raw: string): GameState {
  if (typeof raw !== 'string' || raw.length > 8_000_000) fail('SAVE_LIMIT', '/', 'Save exceeds input limit');
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { fail('SAVE_JSON', '/', 'Malformed JSON'); }
  if (!validateSaveSchema(parsed)) fail('SAVE_SCHEMA', '/', 'Unsupported or malformed save');
  const save = parsed as SaveEnvelope;
  if (canonical(save.content) !== canonical(content.identities) || canonical(save.settings) !== canonical(content.settings)) {
    fail('SAVE_CONTENT_MISMATCH', '/content', 'Exact packages, hashes, order, settings or versions differ; original save retained');
  }
  assertState(content, save.state);
  return structuredClone(save.state);
}

export function gridToWorld(x: number, y: number, elevation = 0, tileSize = 1) {
  if (![x, y, elevation, tileSize].every(Number.isFinite) || tileSize <= 0) throw new Error('INVALID_COORDINATE');
  return { x: x * tileSize, y: elevation, z: y * tileSize };
}
