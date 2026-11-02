import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeTalk, readOriginalScene, readDialogueOnlyEvent } from '../../packages/game-data/src/original.ts';

function idx(ends){const raw=Buffer.alloc(ends.length*4);ends.forEach((value,i)=>raw.writeUInt32LE(value,i*4));return raw;}
function words(values){const raw=Buffer.alloc(values.length*2);values.forEach((value,i)=>raw.writeInt16LE(value,i*2));return raw;}

test('Mock TALK: retain raw transform, explicit line/control tokens, reject missing terminator and invalid encoding',()=>{
  const payload=Buffer.from('Mock*text','ascii');
  const raw=Buffer.concat([Buffer.from(payload.map(value=>value^255)),Buffer.from([0])]);
  const before=Buffer.from(raw);const talk=decodeTalk(raw);
  assert.equal(talk.displayText,'Mock\ntext');assert.equal(talk.codec,'WHATWG Big5');
  assert.equal(talk.hasUnknownControls,false);assert.equal(talk.transformed.at(-1),255);
  assert.deepEqual(raw,before);
  assert.equal(decodeTalk(Uint8Array.from([254,0])).tokens[0].kind,'control');
  assert.throws(()=>decodeTalk(new Uint8Array()),/TERMINATOR/);
  assert.throws(()=>decodeTalk(Uint8Array.from([0x7e,0])),TypeError);
});

test('Mock scene: explicit LE signed layers, source offsets, all capacity retained and malformed data rejected',()=>{
  const record=Buffer.alloc(52);record.write('Mock',2,'ascii');record.writeInt16LE(123,20);
  const index=idx([0,0,0,52,52,52]);const maps=Buffer.alloc(49152*2),events=Buffer.alloc(4400*2);
  maps.writeInt16LE(-1,3*8192+2);events.writeInt16LE(99,2*22+2*2);
  const scene=readOriginalScene(index,record,maps,events,0);
  assert.equal(scene.name,'Mock');assert.equal(scene.sourceOffset,0);
  assert.equal(scene.mapCapacity,2);assert.equal(scene.sceneCount,1);
  assert.equal(scene.layers[3][1],-1);assert.equal(scene.eventFields[2][2],99);assert.equal(scene.entranceRaw[0],123);
  scene.recordBytes[2]=0;assert.equal(record[2],77);
  assert.throws(()=>readOriginalScene(index,record,maps,events,1),/SCENE_ID/);
  assert.throws(()=>readOriginalScene(index,record,maps.subarray(1),events,0),/CAPACITY/);
});

test('Mock event subset: exact dialogue source positions, all effects/unknown words and trailing data rejected',()=>{
  const raw=words([0,1,12,200,2,0,-1]);
  const event=readDialogueOnlyEvent(idx([raw.length]),raw,0);
  assert.deepEqual(event.dialogues,[{wordOffset:1,talkId:12,portraitId:200,side:2}]);
  for(const [values,error] of [[[3,0,-1],/UNSUPPORTED_OPCODE/],[[15,83,-1],/UNSUPPORTED_OPCODE/],
    [[50,138,-1],/UNSUPPORTED_OPCODE/],[[1,12],/TRUNCATED/],[[0],/UNTERMINATED/],[[-1,0],/TRAILING/]]){
    const bytes=words(values);assert.throws(()=>readDialogueOnlyEvent(idx([bytes.length]),bytes,0),error);
  }
});
