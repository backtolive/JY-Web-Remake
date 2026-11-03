import test from 'node:test';
import assert from 'node:assert/strict';
import { catalogueDialogueEvents } from '../../tools/analyzer/catalogue-dialogue-events.mjs';

function container(parts) {
  let end = 0;
  const index = Buffer.alloc(parts.length * 4);
  parts.forEach((part, i) => { end += part.length; index.writeUInt32LE(end, i * 4); });
  return [index, Buffer.concat(parts)];
}
function words(values) {
  const bytes = Buffer.alloc(values.length * 2);
  values.forEach((value, i) => bytes.writeInt16LE(value, i * 2));
  return bytes;
}
function mock() {
  const [ki, kg] = container([[0,1,0,2,0,7], [3,0,-1], [-1], [1,4,0,0,7], [1,1,0,0,7], [1,2,0,0,7]].map(words));
  const [ti, tg] = container([Buffer.from([0xb2,0x90,0x9c,0x94,0]), Buffer.from([254,0]), Buffer.from([0x7e,0])]);
  const record = Buffer.alloc(52); record.write('Mock',2);
  const [ri, rg] = container([Buffer.alloc(0),Buffer.alloc(0),Buffer.alloc(0),record,Buffer.alloc(0),Buffer.alloc(0)]);
  const maps = Buffer.alloc(49152); maps.fill(255,3*8192,4*8192); maps.writeInt16LE(2,3*8192+10);
  const slots = Buffer.alloc(4400,255); slots.writeInt16LE(0,2*22+4); slots.writeInt16LE(99,3*22+4);
  return {'KDEF.IDX':ki,'KDEF.GRP':kg,'TALK.IDX':ti,'TALK.GRP':tg,'RANGER.IDX':ri,'RANGER.GRP':rg,'ALLSIN.GRP':maps,'ALLDEF.GRP':slots};
}

test('Mock catalogue: deterministic metadata, exact references, rejected effects/text and immutable bytes', () => {
  const data = mock(), before = Object.fromEntries(Object.entries(data).map(([k,v])=>[k,Buffer.from(v)]));
  const result = catalogueDialogueEvents(data);
  assert.deepEqual(result,catalogueDialogueEvents(data)); assert.deepEqual(data,before);
  assert.deepEqual([result.summary.total,result.summary.dialogueOnly,result.summary.empty,result.summary.rejected],[6,1,1,4]);
  assert.equal(result.entries[0].dialogues[0].eventByteOffset,2);
  assert.equal(result.entries[0].dialogues[0].sourceOffset,0);
  assert.deepEqual(result.entries[0].sceneReferences[0].cells,[5]);
  assert.equal(result.entries[0].sceneReferences[0].sourceOffset,48);
  assert.match(result.entries[1].reason,/UNSUPPORTED_OPCODE:3@0/);
  assert.match(result.entries[3].reason,/TALK_REFERENCE:4@0/);
  assert.match(result.entries[4].reason,/TALK_UNKNOWN_CONTROL:1@0/);
  assert.match(result.entries[5].reason,/TALK_DECODE_ERROR:2@0/);
  assert.equal(result.invalidSceneReferences[0].eventId,99);
  assert.equal(result.sources.length,8);
  assert.ok(result.sources.every(source=>/^[a-f0-9]{64}$/.test(source.sha256)));
  assert.equal(JSON.stringify(result).includes('displayText'),false);
});

test('Mock catalogue: broken containers and unexpected failures abort the complete audit', () => {
  const data=mock(); data['KDEF.IDX']=Buffer.from([0]);
  assert.throws(()=>catalogueDialogueEvents(data),/multiple of four/);
  const missing=mock(); delete missing['TALK.GRP'];
  assert.throws(()=>catalogueDialogueEvents(missing),TypeError);
});
