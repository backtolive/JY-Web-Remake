import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolveContent,createGame,dispatch,serializeSave } from '../../packages/game-core/src/index.ts';
import { saveKey,saveGame,loadGame } from '../../apps/web/src/storage.ts';

const base=JSON.parse(await readFile(new URL('../fixtures/mock-wuxia-package.json',import.meta.url),'utf8'));
function memory(){const values=new Map();return {values,getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};}

test('Mock browser storage: scoped save, previous slot backup, paused dialogue restoration',async()=>{
  const content=await resolveContent([base]);const storage=memory();const initial=createGame(content);
  assert.throws(()=>loadGame(storage,content),/還沒有本機存檔/);
  const first=saveGame(storage,content,initial);
  const paused=dispatch(content,initial,{type:'INTERACT',npcId:'mock.wuxia:npc/guide'}).state;
  saveGame(storage,content,paused);
  assert.equal(storage.values.get(saveKey(content)+':backup'),first);
  assert.deepEqual(loadGame(storage,content),paused);
  assert.deepEqual(loadGame(storage,content,true),initial);
});

test('Mock browser storage: backup/quota errors and invalid state preserve previous main slot',async()=>{
  const content=await resolveContent([base]);const key=saveKey(content),storage=memory();
  const initial=createGame(content);const old=saveGame(storage,content,initial);
  const before=structuredClone(initial);before.y=0;
  assert.throws(()=>saveGame(storage,content,before));assert.equal(storage.getItem(key),old);
  const failing={getItem:storage.getItem,setItem:()=>{throw new Error('quota');}};
  assert.throws(()=>saveGame(failing,content,initial),/quota/);assert.equal(storage.getItem(key),old);
  const failMain={getItem:storage.getItem,setItem:(target,value)=>{if(target===key)throw new Error('quota');storage.setItem(target,value);}};
  assert.throws(()=>saveGame(failMain,content,initial),/quota/);assert.equal(storage.getItem(key),old);
  assert.equal(storage.getItem(key+':backup'),old);
  storage.setItem(key,'broken');assert.throws(()=>loadGame(storage,content));
  assert.equal(storage.getItem(key),'broken');assert.equal(storage.getItem(key+':backup'),old);
  assert.equal(serializeSave(content,initial),old);
});
