/** Exact event-slot field transitions observed for events 353 and 567. */
import{createHash}from'node:crypto';import{parseIdxGrpIndex,readIdxGrpResource}from'../../packages/game-data/src/idx-grp.ts';
import{openOriginalEventSlotTable,createOriginalEventSlotOverlay,readOriginalEventSlot,updateOriginalEventSlot}from'../../packages/game-data/src/original-event-slots.ts';
const H={i:'bf02eccf1dab01fd0ae033cdf807f56b978a71a6c2ab9be05e366239b485104b',g:'135c5e097a7fe561ee931046e1bebf55de9b469678e3d111d8e9f2c6bb600e06',d:'3633122f6a43f0b5dd390c2fa2516766d735a064ca955c8766b73232230a4480'};
const C={353:{offset:57068,length:324,hash:'38ff8f9faf1a687d5e9bf7c5533098991c2bf58806d05ba051c568384c76a6bc',instructions:[[143,[26,-2,4,0,0,1]],[149,[26,-2,5,0,0,1]],[155,[26,-2,6,0,0,1]]],before:[[4,4,-1],[5,4,-1],[6,4,0]],after:[[4,4,0],[5,4,0],[6,4,1]]},567:{offset:87118,length:112,hash:'adf3621b2a03b6411633bce840047ad5286d1c9c99fa209fd215c6345fcec186',instructions:[[0,[27,8,6420,6448]]],before:[[8,5,0],[8,6,0],[8,7,0]],after:[[8,5,6448],[8,6,6448],[8,7,6448]]}};
const sha=b=>createHash('sha256').update(b).digest('hex'),fail=c=>{throw new Error(`ORIGINAL_SLOT_EFFECT_${c}`);};
export async function bindOriginalObservedEventSlotEffect(s,eventId){const d=C[eventId];if(!d)fail('CASE');
 if(sha(s['KDEF.IDX'])!==H.i||sha(s['KDEF.GRP'])!==H.g||sha(s['ALLDEF.GRP'])!==H.d)fail('SOURCE');
 const r=parseIdxGrpIndex(s['KDEF.IDX'],s['KDEF.GRP'].length)[eventId];if(!r||r.sourceOffset!==d.offset||r.byteLength!==d.length)fail('RANGE');
 const raw=readIdxGrpResource(s['KDEF.GRP'],r),v=new DataView(raw.buffer,raw.byteOffset,raw.byteLength);if(sha(raw)!==d.hash)fail('HASH');
 for(const[word,expected]of d.instructions){const actual=expected.map((_,i)=>v.getInt16((word+i)*2,true));if(JSON.stringify(actual)!==JSON.stringify(expected))fail('INSTRUCTION');}
 const table=await openOriginalEventSlotTable(s['ALLDEF.GRP']),base=createOriginalEventSlotOverlay(table);
 if(d.before.some(([slot,field,value])=>readOriginalEventSlot(table,base,32,slot)[field]!==value))fail('PRECONDITION');
 return Object.freeze({adapterVersion:1,eventId,eventSha256:d.hash,table,before:d.before.map(x=>Object.freeze([...x])),after:d.after.map(x=>Object.freeze([...x]))});}
export function createOriginalObservedEventSlotEffectState(c){if(!C[c?.eventId]||c.eventSha256!==C[c.eventId].hash)fail('CONTEXT');return createOriginalEventSlotOverlay(c.table);}
export function applyOriginalObservedEventSlotEffect(c,p){if(Object.keys(p?.records??{}).length||c.before.some(([slot,field,value])=>readOriginalEventSlot(c.table,p,32,slot)[field]!==value))fail('PRECONDITION');
 let next=p;for(const[slot,field,value]of c.after)next=updateOriginalEventSlot(c.table,next,32,slot,[[field,value]]);return next;}
