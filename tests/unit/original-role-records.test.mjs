import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { openOriginalRoleTable, createOriginalRoleOverlay, originalRoleFieldSourceOffset,
  readOriginalRoleInt16, updateOriginalRoleInt16 } from '../../packages/game-data/src/original-role-records.ts';

function mockSource() {
  const index = new Uint8Array(24), group = new Uint8Array(114242);
  const ends = [836,59076,97076,101444,114092,114242], view = new DataView(index.buffer);
  ends.forEach((end,i) => view.setUint32(i*4,end,true));
  new DataView(group.buffer).setInt16(836+120,50,true);
  return {index,group};
}

test('Mock original role overlay retains immutable source and updates only explicit int16 fields', async () => {
  const {index,group} = mockSource(), table = await openOriginalRoleTable(index,group);
  const base = createOriginalRoleOverlay(table);
  assert.equal(originalRoleFieldSourceOffset(table,0,120),956);
  assert.equal(readOriginalRoleInt16(table,base,0,120),50);
  group[956] = 1;
  assert.equal(readOriginalRoleInt16(table,base,0,120),50);
  const prepared = updateOriginalRoleInt16(table,base,0,[[120,72]]);
  const completed = updateOriginalRoleInt16(table,prepared,0,[[120,75]]);
  assert.deepEqual([readOriginalRoleInt16(table,base,0,120),
    readOriginalRoleInt16(table,prepared,0,120),readOriginalRoleInt16(table,completed,0,120)], [50,72,75]);
  assert.equal(readOriginalRoleInt16(table,completed,0,118),0);
  assert.throws(() => updateOriginalRoleInt16(table,base,0,[[120,75],[120,76]]), /WRITES/);
  assert.throws(() => updateOriginalRoleInt16(table,base,0,[[121,75]]), /FIELD/);
  assert.throws(() => updateOriginalRoleInt16(table,base,320,[[120,75]]), /ADDRESS/);
  const bad = structuredClone(completed);bad.records['0'][120] = 256;
  assert.throws(() => readOriginalRoleInt16(table,bad,0,120), /RECORD/);
  assert.equal(readOriginalRoleInt16(table,completed,0,120),75);
});

test('Local original RANGER role 0 field 120 is source 50, separate from sampled DOS 72',
  {skip: !existsSync('original/dos/RANGER.GRP') && 'Original files are local.'}, async () => {
    const table = await openOriginalRoleTable(new Uint8Array(await readFile('original/dos/RANGER.IDX')),
      new Uint8Array(await readFile('original/dos/RANGER.GRP')));
    assert.equal(table.groupSha256,'07b99e3c1676e18691f00d6dfe713121faa6f7429e43666bc83e1568cecb68ab');
    assert.equal(readOriginalRoleInt16(table,createOriginalRoleOverlay(table),0,120),50);
  });
