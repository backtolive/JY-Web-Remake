/** Evidence-scoped generic conversion of the local KDEF corpus into a controlled-event package.
 *
 * Only the 54 opcodes with local DOS / community-source evidence are mapped. Every other
 * opcode blocks the affected event (and only that event) with a diagnostic. Unknown or
 * uninterpreted effects are mapped to no-op steps and recorded, never invented.
 *
 * The output is written only to the git-ignored generated folder and is not executable
 * content until the host loads it; commercial text stays local-only.
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolveControlledEventContent } from '../../packages/game-core/src/controlled-event.ts';
import { canonical } from '../../packages/game-core/src/content.ts';

const PACKAGE_ID = 'original.jy.events';
const VERSION = '0.1.0';
const MONEY_ID = 174;
const ROLE_COUNT = 84;
const SLOT_FIELDS = 8;
const CORPUS_DIR = 'assets/generated/event-corpus';

// The 68 evidence-scoped opcodes. `kind` drives step generation; `label` is the rule status.
const OPCODES = {
  0: { kind: 'noop', label: 'Community Implementation', note: 'no-op' },
  1: { kind: 'say', label: 'Community Implementation', note: 'dialogue' },
  2: { kind: 'effect', effect: 'inventoryAdd', label: 'Community Implementation' },
  3: { kind: 'effect', effect: 'slotWrite', label: 'Inferred' },
  4: { kind: 'branch', condition: 'curItem', label: 'Community Implementation' },
  5: { kind: 'choice', options: [{ id: 'opt:cancel', text: '取消', arm: 'no' }, { id: 'opt:fight', text: '戰鬥', arm: 'yes' }], label: 'Community Implementation' },
  6: { kind: 'battle', label: 'Community Implementation' },
  7: { kind: 'end', label: 'Community Implementation', note: 'break' },
  8: { kind: 'noop', label: 'Community Implementation', note: 'music' },
  9: { kind: 'choice', options: [{ id: 'opt:cancel', text: '取消', arm: 'no' }, { id: 'opt:request', text: '要求', arm: 'yes' }], label: 'Community Implementation' },
  10: { kind: 'effect', effect: 'partyAdd', label: 'Community Implementation' },
  11: { kind: 'choice', options: [{ id: 'opt:no', text: '否', arm: 'no' }, { id: 'opt:yes', text: '是', arm: 'yes' }], label: 'Community Implementation' },
  12: { kind: 'noop', label: 'Community Implementation', note: 'inn-heal-uninterpreted' },
  13: { kind: 'noop', label: 'Community Implementation', note: 'screen-flash' },
  14: { kind: 'noop', label: 'Community Implementation', note: 'black-screen' },
  15: { kind: 'end', label: 'Community Implementation', note: 'death-ending', diagnostic: true },
  16: { kind: 'branch', condition: 'roleInParty', label: 'Community Implementation' },
  17: { kind: 'noop', label: 'Community Implementation', note: 'scene-tile-uninterpreted' },
  18: { kind: 'branch', condition: 'itemPresent', label: 'Inferred' },
  19: { kind: 'noop', label: 'Community Implementation', note: 'player-move-unmodeled' },
  20: { kind: 'branch', condition: 'partyFull', label: 'Community Implementation' },
  21: { kind: 'effect', effect: 'partyRemove', label: 'Community Implementation' },
  22: { kind: 'noop', label: 'Community Implementation', note: 'no-op' },
  23: { kind: 'effect', effect: 'roleSet', field: 'poison', label: 'Community Implementation' },
  24: { kind: 'noop', label: 'Community Implementation', note: 'no-op' },
  25: { kind: 'noop', label: 'Community Implementation', note: 'camera-pan-unmodeled' },
  26: { kind: 'effect', effect: 'slotAdd', label: 'Inferred' },
  27: { kind: 'effect', effect: 'slotSet567', label: 'Inferred' },
  28: { kind: 'branch', condition: 'ethicsRange', label: 'Community Implementation' },
  29: { kind: 'branch', condition: 'attackRange', label: 'Community Implementation' },
  30: { kind: 'noop', label: 'Community Implementation', note: 'walk-unmodeled' },
  31: { kind: 'branch', condition: 'money', label: 'Community Implementation' },
  32: { kind: 'effect', effect: 'inventoryAdd', label: 'Community Implementation' },
  33: { kind: 'effect', effect: 'skillLearn', label: 'Community Implementation' },
  34: { kind: 'effect', effect: 'roleAdd', field: 'aptitude', label: 'Community Implementation' },
  35: { kind: 'effect', effect: 'skillSlotSet', label: 'Community Implementation' },
  36: { kind: 'branch', condition: 'sexCheck', label: 'Community Implementation' },
  37: { kind: 'effect', effect: 'roleAdd0', field: 'ethics', label: 'Community Implementation' },
  38: { kind: 'noop', label: 'Community Implementation', note: 'scene-layer-uninterpreted' },
  39: { kind: 'effect', effect: 'sceneReset', label: 'Community Implementation' },
  40: { kind: 'noop', label: 'Community Implementation', note: 'facing' },
  41: { kind: 'effect', effect: 'carriedItem', label: 'Community Implementation' },
  42: { kind: 'branch', condition: 'hasMale', label: 'Unknown' },
  43: { kind: 'branch', condition: 'itemPresent', label: 'Inferred' },
  44: { kind: 'effect', effect: 'slotPicAnimate', label: 'Community Implementation' },
  45: { kind: 'effect', effect: 'roleAdd', field: 'speed', label: 'Community Implementation' },
  46: { kind: 'effect', effect: 'roleAdd', field: 'max-mp', label: 'Community Implementation' },
  47: { kind: 'effect', effect: 'roleAdd', field: 'attack', label: 'Community Implementation' },
  48: { kind: 'effect', effect: 'roleAdd', field: 'max-hp', label: 'Community Implementation' },
  49: { kind: 'effect', effect: 'roleSet', field: 'mp-type', label: 'Community Implementation' },
  50: { kind: 'branch', condition: 'allItemsPresent', label: 'Community Implementation' },
  51: { kind: 'noop', label: 'Community Implementation', note: 'random-talk-unmodeled' },
  52: { kind: 'noop', label: 'Community Implementation', note: 'no-op' },
  53: { kind: 'noop', label: 'Community Implementation', note: 'no-op' },
  54: { kind: 'noop', label: 'Community Implementation', note: 'no-op' },
  55: { kind: 'branch', condition: 'slotField2', label: 'Verified Original' },
  56: { kind: 'effect', effect: 'roleAdd0', field: 'repute', label: 'Community Implementation' },
  57: { kind: 'effect', effect: 'scene57Anim', label: 'Community Implementation' },
  58: { kind: 'noop', label: 'Community Implementation', note: 'battle-chain-unmodeled' },
  59: { kind: 'effect', effect: 'partyClear', label: 'Community Implementation' },
  60: { kind: 'branch', condition: 'slotPicAny', label: 'Community Implementation' },
  61: { kind: 'branch', condition: 'slot4664All', label: 'Community Implementation' },
  62: { kind: 'end', label: 'Community Implementation', note: 'ending-animation', diagnostic: true },
  63: { kind: 'effect', effect: 'roleSet', field: 'sexual', label: 'Community Implementation' },
  64: { kind: 'noop', label: 'Community Implementation', note: 'shop-purchase-unmodeled' },
  65: { kind: 'noop', label: 'Community Implementation', note: 'no-op' },
  66: { kind: 'noop', label: 'Community Implementation', note: 'music' },
  67: { kind: 'noop', label: 'Community Implementation', note: 'sound' },
};
const ROLE_FIELDS = ['poison', 'aptitude', 'ethics', 'speed', 'max-mp', 'current-mp', 'attack',
  'max-hp', 'current-hp', 'mp-type', 'repute', 'sexual'];

const literal = value => ({ kind: 'literal', value });
const read = (domain, key) => ({ kind: 'read', ref: { domain, key } });
const invKey = id => `original.jy:item/${id}`;
const slotKey = (scene, slot, field) => `original.jy:scene/${scene}/slot/${slot}/field/${field}`;
const sceneRecordKey = scene => `original.jy:scene/${scene}/condition`;
const roleKey = (field, role) => `original.jy:role/${role}`;
const partyKey = 'original.jy:party/members';
const skillKey = (role, slot) => `original.jy:skill/${role}/${slot}`;
const carriedKey = (role, slot) => `original.jy:carried/${role}/${slot}`;
const SKILL_SLOTS = 10;
const CARRIED_SLOTS = 4;
// RANGER carries 84 scene records, numbered 0-83. A -2 (current scene) write resolves to
// whichever scene the game is in, so the allowed keys must cover every scene for the slots
// that -2 writes touch.
const SCENE_COUNT = 84;
const currentSceneRef = { domain: 'original.jy:current-scene', key: 'original.jy:scene/current' };
/** A -2 (current scene) slot ref composed live from the current-scene value via keyFrom. */
const sceneSlotKeyFrom = (slot, field) => ({ domain: 'original.jy:scene-slots', keyFrom: [
  { literal: 'original.jy:scene' },
  { read: currentSceneRef },
  { literal: 'slot' },
  { literal: String(slot) },
  { literal: 'field' },
  { literal: String(field) },
] });
const readRef = ref => ({ kind: 'read', ref });

