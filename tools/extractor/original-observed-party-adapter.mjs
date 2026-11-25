/** Exact party-array transitions observed in original DOS event cases. */
import { createHash } from 'node:crypto';
import { parseIdxGrpIndex, readIdxGrpResource } from '../../packages/game-data/src/idx-grp.ts';

const sourceHashes = Object.freeze({
  'KDEF.IDX': 'bf02eccf1dab01fd0ae033cdf807f56b978a71a6c2ab9be05e366239b485104b',
  'KDEF.GRP': '135c5e097a7fe561ee931046e1bebf55de9b469678e3d111d8e9f2c6bb600e06',
});
const cases = Object.freeze({
  932: Object.freeze({ eventOffset: 112646, eventLength: 80,
    eventHash: '282cb5542ed173c3d0067d8c84674ddd6a9edf85ba432113159dd8aec57a7dc3',
    instructionWordOffset: 38, instruction: [59],
    before: [0, 1, 49, -1, -1, -1], after: [0, -1, -1, -1, -1, -1],
    evidence: 'verified-original-event-932-runtime-team' }),
  950: Object.freeze({ eventOffset: 113454, eventLength: 42,
    eventHash: 'a901c75f40e733d0252ea20c0c40e42ae7bc139e32675f862724d6a29e6435eb',
    instructionWordOffset: 4, instruction: [21, 1],
    before: [0, 1, -1, -1, -1, -1], after: [0, -1, -1, -1, -1, -1],
    evidence: 'verified-original-event-950-runtime-team' }),
});
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const equal = (left, right) => Array.isArray(left) && left.length === right.length &&
  left.every((value, index) => value === right[index]);
const fail = code => { throw new Error(`ORIGINAL_PARTY_${code}`); };

export function bindOriginalObservedParty(sources, eventId) {
  const definition = cases[eventId];
  if (!definition) fail('CASE');
  for (const [name, expected] of Object.entries(sourceHashes))
    if (!(sources[name] instanceof Uint8Array) || sha(sources[name]) !== expected) fail(`SOURCE:${name}`);
  const range = parseIdxGrpIndex(sources['KDEF.IDX'], sources['KDEF.GRP'].length)[eventId];
  if (!range || range.sourceOffset !== definition.eventOffset ||
      range.byteLength !== definition.eventLength) fail('RANGE');
  const raw = readIdxGrpResource(sources['KDEF.GRP'], range);
  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  const actual = definition.instruction.map((_, index) =>
    view.getInt16((definition.instructionWordOffset + index) * 2, true));
  if (sha(raw) !== definition.eventHash || !equal(actual, definition.instruction)) fail('INSTRUCTION');
  return Object.freeze({ adapterVersion: 1, eventId, sourceHashes,
    eventOffset: definition.eventOffset, eventLength: definition.eventLength,
    eventHash: definition.eventHash, instructionWordOffset: definition.instructionWordOffset,
    instruction: Object.freeze([...definition.instruction]),
    before: Object.freeze([...definition.before]), after: Object.freeze([...definition.after]),
    evidence: definition.evidence });
}

export function createOriginalObservedPartyState(context) {
  if (!cases[context?.eventId] || context.eventHash !== cases[context.eventId].eventHash) fail('CONTEXT');
  return Object.freeze({ schemaVersion: 1, roles: Object.freeze([...context.before]),
    evidence: context.evidence });
}

export function applyOriginalObservedParty(context, previous) {
  if (!previous || Object.keys(previous).sort().join('|') !== 'evidence|roles|schemaVersion' ||
      previous.schemaVersion !== 1 || previous.evidence !== context.evidence ||
      !equal(previous.roles, context.before)) fail('PRECONDITION');
  return Object.freeze({ schemaVersion: 1, roles: Object.freeze([...context.after]),
    evidence: context.evidence });
}
