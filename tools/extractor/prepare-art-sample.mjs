import {readFile,mkdir,writeFile,realpath} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {inspectLocalModel} from '../../apps/web/src/model-inspection.ts';
import {calibrateModelReplacement} from '../../packages/game-data/src/model-replacement.ts';
import {canonical} from '../../packages/game-core/src/content.ts';

// Offline only: generated models remain local; no service calls or original writes.
const [basePath,planPath]=process.argv.slice(2);
if(!basePath||!planPath)throw new Error('Usage: node tools/extractor/prepare-art-sample.mjs <region.json> <plan.json>');
const hash=b=>createHash('sha256').update(b).digest('hex');
const baseBytes=await readFile(basePath),bundle=JSON.parse(baseBytes),plan=JSON.parse(await readFile(planPath));
const evidence=JSON.parse(await readFile('assets/generated/scene1-rle/manifest.local.json'));
if(hash(canonical(evidence))!==bundle.provenance?.imageEvidenceSha256)throw new Error('ART_STALE_EVIDENCE');
if(plan.version!==1||!Array.isArray(plan.entries)||!plan.entries.length)throw new Error('ART_PLAN');
const originalPackage=JSON.stringify(bundle.package),seen=new Set(),report=[];
for(const entry of plan.entries){
  if(!Number.isInteger(entry.tileValue)||seen.has(entry.tileValue)||typeof entry.jobId!=='string')throw new Error('ART_BINDING');
  seen.add(entry.tileValue);
  const source=evidence.images.find(image=>image.resourceId===entry.tileValue/2);
  if(!source||entry.resourceId!==entry.tileValue/2)throw new Error('ART_SOURCE_REFERENCE');
  const inputBytes=await readFile(`assets/generated/scene1-rle/resource-${entry.resourceId}.png`);
  if(hash(inputBytes)!==entry.inputSha256)throw new Error('ART_INPUT_HASH');
  const bytes=await readFile(path.resolve(path.dirname(planPath),entry.file));
  if(hash(bytes)!==entry.outputSha256)throw new Error('ART_OUTPUT_HASH');
  if(bytes.length>4_000_000)throw new Error(`ART_MODEL_BUDGET:${entry.tileValue}:${bytes.length}`);
  const replacement={dataUri:`data:model/gltf-binary;base64,${bytes.toString('base64')}`,sha256:hash(bytes)};
  const visuals=bundle.assembled.cells.flatMap(c=>c.assets).filter(v=>v.layer==='buildingTileId'&&v.resourceId===entry.tileValue);
  if(!visuals.length||visuals.some(v=>!v.asset.model))throw new Error(`ART_NO_MODEL:${entry.tileValue}`);
  const next=await inspectLocalModel({...visuals[0].asset.model,...replacement},true);
  for(const visual of visuals){
    const previous=visual.asset.model,old=await inspectLocalModel(previous,true);
    visual.asset.model={...calibrateModelReplacement(previous,replacement,old.bounds,next.bounds),assetId:`local.art:resource/${entry.tileValue/2}`};
    visual.asset.label=`Generated art candidate resource ${entry.tileValue/2}`;
  }
  report.push({...entry,sourceEvidence:source,sha256:replacement.sha256,bytes:bytes.length,instances:visuals.length,...next});
}
if(JSON.stringify(bundle.package)!==originalPackage)throw new Error('ART_GAMEPLAY_CHANGED');
bundle.package.maps[0].name='Scene 1 Art Sample';
bundle.previewNotes=['實際生成美術候選：樹木／岩石依來源圖號替換；其餘資產仍為占位。','尺寸沿用既有原創配置；生成形狀與材質待畫面驗收，不代表原版3D還原。'];
bundle.artSample={version:1,baseSha256:hash(baseBytes),classification:'generated-art-candidate',entries:report};
const root=await realpath('assets/generated'),out=path.join(root,'art-sample');await mkdir(out,{recursive:true});
if(path.dirname(await realpath(out))!==root)throw new Error('ART_OUTPUT');
const destination=path.join(out,`scene1-art-${hash(JSON.stringify(bundle)).slice(0,16)}.local.json`);
await writeFile(destination,JSON.stringify(bundle,null,2)+'\n',{flag:'wx'}).catch(async error=>{if(error.code!=='EEXIST'||await readFile(destination,'utf8')!==JSON.stringify(bundle,null,2)+'\n')throw error;});
console.log(JSON.stringify({destination,report},null,2));
