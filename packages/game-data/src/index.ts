/** Provenance contract only; this is not a confirmed DOS record layout. */
export type Confidence = 'Verified Original' | 'Source Confirmed' | 'Community Implementation' | 'Inferred' | 'Unknown';

export { IDX_GRP_PARSER_VERSION, IdxGrpFormatError, parseIdxGrpIndex, readIdxGrpResource } from './idx-grp.ts';
export type { IdxGrpRange, IdxGrpErrorCode } from './idx-grp.ts';
export { ORIGINAL_PARSER_VERSION, ORIGINAL_CONFIDENCE, decodeTalk, readOriginalScene, readDialogueOnlyEvent } from './original.ts';
export type { TalkToken, OriginalScene, OriginalDialogueRef } from './original.ts';

export interface ResourceProvenance {
  sourceFile: string;
  sourceResourceId: number | string;
  sourceOffset?: number;
  parserVersion: string;
  sourceSha256: string;
  canonicalResourceId: string;
  confidence: Confidence;
}