function loadCorpus() {
  const file = readdirSync(CORPUS_DIR).find(name => name.startsWith('all-events-') && name.endsWith('.local.json'));
  if (!file) throw new Error('CORPUS_MISSING');
  return JSON.parse(readFileSync(`${CORPUS_DIR}/${file}`, 'utf8'));
}

function talkText(talk) {
  if (!talk) return '';
  return talk.tokens.map(token => {
    if (token.kind === 'text') return token.text;
    if (token.kind === 'lineBreak') return '\n';
    return '';
  }).join('').replace(/\n{3,}/g, '\n\n').trim();
}

/** First pass: collect every key the mapped effects/conditions will reference. */
function collectKeys(events) {
  const inventory = new Set([MONEY_ID]);
  const sceneSlots = new Set();
  const minus2Combos = new Set();
  const sceneRecords = new Set();
  const roles = new Set();
  const skillRoles = new Set();
  const carriedRoles = new Set();
  for (const event of events) {
    for (const instruction of event.instructions) {
      const op = OPCODES[instruction.opcode];
      if (!op || instruction.opcode === -1) continue;
      const [a0, a1, a2, a3, a4] = instruction.args;
      switch (op.effect ?? op.condition) {
        case 'inventoryAdd': inventory.add(a0); break;
        case 'itemPresent': inventory.add(a0); break;
        case 'slotWrite':
          if (typeof a0 === 'number' && typeof a1 === 'number') {
            if (a0 === -2) {
              for (let field = 0; field < SLOT_FIELDS; field++)
                if (typeof instruction.args[2 + field] === 'number' && instruction.args[2 + field] !== -2)
                  minus2Combos.add(`slot/${a1}/field/${field}`);
            } else for (let field = 0; field < SLOT_FIELDS; field++) sceneSlots.add(slotKey(a0, a1, field));
          }
          break;
        case 'slotAdd':
          if (typeof a0 === 'number' && typeof a1 === 'number') {
            if (a0 === -2) for (const field of [2, 3, 4]) minus2Combos.add(`slot/${a1}/field/${field}`);
            else for (const field of [2, 3, 4]) sceneSlots.add(slotKey(a0, a1, field));
          }
          break;
        case 'slotSet567':
          if (typeof a0 === 'number') for (const field of [5, 6, 7]) minus2Combos.add(`slot/${a0}/field/${field}`);
          break;
        case 'slotField2':
          if (typeof a0 === 'number') minus2Combos.add(`slot/${a0}/field/2`);
          break;
        case 'slotPicAny':
          if (typeof a0 === 'number' && typeof a1 === 'number') {
            if (a0 === -2) for (const field of [5, 6, 7]) minus2Combos.add(`slot/${a1}/field/${field}`);
            else for (const field of [5, 6, 7]) sceneSlots.add(slotKey(a0, a1, field));
          }
          break;
        case 'slot4664All':
          for (let slot = 11; slot <= 24; slot++) minus2Combos.add(`slot/${slot}/field/5`);
          break;
        case 'slotPicAnimate':
          if (typeof a0 === 'number' && typeof a2 === 'number') {
            minus2Combos.add(`slot/${a0}/field/5`);
            minus2Combos.add(`slot/${a2}/field/5`);
          }
          break;
        case 'scene57Anim':
          for (const field of [5, 6, 7]) minus2Combos.add(`slot/-1/field/${field}`);
          for (const slot of [2, 3, 4]) minus2Combos.add(`slot/${slot}/field/5`);
          break;
        case 'sceneReset': if (typeof a0 === 'number') sceneRecords.add(sceneRecordKey(a0)); break;
        case 'partyAdd': case 'partyRemove': if (typeof a0 === 'number') roles.add(a0); break;
        case 'roleSet': case 'roleAdd': if (typeof a0 === 'number') roles.add(a0); break;
        case 'roleAdd0': roles.add(0); break;
        case 'skillLearn': case 'skillSlotSet': if (typeof a0 === 'number') skillRoles.add(a0); break;
        case 'carriedItem': if (typeof a0 === 'number') carriedRoles.add(a0); break;
        case 'allItemsPresent':
          for (const item of [a0, a1, a2, a3, a4]) if (typeof item === 'number') inventory.add(item);
          break;
        default: break;
      }
    }
  }
  return { inventory: [...inventory].sort((a, b) => a - b), sceneSlots: [...sceneSlots],
    minus2Combos: [...minus2Combos],
    sceneRecords: [...sceneRecords], roles: [...roles].sort((a, b) => a - b),
    skillRoles: [...skillRoles].sort((a, b) => a - b), carriedRoles: [...carriedRoles].sort((a, b) => a - b) };
}

