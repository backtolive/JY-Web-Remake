import {readFile,writeFile,mkdir,realpath} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {canonical} from '../../packages/game-core/src/content.ts';
import {decodeLocalModel} from '../../packages/game-data/src/local-model.ts';
import {independentGroundResources} from './independent-ground-resources.mjs';
const source=process.argv[2];if(!source)throw new Error('Usage: node tools/extractor/prepare-independent-ground.mjs <region-with-original-ground.json>');
const hash=b=>createHash('sha256').update(b).digest('hex');
const original=await readFile(source),bundle=JSON.parse(original),review=JSON.parse(await readFile('assets/generated/ground-id-review/review.local.json'));
const evidence=JSON.parse(await readFile('assets/generated/scene1-rle/manifest.local.json'));
if(hash(canonical(evidence))!==bundle.provenance?.imageEvidenceSha256)throw new Error('GROUND_STALE_EVIDENCE');
const entries=[];
for(const entry of review.entries){
  const image=evidence.images.find(e=>e.resourceId===entry.resourceId);
  if(!image||image.sha256!==entry.sha256||image.sourceOffset!==entry.sourceOffset||entry.mergeWith!==null||entry.gameplayProperty!=='Unknown')throw new Error('GROUND_REVIEW_EVIDENCE');
  entries.push({...entry,png:await readFile(`assets/generated/scene1-rle/resource-${entry.resourceId}.png`)});
}
for(const cell of bundle.region.cells){
  const visual=bundle.assembled.cells.find(c=>c.relativeX===cell.relativeX&&c.relativeY===cell.relativeY)?.assets.filter(v=>v.layer==='groundTileId');
  if(visual?.length!==1||visual[0].resourceId!==cell.layers.groundTileId||visual[0].world.x!==cell.relativeX||visual[0].world.z!==cell.relativeY)throw new Error('GROUND_GRID_MISMATCH');
}
const gameplay=JSON.stringify(bundle.package),generated=independentGroundResources(bundle.assembled.cells,entries);decodeLocalModel(generated.model);
for(const cell of bundle.assembled.cells)cell.assets=cell.assets.filter(v=>v.layer!=='groundTileId');
bundle.assembled.cells[0].assets.push({layer:'independentSourceGround',resourceId:0,asset:{kind:'box',height:.01,color:'#ffffff',label:'Independent original ground image review',model:generated.model},world:{x:0,y:0,z:0}});
if(JSON.stringify(bundle.package)!==gameplay)throw new Error('GROUND_GAMEPLAY_CHANGED');
bundle.package.maps[0].name='Scene 1 Independent Ground Review';
bundle.independentGround={version:1,classification:'original-derived',converterVersion:'0.1.0',baseSha256:hash(original),bindings:generated.bindings,
  policy:'Each source ID has one independent original-image material. No semantic terrain grouping, tint substitution, sharing or new edge blending. Full source images preserved in projection.'};
bundle.previewNotes=['21個地面資源ID各自使用原圖材質，依原64格配置；不合併、不按顏色分類。','此為原圖投影核對，不是高解析材質定稿；1182保留完整22px原圖，不推定實際高度。'];
const root=await realpath('assets/generated'),out=path.join(root,'ground-id-review');await mkdir(out,{recursive:true});if(path.dirname(await realpath(out))!==root)throw new Error('GROUND_OUTPUT');
const serialized=JSON.stringify(bundle,null,2)+'\n',destination=path.join(out,`scene1-independent-${hash(serialized).slice(0,16)}.local.json`);
for(const [file,data] of [[destination,serialized],[path.join(out,`ground-independent-${generated.model.sha256.slice(0,16)}.glb`),generated.bytes]]){
  try{await writeFile(file,data,{flag:'wx'});}catch(error){if(error.code!=='EEXIST'||hash(await readFile(file))!==hash(data))throw error;}
}
console.log(JSON.stringify({destination,materials:generated.bindings.length,cells:generated.bindings.reduce((n,b)=>n+b.instances,0),modelBytes:generated.bytes.length}));
