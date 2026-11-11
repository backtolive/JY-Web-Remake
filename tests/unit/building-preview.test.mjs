import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBuildingPreview } from '../../tools/extractor/prepare-building-preview.mjs';
import { resolveContent,createGame,dispatch } from '../../packages/game-core/src/index.ts';

function mock(){
  const cells=Array.from({length:64},(_,i)=>({x:20+i%8,y:22+Math.floor(i/8),relativeX:i%8,relativeY:Math.floor(i/8),
    layers:{groundTileId:2,buildingTileId:i===33?4:0,objectTileId:0,eventSlot:i===34?15:-1,buildingHeight:4,objectHeight:0}}));
  const region={sceneId:1,originX:20,originY:22,width:8,height:8,cells,blocked:[33]};
  const evidence={parserVersion:'0.1.0',images:[{resourceId:1,averageOpaqueColor:'#889955'},{resourceId:2}],placements:[{layer:0,tileValue:2,resourceId:1},{layer:1,tileValue:4,resourceId:2}]};
  const rules={version:1,sceneId:1,classification:'original-authored',entries:[{tileValue:4,resourceId:2,category:'wall',status:'authored-proxy',geometry:{version:1,classification:'original-authored',parts:[{size:{width:1,height:1.65,depth:.12},offset:{x:0,y:0,z:0},rotationY:0,material:{id:'mock:wall',color:'#9b713c'}}]}}]};
  return {region,evidence,rules};
}
test('Mock building: community passability permits doorway while wall blocks and no event or portal inferred',async()=>{
  const {region,evidence,rules}=mock(),before=structuredClone(region);
  const b=buildBuildingPreview(region,evidence,rules);assert.deepEqual(region,before);
  const content=await resolveContent([b.package]),state=createGame(content);
  assert.deepEqual([state.x,state.y],[2,5]);
  assert.equal(dispatch(content,state,{type:'MOVE',direction:'north'}).notifications[0].type,'PLAYER_MOVED');
  const nearWall=dispatch(content,state,{type:'MOVE',direction:'west'}).state;
  assert.equal(dispatch(content,nearWall,{type:'MOVE',direction:'north'}).notifications[0].type,'MOVE_BLOCKED');
  assert.equal(b.package.maps[0].portals.length,0);assert.deepEqual(b.package.maps[0].blocked,region.blocked);
  assert.equal(b.gateEvidence.mapSourceOffset,49152+3*8192+(26*64+22)*2);
  assert.equal(b.assembled.cells[33].assets[1].world.y,0);
});
test('Mock building: changed gate reference, wrongly blocked doorway or blocked entry rejected',()=>{
  for(const mutate of [m=>m.region.cells[34].layers.eventSlot=16,m=>m.region.blocked.push(34),m=>m.region.blocked.push(42)]){
    const m=mock();mutate(m);assert.throws(()=>buildBuildingPreview(m.region,m.evidence,m.rules),/BUILDING_/);
  }
});
