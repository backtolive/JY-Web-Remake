import test from'node:test';import assert from'node:assert/strict';import{existsSync}from'node:fs';import{readFile}from'node:fs/promises';
import{readOriginalSceneLayerCell}from'../../packages/game-data/src/original-scene-layers.ts';
import{bindOriginal434LayerAdapter,createOriginal434SyntheticLayerState,applyOriginal434ObservedLayer}from'../../tools/extractor/original-event-434-layer-adapter.mjs';
const names=['KDEF.IDX','KDEF.GRP','ALLSIN.GRP'],available=names.every(n=>existsSync(`original/dos/${n}`)),sources=async()=>Object.fromEntries(await Promise.all(names.map(async n=>[n,new Uint8Array(await readFile(`original/dos/${n}`))])));
test('event 434 changes only the explicitly prepared synthetic 990 cell to 994',{skip:!available&&'Original data is local.'},async()=>{
 const c=await bindOriginal434LayerAdapter(await sources()),s=createOriginal434SyntheticLayerState(c),n=applyOriginal434ObservedLayer(c,s);
 assert.equal(readOriginalSceneLayerCell(c.table,s,32,0,c.cell),990);assert.equal(readOriginalSceneLayerCell(c.table,n,32,0,c.cell),994);
 assert.equal(readOriginalSceneLayerCell(c.table,createOriginal434SyntheticLayerState(c),32,0,c.cell),990);
});
