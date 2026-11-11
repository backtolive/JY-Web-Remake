import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGroundPreview } from '../../tools/extractor/prepare-ground-preview.mjs';
import { resolveContent } from '../../packages/game-core/src/content.ts';
import { readFile } from 'node:fs/promises';
const region=()=>({sceneId:1,originX:10,originY:20,width:2,height:1,blocked:[1],cells:[0,1].map(i=>({x:10+i,y:20,relativeX:i,relativeY:0,layers:{groundTileId:2,buildingTileId:i?4:0,objectTileId:0,buildingHeight:40,objectHeight:0}}))});
const evidence=()=>({parserVersion:'0.1.0',images:[{resourceId:1,averageOpaqueColor:'#889955'}],placements:[{layer:0,tileValue:2,resourceId:1}]});
test('Mock ground pipeline: explicit floor dimensions, relative placement, deterministic output, upper diagnostics and unchanged collision',async()=>{
  const r=region(),before=structuredClone(r),e=evidence();
  const b=buildGroundPreview(r,e);
  assert.deepEqual(b,buildGroundPreview(r,e));assert.deepEqual(r,before);
  assert.deepEqual(b.package.maps[0].blocked,[1]);
  assert.equal(b.assembled.cells[0].assets[0].world.y,0);
  assert.equal(b.assembled.cells[1].assets[0].world.x,1);
  assert.equal(b.assembled.cells[0].assets[0].asset.geometry.parts[0].size.width,1);
  assert.deepEqual(b.assembled.diagnostics,['UNMAPPED_RESOURCE:buildingTileId:4']);
  assert.equal((await resolveContent([b.package])).entry.x,0);
});
test('Mock ground pipeline: missing image evidence, mismatched ID, invalid color and no walkable entry rejected',()=>{
  for(const change of [e=>e.images=[],e=>e.placements[0].resourceId=9,e=>e.images[0].averageOpaqueColor='unknown']){
    const e=evidence();change(e);assert.throws(()=>buildGroundPreview(region(),e),/EVIDENCE_MISSING/);
  }
  const r=region();r.blocked=[0,1];assert.throws(()=>buildGroundPreview(r,evidence()),/NO_PREVIEW_ENTRY/);
});

const rules=()=>({version:1,sceneId:1,classification:'original-authored',entries:[{tileValue:4,resourceId:2,category:'rail',status:'authored-proxy',geometry:{version:1,classification:'original-authored',parts:[{size:{width:1,height:0.1,depth:0.1},offset:{x:0,y:0.5,z:0},rotationY:0,material:{id:'authored:wood',color:'#805526'}}]}}]});
const upperEvidence=()=>({...evidence(),images:[...evidence().images,{resourceId:2,sourceOffset:100,sha256:'mock'}],placements:[...evidence().placements,{layer:1,tileValue:4,resourceId:2}]});
test('Mock reviewed upper rules: inferred classification, explicit proxy, immutable collision and deterministic mapping',()=>{
  const r=region(),before=structuredClone(r),e=upperEvidence(),u=rules();
  const b=buildGroundPreview(r,e,u);
  assert.deepEqual(b,buildGroundPreview(r,e,u));assert.deepEqual(r,before);
  assert.equal(b.reviewedResources[0].confidence,'Inferred');assert.equal(b.assembled.unmapped.length,0);
  assert.equal(b.assembled.cells[1].assets[1].world.y,0);
  assert.deepEqual(b.package.maps[0].blocked,[1]);
});
test('Mock reviewed upper rules: duplicates, missing evidence, invalid primitives and pending geometry rejected',()=>{
  for(const change of [u=>u.entries.push(structuredClone(u.entries[0])),u=>u.entries[0].resourceId=99,
    u=>u.entries[0].geometry.parts[0].size.width=0,u=>u.entries[0].status='needs-model']){
    const u=rules();change(u);assert.throws(()=>buildGroundPreview(region(),upperEvidence(),u),/UPPER_|PRIMITIVE_/);
  }
  assert.throws(()=>buildGroundPreview(region(),evidence(),rules()),/UPPER_EVIDENCE_MISSING/);
});
test('Scoped review table: all eleven IDs classified, only two rail proxies and sign fragments kept pending',async()=>{
  const table=JSON.parse(await readFile(new URL('../../tools/scene1-upper-rules.json',import.meta.url),'utf8'));
  assert.equal(table.entries.length,11);
  assert.deepEqual(table.entries.filter(e=>e.geometry).map(e=>e.category),['rail-segment','rail-post-end']);
  assert.equal(table.entries.filter(e=>e.status==='needs-grouping').length,2);
});
