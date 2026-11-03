import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolveContent, canonical } from '../../packages/game-core/src/content.ts';
import { createGame, dispatch, serializeSave, restoreSave, gridToWorld } from '../../packages/game-core/src/runtime.ts';
import { prepareOriginalSlice } from '../extractor/prepare-mvp.mjs';
import { checkSliceNpcs } from './check-slice-npcs.mjs';

const read=async name=>JSON.parse(await readFile(new URL(`../../tests/fixtures/${name}`,import.meta.url),'utf8'));
const base=await read('mock-wuxia-package.json'),mod=await read('mock-greeting-mod.json');
const content=await resolveContent([mod,base]);
assert.deepEqual(content.identities,(await resolveContent([base,mod])).identities);
let state=createGame(content,42);
assert.equal(dispatch(content,state,{type:'MOVE',direction:'north'}).notifications[0].type,'MOVE_BLOCKED');
state=dispatch(content,state,{type:'INTERACT',npcId:'mock.wuxia:npc/guide'}).state;
state=restoreSave(content,serializeSave(content,state));
state=dispatch(content,state,{type:'CONTINUE'}).state;
state=restoreSave(content,serializeSave(content,state));
state=dispatch(content,state,{type:'CHOOSE',option:0}).state;
assert.equal(state.inventory['mock.wuxia:item/coin'],1);
state=dispatch(content,state,{type:'CONTINUE'}).state;
state=dispatch(content,state,{type:'MOVE',direction:'south'}).state;
assert.equal(state.mapId,'mock.wuxia:map/yard');
assert.equal(gridToWorld(1,2).z,2);
const report={schemaVersion:1,scope:'First 3D scene MVP preparation; not full Phase 6 completion',
  mock:{movement:true,collision:true,npcDialogue:true,choice:true,flagsAndInventory:true,
    sceneTransition:true,saveDuringDialogue:true,saveDuringChoice:true,modOrderAndPatch:true,coordinateAdapter:true},
  original:null,ready:false};
const originalIndex=process.argv.indexOf('--original');
if(originalIndex>=0){
  const root=process.argv[originalIndex+1];if(!root)throw new Error('Missing original directory');
  const bundle=await prepareOriginalSlice(root);
  assert.equal(canonical(bundle),canonical(await prepareOriginalSlice(root)));
  const original=await resolveContent([bundle.package]);
  const npcChecks=checkSliceNpcs(original);
  let originalState=createGame(original);
  const npc=original.maps[originalState.mapId].npcs[0];
  originalState=dispatch(original,originalState,{type:'INTERACT',npcId:npc.id}).state;
  assert.equal(originalState.cursor.waiting,'dialogue');
  originalState=restoreSave(original,serializeSave(original,originalState));
  for(let budget=0;originalState.cursor;budget++){
    if(budget>=100)throw new Error('Original dialogue exceeded continuation budget');
    originalState=dispatch(original,originalState,{type:'CONTINUE'}).state;
  }
  report.original={sceneId:bundle.provenance.sceneId,eventId:bundle.provenance.eventId,
    inputCount:bundle.provenance.sources.length,dialogueCount:bundle.package.dialogues.length,
    confidence:bundle.provenance.confidence,readOnlySlice:true,saveContinuation:true,
    npcs:npcChecks.map(({path,...check})=>({...check,walkingSteps:path.length}))};
}
report.ready=report.original!==null;
console.log(JSON.stringify(report,null,2));
if(!report.ready){console.error('Mock foundation passed; use --original <directory> to validate local original slice.');process.exitCode=1;}
