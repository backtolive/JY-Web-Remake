import test from 'node:test';
import assert from 'node:assert/strict';
import {placeholderRock} from '../../tools/extractor/placeholder-rock.mjs';
import {inspectLocalModel} from '../../apps/web/src/model-inspection.ts';
import {calibrateModelReplacement,replaceModelInstances} from '../../packages/game-data/src/model-replacement.ts';
import {collisionDemo} from '../../tools/extractor/prepare-collision-demo.mjs';
import {resolveContent,createGame,serializeSave} from '../../packages/game-core/src/index.ts';
const oldModel=()=>collisionDemo().assembled.cells.at(-1).assets[0].asset.model;
const shifted=()=>placeholderRock({uniformScale:2,translation:[4,2,-3],color:[.18,.24,.4,1]});
test('Actual GLB inspection: shifted double-size replacement fits authored bounds and keeps base-centre for rotated instances',async()=>{
  const previous={...oldModel(),rotationY:Math.PI/2,offset:{x:1,y:2,z:3}},asset=shifted();
  const old=await inspectLocalModel(previous),next=await inspectLocalModel({...previous,dataUri:asset.dataUri,sha256:asset.sha256});
  assert.equal(next.triangles,8);assert.equal(next.bounds.max.y-next.bounds.min.y,2);
  const result=calibrateModelReplacement(previous,asset,old.bounds,next.bounds);
  for(const key of ['x','y','z'])assert.ok(Math.abs(result.scale[key]-previous.scale[key]/2)<1e-8);
  function base(model,bounds){
    const x=(bounds.min.x+bounds.max.x)/2*model.scale.x,z=(bounds.min.z+bounds.max.z)/2*model.scale.z;
    return {x:model.offset.x+Math.cos(model.rotationY)*x+Math.sin(model.rotationY)*z,
      y:model.offset.y+bounds.min.y*model.scale.y,z:model.offset.z-Math.sin(model.rotationY)*x+Math.cos(model.rotationY)*z};
  }
  const a=base(previous,old.bounds),b=base(result,next.bounds);
  for(const key of ['x','y','z'])assert.ok(Math.abs(a[key]-b[key])<1e-7);
});
test('Model replacement: all matching IDs change atomically, preserve world positions, collision and exact game save',async()=>{
  const bundle=collisionDemo(),before=structuredClone(bundle),asset=shifted();
  const old=await inspectLocalModel(oldModel()),next=await inspectLocalModel({...oldModel(),...asset});
  const result=replaceModelInstances(bundle.assembled.cells,'authored.placeholder:rock',asset,old.bounds,next.bounds);
  assert.equal(result.count,2);assert.deepEqual(bundle,before);
  const rocks=result.cells.flatMap(c=>c.assets).filter(v=>v.asset.model);
  assert.ok(rocks.every(v=>v.asset.model.sha256===asset.sha256));
  assert.deepEqual(rocks.map(v=>v.world),before.assembled.cells.flatMap(c=>c.assets).filter(v=>v.asset.model).map(v=>v.world));
  const content=await resolveContent([bundle.package]),state=createGame(content),save=serializeSave(content,state);
  bundle.assembled.cells=result.cells;
  assert.equal(serializeSave(await resolveContent([bundle.package]),state),save);
});
test('Replacement rejects absent/ambiguous IDs and invalid extents without changing originals',()=>{
  const cells=collisionDemo().assembled.cells,before=structuredClone(cells),asset=shifted();
  const bounds={min:{x:-.5,y:0,z:-.5},max:{x:.5,y:1,z:.5}};
  assert.throws(()=>replaceModelInstances(cells,'missing',asset,bounds,bounds),/IDENTITY/);
  assert.throws(()=>replaceModelInstances(cells,'authored.placeholder:rock',asset,bounds,{...bounds,max:bounds.min}),/BOUNDS/);
  assert.deepEqual(cells,before);
  const bad=structuredClone(cells);bad.at(-1).assets[0].asset.model.sha256='0'.repeat(64);
  assert.throws(()=>replaceModelInstances(bad,'authored.placeholder:rock',asset,bounds,bounds),/IDENTITY/);
});
