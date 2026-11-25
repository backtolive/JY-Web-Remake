import test from 'node:test';
import assert from 'node:assert/strict';
import { openOriginalSceneRecordTable, createOriginalSceneRecordOverlay,
  readOriginalSceneRecordInt16, updateOriginalSceneRecordInt16 } from
  '../../packages/game-data/src/original-scene-records.ts';
function mock() { const index = new Uint8Array(24), group = new Uint8Array(114242);
  [836,59076,97076,101444,114092,114242].forEach((end,i) => new DataView(index.buffer).setUint32(i*4,end,true));
  new DataView(group.buffer).setInt16(97076 + 75*52 + 18, 1, true); return {index,group}; }
test('Mock scene record overlay changes one int16 without mutating source', async () => {
  const {index,group}=mock(), table=await openOriginalSceneRecordTable(index,group);
  const base=createOriginalSceneRecordOverlay(table), next=updateOriginalSceneRecordInt16(table,base,[[75,18,0]]);
  assert.equal(readOriginalSceneRecordInt16(table,base,75,18),1);
  assert.equal(readOriginalSceneRecordInt16(table,next,75,18),0);
  assert.deepEqual(Object.keys(next.records),['75']);
  assert.throws(()=>updateOriginalSceneRecordInt16(table,base,[[75,18,0],[75,18,1]]),/WRITES/);
});
