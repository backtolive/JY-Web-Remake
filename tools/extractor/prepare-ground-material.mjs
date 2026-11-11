import {readFile,writeFile,mkdir,realpath} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {sharedGroundMaterial} from './shared-ground-material.mjs';
import {decodeLocalModel} from '../../packages/game-data/src/local-model.ts';
const [source,texture]=process.argv.slice(2);
if(process.argv[4]!=='--historical-shared-experiment')throw new Error('GROUND_SHARED_POLICY_RETIRED: use prepare-independent-ground.mjs. Shared color grouping was rejected; historical reproduction requires --historical-shared-experiment.');
if(!source||!texture)throw new Error('Usage: node tools/extractor/prepare-ground-material.mjs <region.json> <albedo.png>');
const hash=b=>createHash('sha256').update(b).digest('hex');
const sourceBytes=await readFile(source),bundle=JSON.parse(sourceBytes),png=await readFile(texture);
const before=JSON.stringify(bundle.package),generated=sharedGroundMaterial(bundle.assembled.cells,png);decodeLocalModel(generated.model);
const groundReferences=bundle.assembled.cells.flatMap(c=>c.assets.filter(v=>v.layer==='groundTileId').map(v=>({layer:v.layer,resourceId:v.resourceId,world:v.world})));
for(const cell of bundle.assembled.cells)cell.assets=cell.assets.filter(v=>v.layer!=='groundTileId');
bundle.assembled.cells[0].assets.push({layer:'authoredGroundSurface',resourceId:0,asset:{kind:'box',height:.01,color:'#71804b',label:'Shared grass-soil material',model:generated.model},world:{x:0,y:0,z:0}});
if(JSON.stringify(bundle.package)!==before)throw new Error('GROUND_GAMEPLAY_CHANGED');
bundle.package.maps[0].name='Scene 1 Shared Ground Material';
bundle.groundMaterial={version:1,classification:'original-authored',baseSha256:hash(sourceBytes),textureFile:path.basename(texture),textureSha256:hash(png),modelSha256:generated.model.sha256,tiles:generated.tiles,triangles:generated.triangles,uvTileSize:2,groundReferences};
bundle.previewNotes=['共用草土材質已套用64格；樹木與岩石使用後處理成功LOD0，其餘上層仍為占位。','連續世界UV與平滑色調為原創美術設計；原版資源ID、配置與碰撞另行保留。'];
const root=await realpath('assets/generated'),out=path.join(root,'ground-material');await mkdir(out,{recursive:true});if(path.dirname(await realpath(out))!==root)throw new Error('GROUND_OUTPUT');
const serialized=JSON.stringify(bundle,null,2)+'\n';if(Buffer.byteLength(serialized)>16_000_000)throw new Error('GROUND_BUNDLE_BUDGET');
const destination=path.join(out,`scene1-ground-${hash(serialized).slice(0,16)}.local.json`);
for(const [file,data] of [[destination,serialized],[path.join(out,`shared-ground-${generated.model.sha256.slice(0,16)}.glb`),generated.bytes]]){
  try{await writeFile(file,data,{flag:'wx'});}catch(error){if(error.code!=='EEXIST'||hash(await readFile(file))!==hash(data))throw error;}
}
console.log(JSON.stringify({destination,tiles:generated.tiles,triangles:generated.triangles,modelBytes:generated.bytes.length,bundleBytes:Buffer.byteLength(serialized)}));
