import test from 'node:test';
import assert from 'node:assert/strict';
import {footprintModelCalibration} from '../../packages/game-data/src/footprint-model-calibration.ts';
test('Footprint reconstruction: thin source becomes 4x3 base, with source-image aspect preserved in a 2:1 isometric box projection',()=>{
  const bounds={min:{x:-.5,y:0,z:-.05},max:{x:.5,y:1,z:.05}};
  const result=footprintModelCalibration(bounds,{width:4,depth:3,centreX:-1.5,centreZ:1},{width:108,height:102});
  assert.equal(result.scale.x,4);assert.equal(result.scale.z,30);assert.ok(Math.abs(result.size.height-2.540211585108481)<1e-9);
  const projected=[];
  for(const x of [0,4])for(const z of [0,3])for(const y of [0,result.size.height])projected.push({x:(x-z)/Math.sqrt(2),y:(x+z)/Math.sqrt(8)-y*Math.sqrt(3)/2});
  const w=Math.max(...projected.map(p=>p.x))-Math.min(...projected.map(p=>p.x)),h=Math.max(...projected.map(p=>p.y))-Math.min(...projected.map(p=>p.y));
  assert.ok(Math.abs(h/w-102/108)<1e-9);
  assert.equal(result.offset.x,-1.5);assert.equal(result.offset.z,1);assert.ok(Math.abs(result.offset.y)<1e-9);
});
test('Footprint reconstruction rejects impossible height rather than inventing a minimum height',()=>{
  assert.throws(()=>footprintModelCalibration({min:{x:0,y:0,z:0},max:{x:1,y:1,z:1}},{width:4,depth:3,centreX:0,centreZ:0},{width:108,height:20}),/FOOTPRINT_CALIBRATION_HEIGHT/);
});
