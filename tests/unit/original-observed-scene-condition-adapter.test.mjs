import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from'node:fs';import{readFile}from'node:fs/promises';
import{readOriginalSceneRecordInt16}from'../../packages/game-data/src/original-scene-records.ts';
import{bindOriginalObservedSceneCondition,createOriginalObservedSceneConditionState,
  applyOriginalObservedSceneCondition}from'../../tools/extractor/original-observed-scene-condition-adapter.mjs';
const names=['KDEF.IDX','KDEF.GRP','RANGER.IDX','RANGER.GRP'],available=names.every(n=>existsSync(`original/dos/${n}`));
const sources=async()=>Object.fromEntries(await Promise.all(names.map(async n=>[n,new Uint8Array(await readFile(`original/dos/${n}`))])));
test('events 420 and 821 apply only their observed scene condition fields',{skip:!available&&'Original data is local.'},async()=>{
 const input=await sources();
 const c420=await bindOriginalObservedSceneCondition(input,420),s420=createOriginalObservedSceneConditionState(c420),n420=applyOriginalObservedSceneCondition(c420,s420);
 assert.equal(readOriginalSceneRecordInt16(c420.table,n420,75,18),0);
 const c821=await bindOriginalObservedSceneCondition(input,821),s821=createOriginalObservedSceneConditionState(c821),n821=applyOriginalObservedSceneCondition(c821,s821);
 assert.deepEqual([2,4,38,75].map(id=>readOriginalSceneRecordInt16(c821.table,n821,id,18)),[2,0,2,1]);
 assert.deepEqual(Object.keys(n821.records),['2','4','38']);
});
