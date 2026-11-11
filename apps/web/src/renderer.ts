import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { Camera } from '@babylonjs/core/Cameras/camera';
import { Vector3, Matrix } from '@babylonjs/core/Maths/math.vector';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import '@babylonjs/core/Meshes/thinInstanceMesh';
import { gridToWorld } from '@jy/game-core';
import type { GameMap, GameState } from '@jy/game-core';
import { VIEW_CAMERA,PROJECTED_GRID_Y_SIGN } from './view-controls';
import type { CameraView } from './view-controls';
import { placePrimitive } from '../../../packages/game-data/src/visual-primitive';
import type { PrimitiveGeometry } from '../../../packages/game-data/src/visual-primitive';
import { decodeLocalModel } from '../../../packages/game-data/src/local-model';
import type { LocalModel } from '../../../packages/game-data/src/local-model';
import { ImportMeshAsync } from '@babylonjs/core/Loading/sceneLoader';
import '@babylonjs/loaders/glTF/2.0/glTFLoader';
import '@babylonjs/loaders/glTF/glTFFileLoader';
import type {ProjectedMap} from '../../../packages/game-data/src/projected-map';
import {createProjectedMapRenderer} from './projected-map-renderer';

export interface SceneRenderer { ready:Promise<void>; setCutaway(value:boolean):void; update(state: GameState): void; dispose(): void }

