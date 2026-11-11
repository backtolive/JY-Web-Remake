import type { OriginalScene } from './original.ts';
import { validatePrimitiveGeometry } from './visual-primitive.ts';
import type { PrimitiveGeometry } from './visual-primitive.ts';
import type { LocalModel } from './local-model.ts';
import { decodeLocalModel } from './local-model.ts';
import { scenePassability, SCENE_PASSABILITY_PROFILE } from './scene-passability.ts';

export const MAP_REGION_PARSER_VERSION = '0.2.0';
export const MAP_REGION_CLASSIFICATION = 'Community Implementation';

export interface MapRegionLayerValues {
  groundTileId: number;
  buildingTileId: number;
  objectTileId: number;
  eventSlot: number;
  buildingHeight: number;
  objectHeight: number;
}

export interface MapRegionCell {
  x: number;
  y: number;
  relativeX: number;
  relativeY: number;
  layers: MapRegionLayerValues;
}

export interface MapRegion {
  collisionProfile?:string;
  sceneId: number;
  originX: number;
  originY: number;
  width: number;
  height: number;
  parserVersion: string;
  layerMeaning: readonly string[];
  cells: MapRegionCell[];
  blocked: number[];
}

export interface MockVisualAsset {
  cutaway?:boolean;
  model?: LocalModel;
  geometry?: PrimitiveGeometry;
  /** Explicit authored vertical base; legacy source-height preview is used only without geometry. */
  baseY?: number;
  kind: 'tile' | 'block' | 'marker' | 'box' | 'cylinder' | 'plane';
  color: string;
  height: number;
  scale?: number;
  label?: string;
}

export interface RegionAssetMapping {
  version: string;
  classification?: string;
  sourceSceneId?: number;
  region?: { originX: number; originY: number; width: number; height: number };
  layers: Record<string, Record<string, MockVisualAsset>>;
  fallback?: MockVisualAsset;
}

export interface RegionResourceRef {
  layer: 'groundTileId' | 'buildingTileId' | 'objectTileId';
  resourceId: number;
  key: string;
}

export interface AssembledRegionAsset {
  layer: RegionResourceRef['layer'];
  resourceId: number;
  asset: MockVisualAsset;
  relativeX: number;
  relativeY: number;
  logicalX: number;
  logicalY: number;
  world: { x: number; y: number; z: number };
}

export interface AssembledRegionCell {
  relativeX: number;
  relativeY: number;
  logicalX: number;
  logicalY: number;
  height: number;
  world: { x: number; y: number; z: number };
  assets: AssembledRegionAsset[];
}

export interface AssembledRegion {
  version: string;
  region: MapRegion;
  cells: AssembledRegionCell[];
  unmapped: RegionResourceRef[];
  diagnostics: string[];
}

const TILE_LAYERS = ['groundTileId', 'buildingTileId', 'objectTileId'] as const;

function assertInteger(name: string, value: number) {
  if (!Number.isInteger(value)) throw new Error(`REGION_${name.toUpperCase()}_INTEGER`);
}

export function extractMapRegion(scene: OriginalScene, originX: number, originY: number, width = 8, height = 8): MapRegion {
  assertInteger('originX', originX);
  assertInteger('originY', originY);
  assertInteger('width', width);
  assertInteger('height', height);
  if (width < 1 || height < 1) throw new Error('REGION_SIZE');
  if (originX < 0 || originY < 0 || originX + width > 64 || originY + height > 64) throw new Error('REGION_BOUNDS');
  const cells: MapRegionCell[] = [];
  const blocked: number[] = [];
  for (let relativeY = 0; relativeY < height; relativeY++) {
    for (let relativeX = 0; relativeX < width; relativeX++) {
      const x = originX + relativeX;
      const y = originY + relativeY;
      const cellId = y * 64 + x;
      const layers: MapRegionLayerValues = {
        groundTileId: scene.layers[0]![cellId] ?? 0,
        buildingTileId: scene.layers[1]![cellId] ?? 0,
        objectTileId: scene.layers[2]![cellId] ?? 0,
        eventSlot: scene.layers[3]![cellId] ?? 0,
        buildingHeight: scene.layers[4]![cellId] ?? 0,
        objectHeight: scene.layers[5]![cellId] ?? 0,
      };
      cells.push({ x, y, relativeX, relativeY, layers });
      if(scenePassability(layers.groundTileId,layers.buildingTileId,layers.eventSlot,scene.eventFields).blocked)blocked.push(relativeY*width+relativeX);
    }
  }
  return {
    sceneId: scene.id,
    originX,
    originY,
    width,
    height,
    parserVersion: MAP_REGION_PARSER_VERSION,
    collisionProfile: SCENE_PASSABILITY_PROFILE,
    layerMeaning: ['groundTileId', 'buildingTileId', 'objectTileId', 'eventSlot', 'buildingHeight', 'objectHeight'],
    cells,
    blocked,
  };
}

