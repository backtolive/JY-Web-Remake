import test from 'node:test';
import assert from 'node:assert/strict';
import { scenePassability } from '../../packages/game-data/src/scene-passability.ts';
import { extractMapRegion } from '../../packages/game-data/src/map-region.ts';
test('Mock source policy: shared region passability respects zero event flags, water, buildings and unknown references',()=>{
  assert.equal(scenePassability(2,0,0,[[0]]).blocked,false);
  assert.equal(scenePassability(2,0,0,[[1]]).blocked,true);
  assert.deepEqual(scenePassability(2,0,1,[[0]]).reasons,['unknown-event']);
  assert.equal(scenePassability(0x176,0,-1).blocked,true);
  assert.equal(scenePassability(0x177,0,-1).blocked,false);
  assert.equal(scenePassability(2,5,-1).blocked,true);
  assert.throws(()=>scenePassability(NaN,0,-1),/INPUT/);
  const layers=Array.from({length:6},()=>Array(4096).fill(0));layers[0].fill(2);layers[3].fill(-1);layers[3][0]=0;layers[3][1]=1;
  const region=extractMapRegion({id:1,layers,eventFields:[[0],[1]]},0,0,2,1);
  assert.deepEqual(region.blocked,[1]);assert.equal(region.collisionProfile,'community-scene-pass-v1');
});
