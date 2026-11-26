// E2E sanity check for the CanEquip gate + mutual unbinding on the original package.
import { readFileSync } from 'node:fs';
import { readdirSync } from 'node:fs';
import { resolveControlledEventContent, createControlledEventState, dispatchControlledEvent } from '../../packages/game-core/src/controlled-event.ts';

const dir = 'assets/generated/original-events';
const file = readdirSync(dir).find(name => name.endsWith('.local.json') && !name.includes('diagnostics'));
const c = JSON.parse(readFileSync(`${dir}/${file}`, 'utf8'));
const content = await resolveControlledEventContent(c);
const read = (state, domain, key) => state.decision.values[domain]?.[key];

let state = createControlledEventState(content);

// 1) Fresh state (all role attrs 0): item 110 (mp:50, attack:50) must FAIL the CanEquip gate.
try {
  dispatchControlledEvent(content, state, { type: 'EQUIP', itemId: 110, role: 0, slot: 0 });
  console.log('FAIL: EQUIP 110 on fresh state succeeded (expected EQUIP_CONDITION)');
} catch (e) { console.log('PASS: fresh-state EQUIP 110 ->', e.message); }

// 2) Seed role 0 attrs (current-mp 60, attack 60, mp-type 2): item 110 now passes.
state.decision.values['original.jy:role/current-mp'] = { 'original.jy:role/0': 60 };
state.decision.values['original.jy:role/attack'] = { 'original.jy:role/0': 60 };
state.decision.values['original.jy:role/mp-type'] = { 'original.jy:role/0': 2 };
const r1 = dispatchControlledEvent(content, state, { type: 'EQUIP', itemId: 110, role: 0, slot: 0 });
console.log('PASS: EQUIP 110 -> slot0 =', read(r1.state, 'original.jy:equip', 'original.jy:equip/0/0'),
  'itemUser[110] =', read(r1.state, 'original.jy:item-user', 'original.jy:item-user/110'));

// 3) Equip item 106 (玄鐵劍, needs mp:100 attack:60) over 110: must unbind 110 and write 106.
r1.state.decision.values['original.jy:role/current-mp'] = { 'original.jy:role/0': 100 };
const r2 = dispatchControlledEvent(content, r1.state, { type: 'EQUIP', itemId: 106, role: 0, slot: 0 });
console.log('PASS: EQUIP 106 over 110 -> slot0 =', read(r2.state, 'original.jy:equip', 'original.jy:equip/0/0'),
  'itemUser[110] =', read(r2.state, 'original.jy:item-user', 'original.jy:item-user/110'),
  'itemUser[106] =', read(r2.state, 'original.jy:item-user', 'original.jy:item-user/106'));

// 4) PRACTICE unbinding: practice item 57 to role 0, then 58 over it.
const r3 = dispatchControlledEvent(content, r2.state, { type: 'PRACTICE', itemId: 57, role: 0 });
const r4 = dispatchControlledEvent(content, r3.state, { type: 'PRACTICE', itemId: 58, role: 0 });
console.log('PASS: PRACTICE 58 over 57 -> practice[0] =', read(r4.state, 'original.jy:practice', 'original.jy:practice/0'),
  'itemUser[57] =', read(r4.state, 'original.jy:item-user', 'original.jy:item-user/57'),
  'itemUser[58] =', read(r4.state, 'original.jy:item-user', 'original.jy:item-user/58'));
