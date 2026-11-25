/** Serializable checkpoint for the verified role-only effect slice of event 289. */
import { canonical } from '../../packages/game-core/src/content.ts';
import { readOriginalRoleInt16 } from '../../packages/game-data/src/original-role-records.ts';
import { applyOriginal289ObservedRole, createOriginal289RoleState } from
  './original-event-289-role-adapter.mjs';

const exact = (value, keys) => !!value && typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).sort().join('|') === [...keys].sort().join('|');
const fail = code => { throw new Error(`ORIGINAL289_SESSION_${code}`); };
const lock = context => ({ adapterVersion: context.adapterVersion, eventId: context.eventId,
  eventSha256: context.eventSha256, sourceHashes: { ...context.sourceHashes } });

export function validateOriginal289RoleSession(context, state) {
  if (!exact(state, ['schemaVersion', 'status', 'precondition', 'roles']) || state.schemaVersion !== 1 ||
      !['ready', 'completed'].includes(state.status) ||
      !['source-sex-2', 'synthetic-sex-0'].includes(state.precondition)) fail('STATE');
  const values = [28, 126, 146, 166, 174].map(offset =>
    readOriginalRoleInt16(context.roleTable, state.roles, 36, offset));
  const before = state.precondition === 'source-sex-2' ? [2, 31, 0, -1, 0] : [0, 31, 0, -1, 0];
  const expected = state.status === 'ready' ? before : [2, 60, 100, 78, 1];
  if (JSON.stringify(values) !== JSON.stringify(expected)) fail('ROLE');
  const keys = Object.keys(state.roles.records);
  if ((state.status === 'ready' && state.precondition === 'source-sex-2' && keys.length) ||
      ((state.status === 'completed' || state.precondition === 'synthetic-sex-0') &&
       keys.join('|') !== '36')) fail('SCOPE');
}

export function createOriginal289RoleSession(context, precondition = 'source-sex-2') {
  if (!['source-sex-2', 'synthetic-sex-0'].includes(precondition)) fail('PRECONDITION');
  const state = { schemaVersion: 1, status: 'ready', precondition,
    roles: createOriginal289RoleState(context, { syntheticSexZero: precondition === 'synthetic-sex-0' }) };
  validateOriginal289RoleSession(context, state);
  return state;
}

export function executeOriginal289RoleSession(context, previous) {
  validateOriginal289RoleSession(context, previous);
  if (previous.status !== 'ready') fail('ALREADY_COMPLETED');
  const state = { ...structuredClone(previous), status: 'completed',
    roles: applyOriginal289ObservedRole(context, previous.roles) };
  validateOriginal289RoleSession(context, state);
  return state;
}

export function serializeOriginal289RoleSession(context, state) {
  validateOriginal289RoleSession(context, state);
  return canonical({ format: 'original-289-role-slice', schemaVersion: 1,
    adapterVersion: '0.1.0', contentLock: lock(context), state });
}

export function restoreOriginal289RoleSession(context, raw) {
  if (typeof raw !== 'string' || raw.length > 2_000_000) fail('SIZE');
  let parsed;
  try { parsed = JSON.parse(raw); } catch { fail('JSON'); }
  if (!exact(parsed, ['format', 'schemaVersion', 'adapterVersion', 'contentLock', 'state']) ||
      parsed.format !== 'original-289-role-slice' || parsed.schemaVersion !== 1 ||
      parsed.adapterVersion !== '0.1.0' || canonical(parsed.contentLock) !== canonical(lock(context)))
    fail('FORMAT');
  validateOriginal289RoleSession(context, parsed.state);
  return structuredClone(parsed.state);
}
