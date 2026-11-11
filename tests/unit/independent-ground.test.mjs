import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {independentGroundResources} from '../../tools/extractor/independent-ground-resources.mjs';
import {decodeLocalModel} from '../../packages/game-data/src/local-model.ts';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64');
const entries=[4,8].map(tileValue=>({tileValue,resourceId:tileValue/2,materialId:`mock.ground:id/${tileValue}`,png,pngSha256:createHash('sha256').update(png).digest('hex'),width:1,height:1,xOffset:0,yOffset:0,sourceOffset:tileValue}));
const cells=[4,8,4].map((id,x)=>({assets:[{layer:'groundTileId',resourceId:id,asset:{color:'#ffffff'},world:{x,y:0,z:0}}]}));
test('Mock independent ground: identical image bytes never merge different IDs or infer terrain; all bindings and bytes preserved',()=>{
  const original=structuredClone(cells),result=independentGroundResources(cells,entries),bytes=Buffer.from(decodeLocalModel(result.model));
  const doc=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)));
  assert.equal(doc.materials.length,2);assert.equal(doc.images.length,2);assert.equal(doc.textures.length,2);
  assert.deepEqual(result.bindings.map(b=>b.instances),[2,1]);
  assert.deepEqual(doc.materials.map(m=>m.name),entries.map(e=>e.materialId));
  assert.ok(doc.materials.every(m=>m.extras.gameplayProperty==='Unknown'));
  assert.ok(doc.meshes[0].primitives.every(p=>!('COLOR_0' in p.attributes)));
  const bin=28+bytes.readUInt32LE(12);
  for(const image of doc.images){const view=doc.bufferViews[image.bufferView];assert.deepEqual(bytes.subarray(bin+view.byteOffset,bin+view.byteOffset+view.byteLength),png);}
  assert.deepEqual(cells,original);
  assert.equal(independentGroundResources(cells,entries).model.sha256,result.model.sha256);
});
test('Mock independent ground refuses missing resources and changed source image hash',()=>{
  assert.throws(()=>independentGroundResources(cells,entries.slice(0,1)),/GROUND_RESOURCE_SET/);
  assert.throws(()=>independentGroundResources(cells,entries.map(e=>({...e,pngSha256:'0'.repeat(64)}))),/GROUND_SOURCE_IMAGE/);
});
