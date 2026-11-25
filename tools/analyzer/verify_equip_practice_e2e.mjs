// End-to-end check of the EQUIP/PRACTICE host commands against the generated original
// package: equip the Jinse sword (110, equipment, slot 0) and the Xuanming manual (57,
// secret-manual) to role 0, then verify the per-role slot and per-item user bindings.
// Read-only over assets/generated/original-events (git-ignored local output).
import { readdirSync, readFileSync } from 'node:fs';
import { resolveControlledEventContent, createControlledEventState, dispatchControlledEvent }
  from '../../packages/game-core/src/controlled-event.ts';
import { readDecisionValue } from '../../packages/game-core/src/decision.ts';

const file = readdirSync('assets/generated/original-events')
  .find(name => name.startsWith('original-events-') && name.endsWith('.local.json') && !name.includes('.diagnostics.'));
if (!file) { console.error('PACKAGE_MISSING'); process.exit(1); }
const content = await resolveControlledEventContent(
  JSON.parse(readFileSync(`assets/generated/original-events/${file}`, 'utf8')));

const declarations = content.data.equipment;
if (!declarations) { console.error('NO_EQUIPMENT_DECLARATION'); process.exit(1); }

const role = 0;
let state = createControlledEventState(content);
({ state } = dispatchControlledEvent(content, state, { type: 'EQUIP', itemId: 110, role, slot: 0 }));
({ state } = dispatchControlledEvent(content, state, { type: 'PRACTICE', itemId: 57, role }));

const slotRef = { domain: declarations.slots.domain, key: `original.jy:equip/${role}/0` };
const practiceRef = { domain: declarations.practice.domain, key: `original.jy:practice/${role}` };
const swordUser = { domain: declarations.itemUser.domain, key: 'original.jy:item-user/110' };
const manualUser = { domain: declarations.itemUser.domain, key: 'original.jy:item-user/57' };
const sword = readDecisionValue(content.data.decision, state.decision, slotRef);
const manual = readDecisionValue(content.data.decision, state.decision, practiceRef);
const swordOwner = readDecisionValue(content.data.decision, state.decision, swordUser);
const manualOwner = readDecisionValue(content.data.decision, state.decision, manualUser);
console.log(`equip[0][0] = ${sword} (expect 110 金蛇劍)`);
console.log(`practice[0] = ${manual} (expect 57 玄冥神掌)`);
console.log(`item-user[110] = ${swordOwner} (expect 0)`);
console.log(`item-user[57] = ${manualOwner} (expect 0)`);
const ok = sword === 110 && manual === 57 && swordOwner === 0 && manualOwner === 0;
console.log(ok ? 'OK: EQUIP/PRACTICE bindings match the community Pascal writes' : 'MISMATCH');
process.exit(ok ? 0 : 1);
