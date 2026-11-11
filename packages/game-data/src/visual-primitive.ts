/** Original authoring contract, not DOS dimensions or collision geometry. */
export interface PrimitivePart {
  size: { width: number; height: number; depth: number };
  offset: { x: number; y: number; z: number };
  rotationY: number;
  material: { id: string; color: string };
}
export interface PrimitiveGeometry {
  version: 1;
  classification: 'mock' | 'original-authored';
  parts: PrimitivePart[];
}
export function validatePrimitiveGeometry(value: unknown): asserts value is PrimitiveGeometry {
  const geometry = value as PrimitiveGeometry | undefined;
  if (!geometry || geometry.version !== 1 || !['mock','original-authored'].includes(geometry.classification)
    || !Array.isArray(geometry.parts) || !geometry.parts.length || geometry.parts.length > 32) throw new Error('PRIMITIVE_FORMAT');
  for (const part of geometry.parts) {
    if (!part || !part.size || !part.offset || !part.material) throw new Error('PRIMITIVE_PART');
    if (![part.size.width,part.size.height,part.size.depth].every(n=>Number.isFinite(n)&&n>0&&n<=64)) throw new Error('PRIMITIVE_SIZE');
    if (![part.offset.x,part.offset.y,part.offset.z,part.rotationY].every(n=>Number.isFinite(n)&&Math.abs(n)<=64)) throw new Error('PRIMITIVE_TRANSFORM');
    if (typeof part.material.id!=='string'||!part.material.id.length||part.material.id.length>128||!/^#[a-fA-F0-9]{6}$/.test(part.material.color)) throw new Error('PRIMITIVE_MATERIAL');
  }
}

/** Offset is base-centre; rotation in radians. No source height is converted implicitly. */
export function placePrimitive(geometry: PrimitiveGeometry, anchor: {x:number;y:number;z:number}) {
  validatePrimitiveGeometry(geometry);
  if (![anchor.x,anchor.y,anchor.z].every(Number.isFinite)) throw new Error('PRIMITIVE_ANCHOR');
  return geometry.parts.map(part=>({...part,position:{x:anchor.x+part.offset.x,
    y:anchor.y+part.offset.y+part.size.height/2,z:anchor.z+part.offset.z}}));
}