export interface RegionVisualAsset { asset: { color: string; height: number; label?: string; cutaway?:boolean; geometry?: PrimitiveGeometry; model?:LocalModel }; world: { x: number; y: number; z: number } }
export interface RegionVisualCell { assets: RegionVisualAsset[] }
export function createRenderer(canvas: HTMLCanvasElement, map: GameMap, initial: GameState,
  interact: (npcId: string) => void, regionCells: RegionVisualCell[] = [], onViewChange:(view:CameraView)=>void=()=>{},projectedMap?:ProjectedMap): SceneRenderer {
  const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
  try {
    engine.setHardwareScalingLevel(Math.max(1, window.devicePixelRatio / 1.5));
    const scene = new Scene(engine);
    const modelLoads:Promise<unknown>[]=[];
    const cutawayMeshes:{isVisible:boolean}[]=[];let cutaway=false;
    function registerCutaway(mesh:{isVisible:boolean},hide?:boolean){if(hide){cutawayMeshes.push(mesh);mesh.isVisible=!cutaway;}}
    scene.clearColor = new Color4(0.87, 0.86, 0.8, 1);
    scene.ambientColor = new Color3(0.6,0.6,0.6);
    const gridYSign:1|-1=projectedMap?PROJECTED_GRID_Y_SIGN:1;
    const small = Math.max(map.width, map.height) < 12;
    const camera = new ArcRotateCamera('fixed-isometric', VIEW_CAMERA.alpha, VIEW_CAMERA.beta,
      small ? 9 : 14, new Vector3((map.width-1)/2,0,(map.height-1)/2),scene);
    if(projectedMap)camera.target.set(initial.x,0,initial.y*gridYSign);
    let publishedView:CameraView={alpha:camera.alpha,beta:camera.beta,gridYSign};onViewChange(publishedView);
    camera.minZ = 0.1; camera.maxZ = 1000;
    // Parallel projection keeps screen-direction steps aligned even away from the map centre.
    camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
    function fitCamera() {
      const aspect=engine.getAspectRatio(camera);
      let halfHeight=small?4:7,cx=0,cy=0;
      if(regionCells.length){
        const points:Vector3[]=[];const view=camera.getViewMatrix(true);
        for(const mesh of scene.meshes){
          if(!mesh.isVisible||mesh.getTotalVertices()===0)continue;
          mesh.computeWorldMatrix(true);
          for(const corner of mesh.getBoundingInfo().boundingBox.vectorsWorld)points.push(Vector3.TransformCoordinates(corner,view));
        }
        if(points.length){
          const minX=Math.min(...points.map(p=>p.x)),maxX=Math.max(...points.map(p=>p.x));
          const minY=Math.min(...points.map(p=>p.y)),maxY=Math.max(...points.map(p=>p.y));
          cx=(minX+maxX)/2;cy=(minY+maxY)/2;halfHeight=Math.max((maxY-minY)/2,(maxX-minX)/(2*aspect))+0.4;
        }
      }
      const halfWidth=halfHeight*aspect;
      camera.orthoLeft=cx-halfWidth;camera.orthoRight=cx+halfWidth;
      camera.orthoTop=cy+halfHeight;camera.orthoBottom=cy-halfHeight;
    }
    const light = new HemisphericLight('sky',new Vector3(0,1,0),scene);light.intensity=1.1;
    const sun = new DirectionalLight('sun',new Vector3(-1,-2,1),scene);sun.intensity=0.45;
    function material(name:string,color:string){const m=new StandardMaterial(name,scene);m.diffuseColor=Color3.FromHexString(color);m.specularColor=Color3.Black();return m;}
    const floorMaterial=material('sandstone','#c8c4ad'),wallMaterial=material('walls','#929c84');
    const jade=material('player-jade','#245b50'),skin=material('skin','#e8c8a0'),ochre=material('npc-ochre','#b56c3b'),gold=material('portal-gold','#c79a4c');
    gold.emissiveColor=new Color3(0.25,0.17,0.04);
    const ground=MeshBuilder.CreateBox('ground',{width:map.width,depth:map.height,height:0.16},scene);
    if(projectedMap)ground.isVisible=false;
    ground.position.set((map.width-1)/2,-0.16,(map.height-1)/2);ground.material=floorMaterial;ground.isPickable=false;
    const lines:Vector3[][]=[];
    for(let x=0;x<=map.width;x++)lines.push([new Vector3(x-0.5,-0.065,-0.5),new Vector3(x-0.5,-0.065,map.height-0.5)]);
    for(let y=0;y<=map.height;y++)lines.push([new Vector3(-0.5,-0.065,y-0.5),new Vector3(map.width-0.5,-0.065,y-0.5)]);
    const grid=MeshBuilder.CreateLineSystem('grid',{lines},scene);grid.color=Color3.FromHexString('#a9ad95');grid.isPickable=false;
    if(projectedMap)grid.isVisible=false;
    if(map.blocked.length && !regionCells.length&&!projectedMap){
      const walls=MeshBuilder.CreateBox('blocked-cells',{width:0.94,depth:0.94,height:0.65},scene);walls.material=wallMaterial;walls.isPickable=false;
      const matrices=new Float32Array(map.blocked.length*16);
      map.blocked.forEach((cell,i)=>Matrix.Translation(cell%map.width,0.25,Math.floor(cell/map.width)).copyToArray(matrices,i*16));
      walls.thinInstanceSetBuffer('matrix',matrices,16,true);
    }
    function actor(name:string,color:StandardMaterial,x:number,y:number){
      const parent=new TransformNode(name,scene);parent.position.set(x,0,y*gridYSign);
      const body=MeshBuilder.CreateCylinder(name+'-robe',{height:0.8,diameterTop:0.29,diameterBottom:0.49,tessellation:8},scene);
      body.parent=parent;body.position.y=0.38;body.material=color;
      const head=MeshBuilder.CreateSphere(name+'-head',{diameter:0.29,segments:8},scene);head.parent=parent;head.position.y=0.94;head.material=skin;
      const hat=MeshBuilder.CreateCylinder(name+'-hair',{height:0.12,diameter:0.31,tessellation:8},scene);hat.parent=parent;hat.position.y=1.07;hat.material=jade;
      return {parent,parts:[body,head,hat]};
    }
    const player=actor('player',jade,initial.x,initial.y);
    player.parts.forEach(part=>{part.isPickable=false;if(projectedMap)part.renderingGroupId=1;});
    const halo=MeshBuilder.CreateTorus('player-ring',{diameter:0.75,thickness:0.035,tessellation:32},scene);halo.parent=player.parent;halo.position.y=-0.03;halo.material=gold;halo.isPickable=false;
    if(projectedMap)halo.renderingGroupId=1;
    map.npcs.forEach(npc=>{const a=actor(npc.id,ochre,npc.x,npc.y);a.parts.forEach(part=>{part.metadata={npcId:npc.id};});});
    map.portals.forEach((portal,i)=>{
      const ring=MeshBuilder.CreateTorus('portal-'+i,{diameter:0.75,thickness:0.09,tessellation:32},scene);
      ring.position.set(portal.x,0.01,portal.y*gridYSign);ring.material=gold;ring.isPickable=false;
      const gem=MeshBuilder.CreateBox('portal-gem-'+i,{size:0.18},scene);gem.position.set(portal.x,0.35,portal.y*gridYSign);gem.rotation.z=Math.PI/4;gem.rotation.x=Math.PI/4;gem.material=gold;gem.isPickable=false;
    });
    if(regionCells.length){
      const regionMaterials=new Map<string,StandardMaterial>();
      function regionMaterial(color:string){let material=regionMaterials.get(color);if(!material){material=new StandardMaterial('region-'+color,scene);material.diffuseColor=Color3.FromHexString(color);material.specularColor=Color3.Black();regionMaterials.set(color,material);}return material;}
      regionCells.forEach((cell,cellIndex)=>{
        cell.assets.forEach((asset,assetIndex)=>{
          if(asset.asset.model){
            const model=asset.asset.model,bytes=decodeLocalModel(model);
            const parent=new TransformNode(`model-${cellIndex}-${assetIndex}`,scene);
            parent.position.set(asset.world.x+model.offset.x,asset.world.y+model.offset.y,asset.world.z+model.offset.z);
            parent.scaling.set(model.scale.x,model.scale.y,model.scale.z);parent.rotation.y=model.rotationY;
            modelLoads.push(ImportMeshAsync(bytes,scene,{pluginExtension:'.glb'}).then(result=>{
              if(scene.isDisposed)return;
              for(const mesh of result.meshes){if(!mesh.parent)mesh.parent=parent;mesh.isPickable=false;mesh.checkCollisions=false;registerCutaway(mesh,asset.asset.cutaway);}
            }));
            return;
          }
          if(asset.asset.geometry){
            for(const [partIndex,part] of placePrimitive(asset.asset.geometry,asset.world).entries()){
              const box=MeshBuilder.CreateBox(`region-primitive-${cellIndex}-${assetIndex}-${partIndex}`,part.size,scene);
              box.position.set(part.position.x,part.position.y,part.position.z);box.rotation.y=part.rotationY;
              box.material=regionMaterial(part.material.color);box.isPickable=false;
              registerCutaway(box,asset.asset.cutaway);
            }
            return;
          }
          const height=Math.max(0.05,asset.asset.height||0.1);
          const box=MeshBuilder.CreateBox(`region-asset-${cellIndex}-${assetIndex}`,{width:0.88,depth:0.88,height},scene);
          box.position.set(asset.world.x,height/2+asset.world.y,asset.world.z);
          box.material=regionMaterial(asset.asset.color);
          box.isPickable=false;
          registerCutaway(box,asset.asset.cutaway);
        });
      });
    }
    scene.onPointerDown=(_event,pick)=>{const id=pick.pickedMesh?.metadata?.npcId;if(typeof id==='string')interact(id);};
    let target=new Vector3(initial.x,0,initial.y*gridYSign);
    const projected=projectedMap?createProjectedMapRenderer(scene,projectedMap,initial.x,initial.y):undefined;
    if(projected)modelLoads.push(projected.ready);
    engine.runRenderLoop(()=>{
      if(document.hidden)return;
      if(Math.abs(camera.alpha-publishedView.alpha)>1e-7||Math.abs(camera.beta-publishedView.beta)>1e-7){
        publishedView={alpha:camera.alpha,beta:camera.beta,gridYSign};onViewChange(publishedView);
      }
      const delta=Math.min(1,engine.getDeltaTime()/90);
      player.parent.position=Vector3.Lerp(player.parent.position,target,delta);
      if(!small)camera.setTarget(Vector3.Lerp(camera.target,target,delta),false,false,true);
      scene.render();
    });
    const resize=new ResizeObserver(()=>{engine.resize();fitCamera();});resize.observe(canvas);
    engine.resize();fitCamera();
    return {ready:Promise.all(modelLoads).then(()=>{fitCamera();}),setCutaway(value){cutaway=value;for(const mesh of cutawayMeshes)mesh.isVisible=!value;},update(state){const world=gridToWorld(state.x,state.y);target.set(world.x,world.y,world.z*gridYSign);projected?.update(state.x,state.y);},
      dispose(){resize.disconnect();engine.stopRenderLoop();scene.dispose();engine.dispose();}};
  } catch(error){engine.dispose();throw error;}
}
