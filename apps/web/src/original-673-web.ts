/** Locally imported, source-locked scene 32 observation. No original bytes are bundled with the site. */
import { assertState, canonical, createGame, dispatch } from '@jy/game-core';
import type { Command, GameState, ResolvedContent } from '@jy/game-core';
import { openOriginalEventSlotTable, readOriginalEventSlot } from '../../../packages/game-data/src/original-event-slots';
import { openOriginalRoleTable, readOriginalRoleInt16 } from '../../../packages/game-data/src/original-role-records';
import { bindOriginal673Session, createOriginal673Session, dispatchOriginal673Session,
  validateOriginal673Session } from '../../../tools/extractor/original-event-673-session.mjs';
import type { Original673Context, Original673State } from '../../../tools/extractor/original-event-673-session.mjs';

const packageId = 'original.jy.observed673';
const npcId = `${packageId}:npc/0`;
const eventId = 'original.jy.comparison673:event/673';
const contentHash = '048d0307af5dbce9a97d188715ae60c5f202ad3c6e4eea27e884db2439b60ac5';
const sourceHashes: Record<string, string> = {
  'KDEF.IDX': 'bf02eccf1dab01fd0ae033cdf807f56b978a71a6c2ab9be05e366239b485104b',
  'KDEF.GRP': '135c5e097a7fe561ee931046e1bebf55de9b469678e3d111d8e9f2c6bb600e06',
  'TALK.IDX': 'ac0cd18601ca1eb8aae2b0e2203c0082bcc14353ee66bfb6bc98e4e79ce92495',
  'TALK.GRP': '5cde11862ed7a52ffd45920e8f19ff21a5065bfe4c02036c524a504a5cb91811',
  'ALLDEF.GRP': '3633122f6a43f0b5dd390c2fa2516766d735a064ca955c8766b73232230a4480',
  'RANGER.IDX': '52c1545c8c0aa4d7919916ae840fb15f2772c567811ab9b9056e55b2e17ff92c',
  'RANGER.GRP': '07b99e3c1676e18691f00d6dfe713121faa6f7429e43666bc83e1568cecb68ab',
};
export interface Observed673State { game: GameState; original: Original673State }
export interface Observed673Runtime { host: ResolvedContent; context: Original673Context; state: Observed673State }
interface AttachedBundle { schemaVersion: 1; npcId: string; content: unknown;
  provenance: { eventId: number; sourceHashes: Record<string, string> };
  allDefBase64: string; rangerIndexBase64: string; rangerGroupBase64: string }
