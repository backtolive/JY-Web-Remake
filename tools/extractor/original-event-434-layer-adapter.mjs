/** Synthetic-precondition layer replacement observed for exact event 434. */
import{createHash}from'node:crypto';import{parseIdxGrpIndex,readIdxGrpResource}from'../../packages/game-data/src/idx-grp.ts';
import{openOriginalSceneLayerTable,createOriginalSceneLayerOverlay,readOriginalSceneLayerCell,
 updateOriginalSceneLayerCells}from'../../packages/game-data/src/original-scene-layers.ts';
const H={i:'bf02eccf1dab01fd0ae033cdf807f56b978a71a6c2ab9be05e366239b485104b',g:'135c5e097a7fe561ee931046e1bebf55de9b469678e3d111d8e9f2c6bb600e06',s:'830ae313ccabe310a16d330eac83647a9c81a6c23efce6069ca87dc653f0e154'},EH='ebc33f2f67b16cd9e2311ae3aa4d0f4b9394f3e2c156893aec8b531c8e4a225c',cell=12*64+22;
const sha=b=>createHash('sha256').update(b).digest('hex'),fail=c=>{throw new Error(`ORIGINAL434_LAYER_${c}`);};
export async function bindOriginal434LayerAdapter(s){
 if(sha(s['KDEF.IDX'])!==H.i||sha(s['KDEF.GRP'])!==H.g||sha(s['ALLSIN.GRP'])!==H.s)fail('SOURCE');
 const r=parseIdxGrpIndex(s['KDEF.IDX'],s['KDEF.GRP'].length)[434];if(!r||r.sourceOffset!==66464||r.byteLength!==68)fail('RANGE');
 const raw=readIdxGrpResource(s['KDEF.GRP'],r),v=new DataView(raw.buffer,raw.byteOffset,raw.byteLength);
 if(sha(raw)!==EH||JSON.stringify(Array.from({length:5},(_,i)=>v.getInt16(i*2,true)))!==JSON.stringify([38,-2,0,990,994]))fail('INSTRUCTION');
 const table=await openOriginalSceneLayerTable(s['ALLSIN.GRP']),base=createOriginalSceneLayerOverlay(table);
 if(readOriginalSceneLayerCell(table,base,32,0,cell)!==390)fail('SOURCE_CELL');
 return Object.freeze({adapterVersion:1,eventId:434,eventSha256:EH,table,sceneId:32,layer:0,cell,arrayIndex1:12,arrayIndex2:22});
}
export function createOriginal434SyntheticLayerState(c){
 if(c?.eventId!==434||c.eventSha256!==EH)fail('CONTEXT');
 return updateOriginalSceneLayerCells(c.table,createOriginalSceneLayerOverlay(c.table),[[32,0,cell,990]]);
}
export function applyOriginal434ObservedLayer(c,p){
 if(Object.keys(p?.records??{}).join('|')!==`32/0/${cell}`||readOriginalSceneLayerCell(c.table,p,32,0,cell)!==990)fail('PRECONDITION');
 return updateOriginalSceneLayerCells(c.table,p,[[32,0,cell,994]]);
}
