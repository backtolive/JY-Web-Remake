import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {decodeProjectedMap,visibleProjectedTiles} from '../../packages/game-data/src/projected-map.ts';
import {resolveContent,createGame,dispatch,serializeSave,restoreSave,validatePackageSchema} from '../../packages/game-core/src/index.ts';
import {placeholderRock} from '../../tools/extractor/placeholder-rock.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
function fixture(){
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64'),data=Buffer.alloc(480*480*2);
  for(let i=0;i<480*480;i++)data.writeUInt16LE(i%2?4:8,i*2);
  return {version:1,width:480,height:480,images:[4,8].map(tileValue=>({tileValue,assetId:`mock.world:tile/${tileValue}`,width:1,height:1,xOffset:0,yOffset:0,sha256:hash(png),dataUri:'data:image/png;base64,'+png.toString('base64')})),layers:[{id:'mock-ground',projection:'ground',sha256:hash(data),data:data.toString('base64')}]};
}
test('Mock full 480 grid: identical images keep independent IDs; visible scope moves across partitions without losing global cells',async()=>{
  const v=fixture(),map=await decodeProjectedMap(v);assert.equal(map.layers[0].values.length,230400);assert.equal(map.images.length,2);
  const first=visibleProjectedTiles(map,16,16,2),far=visibleProjectedTiles(map,470,470,2);
  assert.equal([...first.values()].reduce((n,g)=>n+g.cells.length,0),25);
  assert.ok([...far.values()].every(g=>g.cells.every(c=>c.x>=468&&c.y>=468)));
  assert.equal(map.layers[0].values[470*480+470],8);assert.equal(first.size,2);
  const mask=Buffer.alloc(480*480);mask[16*480+16]=1;v.layers[0].visibility={data:mask.toString('base64'),sha256:hash(mask)};
  const masked=await decodeProjectedMap(v);assert.equal([...visibleProjectedTiles(masked,16,16,2).values()].reduce((n,g)=>n+g.cells.length,0),1);
  assert.equal(masked.images.length,2);assert.equal(masked.layers[0].values.length,230400);
});
test('Mock projected map refuses changed hashes, unknown image IDs and truncated global layers',async()=>{
  const v=fixture();await assert.rejects(decodeProjectedMap({...v,images:v.images.slice(0,1)}),/PROJECTED_UNMAPPED_ID/);
  const bad=structuredClone(v);bad.layers[0].sha256='0'.repeat(64);await assert.rejects(decodeProjectedMap(bad),/PROJECTED_HASH/);
  bad.layers[0].data='AAAA';await assert.rejects(decodeProjectedMap(bad),/PROJECTED_GRID_SIZE/);
});
test('Mock projected model binding validates layer, ID, duplicates and embedded model hash',async()=>{
  const v=fixture(),asset=placeholderRock();v.models=[{layerId:'mock-ground',tileValue:4,model:{version:1,assetId:'mock.world:model/4',dataUri:asset.dataUri,sha256:asset.sha256,scale:{x:1,y:1,z:1},offset:{x:0,y:0,z:0},rotationY:0}}];
  assert.equal((await decodeProjectedMap(v)).models.length,1);
  const bad=structuredClone(v);bad.models[0].layerId='missing';await assert.rejects(decodeProjectedMap(bad),/PROJECTED_MODEL_BINDING/);
  bad.models=[...v.models,...v.models];await assert.rejects(decodeProjectedMap(bad),/PROJECTED_MODEL_BINDING/);
  bad.models=structuredClone(v.models);bad.models[0].model.sha256='0'.repeat(64);await assert.rejects(decodeProjectedMap(bad),/PROJECTED_HASH/);
});
test('Mock enlarged generic schema: far-edge movement and save restore valid at 512; 513 and outside states rejected',async()=>{
  const pkg=JSON.parse(readFileSync('tests/fixtures/mock-wuxia-package.json','utf8'));pkg.maps[0].width=512;pkg.maps[0].height=512;
  assert.equal(validatePackageSchema(pkg),true);const content=await resolveContent([pkg]),state={...createGame(content),x:510,y:511};
  const result=dispatch(content,state,{type:'MOVE',direction:'east'}).state;assert.equal(result.x,511);
  assert.equal(dispatch(content,result,{type:'MOVE',direction:'east'}).state.x,511);
  assert.equal(restoreSave(content,serializeSave(content,result)).y,511);
  pkg.maps[0].width=513;assert.equal(validatePackageSchema(pkg),false);
});
