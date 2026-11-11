import test from 'node:test';
import assert from 'node:assert/strict';
import { placePrimitive, validatePrimitiveGeometry } from '../../packages/game-data/src/visual-primitive.ts';
import { assembleRegion } from '../../packages/game-data/src/map-region.ts';
const geometry=()=>({version:1,classification:'mock',parts:[{size:{width:2,height:0.2,depth:0.5},offset:{x:0,y:0.1,z:0},rotationY:Math.PI/2,material:{id:'mock:stone',color:'#889977'}}]});
test('Mock primitives: explicit dimensions, radians, base-centre transforms and immutable deterministic output',()=>{
  const input=geometry(),before=structuredClone(input);
  const placed=placePrimitive(input,{x:3,y:2,z:4});
  assert.deepEqual(placed[0].position,{x:3,y:2.2,z:4});
  assert.deepEqual(placed[0].size,{width:2,height:0.2,depth:0.5});
  assert.equal(placed[0].rotationY,Math.PI/2);assert.deepEqual(input,before);
  assert.deepEqual(placed,placePrimitive(input,{x:3,y:2,z:4}));
});
test('Mock primitives: unknown versions, invalid dimensions, transforms, materials and excessive parts rejected',()=>{
  for(const change of [g=>g.version=2,g=>g.parts[0].size.width=0,g=>g.parts[0].size.height=Infinity,
    g=>g.parts[0].offset.y=NaN,g=>g.parts[0].material.color='red',g=>g.parts=Array(33).fill(g.parts[0])]){
    const g=geometry();change(g);assert.throws(()=>validatePrimitiveGeometry(g),/PRIMITIVE_/);
  }
  assert.throws(()=>placePrimitive(geometry(),{x:NaN,y:0,z:0}),/ANCHOR/);
});
test('Mock primitive assembly: authored height ignores source sprite lift and never changes collision',()=>{
  const region={cells:[{x:3,y:4,relativeX:0,relativeY:0,layers:{groundTileId:2,buildingTileId:0,objectTileId:0,buildingHeight:40,objectHeight:99}}],blocked:[0]};
  const before=structuredClone(region);
  const result=assembleRegion(region,{version:'0.2.0',layers:{groundTileId:{2:{kind:'box',color:'#889977',height:0.2,geometry:geometry(),baseY:-0.2}}}});
  assert.equal(result.cells[0].assets[0].world.y,-0.2);assert.deepEqual(region,before);
});