function buildDomains(keys) {
  const domains = {
    'original.jy:party': { kind: 'list', default: [], maxItems: 6, unique: true,
      allowedKeys: [partyKey], allowedValues: keys.roles.map(role => String(role)) },
    // min is symmetric with the other integer domains so consumption effects (negative add)
    // from a fresh zero state do not fail validation; a real game seeds proper starting values.
    'original.jy:inventory': { kind: 'integer', default: 0, min: -1_000_000, max: 1_000_000,
      allowedKeys: keys.inventory.map(id => invKey(id)) },
    'original.jy:scene-slots': { kind: 'integer', default: 0, min: -1_000_000, max: 1_000_000,
      // -2 (current scene) writes resolve to the live scene, so allow every scene for the
      // slots those writes touch; explicit scene keys may overlap, dedupe.
      allowedKeys: [...new Set([...keys.sceneSlots,
        ...keys.minus2Combos.flatMap(combo => Array.from({ length: SCENE_COUNT },
          (_, scene) => `original.jy:scene/${scene}/${combo}`))])] },
    'original.jy:current-scene': { kind: 'integer', default: 0, min: 0, max: 1_000_000,
      allowedKeys: ['original.jy:scene/current'] },
    'original.jy:current-item': { kind: 'integer', default: 0, min: -1, max: 1_000_000,
      allowedKeys: ['original.jy:item/current'] },
    'original.jy:scene-records': { kind: 'integer', default: 0, min: 0, max: 1_000_000,
      allowedKeys: keys.sceneRecords },
  };
  for (const field of ROLE_FIELDS) {
    domains[`original.jy:role/${field}`] = { kind: 'integer', default: 0, min: -1_000_000, max: 1_000_000,
      allowedKeys: keys.roles.length ? keys.roles.map(role => roleKey(field, role))
        : Array.from({ length: ROLE_COUNT }, (_, role) => roleKey(field, role)) };
  }
  if (keys.skillRoles.length) {
    const skillKeys = keys.skillRoles.flatMap(role =>
      Array.from({ length: SKILL_SLOTS }, (_, slot) => skillKey(role, slot)));
    // Skill IDs are positive; 0 marks an empty slot. Levels are set by opcode 35 to
    // arbitrary values (e.g. 900) and only capped at 10 on opcode 33 re-learn, so the
    // level domain is wide; the cap is enforced by the plan, not the range.
    domains['original.jy:skill'] = { kind: 'integer', default: 0, min: 0, max: 1_000_000, allowedKeys: skillKeys };
    domains['original.jy:skill-level'] = { kind: 'integer', default: 0, min: 0, max: 1_000_000, allowedKeys: skillKeys };
  }
  if (keys.carriedRoles.length) {
    const carriedKeys = keys.carriedRoles.flatMap(role =>
      Array.from({ length: CARRIED_SLOTS }, (_, slot) => carriedKey(role, slot)));
    domains['original.jy:carried-item'] = { kind: 'integer', default: -1, min: -1, max: 1_000_000, allowedKeys: carriedKeys };
    domains['original.jy:carried-item-amount'] = { kind: 'integer', default: 0, min: -1_000_000, max: 1_000_000, allowedKeys: carriedKeys };
  }
  return domains;
}

