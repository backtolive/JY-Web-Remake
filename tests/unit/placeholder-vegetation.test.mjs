import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { placeholderVegetation } from '../../tools/extractor/placeholder-vegetation.mjs';
import { placeholderCatalogue } from '../../tools/extractor/placeholder-catalogue.mjs';
import { decodeLocalModel } from '../../packages/game-data/src/local-model.ts';

test('Mock volumetric vegetation GLBs load with finite normals, bottom-centred unit height and rough materials',async()=>{
  const require=createRequire(new URL('../../apps/web/package.json',import.meta.url));
  const load=async p=>import(pathToFileURL(require.resolve(p)).href);
  const {NullEngine}=await load('@babylonjs/core/Engines/nullEngine.js');const {Scene}=await load('@babylonjs/core/scene.js');
  const {ImportMeshAsync}=await load('@babylonjs/core/Loading/sceneLoader.js');
  await load('@babylonjs/loaders/glTF/2.0/glTFLoader.js');await load('@babylonjs/loaders/glTF/glTFFileLoader.js');
  for(const kind of ['grass','tree']){
    const asset=placeholderVegetation(kind);assert.deepEqual(asset.bytes,placeholderVegetation(kind).bytes);
    const bytes=decodeLocalModel({...asset,version:1,assetId:`mock:${kind}`,scale:{x:1,y:1,z:1},offset:{x:0,y:0,z:0},rotationY:0});
    const engine=new NullEngine(),scene=new Scene(engine);
    try{
      const {meshes}=await ImportMeshAsync(bytes,scene,{pluginExtension:'.glb'});
      const solid=meshes.filter(m=>m.getTotalVertices()>0);assert.ok(solid.length>0);
      assert.equal(Math.min(...solid.map(m=>m.getBoundingInfo().boundingBox.minimum.y)),0);
      assert.equal(Math.max(...solid.map(m=>m.getBoundingInfo().boundingBox.maximum.y)),1);
      for(const mesh of solid){assert.ok(mesh.getVerticesData('normal').every(Number.isFinite));assert.equal(mesh.material.roughness,1);}
    }finally{scene.dispose();engine.dispose();}
  }
});
test('Mock catalogue: seven reviewed source bindings share three stable models, with invalid scales/duplicates refused',async()=>{
  const config=JSON.parse(await readFile(new URL('../../tools/scene1-placeholder-models.json',import.meta.url),'utf8'));
  const catalogue=placeholderCatalogue(config);assert.equal(catalogue.bindings.length,7);assert.equal(catalogue.generated.size,3);
  assert.equal(new Set(catalogue.bindings.map(b=>b.model.assetId)).size,3);
  const before=structuredClone(config);placeholderCatalogue(config);assert.deepEqual(config,before);
  for(const mutate of [c=>c.entries.push(c.entries[0]),c=>c.entries[0].scale.y=0,c=>c.entries[0].kind='unknown']){
    const c=structuredClone(config);mutate(c);assert.throws(()=>placeholderCatalogue(c),/PLACEHOLDER_|LOCAL_MODEL_/);
  }
});
