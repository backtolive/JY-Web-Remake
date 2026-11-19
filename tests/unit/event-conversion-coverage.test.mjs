import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { auditEventConversionCoverage } from '../../tools/analyzer/audit-event-conversion-coverage.mjs';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const index = n => Uint8Array.of(n, 0, 0, 0);
function fixture() {
  const event = Uint8Array.of(1,0,0,0,1,0,0,0,255,255);
  const talk = Uint8Array.of('H'.charCodeAt(0)^255, 'i'.charCodeAt(0)^255, 0);
  const rangerIndex = new Uint8Array(24), rangerIndexView = new DataView(rangerIndex.buffer);
  for (let i = 3; i < 6; i++) rangerIndexView.setUint32(i*4,52,true);
  const allDef = new Uint8Array(4400).fill(255); allDef[4]=0; allDef[5]=0;
  const files = { 'KDEF.IDX': index(event.length), 'KDEF.GRP': event,
    'TALK.IDX': index(talk.length), 'TALK.GRP': talk,
    'ALLDEF.GRP': allDef, 'RANGER.IDX': rangerIndex, 'RANGER.GRP': new Uint8Array(52) };
  const corpus = { schemaVersion: 1, converterVersion: '0.3.0', executable: false,
    inputs: Object.entries(files).map(([sourceFile,bytes])=>({sourceFile,byteLength:bytes.length,sha256:sha(bytes)})),
    layoutSource: { commit: '1d439afe76dae41c821065c3a33c1c6709dc7fce' }, summary: { events: 1, dialogues: 1, instructions: 2 },
    eventReferences: [{sceneId:0,slotId:0,eventId:0,sourceFile:'ALLDEF.GRP',sourceOffset:4}], invalidEventReferences: [],
    talks: [{talkId:0,sourceOffset:0,byteLength:talk.length,sha256:sha(talk),
      rawBase64:Buffer.from(talk).toString('base64'),decoded:true}],
    events: [{eventId:0,sourceOffset:0,byteLength:event.length,sha256:sha(event),
      rawBase64:Buffer.from(event).toString('base64'),instructions:[
        {opcode:1,wordOffset:0,sourceByteOffset:0,kind:'instruction',args:[0,1,0],
          dialogueRef:{talkId:0,portraitId:1,side:0}},
        {opcode:-1,wordOffset:4,sourceByteOffset:8,kind:'terminator',args:[]},
      ]}],
  };
  return { corpus, files };
}

test('static audit checks every source byte and separates preview eligibility from runtime proof', () => {
  const {corpus,files}=fixture();
  const report=auditEventConversionCoverage(corpus,files);
  assert.equal(report.summary.events,1);
  assert.equal(report.summary.dialogueRefsValid,1);
  assert.equal(report.summary.previewEligible,1);
  assert.equal(report.summary.sourceLockedObservedPaths,0);
  assert.equal(report.events[0].runtimeStatus,'no-source-locked-rule-adapter');
  files['KDEF.GRP'][0]=2;
  assert.throws(()=>auditEventConversionCoverage(corpus,files),/EVENT_COVERAGE_SOURCE:KDEF.GRP/);
});

test('static audit rejects altered argument or dialogue reference without declaring executable content', () => {
  const {corpus,files}=fixture();
  corpus.events[0].instructions[0].args[0]=1;
  assert.throws(()=>auditEventConversionCoverage(corpus,files),/EVENT_COVERAGE_ARGUMENTS:0:0/);
  corpus.events[0].instructions[0].args[0]=0;
  corpus.events[0].instructions[0].dialogueRef.talkId=1;
  const report=auditEventConversionCoverage(corpus,files);
  assert.equal(report.summary.dialogueRefsValid,0);
  assert.equal(report.summary.previewEligible,0);
  assert.equal(report.summary.noSourceLockedRuleAdapter,1);
});

test('static audit independently checks the full initial event reference list', () => {
  const {corpus,files}=fixture();
  corpus.eventReferences=[];
  assert.throws(()=>auditEventConversionCoverage(corpus,files),/EVENT_COVERAGE_INITIAL_REFERENCES/);
});
