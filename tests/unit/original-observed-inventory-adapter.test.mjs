import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { applyOriginal497ObservedInventory, bindOriginal497InventoryAdapter,
  createOriginal497InventoryState, bindOriginal676InventoryAdapter,
  createOriginal676InventoryState, applyOriginal676ObservedInventory } from
  '../../tools/extractor/original-observed-inventory-adapter.mjs';

const available = ['KDEF.IDX', 'KDEF.GRP'].every(name => existsSync(`original/dos/${name}`));
const sources = async () => ({
  'KDEF.IDX': new Uint8Array(await readFile('original/dos/KDEF.IDX')),
  'KDEF.GRP': new Uint8Array(await readFile('original/dos/KDEF.GRP')),
});

test('event 497 fills the exact observed empty fifth inventory slot with item 57 x1',
  { skip: !available && 'Original data is local and excluded from the repository.' }, async () => {
    const context = bindOriginal497InventoryAdapter(await sources());
    const state = createOriginal497InventoryState(context);
    const next = applyOriginal497ObservedInventory(context, state);
    assert.deepEqual(state.slots, [[0, 3], [2, 3], [10, 3], [21, 3], [-1, 0]]);
    assert.deepEqual(next.slots, [[0, 3], [2, 3], [10, 3], [21, 3], [57, 1]]);
  });

test('event 676 consumes the five observed materials and puts item 176 in their first slot',
  { skip: !available && 'Original data is local and excluded from the repository.' }, async () => {
    const context=bindOriginal676InventoryAdapter(await sources());
    const state=createOriginal676InventoryState(context),next=applyOriginal676ObservedInventory(context,state);
    assert.deepEqual(state.slots.slice(4),[[138,1],[139,1],[140,1],[141,1],[142,1]]);
    assert.deepEqual(next.slots.slice(4),[[176,1],[-1,0],[-1,0],[-1,0],[-1,0]]);
    const missing=createOriginal676InventoryState(context);missing.slots[8]=[-1,0];
    assert.throws(()=>applyOriginal676ObservedInventory(context,missing),/PRECONDITION/);
  });

test('event 497 inventory slice rejects a different slot layout or source',
  { skip: !available && 'Original data is local and excluded from the repository.' }, async () => {
    const input = await sources(), context = bindOriginal497InventoryAdapter(input);
    const state = createOriginal497InventoryState(context);
    state.slots[4] = [57, 0];
    assert.throws(() => applyOriginal497ObservedInventory(context, state), /PRECONDITION/);
    const changed = { ...input, 'KDEF.GRP': new Uint8Array(input['KDEF.GRP']) };
    changed['KDEF.GRP'][75696] ^= 1;
    assert.throws(() => bindOriginal497InventoryAdapter(changed), /_SOURCE/);
  });
