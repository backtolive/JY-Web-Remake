import {readFile,writeFile,mkdir,realpath} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {inspectLocalModel} from '../../apps/web/src/model-inspection.ts';
import {decodeProjectedMap} from '../../packages/game-data/src/projected-map.ts';
import {VIEW_CAMERA,projectedWorldPoint} from '../../apps/web/src/view-controls.ts';
import {footprintModelCalibration} from '../../packages/game-data/src/footprint-model-calibration.ts';
import {bakeModelCalibration} from './bake-model-calibration.mjs';
const [worldFile,modelFile,planFile]=process.argv.slice(2);
if(!worldFile||!modelFile||!planFile)throw new Error('Usage: node tools/extractor/prepare-world-model.mjs <world.json> <model.glb> <plan.json>');
const sha=b=>createHash('sha256').update(b).digest('hex');
const original=await readFile(worldFile),bundle=JSON.parse(original),bytes=await readFile(modelFile),plan=JSON.parse(await readFile(planFile));
if(plan.version!==1||plan.layerId!=='building'||!Number.isInteger(plan.tileValue)||plan.processingStatus!=='succeeded'||plan.outputSha256!==sha(bytes)||bytes.length>4_000_000)throw new Error('WORLD_MODEL_PLAN');
const image=bundle.projectedMap.images.find(i=>i.tileValue===plan.tileValue);
if(!image||image.sha256!==plan.inputSha256)throw new Error('WORLD_MODEL_SOURCE');
const catalogue=JSON.parse(await readFile('assets/generated/world-asset-review/catalogue.local.json'));
const reference=catalogue.instances.find(i=>i.tileValue===plan.tileValue&&i.anchor.x===plan.referenceAnchor.x&&i.anchor.y===plan.referenceAnchor.y);
if(!reference)throw new Error('WORLD_MODEL_REFERENCE');
const model={version:1,assetId:`local.world-model:tile/${plan.tileValue}`,sha256:sha(bytes),dataUri:'data:model/gltf-binary;base64,'+bytes.toString('base64'),scale:{x:1,y:1,z:1},offset:{x:0,y:0,z:0},rotationY:0};
const inspected=await inspectLocalModel(model,true,plan.calibration?.axisAlignment==='horizontal-principal'),{min,max}=inspected.bounds,{alpha,beta}=VIEW_CAMERA;
const width=max.x-min.x,height=max.y-min.y,depth=max.z-min.z;
const viewWidth=Math.abs(Math.sin(alpha))*width+Math.abs(Math.cos(alpha))*depth;
const viewHeight=Math.abs(Math.cos(alpha)*Math.cos(beta))*width+Math.sin(beta)*height+Math.abs(Math.sin(alpha)*Math.cos(beta))*depth;
// Authored preview calibration: uniform visual fit, not original 3D dimensions or collision inference.
const scale=Math.min(image.width*Math.SQRT2/36/viewWidth,image.height*Math.SQRT2*Math.cos(beta)/18/viewHeight);
const centre=projectedWorldPoint((reference.bounds.minX+reference.bounds.maxX)/2-reference.anchor.x,(reference.bounds.minY+reference.bounds.maxY)/2-reference.anchor.y);
model.scale={x:scale,y:scale,z:scale};model.offset={x:centre.x-(min.x+max.x)/2*scale,y:-min.y*scale,z:centre.z-(min.z+max.z)/2*scale};
let calibrationEvidence,calibratedBytes,authoredSize={width:width*scale,height:height*scale,depth:depth*scale};
if(plan.calibration?.policy==='footprint-image-height-v1'){
  const full=catalogue.instances.filter(i=>i.tileValue===plan.tileValue&&i.occupiedCells===i.gridWidth*i.gridDepth).sort((a,b)=>b.occupiedCells-a.occupiedCells);
  if(reference.id!==full[0]?.id)throw new Error('WORLD_MODEL_MAX_COMPLETE_FOOTPRINT');
  const sourceYaw=inspected.horizontalPrincipalYaw??0;
  let bounds=inspected.bounds;
  if(sourceYaw){const rotated=bakeModelCalibration(bytes,{scale:{x:1,y:1,z:1},offset:{x:0,y:0,z:0}},{policy:'axis-only'},sourceYaw);bounds=(await inspectLocalModel({...model,dataUri:'data:model/gltf-binary;base64,'+rotated.toString('base64'),sha256:sha(rotated)},true)).bounds;}
  const result=footprintModelCalibration(bounds,{width:reference.gridWidth,depth:reference.gridDepth,centreX:centre.x,centreZ:centre.z},image,plan.calibration.sourceProjection);
  authoredSize=result.size;calibrationEvidence={...result.evidence,sourceYaw};
  calibratedBytes=bakeModelCalibration(bytes,result,{policy:plan.calibration.policy,sourceModelSha256:sha(bytes),...calibrationEvidence},sourceYaw);
  model.dataUri='data:model/gltf-binary;base64,'+calibratedBytes.toString('base64');model.sha256=sha(calibratedBytes);model.scale={x:1,y:1,z:1};model.offset={x:0,y:0,z:0};
  const check=await inspectLocalModel(model,true);
  for(const [axis,dimension] of [['x','width'],['y','height'],['z','depth']])if(Math.abs(check.bounds.max[axis]-check.bounds.min[axis]-authoredSize[dimension])>1e-5)throw new Error('WORLD_MODEL_CALIBRATED_BOUNDS');
}
const before=JSON.stringify(bundle.package),layersBefore=JSON.stringify(bundle.projectedMap.layers);
bundle.projectedMap.models=[{layerId:plan.layerId,tileValue:plan.tileValue,model}];
bundle.worldModelSample={version:1,...plan,sourceWorldSha256:sha(original),sourceModelSha256:sha(bytes),modelSha256:model.sha256,calibration:plan.calibration?.policy??'authored-uniform-source-view-fit-v1',calibrationEvidence,referenceFootprint:reference,measuredModel:inspected,
  authoredSize,limitations:'One common size for this ID; per-instance source collision masks unchanged. Reconstructed dimensions follow the user-selected rule, not verified original 3D geometry.'};
