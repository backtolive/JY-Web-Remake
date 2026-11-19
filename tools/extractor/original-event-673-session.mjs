/** Limited original-content adapter state for the observed event 673 path. */
import { canonical } from '../../packages/game-core/src/content.ts';
import { readDecisionValue } from '../../packages/game-core/src/decision.ts';
import { createDecisionEventState, dispatchDecisionEvent, resolveDecisionEventContent,
  validateDecisionEventState } from '../../packages/game-core/src/decision-event.ts';
import { createOriginalEventSlotOverlay, readOriginalEventSlot,
  updateOriginalEventSlot } from '../../packages/game-data/src/original-event-slots.ts';
import { createOriginalRoleOverlay, readOriginalRoleRecord, readOriginalRoleInt16,
  updateOriginalRoleInt16 } from '../../packages/game-data/src/original-role-records.ts';

const aptitudeRef = { domain: 'original.jy:stats', key: 'original.jy:hero/aptitude' };
const slotRef = { domain: 'original.jy:event-slots', key: 'original.jy:scene/32/slot/0/field/2' };
const eventId = 'original.jy.comparison673:event/673';
const exact = (value, keys) => !!value && typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).sort().join('|') === [...keys].sort().join('|');
const fail = code => { throw new Error(`ORIGINAL673_SESSION_${code}`); };

export async function bindOriginal673Session(converted) {
  const content = await resolveDecisionEventContent(converted.content);
  if (converted.provenance?.eventId !== 673 ||
      converted.provenance?.sourceHashes?.['ALLDEF.GRP'] !== converted.table?.sha256 ||
      converted.provenance?.sourceHashes?.['RANGER.IDX'] !== converted.roleTable?.indexSha256 ||
      converted.provenance?.sourceHashes?.['RANGER.GRP'] !== converted.roleTable?.groupSha256 ||
      !content.data.events[eventId]) fail('CONTENT');
  return { content, table: converted.table, roleTable: converted.roleTable,
    sourceHashes: structuredClone(converted.provenance.sourceHashes) };
}

function values(context, event) {
  return { aptitude: readDecisionValue(context.content.data.decision, event.decision, aptitudeRef),
    slot: readDecisionValue(context.content.data.decision, event.decision, slotRef) };
}
function lock(context) {
  return { decisionContent: context.content.identity, sourceHashes: context.sourceHashes };
}

export function validateOriginal673Session(context, state) {
  if (!exact(state, ['schemaVersion', 'event', 'overlay', 'roles']) || state.schemaVersion !== 1)
    fail('STATE');
  validateDecisionEventState(context.content, state.event);
  const current = readOriginalEventSlot(context.table, state.overlay, 32, 0)[2];
  const { aptitude, slot } = values(context, state.event);
  if (current !== slot) fail('MIRROR');
  if (readOriginalRoleInt16(context.roleTable, state.roles, 0, 120) !== aptitude) fail('ROLE_MIRROR');
  const before = aptitude === 72 && slot === 673 && state.event.decision.revision === 0;
  const after = aptitude === 75 && slot === 674 && state.event.decision.revision === 1 && !state.event.cursor;
  if (!(before || after))
    fail('SCOPE');
  const keys = Object.keys(state.overlay.records);
  if (before && keys.length) fail('OVERLAY_SCOPE');
  if (after) {
    if (keys.length !== 1 || keys[0] !== '32/0') fail('OVERLAY_SCOPE');
    const base = readOriginalEventSlot(context.table, createOriginalEventSlotOverlay(context.table), 32, 0);
    const record = readOriginalEventSlot(context.table, state.overlay, 32, 0);
    if (record.some((value, field) => value !== (field === 2 ? 674 : base[field])))
      fail('OVERLAY_SCOPE');
  }
  if (Object.keys(state.roles.records).join('|') !== '0') fail('ROLE_SCOPE');
  const baseRole = readOriginalRoleRecord(context.roleTable,
    createOriginalRoleOverlay(context.roleTable), 0);
  const role = readOriginalRoleRecord(context.roleTable, state.roles, 0);
  if (role.some((value, byte) => value !== (byte === 120 ? aptitude & 255 :
      byte === 121 ? aptitude >> 8 & 255 : baseRole[byte]))) fail('ROLE_SCOPE');
}

export function createOriginal673Session(context) {
  const state = { schemaVersion: 1, event: createDecisionEventState(context.content),
    overlay: createOriginalEventSlotOverlay(context.table),
    // The sampled DOS before-state was 72; the immutable base RANGER.GRP value is 50.
    roles: updateOriginalRoleInt16(context.roleTable, createOriginalRoleOverlay(context.roleTable), 0, [[120, 72]]) };
  validateOriginal673Session(context, state);
  return state;
}

/** One command either commits the event result and matching slot overlay together, or throws. */
export function dispatchOriginal673Session(context, previous, command) {
  validateOriginal673Session(context, previous);
  if (command.type === 'START' && (previous.event.cursor || previous.event.decision.revision !== 0))
    fail('START');
  const result = dispatchDecisionEvent(context.content, previous.event, command);
  const oldSlot = readOriginalEventSlot(context.table, previous.overlay, 32, 0)[2];
  const { aptitude, slot } = values(context, result.state);
  let overlay = structuredClone(previous.overlay);
  let roles = structuredClone(previous.roles);
  if (slot !== oldSlot) {
    if (oldSlot !== 673 || slot !== 674 || aptitude !== 75 || result.state.cursor)
      fail('EFFECT');
    overlay = updateOriginalEventSlot(context.table, previous.overlay, 32, 0, [[2, slot]]);
    roles = updateOriginalRoleInt16(context.roleTable, previous.roles, 0, [[120, aptitude]]);
  }
  const state = { schemaVersion: 1, event: result.state, overlay, roles };
  validateOriginal673Session(context, state);
  return { state, notices: result.notices };
}

/** Partial adapter checkpoint only; this is not a DOS or complete Web game save. */
export function serializeOriginal673Session(context, state) {
  validateOriginal673Session(context, state);
  return canonical({ format: 'original-673-slice', schemaVersion: 1,
    adapterVersion: '0.1.0', contentLock: lock(context), state });
}

export function restoreOriginal673Session(context, raw) {
  if (typeof raw !== 'string' || raw.length > 8_000_000) fail('SIZE');
  let parsed;
  try { parsed = JSON.parse(raw); } catch { fail('JSON'); }
  if (!exact(parsed, ['format', 'schemaVersion', 'adapterVersion', 'contentLock', 'state']) ||
      parsed.format !== 'original-673-slice' || parsed.schemaVersion !== 1 ||
      parsed.adapterVersion !== '0.1.0' ||
      !exact(parsed.contentLock, ['decisionContent', 'sourceHashes'])) fail('FORMAT');
  if (canonical(parsed.contentLock) !== canonical(lock(context))) fail('CONTENT_MISMATCH');
  validateOriginal673Session(context, parsed.state);
  return structuredClone(parsed.state);
}
