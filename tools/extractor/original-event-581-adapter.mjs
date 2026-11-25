/** Source-locked adapter for the one verified event-581 opcode-3 shape. */
import { compareObserved581Slot } from './compare-original-event-581-slot.mjs';
import { traceOriginal581Route } from './trace-original-event-581-route.mjs';
import { createOriginalEventSlotOverlay, openOriginalEventSlotTable, readOriginalEventSlot,
  updateOriginalEventSlot } from '../../packages/game-data/src/original-event-slots.ts';
import { createOriginalRoleOverlay, openOriginalRoleTable, readOriginalRoleInt16,
  readOriginalRoleRecord, updateOriginalRoleInt16 } from
  '../../packages/game-data/src/original-role-records.ts';

const beforeExpected = [1, 2, -1, -1, -1, 2718, 2718, 2718, 0, 30, 21];
const afterExpected = [0, 0, -1, -1, -1, -1, -1, -1, 0, 30, 21];
const argsExpected = [-2, 2, 0, 0, -1, -1, -1, -1, -1, -1, -2, -2, -2];
const equal = (left, right) => Array.isArray(left) && left.length === right.length &&
  left.every((value, index) => value === right[index]);
const fail = code => { throw new Error(`ORIGINAL581_ADAPTER_${code}`); };

function validateContext(context) {
  if (!context || context.adapterVersion !== 1 || context.eventId !== 581 ||
      context.sceneId !== 32 || context.slotId !== 2 ||
      context.eventRecordSha256 !== 'ac27f3fee143440e3d3af716d1b460e703959545f58d7f93a604c3a7f5e74386' ||
      context.instructionSourceByteOffset !== 89018 || !equal(context.args, argsExpected) ||
      context.table?.sha256 !== context.sourceHashes?.['ALLDEF.GRP'] ||
      context.roleTable?.indexSha256 !== context.sourceHashes?.['RANGER.IDX'] ||
      context.roleTable?.groupSha256 !== context.sourceHashes?.['RANGER.GRP']) fail('CONTEXT');
}

export async function bindOriginal581SlotAdapter(sources) {
  const comparison = await compareObserved581Slot(sources);
  const route = traceOriginal581Route(sources);
  const table = await openOriginalEventSlotTable(sources['ALLDEF.GRP']);
  const roleTable = await openOriginalRoleTable(sources['RANGER.IDX'], sources['RANGER.GRP']);
  const context = Object.freeze({
    adapterVersion: 1,
    eventId: comparison.eventRecord.eventId,
    sceneId: comparison.candidateInstruction.target.sceneId,
    slotId: comparison.candidateInstruction.target.slotId,
    eventRecordSha256: comparison.eventRecord.sha256,
    instructionSourceByteOffset: comparison.candidateInstruction.sourceByteOffset,
    args: Object.freeze([...comparison.candidateInstruction.args]),
    sourceHashes: Object.freeze({ ...route.sourceHashes }),
    naturalRoute: route,
    table,
    roleTable,
  });
  validateContext(context);
  return context;
}

const role49Before = Object.freeze([[34, 38], [36, 38], [80, 1], [82, 21], [84, 21],
  [86, 14], [88, 30], [128, 0]]);
const role49After = Object.freeze([[34, 238], [36, 238], [80, 2], [82, 321], [84, 321],
  [86, 44], [88, 50], [128, 15]]);
const roleValuesEqual = (table, overlay, expected) => expected.every(([offset, value]) =>
  readOriginalRoleInt16(table, overlay, 49, offset) === value);

export function createOriginal581RoleState(context) {
  validateContext(context);
  const overlay = createOriginalRoleOverlay(context.roleTable);
  if (!roleValuesEqual(context.roleTable, overlay, role49Before)) fail('ROLE_PRECONDITION');
  return overlay;
}

/** Apply only the eight role-49 int16 fields attributed by the DOS before/after evidence. */
export function applyOriginal581ObservedRole(context, previous) {
  validateContext(context);
  if (!previous || Object.keys(previous.records ?? {}).length !== 0 ||
      !roleValuesEqual(context.roleTable, previous, role49Before)) fail('ROLE_PRECONDITION');
  const base = readOriginalRoleRecord(context.roleTable, previous, 49);
  const next = updateOriginalRoleInt16(context.roleTable, previous, 49, role49After);
  const record = readOriginalRoleRecord(context.roleTable, next, 49);
  const changed = new Set(role49After.flatMap(([offset]) => [offset, offset + 1]));
  if (Object.keys(next.records).join('|') !== '49' ||
      !roleValuesEqual(context.roleTable, next, role49After) ||
      record.some((byte, offset) => !changed.has(offset) && byte !== base[offset])) fail('ROLE_RESULT');
  return next;
}

export function createOriginal581SlotState(context) {
  validateContext(context);
  const overlay = createOriginalEventSlotOverlay(context.table);
  if (!equal(readOriginalEventSlot(context.table, overlay, 32, 2), beforeExpected)) fail('PRECONDITION');
  return overlay;
}

/** Apply all eight verified field writes as one immutable overlay replacement. */
export function applyOriginal581ObservedSlot(context, previous) {
  validateContext(context);
  if (!previous || Object.keys(previous.records ?? {}).length !== 0 ||
      !equal(readOriginalEventSlot(context.table, previous, 32, 2), beforeExpected)) fail('PRECONDITION');
  const writes = afterExpected.slice(0, 8).map((value, field) => [field, value]);
  const next = updateOriginalEventSlot(context.table, previous, 32, 2, writes);
  if (Object.keys(next.records).join('|') !== '32/2' ||
      !equal(readOriginalEventSlot(context.table, next, 32, 2), afterExpected)) fail('RESULT');
  return next;
}
