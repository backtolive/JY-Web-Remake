import {NullEngine} from '@babylonjs/core/Engines/nullEngine.js';
import {Scene} from '@babylonjs/core/scene.js';
import {LoadAssetContainerAsync} from '@babylonjs/core/Loading/sceneLoader.js';
import '@babylonjs/loaders/glTF/2.0/glTFLoader.js';
import '@babylonjs/loaders/glTF/glTFFileLoader.js';
import {decodeLocalModel} from '../../../packages/game-data/src/local-model.ts';
import type {LocalModel} from '../../../packages/game-data/src/local-model.ts';
import type {ModelBounds} from '../../../packages/game-data/src/model-replacement.ts';
import {Vector3} from '@babylonjs/core/Maths/math.vector.js';

/** Parse into a disposable engine before replacing anything in the active preview. */
export async function inspectLocalModel(model:LocalModel,geometryOnly=false,measureHorizontalAxis=false):Promise<{bounds:ModelBounds;vertices:number;triangles:number;horizontalPrincipalYaw?:number}>{
  const bytes=decodeLocalModel(model),engine=new NullEngine(),scene=new Scene(engine);
  try{
    const container=await LoadAssetContainerAsync(bytes,scene,{pluginExtension:'.glb',pluginOptions:{gltf:{skipMaterials:geometryOnly}}});
    try{
      if(container.animationGroups.length||container.skeletons.length)throw new Error('MODEL_REPLACEMENT_STATIC_ONLY');
      const meshes=container.meshes.filter(mesh=>mesh.getTotalVertices()>0);
      if(!meshes.length)throw new Error('MODEL_REPLACEMENT_EMPTY');
      const min={x:Infinity,y:Infinity,z:Infinity},max={x:-Infinity,y:-Infinity,z:-Infinity};let vertices=0,triangles=0;
      let count=0,sx=0,sz=0,sxx=0,sxz=0,szz=0;
      for(const mesh of meshes){
        mesh.computeWorldMatrix(true);const box=mesh.getBoundingInfo().boundingBox;
        for(const key of ['x','y','z'] as const){min[key]=Math.min(min[key],box.minimumWorld[key]);max[key]=Math.max(max[key],box.maximumWorld[key]);}
        vertices+=mesh.getTotalVertices();triangles+=(mesh.getTotalIndices()||mesh.getTotalVertices())/3;
        if(measureHorizontalAxis){
          const points=mesh.getVerticesData('position')??[];
          for(let i=0;i<points.length;i+=3){const p=Vector3.TransformCoordinates(new Vector3(points[i]!,points[i+1]!,points[i+2]!),mesh.getWorldMatrix());count++;sx+=p.x;sz+=p.z;sxx+=p.x*p.x;sxz+=p.x*p.z;szz+=p.z*p.z;}
        }
      }
      if(vertices>100_000||triangles>100_000)throw new Error('MODEL_REPLACEMENT_BUDGET');
      return {bounds:{min,max},vertices,triangles,...(measureHorizontalAxis?{horizontalPrincipalYaw:.5*Math.atan2(2*(sxz-sx*sz/count),(sxx-sx*sx/count)-(szz-sz*sz/count))}:{})};
    }finally{container.dispose();}
  }finally{scene.dispose();engine.dispose();}
}
