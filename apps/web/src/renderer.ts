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
import { VIEW_CAMERA } from './view-controls';

export interface SceneRenderer { update(state: GameState): void; dispose(): void }

export function createRenderer(canvas: HTMLCanvasElement, map: GameMap, initial: GameState,
  interact: (npcId: string) => void): SceneRenderer {
  const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
  try {
    engine.setHardwareScalingLevel(Math.max(1, window.devicePixelRatio / 1.5));
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.87, 0.86, 0.8, 1);
    scene.ambientColor = new Color3(0.6,0.6,0.6);
    const small = Math.max(map.width, map.height) < 12;
    const camera = new ArcRotateCamera('fixed-isometric', VIEW_CAMERA.alpha, VIEW_CAMERA.beta,
      small ? 9 : 14, new Vector3((map.width-1)/2,0,(map.height-1)/2),scene);
    camera.minZ = 0.1; camera.maxZ = 1000;
    // Parallel projection keeps screen-direction steps aligned even away from the map centre.
    camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
    function fitCamera() {
      const halfHeight = small ? 4 : 7;
      const halfWidth = halfHeight * engine.getAspectRatio(camera);
      camera.orthoLeft = -halfWidth; camera.orthoRight = halfWidth;
      camera.orthoTop = halfHeight; camera.orthoBottom = -halfHeight;
    }
    const light = new HemisphericLight('sky',new Vector3(0,1,0),scene);light.intensity=1.1;
    const sun = new DirectionalLight('sun',new Vector3(-1,-2,1),scene);sun.intensity=0.45;
    function material(name:string,color:string){const m=new StandardMaterial(name,scene);m.diffuseColor=Color3.FromHexString(color);m.specularColor=Color3.Black();return m;}
    const floorMaterial=material('sandstone','#c8c4ad'),wallMaterial=material('walls','#929c84');
    const jade=material('player-jade','#245b50'),skin=material('skin','#e8c8a0'),ochre=material('npc-ochre','#b56c3b'),gold=material('portal-gold','#c79a4c');
    gold.emissiveColor=new Color3(0.25,0.17,0.04);
    const ground=MeshBuilder.CreateBox('ground',{width:map.width,depth:map.height,height:0.16},scene);
    ground.position.set((map.width-1)/2,-0.16,(map.height-1)/2);ground.material=floorMaterial;ground.isPickable=false;
    const lines:Vector3[][]=[];
    for(let x=0;x<=map.width;x++)lines.push([new Vector3(x-0.5,-0.065,-0.5),new Vector3(x-0.5,-0.065,map.height-0.5)]);
    for(let y=0;y<=map.height;y++)lines.push([new Vector3(-0.5,-0.065,y-0.5),new Vector3(map.width-0.5,-0.065,y-0.5)]);
    const grid=MeshBuilder.CreateLineSystem('grid',{lines},scene);grid.color=Color3.FromHexString('#a9ad95');grid.isPickable=false;
    if(map.blocked.length){
      const walls=MeshBuilder.CreateBox('blocked-cells',{width:0.94,depth:0.94,height:0.65},scene);walls.material=wallMaterial;walls.isPickable=false;
      const matrices=new Float32Array(map.blocked.length*16);
      map.blocked.forEach((cell,i)=>Matrix.Translation(cell%map.width,0.25,Math.floor(cell/map.width)).copyToArray(matrices,i*16));
      walls.thinInstanceSetBuffer('matrix',matrices,16,true);
    }
    function actor(name:string,color:StandardMaterial,x:number,y:number){
      const parent=new TransformNode(name,scene);parent.position.set(x,0,y);
      const body=MeshBuilder.CreateCylinder(name+'-robe',{height:0.8,diameterTop:0.29,diameterBottom:0.49,tessellation:8},scene);
      body.parent=parent;body.position.y=0.38;body.material=color;
      const head=MeshBuilder.CreateSphere(name+'-head',{diameter:0.29,segments:8},scene);head.parent=parent;head.position.y=0.94;head.material=skin;
      const hat=MeshBuilder.CreateCylinder(name+'-hair',{height:0.12,diameter:0.31,tessellation:8},scene);hat.parent=parent;hat.position.y=1.07;hat.material=jade;
      return {parent,parts:[body,head,hat]};
    }
    const player=actor('player',jade,initial.x,initial.y);
    player.parts.forEach(part=>{part.isPickable=false;});
    const halo=MeshBuilder.CreateTorus('player-ring',{diameter:0.75,thickness:0.035,tessellation:32},scene);halo.parent=player.parent;halo.position.y=-0.03;halo.material=gold;halo.isPickable=false;
    map.npcs.forEach(npc=>{const a=actor(npc.id,ochre,npc.x,npc.y);a.parts.forEach(part=>{part.metadata={npcId:npc.id};});});
    map.portals.forEach((portal,i)=>{
      const ring=MeshBuilder.CreateTorus('portal-'+i,{diameter:0.75,thickness:0.09,tessellation:32},scene);
      ring.position.set(portal.x,0.01,portal.y);ring.material=gold;ring.isPickable=false;
      const gem=MeshBuilder.CreateBox('portal-gem-'+i,{size:0.18},scene);gem.position.set(portal.x,0.35,portal.y);gem.rotation.z=Math.PI/4;gem.rotation.x=Math.PI/4;gem.material=gold;gem.isPickable=false;
    });
    scene.onPointerDown=(_event,pick)=>{const id=pick.pickedMesh?.metadata?.npcId;if(typeof id==='string')interact(id);};
    let target=new Vector3(initial.x,0,initial.y);
    engine.runRenderLoop(()=>{
      if(document.hidden)return;
      const delta=Math.min(1,engine.getDeltaTime()/90);
      player.parent.position=Vector3.Lerp(player.parent.position,target,delta);
      if(!small)camera.target=Vector3.Lerp(camera.target,target,delta);
      scene.render();
    });
    const resize=new ResizeObserver(()=>{engine.resize();fitCamera();});resize.observe(canvas);
    engine.resize();fitCamera();
    return {update(state){const world=gridToWorld(state.x,state.y);target.set(world.x,world.y,world.z);},
      dispose(){resize.disconnect();engine.stopRenderLoop();scene.dispose();engine.dispose();}};
  } catch(error){engine.dispose();throw error;}
}
