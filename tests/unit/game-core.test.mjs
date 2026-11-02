import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolveContent, canonical, contentHash, validatePackageSchema } from '../../packages/game-core/src/content.ts';
import { createGame, dispatch, serializeSave, restoreSave, nextRandom, evaluateCondition, gridToWorld } from '../../packages/game-core/src/runtime.ts';
import { contentSchema, saveSchema } from '../../packages/game-core/src/schema.ts';

const base = JSON.parse(await readFile(new URL('../fixtures/mock-wuxia-package.json', import.meta.url), 'utf8'));
const mod = JSON.parse(await readFile(new URL('../fixtures/mock-greeting-mod.json', import.meta.url), 'utf8'));
const copy = value => structuredClone(value);
const has = code => error => error.diagnostics?.some(issue => issue.code === code);
const interact = { type: 'INTERACT', npcId: 'mock.wuxia:npc/guide' };

test('Mock content: shared schemas, stable ordering/hash, explicit patch, inputs never mutated', async () => {
  assert.equal(validatePackageSchema(base), true);
  const frozenBefore = canonical([base,mod]);
  const a = await resolveContent([mod,base]);
  const b = await resolveContent([base,mod]);
  assert.deepEqual(a.identities,b.identities);
  assert.equal(a.dialogues['mock.wuxia:talk/welcome'].text,mod.patches[0].text);
  assert.deepEqual(a.identities.map(x=>x.id),['mock.wuxia','mock.greeting']);
  assert.equal(canonical([base,mod]),frozenBefore);
  assert.equal(await contentHash({b:2,a:1}),await contentHash({a:1,b:2}));
  assert.throws(()=>{a.maps['mock.wuxia:map/room'].blocked.push(10);},TypeError);
  assert.deepEqual(contentSchema,JSON.parse(await readFile('schemas/game-content.schema.json','utf8')));
  assert.deepEqual(saveSchema,JSON.parse(await readFile('schemas/save.schema.json','utf8')));
});

test('Mock content: rejects missing/wrong/cyclic dependencies and competing patches', async () => {
  const missing=copy(mod);missing.manifest.dependencies=[{id:'missing.mod',version:'0.1.0'}];
  await assert.rejects(resolveContent([base,missing]),has('MISSING_DEPENDENCY'));
  const wrong=copy(mod);wrong.manifest.dependencies[0].version='9.0.0';
  await assert.rejects(resolveContent([base,wrong]),has('DEPENDENCY_VERSION'));
  const a=copy(mod), b=copy(mod);a.manifest.id='mock.a';b.manifest.id='mock.b';a.patches=[];b.patches=[];
  a.manifest.dependencies.push({id:'mock.b',version:'0.1.0'});b.manifest.dependencies.push({id:'mock.a',version:'0.1.0'});
  await assert.rejects(resolveContent([base,a,b]),has('DEPENDENCY_CYCLE'));
  const conflict=copy(mod);conflict.manifest.id='mock.other';
  await assert.rejects(resolveContent([base,mod,conflict]),has('PATCH_CONFLICT'));
  const stale=copy(mod);stale.patches[0].expectedText='stale';
  await assert.rejects(resolveContent([base,stale]),has('PATCH_PRECONDITION'));
  const undeclared=copy(mod);undeclared.manifest.dependencies=[];
  await assert.rejects(resolveContent([base,undeclared]),has('BASE_DEPENDENCY'));
});

test('Mock content: refuses unknown opcodes, references, bad positions, jumps and silent overrides', async () => {
  for(const [mutate,code] of [
    [p=>{p.events[0].steps[0]={op:'eval',source:'anything'};},'SCHEMA'],
    [p=>{p.events[0].steps[0].dialogueId='mock.wuxia:missing';},'MISSING_REFERENCE'],
    [p=>{p.events[0].steps[2].onTrue=100;},'JUMP_TARGET'],
    [p=>{p.maps[0].portals[0].toX=100;},'PORTAL_POSITION'],
    [p=>{p.entry.y=0;},'ENTRY_POSITION'],
    [p=>{p.dialogues.push(copy(p.dialogues[0]));},'DUPLICATE_ID'],
    [p=>{p.maps[0].blocked.push(100);},'BLOCKED_CELL'],
    [p=>{p.events[0].id='other.namespace:event/x';},'NAMESPACE'],
  ]) {const p=copy(base);mutate(p);await assert.rejects(resolveContent([p]),has(code));}
});

