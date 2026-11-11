import { placeholderRock } from './placeholder-rock.mjs';
import { placeholderVegetation } from './placeholder-vegetation.mjs';
import { decodeLocalModel } from '../../packages/game-data/src/local-model.ts';

export function placeholderCatalogue(config){
  if(config?.version!==1||config.classification!=='mock'||config.sceneId!==1||!Array.isArray(config.entries))throw new Error('PLACEHOLDER_CONFIG');
  const generated=new Map(),seen=new Set();
  const bindings=config.entries.map(entry=>{
    if(!['rock','grass','tree'].includes(entry.kind)||!Number.isInteger(entry.tileValue)||entry.tileValue<=0||entry.resourceId!==entry.tileValue/2||seen.has(entry.tileValue))throw new Error('PLACEHOLDER_ENTRY');
    seen.add(entry.tileValue);
    if(!generated.has(entry.kind))generated.set(entry.kind,entry.kind==='rock'?placeholderRock():placeholderVegetation(entry.kind));
    const asset=generated.get(entry.kind),model={version:1,assetId:`authored.placeholder:${entry.kind}`,dataUri:asset.dataUri,sha256:asset.sha256,
      scale:entry.scale,offset:{x:0,y:0,z:0},rotationY:0};
    decodeLocalModel(model);
    return {tileValue:entry.tileValue,resourceId:entry.resourceId,model};
  });
  return {bindings,generated};
}