function buildEffect(op, args, instruction) {
  const [a0, a1, a2, a3, a4, a5] = args;
  const plan = { schemaVersion: 1, cases: [], otherwise: [] };
  const put = effect => plan.otherwise.push(effect);
  switch (op.effect) {
    case 'inventoryAdd':
      put({ op: 'add', target: { domain: 'original.jy:inventory', key: invKey(a0) }, amount: literal(a1) });
      break;
    case 'partyAdd':
      put({ op: 'listAdd', target: { domain: 'original.jy:party', key: partyKey }, value: literal(String(a0)) });
      break;
    case 'partyRemove':
      // Guarded by contains: removing a member who is not in the party is a no-op, so
      // events can run from a fresh preview state without LIST_MISSING.
      plan.cases.push({ when: { op: 'contains', list: read('original.jy:party', partyKey),
        value: literal(String(a0)) },
        effects: [{ op: 'listRemove', target: { domain: 'original.jy:party', key: partyKey }, value: literal(String(a0)) }] });
      break;
    case 'partyClear':
      put({ op: 'set', target: { domain: 'original.jy:party', key: partyKey }, value: literal([]) });
      break;
    case 'roleSet':
      put({ op: 'set', target: { domain: `original.jy:role/${op.field}`, key: roleKey(op.field, a0) }, value: literal(a1) });
      break;
    case 'roleAdd':
      put({ op: 'add', target: { domain: `original.jy:role/${op.field}`, key: roleKey(op.field, a0) }, amount: literal(a1) });
      break;
    case 'roleAdd0':
      put({ op: 'add', target: { domain: `original.jy:role/${op.field}`, key: roleKey(op.field, 0) }, amount: literal(a0) });
      break;
    case 'sceneReset':
      put({ op: 'set', target: { domain: 'original.jy:scene-records', key: sceneRecordKey(a0) }, value: literal(0) });
      break;
    case 'slotWrite':
      for (let field = 0; field < SLOT_FIELDS; field++) {
        const value = args[2 + field];
        if (typeof value === 'number' && value !== -2)
          put({ op: 'set', target: a0 === -2 ? sceneSlotKeyFrom(a1, field)
            : { domain: 'original.jy:scene-slots', key: slotKey(a0, a1, field) }, value: literal(value) });
      }
      break;
    case 'slotAdd':
      for (const field of [2, 3, 4])
        put({ op: 'add', target: a0 === -2 ? sceneSlotKeyFrom(a1, field)
          : { domain: 'original.jy:scene-slots', key: slotKey(a0, a1, field) }, amount: literal(args[2 + field - 2]) });
      break;
    case 'slotSet567':
      for (const field of [5, 6, 7])
        put({ op: 'set', target: sceneSlotKeyFrom(a0, field), value: literal(a2) });
      break;
    case 'slotPicAnimate': {
      // Opcode 44 [enum1, beginpic1, endpic1, enum2, beginpic2, endpic2]: animate scene slot
      // field 5 from beginpic to endpic; the final persisted value is the endpic.
      put({ op: 'set', target: sceneSlotKeyFrom(a0, 5), value: literal(a2) });
      put({ op: 'set', target: sceneSlotKeyFrom(a2, 5), value: literal(a5) });
      break;
    }
    case 'scene57Anim':
      // Opcode 57 = instruct_27(-1, 7664, 7688) + instruct_44e(2, 7690, 7746, 3, 7748, 7804, 4, 7806).
      // Final slot field-5 values match the DOS observation for event 655 (7746/7804/7862).
      for (const field of [5, 6, 7]) put({ op: 'set', target: sceneSlotKeyFrom(-1, field), value: literal(7688) });
      put({ op: 'set', target: sceneSlotKeyFrom(2, 5), value: literal(7746) });
      put({ op: 'set', target: sceneSlotKeyFrom(3, 5), value: literal(7804) });
      put({ op: 'set', target: sceneSlotKeyFrom(4, 5), value: literal(7862) });
      break;
    case 'skillLearn':
      buildSkillLearn(plan, a0, a1);
      break;
    case 'skillSlotSet':
      buildSkillSlotSet(plan, a0, a1, a2, a3);
      break;
    case 'carriedItem':
      buildCarriedItem(plan, a0, a1, a2);
      break;
    default:
      break;
  }
  return plan;
}

