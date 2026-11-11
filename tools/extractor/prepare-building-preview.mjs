import {readFile,writeFile,mkdir,realpath} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {readOriginalScene} from '../../packages/game-data/src/original.ts';
import {extractMapRegion} from '../../packages/game-data/src/map-region.ts';
import {resolveContent,canonical} from '../../packages/game-core/src/content.ts';
import {buildGroundPreview} from './prepare-ground-preview.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');

export function buildBuildingPreview(region,evidence,rules){
  if(region.sceneId!==1||region.originX!==20||region.originY!==22||region.width!==8||region.height!==8)throw new Error('BUILDING_REGION_SCOPE');
  const gate=region.cells.find(c=>c.x===22&&c.y===26),entry=region.cells.find(c=>c.x===22&&c.y===27);
  if(!gate||gate.layers.buildingTileId!==0||gate.layers.eventSlot!==15||!entry)throw new Error('BUILDING_GATE_MISMATCH');
  if(region.blocked.includes(gate.relativeY*8+gate.relativeX)||region.blocked.includes(entry.relativeY*8+entry.relativeX))throw new Error('BUILDING_COLLISION_MISMATCH');
  const bundle=buildGroundPreview(region,evidence,rules);
  const id='local.scene1.building-preview',mapId=`${id}:map/region`;
  bundle.package.manifest.id=id;bundle.package.manifest.version='0.2.0';
  bundle.package.maps[0].id=mapId;bundle.package.maps[0].name='Building Passage Preview';
  bundle.package.entry={mapId,x:entry.relativeX,y:entry.relativeY};
  bundle.previewNotes=['牆面與紅柱為原創占位尺寸；室內家具尚未映射，不代表完整建築。',
    '門口（2,4）依社群通行規則可走過；事件槽15的觸發腳本尚未轉換，不觸發事件或切圖。',
    '此來源選區沒有已確認屋頂；本輪不推定屋頂、門扇或背面結構。'];
  bundle.gateEvidence={sourceCell:{x:22,y:26},relativeCell:{x:2,y:4},eventSlot:15,
    mapSourceOffset:49152+3*8192+(26*64+22)*2,eventSlotSourceOffset:4400+15*22,
    policy:'Community passability allows event field0=0; event effects are not executed, no portal inference'};
  return bundle;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  try{
    if(process.argv.length!==3)throw new Error('Usage: node tools/extractor/prepare-building-preview.mjs <original-directory>');
    const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),input=path.resolve(process.argv[2]);
    const names=['RANGER.IDX','RANGER.GRP','ALLSIN.GRP','ALLDEF.GRP','SDX001','SMP001','MMAP.COL'];
    const data=Object.fromEntries(await Promise.all(names.map(async name=>[name,await readFile(path.join(input,name))])));
    const evidence=JSON.parse(await readFile(path.join(project,'assets/generated/scene1-rle-20-22-8-8/manifest.local.json'),'utf8'));
    for(const name of ['SDX001','SMP001','MMAP.COL','ALLSIN.GRP'])if(evidence.sources.find(s=>s.sourceFile===name)?.sha256!==hash(data[name]))throw new Error(`BUILDING_STALE_EVIDENCE:${name}`);
    const rules=JSON.parse(await readFile(path.join(project,'tools/scene1-building-rules.json'),'utf8'));
    const scene=readOriginalScene(data['RANGER.IDX'],data['RANGER.GRP'],data['ALLSIN.GRP'],data['ALLDEF.GRP'],1);
    const bundle=buildBuildingPreview(extractMapRegion(scene,20,22,8,8),evidence,rules);
    bundle.gateEvidence.rawEventFields=scene.eventFields[15];
    bundle.provenance={converterVersion:'0.1.0',confidence:'Community Implementation',geometryClassification:'original-authored',
      rulesSha256:hash(canonical(rules)),imageEvidenceSha256:hash(canonical(evidence)),
      sourceCommit:evidence.sourceCommit,sources:names.map(sourceFile=>({sourceFile,byteLength:data[sourceFile].length,sha256:hash(data[sourceFile])})),
      limitations:'Source-derived wall layout with authored proxy dimensions; furniture/roof/door mechanics not reconstructed.'};
    await resolveContent([bundle.package]);
    for(const name of names)if(hash(await readFile(path.join(input,name)))!==hash(data[name]))throw new Error(`SOURCE_CHANGED:${name}`);
    const output=path.join(project,'assets/generated/building-preview');await mkdir(output,{recursive:true});
    const relative=path.relative(await realpath(path.join(project,'assets/generated')),await realpath(output));
    if(!relative||relative.startsWith('..')||path.isAbsolute(relative))throw new Error('OUTPUT_OUTSIDE_GENERATED');
    const destination=path.join(output,`building-${hash(canonical(bundle)).slice(0,16)}.local.json`),text=JSON.stringify(bundle,null,2)+'\n';
    try{await writeFile(destination,text,{flag:'wx'});}catch(error){if(error.code!=='EEXIST'||await readFile(destination,'utf8')!==text)throw error;}
    console.log(JSON.stringify({destination,unmapped:bundle.assembled.diagnostics,gate:bundle.gateEvidence.sourceCell,blocked:bundle.package.maps[0].blocked.length},null,2));
  }catch(error){console.error(error.message);process.exitCode=1;}
}
