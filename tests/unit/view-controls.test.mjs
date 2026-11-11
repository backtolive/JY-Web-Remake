import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { resolveContent, createGame, dispatch } from '../../packages/game-core/src/index.ts';
import { VIEW_CAMERA, SCREEN_BUTTONS, screenToGridDirection, createMovementController, cameraGroundProjection,projectedWorldPoint,projectedImageOffset } from '../../apps/web/src/view-controls.ts';

const vectors={north:[0,-1],south:[0,1],west:[-1,0],east:[1,0],
  northeast:[1,-1],northwest:[-1,-1],southeast:[1,1],southwest:[-1,1]};

test('Original world axes: X+ right/down, Y+ left/down; ground pixels, upright pixels, minimap and input share one basis',()=>{
  const view={...VIEW_CAMERA,gridYSign:-1},p=cameraGroundProjection(view),{alpha,beta}=view;
  const screen=({x,y,z})=>({x:-Math.sin(alpha)*x+Math.cos(alpha)*z,y:Math.cos(alpha)*Math.cos(beta)*x-Math.sin(beta)*y+Math.sin(alpha)*Math.cos(beta)*z});
  const x=screen(projectedWorldPoint(1,0)),y=screen(projectedWorldPoint(0,1));
  assert.ok(x.x>0&&x.y>0);assert.ok(y.x<0&&y.y>0);
  assert.deepEqual(x,{x:p.a,y:p.b});assert.deepEqual(y,{x:p.c,y:p.d});
  for(const image of [{xOffset:18,yOffset:17},{xOffset:108,yOffset:151}])for(const [px,py] of [[0,0],[18,9],[35,17],[108,151]]){
    const a=screen(projectedImageOffset(image,px,py,'ground')),b=screen(projectedImageOffset(image,px,py,'billboard'));
    assert.ok(Math.abs(a.x-b.x)<1e-9&&Math.abs(a.y-b.y)<1e-9);
    const expectedX=(px-image.xOffset)*Math.SQRT2/36,expectedY=(py-image.yOffset+8)*Math.SQRT2*Math.cos(beta)/18;
    assert.ok(Math.abs(a.x-expectedX)<1e-9&&Math.abs(a.y-expectedY)<1e-9);
  }
  for(const button of SCREEN_BUTTONS){const [dx,dy]=vectors[screenToGridDirection(button.x,button.y,alpha,-1)];const q=screen(projectedWorldPoint(dx,dy));const sign=v=>Math.abs(v)<1e-9?0:Math.sign(v);assert.deepEqual([sign(q.x),sign(q.y)],[button.x,button.y]);}
});

test('Camera-relative input: all eight buttons project into their visible screen direction',()=>{
  const expected=['west','southwest','south','northwest','southeast','north','northeast','east'];
  SCREEN_BUTTONS.forEach((button,i)=>{
    const direction=screenToGridDirection(button.x,button.y);assert.equal(direction,expected[i]);
    const [dx,dy]=vectors[direction];
    // Ground projection in the shared camera orientation: positive screen Y is down.
    const sx=-Math.sin(VIEW_CAMERA.alpha)*dx+Math.cos(VIEW_CAMERA.alpha)*dy;
    const sy=(Math.cos(VIEW_CAMERA.alpha)*dx+Math.sin(VIEW_CAMERA.alpha)*dy)*Math.cos(VIEW_CAMERA.beta);
    const sign=v=>Math.abs(v)<1e-8?0:Math.sign(v);
    assert.deepEqual([sign(sx),sign(sy)],[button.x,button.y]);
  });
  assert.equal(screenToGridDirection(0,0),null);
});

