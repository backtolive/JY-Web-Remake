/** Provenance contract only; this is not a confirmed DOS record layout. */
export type Confidence = 'Verified Original' | 'Source Confirmed' | 'Community Implementation' | 'Inferred' | 'Unknown';

export interface ResourceProvenance {
  sourceFile: string;
  sourceResourceId: number | string;
  sourceOffset?: number;
  parserVersion: string;
  sourceSha256: string;
  canonicalResourceId: string;
  confidence: Confidence;
}
