import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { resolveContent, createGame, dispatch } from '../../packages/game-core/src/index.ts';
import { VIEW_CAMERA, SCREEN_BUTTONS, screenToGridDirection, createMovementController } from '../../apps/web/src/view-controls.ts';

const vectors={north:[0,-1],south:[0,1],west:[-1,0],east:[1,0],
  northeast:[1,-1],northwest:[-1,-1],southeast:[1,1],southwest:[-1,1]};

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

test('Camera-relative keyboard: tap, chord, held repeat, aliases, focus loss and busy events',()=>{
  const clock=fakeClock(),moves=[];let allowed=true;
  const controller=createMovementController(direction=>moves.push(direction),()=>allowed,clock);
  controller.keyDown('W');controller.keyUp('W');assert.deepEqual(moves,['southwest']);
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