/** Opcode 33 [rnum, magicnum]: learn a skill. Pascal scans slots 0..9 in order; the first
 * slot that is empty (<=0) or already holds this skill is used. Re-learn sets
 * level = min(level+1, 10); a fresh slot gets level 1. Cases are interleaved per slot to
 * match the single-loop scan order. */
function buildSkillLearn(plan, role, magic) {
  for (let slot = 0; slot < SKILL_SLOTS; slot++) {
    const key = skillKey(role, slot);
    const hasSkill = { op: 'compare', left: read('original.jy:skill', key), relation: 'eq', right: literal(magic) };
    plan.cases.push({ when: { op: 'all', conditions: [hasSkill,
      { op: 'compare', left: read('original.jy:skill-level', key), relation: 'lt', right: literal(10) }] },
      effects: [{ op: 'add', target: { domain: 'original.jy:skill-level', key }, amount: literal(1) }] });
    plan.cases.push({ when: { op: 'all', conditions: [hasSkill,
      { op: 'compare', left: read('original.jy:skill-level', key), relation: 'ge', right: literal(10) }] },
      effects: [{ op: 'set', target: { domain: 'original.jy:skill-level', key }, value: literal(10) }] });
    plan.cases.push({ when: { op: 'compare', left: read('original.jy:skill', key), relation: 'le', right: literal(0) },
      effects: [
        { op: 'set', target: { domain: 'original.jy:skill', key }, value: literal(magic) },
        { op: 'set', target: { domain: 'original.jy:skill-level', key }, value: literal(1) }] });
  }
  // All slots full and the skill absent: Pascal leaves the table unchanged.
}

/** Opcode 35 [rnum, magiclistnum, magicnum, exp]: write a skill slot. In-range listnum
 * writes that slot directly; out-of-range finds the first empty slot, else falls back to
 * slot 0 (Pascal bug writes MagLevel[10], here approximated as slot 0 level). */
