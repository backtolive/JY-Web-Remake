import type {LocalModel} from './local-model.ts';
import {decodeLocalModel} from './local-model.ts';
export interface ModelBounds {min:{x:number;y:number;z:number};max:{x:number;y:number;z:number}}
function dimensions(bounds:ModelBounds){
  const result={x:bounds.max.x-bounds.min.x,y:bounds.max.y-bounds.min.y,z:bounds.max.z-bounds.min.z};
  if(![...Object.values(bounds.min),...Object.values(bounds.max)].every(Number.isFinite)||!Object.values(result).every(n=>n>1e-6&&n<=1e6))throw new Error('MODEL_BOUNDS');
  return result;
}
/** Preserve authored local extents and bottom-centre in world space; never infer collision. */
export function calibrateModelReplacement(previous:LocalModel,replacement:{dataUri:string;sha256:string},oldBounds:ModelBounds,newBounds:ModelBounds):LocalModel{
  decodeLocalModel(previous);
  const oldSize=dimensions(oldBounds),newSize=dimensions(newBounds);
  const scale={x:previous.scale.x*oldSize.x/newSize.x,y:previous.scale.y*oldSize.y/newSize.y,z:previous.scale.z*oldSize.z/newSize.z};
  const base=(b:ModelBounds)=>({x:(b.min.x+b.max.x)/2,y:b.min.y,z:(b.min.z+b.max.z)/2});
  const oldBase=base(oldBounds),newBase=base(newBounds);
  const delta={x:oldBase.x*previous.scale.x-newBase.x*scale.x,y:oldBase.y*previous.scale.y-newBase.y*scale.y,z:oldBase.z*previous.scale.z-newBase.z*scale.z};
  const cos=Math.cos(previous.rotationY),sin=Math.sin(previous.rotationY);
  const next={...previous,dataUri:replacement.dataUri,sha256:replacement.sha256,scale,offset:{x:previous.offset.x+cos*delta.x+sin*delta.z,
    y:previous.offset.y+delta.y,z:previous.offset.z-sin*delta.x+cos*delta.z}};
  decodeLocalModel(next);return next;
}

export interface ModelVisualCell {assets:{asset:{model?:LocalModel};world:{x:number;y:number;z:number}}[]}
export function replaceModelInstances<T extends ModelVisualCell>(cells:T[],assetId:string,replacement:{dataUri:string;sha256:string},oldBounds:ModelBounds,newBounds:ModelBounds){
  let count=0;const hashes=new Set(cells.flatMap(c=>c.assets.filter(v=>v.asset.model?.assetId===assetId).map(v=>v.asset.model!.sha256)));
  if(hashes.size!==1)throw new Error('MODEL_REPLACEMENT_IDENTITY');
  const next=cells.map(cell=>({...cell,assets:cell.assets.map(visual=>{
    if(visual.asset.model?.assetId!==assetId)return visual;
    count++;return {...visual,asset:{...visual.asset,model:calibrateModelReplacement(visual.asset.model,replacement,oldBounds,newBounds)}};
  })})) as T[];
  return {cells:next,count};
}
