import {decodeLocalModel} from './local-model.ts';
import type {LocalModel} from './local-model.ts';
export interface ProjectedModelBinding {layerId:string;tileValue:number;model:LocalModel}
export interface ProjectedImage {tileValue:number;assetId:string;width:number;height:number;xOffset:number;yOffset:number;sha256:string;dataUri:string}
export interface ProjectedMap {version:1;width:number;height:number;images:ProjectedImage[];layers:{id:string;projection:'ground'|'billboard';values:Uint16Array;visibility?:Uint8Array}[];models?:ProjectedModelBinding[]}
const raw=(value:string)=>Uint8Array.from(atob(value),c=>c.charCodeAt(0));
async function checkHash(bytes:Uint8Array,expected:string){
  if(!/^[a-f0-9]{64}$/.test(expected))throw new Error('PROJECTED_HASH');
  const digest=await crypto.subtle.digest('SHA-256',new Uint8Array(bytes).buffer);
  if(Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('')!==expected)throw new Error('PROJECTED_HASH');
}
/** Generic compact tile projection contract. Unknown IDs fail, never become placeholder colors. */
export async function decodeProjectedMap(value:unknown):Promise<ProjectedMap>{
  const v=value as {version:number;width:number;height:number;images:ProjectedImage[];models?:ProjectedModelBinding[];layers:{id:string;projection?:'ground'|'billboard';data:string;sha256:string;visibility?:{data:string;sha256:string}}[]};
  if(!v||v.version!==1||![v.width,v.height].every(n=>Number.isInteger(n)&&n>0&&n<=512)||!Array.isArray(v.images)||!v.images.length||v.images.length>2048
    ||!Array.isArray(v.layers)||!v.layers.length||v.layers.length>4)throw new Error('PROJECTED_FORMAT');
  const ids=new Set<number>(),layerIds=new Set<string>();let imageBytes=0;
  await Promise.all(v.images.map(async image=>{
    if(!Number.isInteger(image.tileValue)||image.tileValue<=0||image.tileValue>32767||ids.has(image.tileValue)||typeof image.assetId!=='string'||image.assetId.length>160||!image.assetId
      ||![image.width,image.height].every(n=>Number.isInteger(n)&&n>0&&n<=2048)||image.width*image.height>1_048_576
      ||![image.xOffset,image.yOffset].every(n=>Number.isInteger(n)&&Math.abs(n)<=4096)
      ||typeof image.dataUri!=='string'||image.dataUri.length>2_000_000||!image.dataUri.startsWith('data:image/png;base64,'))throw new Error('PROJECTED_IMAGE');
    ids.add(image.tileValue);const bytes=raw(image.dataUri.slice(22));imageBytes+=bytes.length;
    if(bytes.length<24||imageBytes>8_000_000)throw new Error('PROJECTED_IMAGE_BUDGET');
    const header=new DataView(bytes.buffer);
    if(header.getUint32(0)!==0x89504e47||header.getUint32(16)!==image.width||header.getUint32(20)!==image.height)throw new Error('PROJECTED_PNG');
    await checkHash(bytes,image.sha256);
  }));
  const layers=[];
  for(const layer of v.layers){
    if(typeof layer.id!=='string'||!layer.id||layerIds.has(layer.id)||typeof layer.data!=='string'||layer.data.length>800_000||(layer.projection!==undefined&&!['ground','billboard'].includes(layer.projection)))throw new Error('PROJECTED_LAYER');
    layerIds.add(layer.id);const bytes=raw(layer.data);
    if(bytes.length!==v.width*v.height*2)throw new Error('PROJECTED_GRID_SIZE');
    await checkHash(bytes,layer.sha256);const view=new DataView(bytes.buffer),values=new Uint16Array(v.width*v.height);
    for(let i=0;i<values.length;i++){const id=view.getUint16(i*2,true);if(id&&!ids.has(id))throw new Error('PROJECTED_UNMAPPED_ID');values[i]=id;}
    let visibility:Uint8Array|undefined;
    if(layer.visibility){
      if(typeof layer.visibility.data!=='string'||layer.visibility.data.length>400_000)throw new Error('PROJECTED_VISIBILITY');
      visibility=raw(layer.visibility.data);
      if(visibility.length!==values.length||visibility.some(v=>v!==0&&v!==1))throw new Error('PROJECTED_VISIBILITY');
      await checkHash(visibility,layer.visibility.sha256);
    }
    layers.push({id:layer.id,projection:layer.projection??'ground',values,visibility});
  }
  if(new Set(v.images.map(i=>i.assetId)).size!==v.images.length)throw new Error('PROJECTED_ASSET_ID');
  const modelKeys=new Set<string>();
  if(v.models!==undefined&&(!Array.isArray(v.models)||v.models.length>32))throw new Error('PROJECTED_MODELS');
  for(const binding of v.models??[]){
    const key=`${binding.layerId}:${binding.tileValue}`,layer=layers.find(l=>l.id===binding.layerId);
    if(!layer||!ids.has(binding.tileValue)||!layer.values.includes(binding.tileValue)||modelKeys.has(key))throw new Error('PROJECTED_MODEL_BINDING');
    modelKeys.add(key);const bytes=decodeLocalModel(binding.model);await checkHash(bytes,binding.model.sha256);
  }
  return {version:1,width:v.width,height:v.height,images:v.images,layers,models:v.models??[]};
}

/** Rendering scope only: the complete grid stays loaded and movement is never chunk-bounded. */
export function visibleProjectedTiles(map:ProjectedMap,x:number,y:number,radius=24){
  const groups=new Map<string,{layer:number;image:ProjectedImage;cells:{x:number;y:number}[]}>(),images=new Map(map.images.map(i=>[i.tileValue,i]));
  for(let layer=0;layer<map.layers.length;layer++)for(let cy=Math.max(0,y-radius);cy<=Math.min(map.height-1,y+radius);cy++)for(let cx=Math.max(0,x-radius);cx<=Math.min(map.width-1,x+radius);cx++){
    const index=cy*map.width+cx,id=map.layers[layer]!.values[index]!;if(!id||map.layers[layer]!.visibility?.[index]===0)continue;
    const key=`${layer}:${id}`;let group=groups.get(key);
    if(!group){group={layer,image:images.get(id)!,cells:[]};groups.set(key,group);}group.cells.push({x:cx,y:cy});
  }
  return groups;
}
