import test from 'node:test';
import assert from 'node:assert/strict';
import { collisionDemo } from '../../tools/extractor/prepare-collision-demo.mjs';
import { resolveContent,createGame,dispatch,serializeSave,restoreSave } from '../../packages/game-core/src/index.ts';

test('Mock identical GLBs: decoration permits entry, logical blocked rock rejects movement including after save/restore',async()=>{
  const bundle=collisionDemo();assert.deepEqual(bundle,collisionDemo());
  const rocks=bundle.assembled.cells.flatMap(c=>c.assets).filter(a=>a.asset.model);
  assert.equal(rocks.length,2);assert.deepEqual(rocks[0].asset.model,rocks[1].asset.model);
  const content=await resolveContent([bundle.package]);let state=createGame(content);
  state=dispatch(content,state,{type:'MOVE',direction:'east'}).state;
  assert.deepEqual([state.x,state.y],[2,1]);
  state=restoreSave(content,serializeSave(content,state));
  const blocked=dispatch(content,state,{type:'MOVE',direction:'east'});
  assert.equal(blocked.notifications[0].type,'MOVE_BLOCKED');assert.deepEqual(blocked.state,state);
  const diagonal=dispatch(content,state,{type:'MOVE',direction:'northeast'});
  assert.equal(diagonal.notifications[0].type,'MOVE_BLOCKED');
});
test('Mock collision remains identical when visuals are removed or model scale changes',async()=>{
  const bundle=collisionDemo(),before=structuredClone(bundle.package);
  for(const cell of bundle.assembled.cells)for(const visual of cell.assets)if(visual.asset.model)visual.asset.model.scale={x:5,y:5,z:5};
  bundle.assembled.cells=[];assert.deepEqual(bundle.package,before);
  const content=await resolveContent([bundle.package]);let state=createGame(content);
  state=dispatch(content,state,{type:'MOVE',direction:'east'}).state;
  assert.equal(dispatch(content,state,{type:'MOVE',direction:'east'}).notifications[0].type,'MOVE_BLOCKED');
});