test('Mock headless vertical slice: collision, NPC, choice, flags/items, save continuation and portals', async () => {
  const content=await resolveContent([base]);
  const initial=createGame(content,42);
  assert.deepEqual(dispatch(content,initial,{type:'MOVE',direction:'north'}).state,initial);
  assert.deepEqual(dispatch(content,initial,{type:'MOVE',direction:'east'}).state,initial);
  let state=dispatch(content,initial,interact).state;
  assert.equal(state.cursor.waiting,'dialogue');
  assert.equal(initial.cursor,null);
  assert.throws(()=>dispatch(content,state,{type:'MOVE',direction:'south'}),has('EVENT_BUSY'));
  const saved=serializeSave(content,state);
  state=restoreSave(content,saved);
  state=dispatch(content,state,{type:'CONTINUE'}).state;
  assert.equal(state.cursor.waiting,'choice');
  state=restoreSave(content,serializeSave(content,state));
  assert.throws(()=>dispatch(content,state,{type:'CHOOSE',option:99}),has('CHOICE_OPTION'));
  state=dispatch(content,state,{type:'CHOOSE',option:0}).state;
  assert.equal(state.inventory['mock.wuxia:item/coin'],1);
  assert.equal(state.flags['mock.wuxia:flag/rewarded'],true);
  state=dispatch(content,state,{type:'CONTINUE'}).state;
  assert.equal(state.cursor,null);
  // Repeat event: condition prevents duplicate reward.
  state=dispatch(content,state,interact).state;state=dispatch(content,state,{type:'CONTINUE'}).state;
  state=dispatch(content,state,{type:'CHOOSE',option:0}).state;
  assert.equal(state.inventory['mock.wuxia:item/coin'],1);assert.equal(state.cursor,null);
  state=dispatch(content,state,{type:'MOVE',direction:'south'}).state;
  assert.equal(state.mapId,'mock.wuxia:map/yard');
  state=dispatch(content,state,{type:'MOVE',direction:'south'}).state;
  assert.equal(state.mapId,initial.mapId);
  assert.equal(saved,serializeSave(content,restoreSave(content,saved)));
  assert.deepEqual(gridToWorld(2,3,1,2),{x:4,y:1,z:6});
});

test('Mock save: exact MOD hashes/settings/versions and cursor validated before restoring', async () => {
  const c=await resolveContent([base,mod],{difficulty:'practice'});
  const raw=serializeSave(c,dispatch(c,createGame(c),interact).state);
  const changed=copy(mod);changed.patches[0].text='changed without version bump';
  for(const other of [await resolveContent([base],{difficulty:'practice'}),await resolveContent([base,changed],{difficulty:'practice'}),await resolveContent([base,mod],{difficulty:'hard'})]) {
    assert.throws(()=>restoreSave(other,raw),has('SAVE_CONTENT_MISMATCH'));
  }
  const bad=JSON.parse(raw);bad.state.cursor.pc=999;
  assert.throws(()=>restoreSave(c,JSON.stringify(bad)),has('STATE_CURSOR'));
  bad.state.cursor.pc=0;bad.runtimeVersion='9.0.0';
  assert.throws(()=>restoreSave(c,JSON.stringify(bad)),has('SAVE_SCHEMA'));
  assert.throws(()=>restoreSave(c,'{broken'),has('SAVE_JSON'));
  assert.equal(restoreSave(c,raw).cursor.pc,0);
});

test('Mock runtime: step budget and inventory errors are atomic, conditions pure, seeded replay stable', async () => {
  const looping=copy(base);looping.events[0].steps=[{op:'setFlag',key:'mock.wuxia:flag/touched',value:true},
    {op:'if',condition:{op:'flag',key:'mock.wuxia:flag/touched',equals:true},onTrue:1,onFalse:1}];
  const c=await resolveContent([looping]);const state=createGame(c);const before=canonical(state);
  assert.throws(()=>dispatch(c,state,interact,8),has('SCRIPT_BUDGET'));
  assert.equal(canonical(state),before);
  const bad=copy(base);bad.events[0].steps=[{op:'giveItem',itemId:'mock.wuxia:item/coin',amount:-1},{op:'end'}];
  const other=await resolveContent([bad]);const fresh=createGame(other);
  assert.throws(()=>dispatch(other,fresh,interact),has('INVENTORY_RANGE'));assert.deepEqual(fresh.inventory,{});
  const condition={op:'all',conditions:[{op:'flag',key:'mock.wuxia:flag/a',equals:false},{op:'not',condition:{op:'itemAtLeast',itemId:'mock.wuxia:item/coin',count:1}}]};
  assert.equal(evaluateCondition(condition,fresh),true);assert.deepEqual(fresh.inventory,{});
  const sequence=seed=>Array.from({length:20},()=>{const next=nextRandom(seed);seed=next.seed;return next.value;});
  assert.deepEqual(sequence(42),sequence(42));assert.notDeepEqual(sequence(42),sequence(43));
  assert.throws(()=>dispatch(other,fresh,{type:'MOVE',direction:'anything'}),has('INVALID_COMMAND'));
});
