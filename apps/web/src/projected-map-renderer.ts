import {Mesh} from '@babylonjs/core/Meshes/mesh';
import {VertexData} from '@babylonjs/core/Meshes/mesh.vertexData';
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial';
import {Texture} from '@babylonjs/core/Materials/Textures/texture';
import {Color3} from '@babylonjs/core/Maths/math.color';
import {Matrix} from '@babylonjs/core/Maths/math.vector';
import type {Scene} from '@babylonjs/core/scene';
import {visibleProjectedTiles} from '../../../packages/game-data/src/projected-map';
import type {ProjectedMap} from '../../../packages/game-data/src/projected-map';
import '@babylonjs/core/Meshes/thinInstanceMesh';
import {projectedImageOffset,projectedWorldPoint} from './view-controls';
import {TransformNode} from '@babylonjs/core/Meshes/transformNode';
import {LoadAssetContainerAsync} from '@babylonjs/core/Loading/sceneLoader';
import type {AssetContainer} from '@babylonjs/core/assetContainer';
import {decodeLocalModel} from '../../../packages/game-data/src/local-model';
import type {ProjectedModelBinding} from '../../../packages/game-data/src/projected-map';

export function createProjectedMapRenderer(scene:Scene,map:ProjectedMap,x:number,y:number){
  const meshes=new Map<string,{mesh:Mesh;material:StandardMaterial;texture:Texture}>();let lastX=-1,lastY=-1;
  type ModelGroup={binding:ProjectedModelBinding;container?:AssetContainer;ready:Promise<void>;cells:{x:number;y:number}[];instances:Map<string,TransformNode>};
  const modelGroups=new Map<string,ModelGroup>();
  function syncModels(group:ModelGroup){
    if(!group.container||scene.isDisposed)return;
    const wanted=new Set(group.cells.map(c=>`${c.x},${c.y}`));
    for(const [key,parent] of group.instances)if(!wanted.has(key)){parent.dispose();group.instances.delete(key);}
    for(const cell of group.cells){
      const key=`${cell.x},${cell.y}`;if(group.instances.has(key))continue;
      const model=group.binding.model,point=projectedWorldPoint(cell.x,cell.y),parent=new TransformNode('world-model-'+group.binding.tileValue+'-'+key,scene);
      parent.position.set(point.x+model.offset.x,model.offset.y,point.z+model.offset.z);parent.scaling.set(model.scale.x,model.scale.y,model.scale.z);parent.rotation.y=model.rotationY;
      const instance=group.container.instantiateModelsToScene(name=>'world-instance-'+key+'-'+name,false);
      for(const root of instance.rootNodes)root.parent=parent;
      for(const mesh of parent.getChildMeshes()){mesh.isPickable=false;mesh.checkCollisions=false;}
      group.instances.set(key,parent);
    }
  }
  scene.onDisposeObservable.add(()=>{for(const group of modelGroups.values())group.container?.dispose();modelGroups.clear();});
  function update(x:number,y:number){
    if(x===lastX&&y===lastY)return [];
    lastX=x;lastY=y;const groups=visibleProjectedTiles(map,x,y),pending:Promise<void>[]=[];
    for(const [key,item] of meshes)if(!groups.has(key)){item.mesh.dispose();item.material.dispose();item.texture.dispose();meshes.delete(key);}
    for(const [key,group] of modelGroups)if(!groups.has(key)){for(const parent of group.instances.values())parent.dispose();group.container?.dispose();modelGroups.delete(key);}
    for(const [key,group] of groups){
      const binding=map.models?.find(b=>b.layerId===map.layers[group.layer]!.id&&b.tileValue===group.image.tileValue);
      if(binding){
        let active=modelGroups.get(key);
        if(!active){
          const next:ModelGroup={binding,cells:group.cells,instances:new Map(),ready:Promise.resolve()};modelGroups.set(key,next);
          next.ready=LoadAssetContainerAsync(decodeLocalModel(binding.model),scene,{pluginExtension:'.glb'}).then(container=>{
            if(scene.isDisposed||modelGroups.get(key)!==next){container.dispose();return;}
            next.container=container;syncModels(next);
          });active=next;
        }else{active.cells=group.cells;syncModels(active);}
        pending.push(active.ready);continue;
      }
      let item=meshes.get(key);
      if(!item){
        const image=group.image,mesh=new Mesh('projected-'+key,scene),data=new VertexData();const positions:number[]=[];
        for(const [px,py] of [[0,0],[image.width,0],[image.width,image.height],[0,image.height]]){
          const point=projectedImageOffset(image,px!,py!,map.layers[group.layer]!.projection,group.layer);
          positions.push(point.x,point.y,point.z);
        }
        data.positions=positions;data.normals=[0,1,0,0,1,0,0,1,0,0,1,0];data.uvs=[0,1,1,1,1,0,0,0];data.indices=[0,2,1,0,3,2];data.applyToMesh(mesh);
        const material=new StandardMaterial('material-'+image.assetId,scene);material.disableLighting=true;material.diffuseColor=Color3.White();material.emissiveColor=Color3.White();material.specularColor=Color3.Black();material.backFaceCulling=false;
        let texture!:Texture;
        pending.push(new Promise<void>((resolve,reject)=>{texture=new Texture(image.dataUri,scene,true,true,Texture.NEAREST_SAMPLINGMODE,()=>resolve(),()=>reject(new Error('PROJECTED_TEXTURE')));}));
        texture.hasAlpha=true;material.diffuseTexture=texture;material.useAlphaFromDiffuseTexture=true;material.transparencyMode=1;
        mesh.material=material;mesh.isPickable=false;mesh.checkCollisions=false;mesh.alwaysSelectAsActiveMesh=true;
        item={mesh,material,texture};meshes.set(key,item);
      }
      const matrices=new Float32Array(group.cells.length*16);
      group.cells.forEach((cell,i)=>{const point=projectedWorldPoint(cell.x,cell.y);Matrix.Translation(point.x,(cell.x+cell.y)*.00001,point.z).copyToArray(matrices,i*16);});
      item.mesh.thinInstanceSetBuffer('matrix',matrices,16,true);
    }
    return pending;
  }
  const ready=Promise.all(update(x,y)).then(()=>{});
  return {ready,update(x:number,y:number){for(const promise of update(x,y))void promise.catch(()=>{});}};
}