function buildSkillSlotSet(plan, role, listnum, magic, exp) {
  if (Number.isInteger(listnum) && listnum >= 0 && listnum < SKILL_SLOTS) {
    const key = skillKey(role, listnum);
    plan.otherwise.push(
      { op: 'set', target: { domain: 'original.jy:skill', key }, value: literal(magic) },
      { op: 'set', target: { domain: 'original.jy:skill-level', key }, value: literal(exp) });
    return;
  }
  for (let slot = 0; slot < SKILL_SLOTS; slot++) {
    const key = skillKey(role, slot);
    plan.cases.push({ when: { op: 'compare', left: read('original.jy:skill', key), relation: 'le', right: literal(0) },
      effects: [
        { op: 'set', target: { domain: 'original.jy:skill', key }, value: literal(magic) },
        { op: 'set', target: { domain: 'original.jy:skill-level', key }, value: literal(exp) }] });
  }
  const fallback = skillKey(role, 0);
  plan.otherwise.push(
    { op: 'set', target: { domain: 'original.jy:skill', key: fallback }, value: literal(magic) },
    { op: 'set', target: { domain: 'original.jy:skill-level', key: fallback }, value: literal(exp) });
}

/** Opcode 41 [rnum, inum, amount]: carry an item. Pascal first scans all four slots for an
 * existing copy (then increments its amount); only if none is found does it take the first
 * empty slot. The two groups preserve that scan order. */
function buildCarriedItem(plan, role, inum, amount) {
  for (let slot = 0; slot < CARRIED_SLOTS; slot++) {
    const key = carriedKey(role, slot);
    plan.cases.push({ when: { op: 'compare', left: read('original.jy:carried-item', key), relation: 'eq', right: literal(inum) },
      effects: [{ op: 'add', target: { domain: 'original.jy:carried-item-amount', key }, amount: literal(amount) }] });
  }
  for (let slot = 0; slot < CARRIED_SLOTS; slot++) {
    const key = carriedKey(role, slot);
    plan.cases.push({ when: { op: 'compare', left: read('original.jy:carried-item', key), relation: 'eq', right: literal(-1) },
      effects: [
        { op: 'set', target: { domain: 'original.jy:carried-item', key }, value: literal(inum) },
        { op: 'set', target: { domain: 'original.jy:carried-item-amount', key }, value: literal(amount) }] });
  }
  // All four slots full and the item absent: Pascal leaves the slots unchanged.
}

function buildCondition(op, args) {
  const [a0, a1, a2, a3, a4] = args;
  switch (op.condition) {
    case 'roleInParty':
      return { op: 'contains', list: read('original.jy:party', partyKey), value: literal(String(a0)) };
    case 'itemPresent':
      return { op: 'compare', left: read('original.jy:inventory', invKey(a0)), relation: 'ge', right: literal(1) };
    case 'partyFull':
      return { op: 'listSize', list: read('original.jy:party', partyKey), relation: 'eq', value: literal(6) };
    case 'ethicsRange':
      return { op: 'all', conditions: [
        { op: 'compare', left: read('original.jy:role/ethics', roleKey('ethics', a0)), relation: 'ge', right: literal(a1) },
        { op: 'compare', left: read('original.jy:role/ethics', roleKey('ethics', a0)), relation: 'le', right: literal(a2) } ] };
    case 'attackRange':
      return { op: 'all', conditions: [
        { op: 'compare', left: read('original.jy:role/attack', roleKey('attack', a0)), relation: 'ge', right: literal(a1) },
        { op: 'compare', left: read('original.jy:role/attack', roleKey('attack', a0)), relation: 'le', right: literal(a2) } ] };
    case 'money':
      return { op: 'compare', left: read('original.jy:inventory', invKey(MONEY_ID)), relation: 'ge', right: literal(a0) };
    case 'sexCheck':
      return { op: 'compare', left: read('original.jy:role/sexual', roleKey('sexual', 0)), relation: 'eq', right: literal(a0) };
    case 'hasMale':
      return { op: 'compare', left: literal(0), relation: 'eq', right: literal(1) };
    case 'slotField2':
      return { op: 'compare', left: readRef(sceneSlotKeyFrom(a0, 2)), relation: 'eq', right: literal(a1) };
    case 'curItem':
      // Opcode 4 [inum, jump1, jump2]: branch when the currently used/selected item is inum.
      return { op: 'compare', left: read('original.jy:current-item', 'original.jy:item/current'),
        relation: 'eq', right: literal(a0) };
    case 'slotPicAny': {
      // Opcode 60 [snum, enum, pic, jump1, jump2]: branch when any of scene slot fields 5/6/7
      // equals pic; snum -2 resolves to the current scene.
      const slotRead = field => a0 === -2 ? readRef(sceneSlotKeyFrom(a1, field))
        : read('original.jy:scene-slots', slotKey(a0, a1, field));
      return { op: 'any', conditions: [5, 6, 7].map(field =>
        ({ op: 'compare', left: slotRead(field), relation: 'eq', right: literal(a2) })) };
    }
    case 'slot4664All':
      // Opcode 61 [jump1, jump2]: branch when current-scene slots 11..24 all have field 5 == 4664.
      return { op: 'all', conditions: Array.from({ length: 14 }, (_, i) =>
        ({ op: 'compare', left: readRef(sceneSlotKeyFrom(11 + i, 5)), relation: 'eq', right: literal(4664) })) };
    case 'allItemsPresent':
      // Opcode 50 dynamic variant: branch when all five items (args 0..4) are in inventory.
      return { op: 'all', conditions: [a0, a1, a2, a3, a4].filter(item => typeof item === 'number')
        .map(item => ({ op: 'compare', left: read('original.jy:inventory', invKey(item)), relation: 'ge', right: literal(1) })) };
    default:
      return null;
  }
}

