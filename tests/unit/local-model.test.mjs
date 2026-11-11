import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { placeholderRock } from '../../tools/extractor/placeholder-rock.mjs';
import { decodeLocalModel } from '../../packages/game-data/src/local-model.ts';
import { buildGroundPreview } from '../../tools/extractor/prepare-ground-preview.mjs';
const model=()=>({...placeholderRock(),version:1,assetId:'authored.placeholder:rock',scale:{x:.7,y:.4,z:.6},offset:{x:0,y:0,z:0},rotationY:0});
test('Mock GLB: deterministic actual binary loads through official Babylon loader with unit bounds and eight faces',async()=>{
  const a=model();assert.deepEqual(a.bytes,model().bytes);
  assert.deepEqual(Buffer.from(decodeLocalModel(a)),a.bytes);
  const require=createRequire(new URL('../../apps/web/package.json',import.meta.url));
  const load=async name=>import(pathToFileURL(require.resolve(name)).href);
  const {NullEngine}=await load('@babylonjs/core/Engines/nullEngine.js');
  const {Scene}=await load('@babylonjs/core/scene.js');
  const {ImportMeshAsync}=await load('@babylonjs/core/Loading/sceneLoader.js');
  await load('@babylonjs/loaders/glTF/2.0/glTFLoader.js');await load('@babylonjs/loaders/glTF/glTFFileLoader.js');
  const engine=new NullEngine(),scene=new Scene(engine);
  try{
    const result=await ImportMeshAsync(decodeLocalModel(a),scene,{pluginExtension:'.glb'});
    const mesh=result.meshes.find(m=>m.getTotalVertices()>0);assert.ok(mesh);
    assert.equal(mesh.getTotalVertices(),24);
    assert.equal((mesh.getTotalIndices()||mesh.getTotalVertices())/3,8);
    const box=mesh.getBoundingInfo().boundingBox;
    assert.deepEqual([box.maximum.x-box.minimum.x,box.maximum.y-box.minimum.y,box.maximum.z-box.minimum.z],[1,1,1]);
  }finally{scene.dispose();engine.dispose();}
});
test('Mock GLB: bad headers, transforms and external URI rejected before loading',()=>{
  const a=model();
  for(const change of [m=>m.version=2,m=>m.scale.y=0,m=>m.rotationY=NaN,m=>m.dataUri='https://example.invalid/model.glb',
    m=>{const bytes=Buffer.from(m.bytes);bytes[0]=0;m.dataUri='data:model/gltf-binary;base64,'+bytes.toString('base64');}]){
    const bad=model();change(bad);assert.throws(()=>decodeLocalModel(bad),/LOCAL_MODEL_/);
  }
  const length=a.bytes.readUInt32LE(12),doc=JSON.parse(a.bytes.subarray(20,20+length));doc.buffers[0].uri='external.bin';
  let json=Buffer.from(JSON.stringify(doc));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);
  const bytes=Buffer.concat([a.bytes.subarray(0,20),json,a.bytes.subarray(20+length)]);
  bytes.writeUInt32LE(bytes.length,8);bytes.writeUInt32LE(json.length,12);
  assert.throws(()=>decodeLocalModel({...a,dataUri:'data:model/gltf-binary;base64,'+bytes.toString('base64')}),/EXTERNAL_RESOURCE/);
});
test('Mock GLB binding preserves source collision and stable asset ID; bad hashes refused',()=>{
  const region={sceneId:1,width:2,height:1,blocked:[1],cells:[0,1].map(i=>({x:i,y:0,relativeX:i,relativeY:0,layers:{groundTileId:2,buildingTileId:i?4:0,objectTileId:0,buildingHeight:20,objectHeight:0}}))};
  const evidence={parserVersion:'0.1.0',images:[{resourceId:1,averageOpaqueColor:'#889955'},{resourceId:2}],placements:[{layer:0,tileValue:2,resourceId:1},{layer:1,tileValue:4,resourceId:2}]};
  const a=model(),binding={tileValue:4,resourceId:2,model:a};
  const b=buildGroundPreview(region,evidence,undefined,[binding]);
  assert.equal(b.assembled.cells[1].assets[1].asset.model.assetId,a.assetId);
  assert.equal(b.assembled.cells[1].assets[1].world.y,0);assert.deepEqual(b.package.maps[0].blocked,[1]);
  assert.throws(()=>buildGroundPreview(region,evidence,undefined,[{...binding,model:{...a,sha256:'0'.repeat(64)}}]),/MODEL_BINDING_HASH/);
});