test('Actual Babylon camera projection: keys align on-screen at the centre and away from centre',async()=>{
  const requireFromWeb=createRequire(new URL('../../apps/web/package.json',import.meta.url));
  const load=module=>import(pathToFileURL(requireFromWeb.resolve('@babylonjs/core/'+module)).href);
  const [{NullEngine},{Scene},{ArcRotateCamera},{Camera},{Vector3,Matrix},{Viewport}]=await Promise.all([
    load('Engines/nullEngine.js'),load('scene.js'),load('Cameras/arcRotateCamera.js'),load('Cameras/camera.js'),
    load('Maths/math.vector.js'),load('Maths/math.viewport.js')]);
  const engine=new NullEngine({renderWidth:800,renderHeight:600,textureSize:512,deterministicLockstep:true,lockstepMaxSteps:4});
  try{
    const scene=new Scene(engine),camera=new ArcRotateCamera('test-camera',VIEW_CAMERA.alpha,VIEW_CAMERA.beta,9,Vector3.Zero(),scene);
    camera.mode=Camera.ORTHOGRAPHIC_CAMERA;camera.orthoLeft=-5;camera.orthoRight=5;camera.orthoTop=4;camera.orthoBottom=-4;
    const transform=camera.getViewMatrix().multiply(camera.getProjectionMatrix());
    const project=point=>Vector3.Project(point,Matrix.Identity(),transform,new Viewport(0,0,800,600));
    for(const origin of [new Vector3(0,0,0),new Vector3(3,0,-2)])for(const button of SCREEN_BUTTONS){
      const [dx,dy]=vectors[screenToGridDirection(button.x,button.y)];
      const before=project(origin),after=project(origin.add(new Vector3(dx,0,dy)));
      const sign=v=>Math.abs(v)<1e-5?0:Math.sign(v);
      assert.deepEqual([sign(after.x-before.x),sign(after.y-before.y)],[button.x,button.y]);
    }
  }finally{engine.dispose();}
});

function fakeClock(){
  let time=0,nextId=0;const tasks=new Map();
  return {schedule(callback,delay){const id=++nextId;tasks.set(id,{callback,at:time+delay});return id;},
    cancel(id){tasks.delete(id);},advance(ms){const until=time+ms;
      while(true){const next=[...tasks].filter(([,task])=>task.at<=until).sort((a,b)=>a[1].at-b[1].at)[0];
        if(!next)break;time=next[1].at;tasks.delete(next[0]);next[1].callback();}time=until;}};
}

test('Live camera view: minimap projection matches actual Babylon pixels across yaw/pitch; held input follows current yaw',async()=>{
  const requireFromWeb=createRequire(new URL('../../apps/web/package.json',import.meta.url));
  const load=module=>import(pathToFileURL(requireFromWeb.resolve('@babylonjs/core/'+module)).href);
  const [{NullEngine},{Scene},{ArcRotateCamera},{Camera},{Vector3,Matrix},{Viewport}]=await Promise.all([
    load('Engines/nullEngine.js'),load('scene.js'),load('Cameras/arcRotateCamera.js'),load('Cameras/camera.js'),load('Maths/math.vector.js'),load('Maths/math.viewport.js')]);
  const engine=new NullEngine({renderWidth:800,renderHeight:600,textureSize:512,deterministicLockstep:true,lockstepMaxSteps:4});
  try{
    const scene=new Scene(engine),camera=new ArcRotateCamera('rotating-camera',0,1,9,Vector3.Zero(),scene);
    camera.mode=Camera.ORTHOGRAPHIC_CAMERA;camera.orthoLeft=-4;camera.orthoRight=4;camera.orthoTop=3;camera.orthoBottom=-3;
    for(const alpha of [-Math.PI/4,Math.PI/4,3*Math.PI/4,5*Math.PI/4,.23])for(const beta of [Math.PI/4,Math.PI/3.1]){
      camera.alpha=alpha;camera.beta=beta;const m=cameraGroundProjection({alpha,beta});
      const transform=camera.getViewMatrix(true).multiply(camera.getProjectionMatrix(true));
      const project=p=>Vector3.Project(p,Matrix.Identity(),transform,new Viewport(0,0,800,600));
      const origin=project(Vector3.Zero());
      for(const [x,z] of Object.values(vectors)){
        const point=project(new Vector3(x,0,z));
        assert.ok(Math.abs((point.x-origin.x)/100-(m.a*x+m.c*z))<1e-6);
        assert.ok(Math.abs((point.y-origin.y)/100-(m.b*x+m.d*z))<1e-6);
      }
    }
  }finally{engine.dispose();}
  let view={...VIEW_CAMERA};const clock=fakeClock(),moves=[];
  const input=createMovementController(d=>moves.push(d),()=>true,clock,()=>view);
  input.keyDown('ArrowRight');clock.advance(65);view={...view,alpha:view.alpha+Math.PI/2};clock.advance(140);
  assert.deepEqual(moves,['southeast','southwest']);input.clear();
  assert.throws(()=>cameraGroundProjection({alpha:NaN,beta:1}),/INVALID_CAMERA_VIEW/);
});

