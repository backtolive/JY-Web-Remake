import test from'node:test';import assert from'node:assert/strict';import{existsSync}from'node:fs';import{readFile}from'node:fs/promises';import{readOriginalEventSlot}from'../../packages/game-data/src/original-event-slots.ts';
import{bindOriginalObservedEventSlotEffect,createOriginalObservedEventSlotEffectState,applyOriginalObservedEventSlotEffect}from'../../tools/extractor/original-observed-event-slot-effects.mjs';
const names=['KDEF.IDX','KDEF.GRP','ALLDEF.GRP'],available=names.every(n=>existsSync(`original/dos/${n}`)),sources=async()=>Object.fromEntries(await Promise.all(names.map(async n=>[n,new Uint8Array(await readFile(`original/dos/${n}`))])));
test('events 353 and 567 apply only their exact observed event-slot fields',{skip:!available&&'Original data is local.'},async()=>{const s=await sources();
 const a=await bindOriginalObservedEventSlotEffect(s,353),an=applyOriginalObservedEventSlotEffect(a,createOriginalObservedEventSlotEffectState(a));assert.deepEqual([4,5,6].map(slot=>readOriginalEventSlot(a.table,an,32,slot)[4]),[0,0,1]);
 const b=await bindOriginalObservedEventSlotEffect(s,567),bn=applyOriginalObservedEventSlotEffect(b,createOriginalObservedEventSlotEffectState(b));assert.deepEqual(readOriginalEventSlot(b.table,bn,32,8).slice(5,8),[6448,6448,6448]);assert.deepEqual(Object.keys(bn.records),['32/8']);
});
