/** Provenance contract only; this is not a confirmed DOS record layout. */
export type Confidence = 'Verified Original' | 'Source Confirmed' | 'Community Implementation' | 'Inferred' | 'Unknown';

export { IDX_GRP_PARSER_VERSION, IdxGrpFormatError, parseIdxGrpIndex, readIdxGrpResource } from './idx-grp.ts';
export type { IdxGrpRange, IdxGrpErrorCode } from './idx-grp.ts';
export { ORIGINAL_PARSER_VERSION, ORIGINAL_CONFIDENCE, decodeTalk, readOriginalScene, readDialogueOnlyEvent } from './original.ts';
export type { TalkToken, OriginalScene, OriginalDialogueRef } from './original.ts';
export { validatePrimitiveGeometry, placePrimitive } from './visual-primitive.ts';
export type { PrimitiveGeometry, PrimitivePart } from './visual-primitive.ts';
export { decodeLocalModel } from './local-model.ts';
export type { LocalModel } from './local-model.ts';
export { calibrateModelReplacement, replaceModelInstances } from './model-replacement.ts';
export type { ModelBounds } from './model-replacement.ts';
export { scenePassability, SCENE_PASSABILITY_PROFILE } from './scene-passability.ts';
export { MAP_REGION_PARSER_VERSION, MAP_REGION_CLASSIFICATION, extractMapRegion, regionResourceIds, unmappedRegionResources, assembleRegion } from './map-region.ts';
export {decodeProjectedMap,visibleProjectedTiles} from './projected-map.ts';
export type {ProjectedMap,ProjectedImage} from './projected-map.ts';
export type { MapRegion, MapRegionCell, MapRegionLayerValues, MockVisualAsset, RegionAssetMapping, RegionResourceRef, AssembledRegion, AssembledRegionCell, AssembledRegionAsset } from './map-region.ts';

export interface ResourceProvenance {
  sourceFile: string;
  sourceResourceId: number | string;
  sourceOffset?: number;
  parserVersion: string;
  sourceSha256: string;
  canonicalResourceId: string;
  confidence: Confidence;
}
