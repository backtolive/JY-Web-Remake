/** Serializable partial session for the observed one-person event-581 effect. */
import { canonical } from '../../packages/game-core/src/content.ts';
import { readOriginalEventSlot } from '../../packages/game-data/src/original-event-slots.ts';
import { createOriginalRoleOverlay, readOriginalRoleInt16, readOriginalRoleRecord } from
  '../../packages/game-data/src/original-role-records.ts';
import { applyOriginal581ObservedRole, applyOriginal581ObservedSlot,
  createOriginal581RoleState, createOriginal581SlotState } from
  './original-event-581-adapter.mjs';

const beforeExpected = [1, 2, -1, -1, -1, 2718, 2718, 2718, 0, 30, 21];
const afterExpected = [0, 0, -1, -1, -1, -1, -1, -1, 0, 30, 21];
const equal = (left, right) => Array.isArray(left) && left.length === right.length &&
  left.every((value, index) => value === right[index]);
const exact = (value, keys) => !!value && typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).sort().join('|') === [...keys].sort().join('|');
const fail = code => { throw new Error(`ORIGINAL581_SESSION_${code}`); };

function contentLock(context) {
  return {
    adapterVersion: 1,
    eventId: context.eventId,
    eventRecordSha256: context.eventRecordSha256,
    instructionSourceByteOffset: context.instructionSourceByteOffset,
    args: [...context.args],
    sourceHashes: { ...context.sourceHashes },
  };
}

function validateLock(context, lock) {
  if (!exact(lock, ['adapterVersion', 'eventId', 'eventRecordSha256',
      'instructionSourceByteOffset', 'args', 'sourceHashes']) ||
      canonical(lock) !== canonical(contentLock(context))) fail('CONTENT_MISMATCH');
}

export function validateOriginal581Session(context, state) {
  if (!exact(state, ['schemaVersion', 'status', 'party', 'location', 'overlay', 'roles']) ||
      state.schemaVersion !== 1 || !['ready', 'completed', 'blocked-full-party'].includes(state.status) ||
      !exact(state.party, ['roles', 'evidence']) || !Array.isArray(state.party.roles) ||
      !['verified-original-one-person-sample', 'verified-original-full-party-sample'].includes(state.party.evidence) ||
      !exact(state.location, ['sceneId', 'sceneName', 'slotId', 'arrayIndex1', 'arrayIndex2']) ||
      state.location.sceneId !== 53 || state.location.sceneName !== '擂鼓山' ||
      state.location.slotId !== 2 || state.location.arrayIndex1 !== 18 || state.location.arrayIndex2 !== 24)
    fail('STATE');
  const onePerson = equal(state.party.roles, [0, -1, -1, -1, -1, -1]) &&
    state.party.evidence === 'verified-original-one-person-sample';
  const joined = equal(state.party.roles, [0, 49, -1, -1, -1, -1]) &&
    state.party.evidence === 'verified-original-one-person-sample';
  const fullParty = equal(state.party.roles, [0, 1, 2, 3, 4, 5]) &&
    state.party.evidence === 'verified-original-full-party-sample';
  if (!(onePerson || joined || fullParty) || (state.status === 'ready' && !(onePerson || fullParty)) ||
      (state.status === 'completed' && !joined) ||
      (state.status === 'blocked-full-party' && !fullParty)) fail('STATE');
  const record = readOriginalEventSlot(context.table, state.overlay, 32, 2);
  const expected = state.status === 'ready' ? beforeExpected : afterExpected;
  const actualExpected = state.status === 'blocked-full-party' ? beforeExpected : expected;
  if (!equal(record, actualExpected)) fail('SLOT');
  const keys = Object.keys(state.overlay.records);
  if ((['ready', 'blocked-full-party'].includes(state.status) && keys.length !== 0) ||
      (state.status === 'completed' && (keys.length !== 1 || keys[0] !== '32/2')))
    fail('OVERLAY_SCOPE');
  const roleKeys = Object.keys(state.roles.records);
  if (state.status !== 'completed') {
    if (roleKeys.length !== 0) fail('ROLE_SCOPE');
  } else {
    if (roleKeys.join('|') !== '49') fail('ROLE_SCOPE');
    const expectedRole = new Map([[34, 238], [36, 238], [80, 2], [82, 321], [84, 321],
      [86, 44], [88, 50], [128, 15]]);
    const base = readOriginalRoleRecord(context.roleTable, createOriginalRoleOverlay(context.roleTable), 49);
    const role = readOriginalRoleRecord(context.roleTable, state.roles, 49);
    const changed = new Set([...expectedRole.keys()].flatMap(offset => [offset, offset + 1]));
    for (const [offset, value] of expectedRole)
      if (readOriginalRoleInt16(context.roleTable, state.roles, 49, offset) !== value) fail('ROLE');
    if (role.some((byte, offset) => !changed.has(offset) && byte !== base[offset])) fail('ROLE_SCOPE');
  }
}

export function createOriginal581Session(context, partyRoles = [0, -1, -1, -1, -1, -1]) {
  const onePerson = equal(partyRoles, [0, -1, -1, -1, -1, -1]);
  const fullParty = equal(partyRoles, [0, 1, 2, 3, 4, 5]);
  if (!(onePerson || fullParty)) fail('UNVERIFIED_PARTY');
  const state = {
    schemaVersion: 1,
    status: 'ready',
    party: { roles: [...partyRoles], evidence: onePerson ?
      'verified-original-one-person-sample' : 'verified-original-full-party-sample' },
    location: { sceneId: 53, sceneName: '擂鼓山', slotId: 2, arrayIndex1: 18, arrayIndex2: 24 },
    overlay: createOriginal581SlotState(context),
    roles: createOriginal581RoleState(context),
  };
  validateOriginal581Session(context, state);
  return state;
}

/** The command commits the full verified overlay or throws without mutating previous. */
export function executeOriginal581Session(context, previous) {
  validateOriginal581Session(context, previous);
  if (previous.status !== 'ready') fail('ALREADY_COMPLETED');
  if (previous.party.evidence === 'verified-original-full-party-sample') {
    const blocked = { ...structuredClone(previous), status: 'blocked-full-party' };
    validateOriginal581Session(context, blocked);
    return blocked;
  }
  const state = {
    schemaVersion: 1,
    status: 'completed',
    party: { ...structuredClone(previous.party), roles: [0, 49, -1, -1, -1, -1] },
    location: structuredClone(previous.location),
    overlay: applyOriginal581ObservedSlot(context, previous.overlay),
    roles: applyOriginal581ObservedRole(context, previous.roles),
  };
  validateOriginal581Session(context, state);
  return state;
}

/** Partial evidence session only; this is not a complete original-game save. */
export function serializeOriginal581Session(context, state) {
  validateOriginal581Session(context, state);
  return canonical({
    format: 'original-581-slice',
    schemaVersion: 1,
    adapterVersion: '0.1.0',
    contentLock: contentLock(context),
    state,
  });
}

export function restoreOriginal581Session(context, raw) {
  if (typeof raw !== 'string' || raw.length > 8_000_000) fail('SIZE');
  let parsed;
  try { parsed = JSON.parse(raw); } catch { fail('JSON'); }
  if (!exact(parsed, ['format', 'schemaVersion', 'adapterVersion', 'contentLock', 'state']) ||
      parsed.format !== 'original-581-slice' || parsed.schemaVersion !== 1 ||
      parsed.adapterVersion !== '0.1.0') fail('FORMAT');
  validateLock(context, parsed.contentLock);
  validateOriginal581Session(context, parsed.state);
  return structuredClone(parsed.state);
}
