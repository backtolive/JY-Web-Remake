/** Source-locked scalar role effects for exact DOS-observed event cases. */
import { createHash } from 'node:crypto';
import { parseIdxGrpIndex, readIdxGrpResource } from '../../packages/game-data/src/idx-grp.ts';
import { createOriginalRoleOverlay, openOriginalRoleTable, readOriginalRoleInt16,
  readOriginalRoleRecord, updateOriginalRoleInt16 } from
  '../../packages/game-data/src/original-role-records.ts';

const hashes = Object.freeze({
  'KDEF.IDX': 'bf02eccf1dab01fd0ae033cdf807f56b978a71a6c2ab9be05e366239b485104b',
  'KDEF.GRP': '135c5e097a7fe561ee931046e1bebf55de9b469678e3d111d8e9f2c6bb600e06',
  'RANGER.IDX': '52c1545c8c0aa4d7919916ae840fb15f2772c567811ab9b9056e55b2e17ff92c',
  'RANGER.GRP': '07b99e3c1676e18691f00d6dfe713121faa6f7429e43666bc83e1568cecb68ab',
});
const cases = Object.freeze({
  28: Object.freeze({ eventOffset: 2334, eventLength: 200,
    eventHash: 'b167afbf2bca14859384c2550b4fdec2e087db6b96aee6bc42747d1f8884b15c',
    instructionWordOffset: 65, instruction: [23, 4, 99], roleId: 4, fieldOffset: 94,
    before: 53, after: 99, evidence: 'verified-original-event-28-pre-battle-path' }),
  101: Object.freeze({ eventOffset: 17272, eventLength: 164,
    eventHash: 'd15178326f1b9a0786678b01fd539ee166cf9c9030fbe7704708ddb5029c0413',
    instructionWordOffset: 57, instruction: [56, 3], roleId: 0, fieldOffset: 118,
    before: 0, after: 3, evidence: 'verified-original-event-101-victory-path' }),
  497: Object.freeze({ eventOffset: 75696, eventLength: 40,
    eventHash: 'd1f6e697f10af178b61113bdc07e180fdcec634886cc96bb59a3068d44ffbd08',
    instructionWordOffset: 17, instruction: [37, -1], roleId: 0, fieldOffset: 112,
    before: 50, after: 49, evidence: 'verified-original-event-497-path' }),
});
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = code => { throw new Error(`ORIGINAL_ROLE_SCALAR_${code}`); };

export async function bindOriginalObservedRoleScalar(sources, eventId) {
  const definition = cases[eventId];
  if (!definition) fail('CASE');
  for (const [name, expected] of Object.entries(hashes))
    if (!(sources[name] instanceof Uint8Array) || sha(sources[name]) !== expected) fail(`SOURCE:${name}`);
  const range = parseIdxGrpIndex(sources['KDEF.IDX'], sources['KDEF.GRP'].length)[eventId];
  if (!range || range.sourceOffset !== definition.eventOffset ||
      range.byteLength !== definition.eventLength) fail('RANGE');
  const raw = readIdxGrpResource(sources['KDEF.GRP'], range);
  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  const actual = definition.instruction.map((_, index) =>
    view.getInt16((definition.instructionWordOffset + index) * 2, true));
  if (sha(raw) !== definition.eventHash || JSON.stringify(actual) !==
      JSON.stringify(definition.instruction)) fail('INSTRUCTION');
  const roleTable = await openOriginalRoleTable(sources['RANGER.IDX'], sources['RANGER.GRP']);
  const context = Object.freeze({ adapterVersion: 1, eventId, sourceHashes: hashes,
    ...definition, roleTable });
  const source = createOriginalRoleOverlay(roleTable);
  if (readOriginalRoleInt16(roleTable, source, definition.roleId, definition.fieldOffset) !==
      definition.before) fail('SOURCE_ROLE');
  return context;
}

export function createOriginalObservedRoleScalarState(context) {
  if (!cases[context?.eventId] || context.eventHash !== cases[context.eventId].eventHash) fail('CONTEXT');
  return createOriginalRoleOverlay(context.roleTable);
}

export function applyOriginalObservedRoleScalar(context, previous) {
  if (!cases[context?.eventId] || context.eventHash !== cases[context.eventId].eventHash ||
      Object.keys(previous?.records ?? {}).length !== 0 ||
      readOriginalRoleInt16(context.roleTable, previous, context.roleId, context.fieldOffset) !==
      context.before) fail('PRECONDITION');
  const base = readOriginalRoleRecord(context.roleTable, previous, context.roleId);
  const next = updateOriginalRoleInt16(context.roleTable, previous, context.roleId,
    [[context.fieldOffset, context.after]]);
  const record = readOriginalRoleRecord(context.roleTable, next, context.roleId);
  if (record.some((byte, offset) => ![context.fieldOffset, context.fieldOffset + 1].includes(offset) &&
      byte !== base[offset])) fail('RESULT');
  return next;
}
