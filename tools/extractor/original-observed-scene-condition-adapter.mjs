/** Exact scene-record condition changes observed for events 420 and 821. */
import { createHash } from 'node:crypto';
import { parseIdxGrpIndex, readIdxGrpResource } from '../../packages/game-data/src/idx-grp.ts';
import { createOriginalSceneRecordOverlay, openOriginalSceneRecordTable,
  readOriginalSceneRecordInt16, updateOriginalSceneRecordInt16 } from
  '../../packages/game-data/src/original-scene-records.ts';
const pinned = { idx:'bf02eccf1dab01fd0ae033cdf807f56b978a71a6c2ab9be05e366239b485104b',
  grp:'135c5e097a7fe561ee931046e1bebf55de9b469678e3d111d8e9f2c6bb600e06',
  ridx:'52c1545c8c0aa4d7919916ae840fb15f2772c567811ab9b9056e55b2e17ff92c',
  rgrp:'07b99e3c1676e18691f00d6dfe713121faa6f7429e43666bc83e1568cecb68ab' };
const cases = {
  420:{offset:65418,length:54,hash:'512758e3c70358a6e9e817554e99e47ac443f1a7e7a26aa9f6ca336f72c5e485',word:24,instruction:[39,75],writes:[[75,18,0]],unchanged:[]},
  821:{offset:107360,length:378,hash:'ba4bf22d16ec1ff380e690b5e76b4cd5264d823d66dd23c0ce35ca40c698c746',word:145,instruction:[54],writes:[[2,18,2],[4,18,0],[38,18,2]],unchanged:[[75,18,1]]},
};
const sha=b=>createHash('sha256').update(b).digest('hex');
const fail=c=>{throw new Error(`ORIGINAL_SCENE_CONDITION_${c}`);};
export async function bindOriginalObservedSceneCondition(sources,eventId){
  const d=cases[eventId]; if(!d) fail('CASE');
  if(sha(sources['KDEF.IDX'])!==pinned.idx||sha(sources['KDEF.GRP'])!==pinned.grp||
    sha(sources['RANGER.IDX'])!==pinned.ridx||sha(sources['RANGER.GRP'])!==pinned.rgrp) fail('SOURCE');
  const range=parseIdxGrpIndex(sources['KDEF.IDX'],sources['KDEF.GRP'].length)[eventId];
  if(!range||range.sourceOffset!==d.offset||range.byteLength!==d.length) fail('RANGE');
  const raw=readIdxGrpResource(sources['KDEF.GRP'],range),view=new DataView(raw.buffer,raw.byteOffset,raw.byteLength);
  const actual=d.instruction.map((_,i)=>view.getInt16((d.word+i)*2,true));
  if(sha(raw)!==d.hash||JSON.stringify(actual)!==JSON.stringify(d.instruction)) fail('INSTRUCTION');
  const table=await openOriginalSceneRecordTable(sources['RANGER.IDX'],sources['RANGER.GRP']);
  const base=createOriginalSceneRecordOverlay(table);
  if([...d.writes,...d.unchanged].some(([scene,offset])=>readOriginalSceneRecordInt16(table,base,scene,offset)!==1)) fail('PRECONDITION');
  return Object.freeze({adapterVersion:1,eventId,eventSha256:d.hash,table,
    writes:Object.freeze(d.writes.map(x=>Object.freeze([...x]))),unchanged:Object.freeze(d.unchanged.map(x=>Object.freeze([...x])))});
}
export function createOriginalObservedSceneConditionState(context){
  if(!cases[context?.eventId]||context.eventSha256!==cases[context.eventId].hash) fail('CONTEXT');
  return createOriginalSceneRecordOverlay(context.table);
}
export function applyOriginalObservedSceneCondition(context,previous){
  if(Object.keys(previous?.records??{}).length||[...context.writes,...context.unchanged].some(([scene,offset])=>
    readOriginalSceneRecordInt16(context.table,previous,scene,offset)!==1)) fail('PRECONDITION');
  const next=updateOriginalSceneRecordInt16(context.table,previous,context.writes);
  if(context.unchanged.some(([scene,offset,value])=>readOriginalSceneRecordInt16(context.table,next,scene,offset)!==value)) fail('RESULT');
  return next;
}