test('Camera-relative keyboard: tap, chord, held repeat, aliases, focus loss and busy events',()=>{
  const clock=fakeClock(),moves=[];let allowed=true;
  const controller=createMovementController(direction=>moves.push(direction),()=>allowed,clock);
  controller.keyDown('W');controller.keyUp('W');assert.deepEqual(moves,['southwest']);
  moves.length=0;controller.keyDown('w');controller.keyDown('d');controller.keyUp('d');controller.keyUp('w');
  assert.deepEqual(moves,['south']);clock.advance(1000);assert.equal(moves.length,1);
  moves.length=0;controller.keyDown('w');clock.advance(20);controller.keyDown('d');clock.advance(45);
  assert.deepEqual(moves,['south']); // no spurious first single-key step
  clock.advance(140);assert.deepEqual(moves,['south','south']);
  controller.keyUp('w');clock.advance(140);assert.equal(moves.at(-1),'southeast');
  controller.keyUp('d');clock.advance(1000);assert.equal(moves.length,3);
  moves.length=0;controller.keyDown('ArrowUp');controller.keyDown('w');clock.advance(65);
  assert.deepEqual(moves,['southwest']);controller.clear();clock.advance(1000);assert.equal(moves.length,1);
  controller.keyDown('s');allowed=false;clock.advance(65);controller.keyUp('s');assert.equal(moves.length,1);
  assert.equal(controller.keyDown('e'),false);
});

test('Mock eight-way movement: no corner cutting, all cells remain reachable and portals still trigger',async()=>{
  const base=JSON.parse(await readFile(new URL('../fixtures/mock-wuxia-package.json',import.meta.url),'utf8'));
  const content=await resolveContent([base]),initial=createGame(content);
  // Screen-right maps southeast, but adjacent NPC prevents diagonal corner cutting.
  assert.equal(dispatch(content,initial,{type:'MOVE',direction:screenToGridDirection(1,0)}).notifications[0].type,'MOVE_BLOCKED');
  assert.deepEqual(dispatch(content,initial,{type:'MOVE',direction:'northwest'}).state,initial);
  let state=dispatch(content,initial,{type:'MOVE',direction:screenToGridDirection(0,-1)}).state;
  assert.deepEqual([state.x,state.y],[0,2]);
  state=dispatch(content,state,{type:'MOVE',direction:screenToGridDirection(0,1)}).state;
  assert.deepEqual(state,initial);
  // A screen diagonal produces a single grid-axis step, reaching opposite-parity cells.
  state=dispatch(content,initial,{type:'MOVE',direction:screenToGridDirection(1,-1)}).state;
  assert.equal(state.mapId,'mock.wuxia:map/yard');
  state=dispatch(content,state,{type:'MOVE',direction:screenToGridDirection(1,-1)}).state;
  assert.equal(state.mapId,initial.mapId);
  const modified=structuredClone(base);modified.maps[0].blocked.push(5); // west-adjacent cell blocks southwest
  const blocked=await resolveContent([modified]);
  assert.equal(dispatch(blocked,createGame(blocked),{type:'MOVE',direction:'southwest'}).notifications[0].type,'MOVE_BLOCKED');
});