function convertEvent(event, bundle) {
  const instructions = event.instructions;
  const wordOffsetToIndex = new Map();
  instructions.forEach((instruction, index) => wordOffsetToIndex.set(instruction.wordOffset, index));
  const steps = [];
  const diagnostics = { eventId: event.eventId, opcodeCount: instructions.length, labels: {}, uninterpreted: [], branches: [] };
  const usedTalks = new Set();
  for (let index = 0; index < instructions.length; index++) {
    const instruction = instructions[index];
    if (instruction.opcode === -1) continue;
    const op = OPCODES[instruction.opcode];
    diagnostics.labels[op.label] = (diagnostics.labels[op.label] ?? 0) + 1;
    const targets = instruction.candidateBranchTargets ?? [];
    const [yesTarget, noTarget] = targets.map(target => wordOffsetToIndex.get(target));
    switch (op.kind) {
      case 'say': {
        const talkId = instruction.args[0];
        usedTalks.add(talkId);
        steps.push({ op: 'say', dialogueId: `${PACKAGE_ID}:talk/${talkId}` });
        break;
      }
      case 'choice':
        steps.push({ op: 'choice', options: op.options.map(option => ({ id: option.id, text: option.text,
          target: option.arm === 'yes' ? yesTarget : noTarget })) });
        diagnostics.branches.push({ opcode: instruction.opcode, wordOffset: instruction.wordOffset, yes: yesTarget, no: noTarget });
        break;
      case 'branch': {
        let yes = yesTarget, no = noTarget;
        if (instruction.opcode === 50) {
          // Dynamic variant (list[0] > 128): relative jump via list[5] (yes) and list[6] (no),
          // added to the current position plus the 8-word instruction width.
          const width = 8;
          yes = wordOffsetToIndex.get(instruction.wordOffset + width + instruction.args[5]);
          no = wordOffsetToIndex.get(instruction.wordOffset + width + instruction.args[6]);
          if (instruction.args[0] <= 128 || yes === undefined || no === undefined) {
            diagnostics.uninterpreted.push({ opcode: 50, wordOffset: instruction.wordOffset,
              note: instruction.args[0] <= 128 ? 'opcode-50e-variant' : 'opcode-50-target-out-of-range' });
            steps.push({ op: 'decide', plan: { schemaVersion: 1, cases: [], otherwise: [] } });
            break;
          }
        }
        steps.push({ op: 'branch', condition: buildCondition(op, instruction.args), yes, no });
        diagnostics.branches.push({ opcode: instruction.opcode, wordOffset: instruction.wordOffset, yes, no });
        break;
      }
      case 'battle':
        steps.push({ op: 'invoke', command: { kind: 'battle', encounterId: `${PACKAGE_ID}:battle/${instruction.args[0]}` },
          outcomes: [{ id: 'victory', target: yesTarget }, { id: 'defeat', target: noTarget }, { id: 'escape', target: noTarget }] });
        diagnostics.branches.push({ opcode: instruction.opcode, wordOffset: instruction.wordOffset, yes: yesTarget, no: noTarget });
        break;
      case 'effect': {
        const plan = buildEffect(op, instruction.args, instruction);
        if (!plan.cases.length && !plan.otherwise.length)
          diagnostics.uninterpreted.push({ opcode: instruction.opcode, wordOffset: instruction.wordOffset, note: 'effect-empty' });
        steps.push({ op: 'decide', plan });
        break;
      }
      case 'end':
        if (op.diagnostic)
          diagnostics.uninterpreted.push({ opcode: instruction.opcode, wordOffset: instruction.wordOffset, note: op.note });
        steps.push({ op: 'end' });
        break;
      case 'noop':
        if (op.note) diagnostics.uninterpreted.push({ opcode: instruction.opcode, wordOffset: instruction.wordOffset, note: op.note });
        steps.push({ op: 'decide', plan: { schemaVersion: 1, cases: [], otherwise: [] } });
        break;
      default:
        steps.push({ op: 'decide', plan: { schemaVersion: 1, cases: [], otherwise: [] } });
    }
  }
  steps.push({ op: 'end' });
  return { steps, diagnostics, usedTalks };
}

