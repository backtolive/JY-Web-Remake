import { readFile, mkdir, writeFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readOriginalScene } from '../../packages/game-data/src/original.ts';
import { extractMapRegion, assembleRegion, regionResourceIds } from '../../packages/game-data/src/map-region.ts';
import { resolveContent, canonical } from '../../packages/game-core/src/content.ts';
import { validatePrimitiveGeometry } from '../../packages/game-data/src/visual-primitive.ts';
import { assembleVisualGroups } from './assemble-visual-groups.mjs';
import { decodeLocalModel } from '../../packages/game-data/src/local-model.ts';
import { placeholderRock } from './placeholder-rock.mjs';
import { placeholderCatalogue } from './placeholder-catalogue.mjs';
const hash = value=>createHash('sha256').update(value).digest('hex');

/** Pure scoped converter. Ground dimensions are authored; appearance is source-derived mean color. */
export function buildGroundPreview(region,evidence,upperRules,modelBindings=[]) {
  if(evidence.parserVersion!=='0.1.0'||!Array.isArray(evidence.images)||!Array.isArray(evidence.placements))throw new Error('GROUND_EVIDENCE_VERSION');
  const layers={groundTileId:{}};
  for(const ref of regionResourceIds(region).filter(ref=>ref.layer==='groundTileId')){
    if(ref.resourceId<=0||ref.resourceId%2)throw new Error('GROUND_TILE_ENCODING');
    const image=evidence.images.find(image=>image.resourceId===ref.resourceId/2);
    if(!image||!/^#[a-f0-9]{6}$/.test(image.averageOpaqueColor)||!evidence.placements.some(p=>p.layer===0&&p.tileValue===ref.resourceId&&p.resourceId===image.resourceId))throw new Error(`GROUND_EVIDENCE_MISSING:${ref.resourceId}`);
    const geometry={version:1,classification:'original-authored',parts:[{size:{width:1,height:0.12,depth:1},offset:{x:0,y:-0.12,z:0},rotationY:0,
      material:{id:`local.ground:mean/${image.resourceId}`,color:image.averageOpaqueColor}}]};
    layers.groundTileId[ref.resourceId]={kind:'box',height:0.12,color:image.averageOpaqueColor,geometry,baseY:0,label:'Authored floor with source-derived mean color'};
  }
  const mapping={version:'0.2.0',classification:'original-authored',layers};
  const reviewedResources=[];
  if(upperRules){
    if(upperRules.version!==1||upperRules.sceneId!==region.sceneId||upperRules.classification!=='original-authored'||!Array.isArray(upperRules.entries))throw new Error('UPPER_RULES_FORMAT');
    const seen=new Set();
    for(const rule of upperRules.entries){
      if(seen.has(rule.tileValue))throw new Error('UPPER_RULE_DUPLICATE');seen.add(rule.tileValue);
      if(!Number.isInteger(rule.tileValue)||rule.tileValue<=0||rule.resourceId!==rule.tileValue/2||typeof rule.category!=='string'||!['needs-model','needs-grouping','authored-proxy'].includes(rule.status))throw new Error('UPPER_RULE_INVALID');
      const image=evidence.images.find(image=>image.resourceId===rule.resourceId);
      if(!image||!evidence.placements.some(p=>p.layer===1&&p.tileValue===rule.tileValue&&p.resourceId===rule.resourceId))throw new Error(`UPPER_EVIDENCE_MISSING:${rule.tileValue}`);
      reviewedResources.push({tileValue:rule.tileValue,resourceId:rule.resourceId,category:rule.category,status:rule.status,confidence:'Inferred',sourceFile:'SMP001',sourceOffset:image.sourceOffset,sha256:image.sha256});
      if(rule.status==='authored-proxy'){
        validatePrimitiveGeometry(rule.geometry);
        if(rule.geometry.classification!=='original-authored')throw new Error('UPPER_GEOMETRY_CLASSIFICATION');
        layers.buildingTileId??={};
        layers.buildingTileId[rule.tileValue]={kind:'box',height:0.8,color:rule.geometry.parts[0].material.color,geometry:rule.geometry,baseY:0,label:`Authored proxy: ${rule.category}`,...(rule.cutaway===true?{cutaway:true}:{})};
      }else if(rule.geometry)throw new Error('UPPER_PENDING_GEOMETRY');
    }
  }
  for(const binding of modelBindings){
    if(binding.resourceId!==binding.tileValue/2||!evidence.images.some(i=>i.resourceId===binding.resourceId)
      ||!evidence.placements.some(p=>p.layer===1&&p.tileValue===binding.tileValue&&p.resourceId===binding.resourceId))throw new Error('MODEL_BINDING_EVIDENCE');
    decodeLocalModel(binding.model);
    if(hash(decodeLocalModel(binding.model))!==binding.model.sha256)throw new Error('MODEL_BINDING_HASH');
    layers.buildingTileId??={};
    if(layers.buildingTileId[binding.tileValue])throw new Error('MODEL_BINDING_CONFLICT');
    layers.buildingTileId[binding.tileValue]={kind:'box',height:.4,color:'#665544',model:binding.model,baseY:0,label:`Mock GLB placeholder: ${binding.model.assetId}`};
  }
  const assembled=assembleRegion(region,mapping,{strict:false});
  for(const cell of assembled.cells)for(const visual of cell.assets)if(visual.asset.model)visual.world.y=0;
  for(const cell of assembled.cells)for(const visual of cell.assets){visual.world.x=cell.relativeX;visual.world.z=cell.relativeY;}
  const {groups,consumed}=assembleVisualGroups(region,evidence,upperRules?.groups);
  for(const group of groups){
    if(group.members.some(member=>mapping.layers.buildingTileId?.[member.tileValue]))throw new Error('GROUP_RESOURCE_ALREADY_MAPPED');
    const cell=assembled.cells.find(c=>c.logicalX===group.anchor.x&&c.logicalY===group.anchor.y);
    cell.assets.push(group.visual);
  }
  // Remove a resource-level warning only if every occurrence is represented by a group.
  assembled.unmapped=assembled.unmapped.filter(ref=>ref.layer!=='buildingTileId'||region.cells.some(c=>c.layers.buildingTileId===ref.resourceId&&!consumed.has(`${c.x},${c.y}`)));
  assembled.diagnostics=assembled.unmapped.map(ref=>`UNMAPPED_RESOURCE:${ref.key}`);
  const blocked=[...region.blocked];
  const entryCell=region.cells.find(cell=>!blocked.includes(cell.relativeY*region.width+cell.relativeX)&&cell.layers.groundTileId>0);
  if(!entryCell)throw new Error('GROUND_NO_PREVIEW_ENTRY');
  const id='local.scene1.ground-preview',mapId=`${id}:map/region`;
  const resourceEvidence=Object.keys(layers.groundTileId).map(tileValue=>{
    const image=evidence.images.find(image=>image.resourceId===Number(tileValue)/2);
    return {tileValue:Number(tileValue),sourceFile:'SMP001',...image};
  });
  return {package:{manifest:{id,version:modelBindings.length>1?'0.5.0':modelBindings.length?'0.4.0':groups.length?'0.3.0':upperRules?'0.2.0':'0.1.0',schemaVersion:1,runtimeVersion:'0.1.0',kind:'base',classification:'original-derived',
    license:'User-supplied source-derived data; local preview only; not for redistribution.',ruleset:'authored-ground-preview-v1',priority:0,dependencies:[]},
    entry:{mapId,x:entryCell.relativeX,y:entryCell.relativeY},maps:[{id:mapId,name:modelBindings.length>1?'Full Placeholder Preview':modelBindings.length?'Rock Model Preview':groups.length?'Ground Rail and Sign Preview':upperRules?'Ground and Rail Preview':'Ground Rules Preview',width:region.width,height:region.height,blocked,npcs:[],portals:[]}],
    dialogues:[],events:[],items:[],patches:[]},region,mapping,assembled,resourceEvidence,reviewedResources,groups,modelBindings,
    visualPolicy:'Authored ground boxes with source-derived mean colors; optional reviewed upper proxies have inferred dimensions. Unmapped resources omitted explicitly; collision retained separately.'};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  try{
    if(process.argv.length<3||process.argv.length>4||(process.argv[3]&&!['--upper-rules','--rock-model','--all-placeholders'].includes(process.argv[3])))throw new Error('Usage: node tools/extractor/prepare-ground-preview.mjs <original-directory> [--upper-rules|--rock-model|--all-placeholders]');
    const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
    const input=path.resolve(process.argv[2]);
    const names=['RANGER.IDX','RANGER.GRP','ALLSIN.GRP','ALLDEF.GRP','SDX001','SMP001','MMAP.COL'];
    const data=Object.fromEntries(await Promise.all(names.map(async name=>[name,await readFile(path.join(input,name))])));
    const evidence=JSON.parse(await readFile(path.join(project,'assets/generated/scene1-rle/manifest.local.json'),'utf8'));
    for(const name of ['SDX001','SMP001','MMAP.COL','ALLSIN.GRP'])if(evidence.sources?.find(source=>source.sourceFile===name)?.sha256!==hash(data[name]))throw new Error(`GROUND_STALE_EVIDENCE:${name}`);
    const scene=readOriginalScene(data['RANGER.IDX'],data['RANGER.GRP'],data['ALLSIN.GRP'],data['ALLDEF.GRP'],1);
    const upperRules=process.argv[3]?JSON.parse(await readFile(path.join(project,'tools/scene1-upper-rules.json'),'utf8')):undefined;
    const rock=process.argv[3]==='--rock-model'?placeholderRock():null;
    let models=rock?[{tileValue:2984,resourceId:1492,model:{version:1,assetId:'authored.placeholder:rock',dataUri:rock.dataUri,sha256:rock.sha256,
      scale:{x:.7,y:.4,z:.6},offset:{x:0,y:0,z:0},rotationY:0}}]:[];
    const catalogueConfig=process.argv[3]==='--all-placeholders'?JSON.parse(await readFile(path.join(project,'tools/scene1-placeholder-models.json'),'utf8')):null;
    const catalogue=catalogueConfig?placeholderCatalogue(catalogueConfig):null;
    if(catalogue)models=catalogue.bindings;
    const bundle=buildGroundPreview(extractMapRegion(scene,13,28,8,8),evidence,upperRules,models);
    bundle.provenance={converterVersion:'0.1.0',confidence:'Community Implementation',imageEvidenceSha256:hash(canonical(evidence)),
      sceneMapBlockOffset:49152,groundCells:bundle.region.cells.map(cell=>({x:cell.x,y:cell.y,sourceOffset:49152+(cell.y*64+cell.x)*2})),
      geometryClassification:'original-authored',sources:names.map(sourceFile=>({sourceFile,byteLength:data[sourceFile].length,sha256:hash(data[sourceFile])})),
      upperRulesSha256:upperRules?hash(canonical(upperRules)):null,
      placeholderCatalogueSha256:catalogueConfig?hash(canonical(catalogueConfig)):null,
      limitations:'No DOS appearance, collision or 3D-size fidelity claim. Preview entry selected locally; upper proxies are authored, pending resources absent visually.'};
    await resolveContent([bundle.package]);
    for(const name of names)if(hash(await readFile(path.join(input,name)))!==hash(data[name]))throw new Error(`SOURCE_CHANGED:${name}`);
    const output=path.join(project,'assets/generated/ground-preview');await mkdir(output,{recursive:true});
    const relative=path.relative(await realpath(path.join(project,'assets/generated')),await realpath(output));
    if(!relative||relative.startsWith('..')||path.isAbsolute(relative))throw new Error('OUTPUT_OUTSIDE_GENERATED');
    if(rock)await writeFile(path.join(output,`mock-rock-${rock.sha256.slice(0,16)}.glb`),rock.bytes);
    if(catalogue){
      for(const [kind,asset] of catalogue.generated)await writeFile(path.join(output,`mock-${kind}-${asset.sha256.slice(0,16)}.glb`),asset.bytes);
      bundle.previewNotes=['此場景全部為占位外觀，樹木與草叢皆是低模 GLB，不代表最終畫風。','模型尺寸為原創測試值；碰撞仍依獨立地圖資料，不因植被外形改變。'];
    }
    const destination=path.join(output,`ground-${hash(canonical(bundle)).slice(0,16)}.local.json`);
    const serialized=JSON.stringify(bundle,null,2)+'\n';
    try{await writeFile(destination,serialized,{flag:'wx'});}catch(error){if(error.code!=='EEXIST'||await readFile(destination,'utf8')!==serialized)throw error;}
    console.log(JSON.stringify({destination,groundIds:Object.keys(bundle.mapping.layers.groundTileId).length,
      groundInstances:bundle.assembled.cells.reduce((n,c)=>n+c.assets.filter(a=>a.layer==='groundTileId').length,0),
      upperInstances:bundle.assembled.cells.reduce((n,c)=>n+c.assets.filter(a=>a.layer!=='groundTileId').length,0),diagnostics:bundle.assembled.diagnostics},null,2));
  }catch(error){console.error(error.message);process.exitCode=1;}
}
