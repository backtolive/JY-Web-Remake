/** Exact active-inventory window transition observed for original event 497. */
import { createHash } from 'node:crypto';
import { parseIdxGrpIndex, readIdxGrpResource } from '../../packages/game-data/src/idx-grp.ts';

const indexHash = 'bf02eccf1dab01fd0ae033cdf807f56b978a71a6c2ab9be05e366239b485104b';
const groupHash = '135c5e097a7fe561ee931046e1bebf55de9b469678e3d111d8e9f2c6bb600e06';
const eventHash = 'd1f6e697f10af178b61113bdc07e180fdcec634886cc96bb59a3068d44ffbd08';
const before = Object.freeze([[0, 3], [2, 3], [10, 3], [21, 3], [-1, 0]]
  .map(pair => Object.freeze(pair)));
const after = Object.freeze([[0, 3], [2, 3], [10, 3], [21, 3], [57, 1]]
  .map(pair => Object.freeze(pair)));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const equal = (left, right) => Array.isArray(left) && left.length === right.length &&
  left.every((pair, index) => Array.isArray(pair) && pair.length === 2 &&
    pair[0] === right[index][0] && pair[1] === right[index][1]);
const fail = code => { throw new Error(`ORIGINAL497_INVENTORY_${code}`); };
const event676Hash = '8a8e73c5f766a92a30e5bba86aa53f99b321958d7450922744e5c1e3090eb07a';
const before676 = Object.freeze([[0,3],[2,3],[10,3],[21,3],[138,1],[139,1],[140,1],[141,1],[142,1]].map(x=>Object.freeze(x)));
const after676 = Object.freeze([[0,3],[2,3],[10,3],[21,3],[176,1],[-1,0],[-1,0],[-1,0],[-1,0]].map(x=>Object.freeze(x)));

export function bindOriginal497InventoryAdapter(sources) {
  if (!(sources['KDEF.IDX'] instanceof Uint8Array) || sha(sources['KDEF.IDX']) !== indexHash ||
      !(sources['KDEF.GRP'] instanceof Uint8Array) || sha(sources['KDEF.GRP']) !== groupHash)
    fail('SOURCE');
  const range = parseIdxGrpIndex(sources['KDEF.IDX'], sources['KDEF.GRP'].length)[497];
  if (!range || range.sourceOffset !== 75696 || range.byteLength !== 40) fail('RANGE');
  const raw = readIdxGrpResource(sources['KDEF.GRP'], range);
  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  if (sha(raw) !== eventHash || view.getInt16(0, true) !== 2 ||
      view.getInt16(2, true) !== 57 || view.getInt16(4, true) !== 1) fail('INSTRUCTION');
  return Object.freeze({ adapterVersion: 1, eventId: 497, eventSha256: eventHash,
    sourceHashes: Object.freeze({ 'KDEF.IDX': indexHash, 'KDEF.GRP': groupHash }),
    evidence: 'verified-original-event-497-active-inventory-first-five-slots' });
}

export function createOriginal497InventoryState(context) {
  if (context?.eventId !== 497 || context.eventSha256 !== eventHash) fail('CONTEXT');
  return { schemaVersion: 1, observedSlotStart: 0, slots: before.map(pair => [...pair]),
    evidence: context.evidence };
}

export function applyOriginal497ObservedInventory(context, previous) {
  if (!previous || Object.keys(previous).sort().join('|') !==
      'evidence|observedSlotStart|schemaVersion|slots' || previous.schemaVersion !== 1 ||
      previous.observedSlotStart !== 0 || previous.evidence !== context.evidence ||
      !equal(previous.slots, before)) fail('PRECONDITION');
  return { schemaVersion: 1, observedSlotStart: 0, slots: after.map(pair => [...pair]),
    evidence: context.evidence };
}

export function bindOriginal676InventoryAdapter(sources) {
  if (!(sources['KDEF.IDX'] instanceof Uint8Array) || sha(sources['KDEF.IDX']) !== indexHash ||
      !(sources['KDEF.GRP'] instanceof Uint8Array) || sha(sources['KDEF.GRP']) !== groupHash) fail('SOURCE');
  const range = parseIdxGrpIndex(sources['KDEF.IDX'], sources['KDEF.GRP'].length)[676];
  if (!range || range.sourceOffset !== 101062 || range.byteLength !== 378) fail('RANGE');
  const raw = readIdxGrpResource(sources['KDEF.GRP'], range),
    view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  const checks = [[0,[50,138,139,140,141,142,6,0]],[14,[32,138,-1]],[17,[32,139,-1]],
    [20,[32,140,-1]],[23,[32,141,-1]],[26,[32,142,-1]],[185,[2,176,1]]];
  if (sha(raw) !== event676Hash || checks.some(([word, expected]) => expected.some((value,index) =>
      view.getInt16((word + index) * 2, true) !== value))) fail('INSTRUCTION');
  return Object.freeze({adapterVersion:1,eventId:676,eventSha256:event676Hash,
    evidence:'verified-original-event-676-active-inventory-first-nine-slots'});
}
export function createOriginal676InventoryState(context) {
  if(context?.eventId!==676||context.eventSha256!==event676Hash)fail('CONTEXT');
  return {schemaVersion:1,observedSlotStart:0,slots:before676.map(x=>[...x]),evidence:context.evidence};
}
export function applyOriginal676ObservedInventory(context,previous) {
  if(!previous||previous.schemaVersion!==1||previous.observedSlotStart!==0||
    previous.evidence!==context.evidence||!equal(previous.slots,before676))fail('PRECONDITION');
  return {schemaVersion:1,observedSlotStart:0,slots:after676.map(x=>[...x]),evidence:context.evidence};
}