function fail(code: string): never { throw new Error(`ORIGINAL673_WEB_${code}`); }
function bytes(value: string, max: number): Uint8Array {
  if (typeof value !== 'string' || value.length > max * 4 / 3 + 8 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) fail('BYTES');
  return Uint8Array.from(atob(value), c => c.charCodeAt(0));
}
function lock(runtime: Observed673Runtime) {
  return { host: runtime.host.identities, settings: runtime.host.settings,
    decisionContent: runtime.context.content.identity, sourceHashes: runtime.context.sourceHashes };
}
export function validateObserved673(runtime: Observed673Runtime): void {
  const {host, context, state} = runtime;
  assertState(host, state.game);
  validateOriginal673Session(context, state.original);
  if (state.game.mapId !== `${packageId}:map/32` || state.game.cursor ||
      !host.maps[state.game.mapId]?.npcs.some(n => n.id === npcId && n.x === 31 && n.y === 25) ||
      !host.events[`${packageId}:event/673`] ||
      state.original.event.location.mapId !== 'original.jy:comparison/scene32' ||
      state.original.event.location.x !== 0 || state.original.event.location.y !== 0) fail('STATE');
}
export async function bindObserved673(host: ResolvedContent, attached: AttachedBundle): Promise<Observed673Runtime> {
  if (host.identities.length !== 1 || host.identities[0]?.id !== packageId ||
      !attached || attached.schemaVersion !== 1 || attached.npcId !== npcId ||
      attached.provenance?.eventId !== 673 ||
      canonical(attached.provenance.sourceHashes) !== canonical(sourceHashes)) fail('SOURCE_LOCK');
  const [table, roleTable] = await Promise.all([
    openOriginalEventSlotTable(bytes(attached.allDefBase64, 500_000)),
    openOriginalRoleTable(bytes(attached.rangerIndexBase64, 1_000), bytes(attached.rangerGroupBase64, 200_000)),
  ]);
  const context = await bindOriginal673Session({ content: attached.content as Parameters<typeof bindOriginal673Session>[0]['content'],
    table, roleTable, provenance: attached.provenance });
  if (context.content.identity.sha256 !== contentHash ||
      readOriginalEventSlot(table, createOriginal673Session(context).overlay, 32, 0)[2] !== 673) fail('CONTENT_LOCK');
  const runtime = { host, context, state: { game: createGame(host, 42), original: createOriginal673Session(context) } };
  validateObserved673(runtime);
  return runtime;
}
export function dispatchObserved673(runtime: Observed673Runtime, command: Command): { runtime: Observed673Runtime; notices: string[] } {
  validateObserved673(runtime);
  const { game, original } = runtime.state;
  let state: Observed673State;
  let notices: string[];
  if (command.type === 'MOVE') {
    if (original.event.cursor) fail('EVENT_BUSY');
    const result = dispatch(runtime.host, game, command);
    state = { game: result.state, original };
    notices = result.notifications.map(n => n.type);
  } else if (command.type === 'INTERACT') {
    if (command.npcId !== npcId || original.event.cursor ||
        Math.abs(game.x - 31) + Math.abs(game.y - 25) !== 1 ||
        readOriginalEventSlot(runtime.context.table, original.overlay, 32, 0)[2] !== 673) fail('INTERACT');
    const result = dispatchOriginal673Session(runtime.context, original, { type: 'START', eventId });
    state = { game, original: result.state };
    notices = result.notices.map(n => n.type);
  } else if (command.type === 'CONTINUE') {
    if (!original.event.cursor) fail('CONTINUE');
    const result = dispatchOriginal673Session(runtime.context, original, { type: 'CONTINUE' });
    state = { game, original: result.state };
    notices = result.notices.map(n => n.type);
  } else fail('COMMAND');
  const next = { ...runtime, state };
  validateObserved673(next);
  return { runtime: next, notices };
}
export function observed673Aptitude(runtime: Observed673Runtime): number {
  return readOriginalRoleInt16(runtime.context.roleTable, runtime.state.original.roles, 0, 120);
}
export function observed673Slot(runtime: Observed673Runtime): number {
  return readOriginalEventSlot(runtime.context.table, runtime.state.original.overlay, 32, 0)[2]!;
}
export function serializeObserved673(runtime: Observed673Runtime): string {
  validateObserved673(runtime);
  return canonical({ format: 'observed-673-web-slice', schemaVersion: 1, lock: lock(runtime), state: runtime.state });
}
export function restoreObserved673(runtime: Observed673Runtime, raw: string): Observed673Runtime {
  if (typeof raw !== 'string' || raw.length > 8_000_000) fail('SAVE_SIZE');
  let parsed: { format?: string; schemaVersion?: number; lock?: unknown; state?: Observed673State };
  try { parsed = JSON.parse(raw); } catch { fail('SAVE_JSON'); }
  if (parsed!.format !== 'observed-673-web-slice' || parsed!.schemaVersion !== 1 ||
      canonical(parsed!.lock) !== canonical(lock(runtime)) || !parsed!.state) fail('SAVE_LOCK');
  const next = { ...runtime, state: structuredClone(parsed!.state) };
  validateObserved673(next);
  return next;
}
export function observed673SaveKey(runtime: Observed673Runtime): string {
  return `jy:observed673:${runtime.host.identities[0]!.sha256}:${runtime.context.content.identity.sha256}`;
}