bundle.previewNotes=[`building ID ${plan.tileValue}已替換實際GLB；earth與surface維持原圖投影。`,'同ID共用模型尺度，各位置保留原始占格；模型高度與朝向為第一版美術候選。'];
if(JSON.stringify(bundle.package)!==before||JSON.stringify(bundle.projectedMap.layers)!==layersBefore)throw new Error('WORLD_MODEL_GAMEPLAY_CHANGED');
await decodeProjectedMap(bundle.projectedMap);
const root=await realpath('assets/generated'),out=path.join(root,`world-model-${plan.tileValue}`);await mkdir(out,{recursive:true});if(path.dirname(await realpath(out))!==root)throw new Error('WORLD_MODEL_OUTPUT');
const serialized=JSON.stringify(bundle)+'\n';if(Buffer.byteLength(serialized)>16_000_000)throw new Error('WORLD_MODEL_BUNDLE_BUDGET');
const destination=path.join(out,`world-model-${plan.tileValue}-${sha(serialized).slice(0,16)}.local.json`);
if(calibratedBytes){
  const glb=path.join(out,`building-${plan.tileValue}-calibrated-${model.sha256.slice(0,16)}.glb`);
  try{await writeFile(glb,calibratedBytes,{flag:'wx'});}catch(error){if(error.code!=='EEXIST'||sha(await readFile(glb))!==model.sha256)throw error;}
  console.log(JSON.stringify({calibratedGlb:glb}));
}
try{await writeFile(destination,serialized,{flag:'wx'});}catch(error){if(error.code!=='EEXIST'||await readFile(destination,'utf8')!==serialized)throw error;}
console.log(JSON.stringify({destination,bytes:Buffer.byteLength(serialized),modelBytes:bytes.length,authoredSize:bundle.worldModelSample.authoredSize,reference:reference.id}));