export function regionResourceIds(region: MapRegion): RegionResourceRef[] {
  const seen = new Set<string>();
  const result: RegionResourceRef[] = [];
  for (const cell of region.cells) {
    for (const layer of TILE_LAYERS) {
      const resourceId = cell.layers[layer];
      if (resourceId === 0) continue;
      const key = `${layer}:${resourceId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({ layer, resourceId, key });
    }
  }
  return result.sort((a, b) => a.layer < b.layer ? -1 : a.layer > b.layer ? 1 : a.resourceId - b.resourceId);
}

export function unmappedRegionResources(region: MapRegion, mapping: RegionAssetMapping): RegionResourceRef[] {
  return regionResourceIds(region).filter(ref => !mapping.layers?.[ref.layer]?.[String(ref.resourceId)]);
}

export function assembleRegion(region: MapRegion, mapping: RegionAssetMapping, options: { strict?: boolean } = {}): AssembledRegion {
  const unmapped = unmappedRegionResources(region, mapping);
  const diagnostics = unmapped.map(ref => `UNMAPPED_RESOURCE:${ref.key}`);
  if (options.strict !== false && unmapped.length) throw new Error(diagnostics[0]);
  const cells: AssembledRegionCell[] = region.cells.map(cell => {
    const assets: AssembledRegionAsset[] = [];
    for (const layer of TILE_LAYERS) {
      const resourceId = cell.layers[layer];
      if (resourceId === 0) continue;
      const asset = mapping.layers?.[layer]?.[String(resourceId)] ?? mapping.fallback;
      if (!asset) {
        if (unmapped.some(ref => ref.layer === layer && ref.resourceId === resourceId)) continue;
        throw new Error(`MISSING_ASSET:${layer}:${resourceId}`);
      }
      if(asset.model){
        if(asset.geometry)throw new Error('LOCAL_MODEL_AMBIGUOUS');decodeLocalModel(asset.model);
      }
      if (asset.geometry || asset.model) {
        if(asset.geometry)validatePrimitiveGeometry(asset.geometry);
        if (asset.baseY !== undefined && (!Number.isFinite(asset.baseY) || Math.abs(asset.baseY)>64)) throw new Error('PRIMITIVE_BASE');
      }
      assets.push({
        layer,
        resourceId,
        asset,
        relativeX: cell.relativeX,
        relativeY: cell.relativeY,
        logicalX: cell.x,
        logicalY: cell.y,
        world: { x: cell.x, y: asset.geometry || asset.model ? (asset.baseY ?? 0) : cell.layers.buildingHeight * 0.25, z: cell.y },
      });
    }
    return {
      relativeX: cell.relativeX,
      relativeY: cell.relativeY,
      logicalX: cell.x,
      logicalY: cell.y,
      height: Math.max(cell.layers.buildingHeight, cell.layers.objectHeight),
      world: { x: cell.x, y: cell.layers.buildingHeight * 0.25, z: cell.y },
      assets,
    };
  });
  return { version: mapping.version, region, cells, unmapped, diagnostics };
}
