import test from 'node:test';
import assert from 'node:assert/strict';
import { assembleVisualGroups } from '../../tools/extractor/assemble-visual-groups.mjs';

function mock(){
  const cell=(y,tile)=>({x:3,y,relativeX:0,relativeY:y-2,layers:{buildingTileId:tile}});
  return {region:{cells:[cell(4,2),cell(2,4)]},evidence:{images:[{resourceId:1,width:10,height:20},{resourceId:2,width:10,height:18}],
    placements:[{layer:1,tileValue:2,resourceId:1,cellX:3,cellY:4,screenX:0,screenY:0},{layer:1,tileValue:4,resourceId:2,cellX:3,cellY:2,screenX:10,screenY:1}]},
    rules:[{id:'authored:mock-pair',members:[{tileValue:2,dx:0,dy:0},{tileValue:4,dx:0,dy:-2}],geometry:{version:1,classification:'original-authored',parts:[{size:{width:.2,height:1,depth:2},offset:{x:0,y:0,z:-1},rotationY:0,material:{id:'mock:panel',color:'#aa3333'}}]}}]};
}
test('Mock groups: two nonadjacent grid fragments with exact projected seam produce one traceable model',()=>{
  const {region,evidence,rules}=mock(),before=structuredClone(region);
  const result=assembleVisualGroups(region,evidence,rules);
  assert.equal(result.groups.length,1);assert.equal(result.groups[0].members.length,2);assert.equal(result.consumed.size,2);
  assert.deepEqual(result.groups[0].visual.world,{x:0,y:0,z:2});assert.equal(result.groups[0].seam.gap,0);
  assert.deepEqual(region,before);assert.deepEqual(result,assembleVisualGroups(region,evidence,rules));
});
test('Mock groups: missing fragments, shifted seam, overlapping definitions, wrong anchor and duplicate members rejected',()=>{
  for(const mutate of [m=>m.region.cells.pop(),m=>m.evidence.placements[1].screenX++,m=>m.rules.push({...m.rules[0],id:'other'}),
    m=>m.rules[0].members[0].dx=1,m=>m.rules[0].members[1]={...m.rules[0].members[0]}]){
    const m=mock();mutate(m);assert.throws(()=>assembleVisualGroups(m.region,m.evidence,m.rules),/GROUP_/);
  }
});
