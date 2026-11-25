/** Source-locked role-field effect slice observed for original event 289. */
import { createHash } from 'node:crypto';
import { parseIdxGrpIndex, readIdxGrpResource } from '../../packages/game-data/src/idx-grp.ts';
import { createOriginalRoleOverlay, openOriginalRoleTable, readOriginalRoleInt16,
  readOriginalRoleRecord, updateOriginalRoleInt16 } from
  '../../packages/game-data/src/original-role-records.ts';

const pinned = Object.freeze({
  'KDEF.IDX': 'bf02eccf1dab01fd0ae033cdf807f56b978a71a6c2ab9be05e366239b485104b',
  'KDEF.GRP': '135c5e097a7fe561ee931046e1bebf55de9b469678e3d111d8e9f2c6bb600e06',
  'RANGER.IDX': '52c1545c8c0aa4d7919916ae840fb15f2772c567811ab9b9056e55b2e17ff92c',
  'RANGER.GRP': '07b99e3c1676e18691f00d6dfe713121faa6f7429e43666bc83e1568cecb68ab',
});
const eventHash = 'c191d39636c89da677c8e221d7e1df3be20ef390a7f9991612e2bc27aa387c4b';
const writes = Object.freeze([[28, 2], [126, 60], [146, 100], [166, 78], [174, 1]]);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = code => { throw new Error(`ORIGINAL289_ROLE_${code}`); };

function wordsAt(raw, offset, length) {
  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  return Array.from({ length }, (_, index) => view.getInt16((offset + index) * 2, true));
}

export async function bindOriginal289RoleAdapter(sources) {
  for (const [name, hash] of Object.entries(pinned))
    if (!(sources[name] instanceof Uint8Array) || sha(sources[name]) !== hash) fail(`SOURCE:${name}`);
  const ranges = parseIdxGrpIndex(sources['KDEF.IDX'], sources['KDEF.GRP'].length);
  const range = ranges[289];
  if (!range || range.sourceOffset !== 46184 || range.byteLength !== 226) fail('EVENT_RANGE');
  const raw = readIdxGrpResource(sources['KDEF.GRP'], range);
  if (sha(raw) !== eventHash ||
      JSON.stringify(wordsAt(raw, 98, 5)) !== JSON.stringify([35, 36, 0, 60, 100]) ||
      JSON.stringify(wordsAt(raw, 103, 4)) !== JSON.stringify([41, 36, 78, 1]) ||
      JSON.stringify(wordsAt(raw, 107, 3)) !== JSON.stringify([63, 36, 2])) fail('INSTRUCTIONS');
  const roleTable = await openOriginalRoleTable(sources['RANGER.IDX'], sources['RANGER.GRP']);
  return Object.freeze({ adapterVersion: 1, eventId: 289, eventByteOffset: 46184,
    eventSha256: eventHash, sourceHashes: pinned, roleTable });
}

export function createOriginal289RoleState(context, { syntheticSexZero = false } = {}) {
  if (context?.eventId !== 289 || context?.eventSha256 !== eventHash) fail('CONTEXT');
  const source = createOriginalRoleOverlay(context.roleTable);
  const expected = [[28, 2], [126, 31], [146, 0], [166, -1], [174, 0]];
  if (!expected.every(([offset, value]) =>
    readOriginalRoleInt16(context.roleTable, source, 36, offset) === value)) fail('SOURCE_ROLE');
  return syntheticSexZero ? updateOriginalRoleInt16(context.roleTable, source, 36, [[28, 0]]) : source;
}

/** Apply only fields attributed to opcodes 35, 41 and 63 by the two DOS samples. */
export function applyOriginal289ObservedRole(context, previous) {
  if (context?.eventId !== 289 || context?.eventSha256 !== eventHash || !previous) fail('CONTEXT');
  const keys = Object.keys(previous.records ?? {});
  if (keys.length > 1 || (keys.length === 1 && keys[0] !== '36')) fail('PRECONDITION');
  const before = [[126, 31], [146, 0], [166, -1], [174, 0]];
  const sex = readOriginalRoleInt16(context.roleTable, previous, 36, 28);
  if (![0, 2].includes(sex) || !before.every(([offset, value]) =>
    readOriginalRoleInt16(context.roleTable, previous, 36, offset) === value)) fail('PRECONDITION');
  const source = readOriginalRoleRecord(context.roleTable,
    createOriginalRoleOverlay(context.roleTable), 36);
  const prepared = readOriginalRoleRecord(context.roleTable, previous, 36);
  if (prepared.some((byte, offset) => ![28, 29].includes(offset) && byte !== source[offset]))
    fail('PRECONDITION');
  const base = readOriginalRoleRecord(context.roleTable, previous, 36);
  const next = updateOriginalRoleInt16(context.roleTable, previous, 36, writes);
  const record = readOriginalRoleRecord(context.roleTable, next, 36);
  const changed = new Set(writes.flatMap(([offset]) => [offset, offset + 1]));
  if (!writes.every(([offset, value]) =>
      readOriginalRoleInt16(context.roleTable, next, 36, offset) === value) ||
      record.some((byte, offset) => !changed.has(offset) && byte !== base[offset])) fail('RESULT');
  return next;
}
