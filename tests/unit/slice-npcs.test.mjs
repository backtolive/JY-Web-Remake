import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolveContent } from '../../packages/game-core/src/content.ts';
import { checkSliceNpcs } from '../../tools/validator/check-slice-npcs.mjs';

async function mock() {
  const pkg=JSON.parse(await readFile(new URL('../fixtures/mock-wuxia-package.json',import.meta.url),'utf8'));
  const map=pkg.maps.find(map=>map.id===pkg.entry.mapId);
  map.width=5;map.height=5;map.blocked=[];map.portals=[];
  const npc=map.npcs[0];npc.x=3;npc.y=1;
  map.npcs=[npc,{...npc,id:'mock.wuxia:npc/second',x:3,y:3}];
  pkg.events.find(event=>event.id===npc.eventId).steps=[{op:'say',dialogueId:pkg.dialogues[0].id},{op:'end'}];
  return {pkg,map};
}
test('Mock NPC gate: walk from entry to distinct NPCs sharing an event, collision and save continuation',async()=>{
  const {pkg}=await mock();const content=await resolveContent([pkg]);
  const checks=checkSliceNpcs(content);
  assert.equal(checks.length,2);assert.equal(checks[0].eventId,checks[1].eventId);
  assert.notEqual(checks[0].npcId,checks[1].npcId);
  assert.ok(checks.every(check=>check.path.length>0&&check.collision&&check.saveContinuation));
});
test('Mock NPC gate: nearby walkable cells do not prove reachability through a separating wall',async()=>{
  const {pkg,map}=await mock();map.blocked=[2,7,12,17,22];
  const content=await resolveContent([pkg]);
  assert.throws(()=>checkSliceNpcs(content),/NPC_UNREACHABLE/);
});
