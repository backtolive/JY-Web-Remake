/** Strict end-offset container reader, independent of record semantics and UI. */
export const IDX_GRP_PARSER_VERSION = '0.1.0';

export type IdxGrpErrorCode = 'INVALID_GROUP_SIZE' | 'UNALIGNED_INDEX' | 'INDEX_LIMIT'
  | 'DECREASING_OFFSET' | 'OFFSET_OUT_OF_BOUNDS' | 'UNCOVERED_GROUP' | 'INVALID_RANGE';

export class IdxGrpFormatError extends Error {
  readonly code: IdxGrpErrorCode;
  readonly resourceId: number | undefined;

  constructor(code: IdxGrpErrorCode, message: string, resourceId?: number) {
    super(message);
    this.name = 'IdxGrpFormatError';
    this.code = code;
    this.resourceId = resourceId;
  }
}

export interface IdxGrpRange {
  readonly resourceId: number;
  readonly indexByteOffset: number;
  readonly sourceOffset: number;
  readonly byteLength: number;
}

/** Each uint32 LE is an exclusive end offset. No padding or trailing bytes discarded. */
export function parseIdxGrpIndex(index: Uint8Array, groupByteLength: number): readonly IdxGrpRange[] {
  if (!Number.isSafeInteger(groupByteLength) || groupByteLength < 0 || groupByteLength > 0xffffffff) {
    throw new IdxGrpFormatError('INVALID_GROUP_SIZE', 'GRP size must fit an unsigned 32-bit offset');
  }
  if (index.byteLength % 4 !== 0) {
    throw new IdxGrpFormatError('UNALIGNED_INDEX', 'IDX length must be a multiple of four');
  }
  const count = index.byteLength / 4;
  if (count > 1_000_000) {
    throw new IdxGrpFormatError('INDEX_LIMIT', 'IDX exceeds the one-million-entry safety limit');
  }
  const view = new DataView(index.buffer, index.byteOffset, index.byteLength);
  const ranges: IdxGrpRange[] = [];
  let start = 0;
  for (let resourceId = 0; resourceId < count; resourceId++) {
    const end = view.getUint32(resourceId * 4, true);
    if (end < start) {
      throw new IdxGrpFormatError('DECREASING_OFFSET', `IDX offset decreases at resource ${resourceId}`, resourceId);
    }
    if (end > groupByteLength) {
      throw new IdxGrpFormatError('OFFSET_OUT_OF_BOUNDS', `IDX offset exceeds GRP size at resource ${resourceId}`, resourceId);
    }
    ranges.push({ resourceId, indexByteOffset: resourceId * 4, sourceOffset: start, byteLength: end - start });
    start = end;
  }
  if (start !== groupByteLength) {
    throw new IdxGrpFormatError('UNCOVERED_GROUP', 'Final IDX offset must equal GRP size');
  }
  return ranges;
}

/** Returns a copy, including when group is a Node Buffer; callers cannot alter input. */
export function readIdxGrpResource(group: Uint8Array, range: IdxGrpRange): Uint8Array {
  const { sourceOffset, byteLength } = range;
  if (!Number.isSafeInteger(sourceOffset) || !Number.isSafeInteger(byteLength)
      || sourceOffset < 0 || byteLength < 0 || sourceOffset + byteLength > group.byteLength) {
    throw new IdxGrpFormatError('INVALID_RANGE', 'Resource range must lie inside GRP');
  }
  return new Uint8Array(group.subarray(sourceOffset, sourceOffset + byteLength));
}
