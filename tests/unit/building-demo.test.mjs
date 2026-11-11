import test from 'node:test';
import assert from 'node:assert/strict';
import {buildingDemo} from '../../tools/extractor/prepare-building-demo.mjs';
import {resolveContent,createGame,dispatch,serializeSave,restoreSave} from '../../packages/game-core/src/index.ts';
test('Mock building: walk through door, corner/window/furniture remain blocked, no invented portal or roof collision',async()=>{
  const bundle=buildingDemo();assert.deepEqual(bundle,buildingDemo());const content=await resolveContent([bundle.package]);
  let state=createGame(content);
  state=dispatch(content,state,{type:'MOVE',direction:'north'}).state;assert.deepEqual([state.x,state.y],[3,4]);
  assert.equal(dispatch(content,state,{type:'MOVE',direction:'northwest'}).notifications[0].type,'MOVE_BLOCKED');
  state=dispatch(content,state,{type:'MOVE',direction:'north'}).state;assert.deepEqual([state.x,state.y],[3,3]);
  state=restoreSave(content,serializeSave(content,state));
  state=dispatch(content,state,{type:'MOVE',direction:'west'}).state;
  assert.equal(dispatch(content,state,{type:'MOVE',direction:'north'}).notifications[0].type,'MOVE_BLOCKED');
  assert.equal(dispatch(content,state,{type:'MOVE',direction:'west'}).notifications[0].type,'MOVE_BLOCKED');
  assert.equal(bundle.package.maps[0].portals.length,0);
  const pkg=structuredClone(bundle.package);bundle.assembled.cells=bundle.assembled.cells.filter(c=>!c.assets.some(v=>v.asset.cutaway));
  assert.deepEqual(bundle.package,pkg);
});