export function buildOriginalEventsContent() {
  const bundle = loadCorpus();
  const convertible = [];
  const blocked = [];
  for (const event of bundle.events) {
    const unsupported = [...new Set(event.instructions.filter(instruction =>
      instruction.opcode !== -1 && !OPCODES[instruction.opcode]).map(instruction => instruction.opcode))];
    if (unsupported.length) blocked.push({ eventId: event.eventId, opcodes: unsupported });
    else convertible.push(event);
  }
  const keys = collectKeys(convertible);
  const domains = buildDomains(keys);
  const events = {};
  const dialogues = {};
  const eventDiagnostics = [];
  for (const event of convertible) {
    const { steps, diagnostics, usedTalks } = convertEvent(event, bundle);
    events[`${PACKAGE_ID}:event/${event.eventId}`] = { steps };
    eventDiagnostics.push(diagnostics);
    for (const talkId of usedTalks) {
      const dialogueId = `${PACKAGE_ID}:talk/${talkId}`;
      if (dialogues[dialogueId]) continue;
      const talk = bundle.talks[talkId];
      const sayInstruction = event.instructions.find(instruction => instruction.opcode === 1 && instruction.args[0] === talkId);
      dialogues[dialogueId] = { speaker: `Portrait ${sayInstruction?.args[1] ?? 0}`, text: talkText(talk) };
    }
  }
  const content = {
    schemaVersion: 2, id: PACKAGE_ID, version: VERSION, classification: 'original-derived',
    entry: { mapId: `${PACKAGE_ID}:map/start`, x: 0, y: 0 },
    decision: { schemaVersion: 1, domains }, dialogues, events,
  };
  const serialized = JSON.stringify(content, null, 2) + '\n';
  const digest = createHash('sha256').update(serialized).digest('hex').slice(0, 16);
  const diagnostics = {
    schemaVersion: 1, converterVersion: VERSION, packageId: PACKAGE_ID,
    contentSha256: null, corpusSha256: bundle.inputs?.find(input => input.sourceFile === 'KDEF.GRP')?.sha256,
    summary: { totalEvents: bundle.events.length, converted: convertible.length, blocked: blocked.length,
      dialogues: Object.keys(dialogues).length,
      opcodeLabels: Object.fromEntries(Object.entries(
        eventDiagnostics.reduce((acc, row) => { for (const [label, count] of Object.entries(row.labels)) acc[label] = (acc[label] ?? 0) + count; return acc; }, {}))
        .sort((a, b) => a[0].localeCompare(b[0]))) },
    blocked, eventDiagnostics,
  };
  return { content, diagnostics, digest };
}

export async function convertOriginalEventsGeneric() {
  const { content, diagnostics, digest } = buildOriginalEventsContent();
  const resolved = await resolveControlledEventContent(content);
  diagnostics.contentSha256 = resolved.identity.sha256;
  return { content, diagnostics, digest };
}

export function writeOriginalEventsLocal(projectRoot, { content, diagnostics, digest }) {
  const output = new URL(`file://${projectRoot}/assets/generated/original-events/`.replace(/\\/g, '/'));
  const dir = output.pathname.replace(/^\/([A-Za-z]:)/, '$1');
  mkdirSync(dir, { recursive: true });
  const contentPath = `${dir}/original-events-${digest}.local.json`;
  const diagnosticsPath = `${dir}/original-events-${digest}.diagnostics.local.json`;
  writeFileSync(contentPath, JSON.stringify(content, null, 2) + '\n', 'utf8');
  writeFileSync(diagnosticsPath, JSON.stringify(diagnostics, null, 2) + '\n', 'utf8');
  return { contentPath, diagnosticsPath };
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('\\').pop())) {
  convertOriginalEventsGeneric()
    .then(({ content, diagnostics, digest }) => {
      const paths = writeOriginalEventsLocal(process.cwd(), { content, diagnostics, digest });
      console.log(JSON.stringify({ digest, ...paths, summary: diagnostics.summary }, null, 1));
    })
    .catch(error => { console.error(error.message); process.exit(1); });
}
