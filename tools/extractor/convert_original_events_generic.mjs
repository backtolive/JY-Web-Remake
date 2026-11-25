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

// The 54 evidence-scoped opcodes. `kind` drives step generation; `label` is the rule status.
const OPCODES = {
  0: { kind: 'noop', label: 'Community Implementation', note: 'no-op' },
  1: { kind: 'say', label: 'Community Implementation', note: 'dialogue' },
  2: { kind: 'effect', effect: 'inventoryAdd', label: 'Community Implementation' },
  3: { kind: 'effect', effect: 'slotWrite', label: 'Inferred' },
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
  16: { kind: 'branch', condition: 'roleInParty', label: 'Community Implementation' },
  17: { kind: 'noop', label: 'Community Implementation', note: 'scene-tile-uninterpreted' },
  18: { kind: 'branch', condition: 'itemPresent', label: 'Inferred' },
  20: { kind: 'branch', condition: 'partyFull', label: 'Community Implementation' },
  21: { kind: 'effect', effect: 'partyRemove', label: 'Community Implementation' },
  22: { kind: 'noop', label: 'Community Implementation', note: 'no-op' },
  23: { kind: 'effect', effect: 'roleSet', field: 'poison', label: 'Community Implementation' },
  26: { kind: 'effect', effect: 'slotAdd', label: 'Inferred' },
  27: { kind: 'effect', effect: 'slotSet567', label: 'Inferred' },
  28: { kind: 'branch', condition: 'ethicsRange', label: 'Community Implementation' },
  29: { kind: 'branch', condition: 'attackRange', label: 'Community Implementation' },
  31: { kind: 'branch', condition: 'money', label: 'Community Implementation' },
  32: { kind: 'effect', effect: 'inventoryAdd', label: 'Community Implementation' },
  33: { kind: 'noop', label: 'Community Implementation', note: 'skill-learn-uninterpreted' },
  34: { kind: 'effect', effect: 'roleAdd', field: 'aptitude', label: 'Community Implementation' },
  35: { kind: 'noop', label: 'Community Implementation', note: 'skill-slot-uninterpreted' },
  36: { kind: 'branch', condition: 'sexCheck', label: 'Community Implementation' },
  37: { kind: 'effect', effect: 'roleAdd0', field: 'ethics', label: 'Community Implementation' },
  38: { kind: 'noop', label: 'Community Implementation', note: 'scene-layer-uninterpreted' },
  39: { kind: 'effect', effect: 'sceneReset', label: 'Community Implementation' },
  40: { kind: 'noop', label: 'Community Implementation', note: 'facing' },
  41: { kind: 'noop', label: 'Community Implementation', note: 'carried-item-uninterpreted' },
  42: { kind: 'branch', condition: 'hasMale', label: 'Unknown' },
  43: { kind: 'branch', condition: 'itemPresent', label: 'Inferred' },
  45: { kind: 'effect', effect: 'roleAdd', field: 'speed', label: 'Community Implementation' },
  46: { kind: 'effect', effect: 'roleAdd', field: 'max-mp', label: 'Community Implementation' },
  47: { kind: 'effect', effect: 'roleAdd', field: 'attack', label: 'Community Implementation' },
  48: { kind: 'effect', effect: 'roleAdd', field: 'max-hp', label: 'Community Implementation' },
  49: { kind: 'effect', effect: 'roleSet', field: 'mp-type', label: 'Community Implementation' },
  50: { kind: 'noop', label: 'Community Implementation', note: 'dynamic-variant-uninterpreted' },
  52: { kind: 'noop', label: 'Community Implementation', note: 'no-op' },
  53: { kind: 'noop', label: 'Community Implementation', note: 'no-op' },
  54: { kind: 'noop', label: 'Community Implementation', note: 'no-op' },
  55: { kind: 'branch', condition: 'slotField2', label: 'Verified Original' },
  56: { kind: 'effect', effect: 'roleAdd0', field: 'repute', label: 'Community Implementation' },
  59: { kind: 'effect', effect: 'partyClear', label: 'Community Implementation' },
  63: { kind: 'effect', effect: 'roleSet', field: 'sexual', label: 'Community Implementation' },
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
const sceneName = value => (value === -2 ? 'current' : String(value));

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
  const sceneRecords = new Set();
  const roles = new Set();
  for (const event of events) {
    for (const instruction of event.instructions) {
      const op = OPCODES[instruction.opcode];
      if (!op || instruction.opcode === -1) continue;
      const [a0, a1, a2, a3, a4] = instruction.args;
      switch (op.effect ?? op.condition) {
        case 'inventoryAdd': inventory.add(a0); break;
        case 'itemPresent': inventory.add(a0); break;
        case 'slotWrite':
          if (typeof a0 === 'number' && typeof a1 === 'number')
            for (let field = 0; field < SLOT_FIELDS; field++) sceneSlots.add(slotKey(sceneName(a0), a1, field));
          break;
        case 'slotAdd':
          if (typeof a0 === 'number' && typeof a1 === 'number')
            for (const field of [2, 3, 4]) sceneSlots.add(slotKey(sceneName(a0), a1, field));
          break;
        case 'slotSet567':
          if (typeof a0 === 'number') for (const field of [5, 6, 7]) sceneSlots.add(slotKey('current', a0, field));
          break;
        case 'slotField2':
          if (typeof a0 === 'number') sceneSlots.add(slotKey('current', a0, 2));
          break;
        case 'sceneReset': if (typeof a0 === 'number') sceneRecords.add(sceneRecordKey(a0)); break;
        case 'partyAdd': case 'partyRemove': if (typeof a0 === 'number') roles.add(a0); break;
        case 'roleSet': case 'roleAdd': if (typeof a0 === 'number') roles.add(a0); break;
        case 'roleAdd0': roles.add(0); break;
        default: break;
      }
    }
  }
  return { inventory: [...inventory].sort((a, b) => a - b), sceneSlots: [...sceneSlots],
    sceneRecords: [...sceneRecords], roles: [...roles].sort((a, b) => a - b) };
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
      allowedKeys: keys.sceneSlots },
    'original.jy:scene-records': { kind: 'integer', default: 0, min: 0, max: 1_000_000,
      allowedKeys: keys.sceneRecords },
  };
  for (const field of ROLE_FIELDS) {
    domains[`original.jy:role/${field}`] = { kind: 'integer', default: 0, min: -1_000_000, max: 1_000_000,
      allowedKeys: keys.roles.length ? keys.roles.map(role => roleKey(field, role))
        : Array.from({ length: ROLE_COUNT }, (_, role) => roleKey(field, role)) };
  }
  return domains;
}

function buildEffect(op, args, instruction) {
  const [a0, a1, a2, a3, a4] = args;
  switch (op.effect) {
    case 'inventoryAdd':
      return [{ op: 'add', target: { domain: 'original.jy:inventory', key: invKey(a0) }, amount: literal(a1) }];
    case 'partyAdd':
      return [{ op: 'listAdd', target: { domain: 'original.jy:party', key: partyKey }, value: literal(String(a0)) }];
    case 'partyRemove':
      return [{ op: 'listRemove', target: { domain: 'original.jy:party', key: partyKey }, value: literal(String(a0)) }];
    case 'partyClear':
      return [{ op: 'set', target: { domain: 'original.jy:party', key: partyKey }, value: literal([]) }];
    case 'roleSet':
      return [{ op: 'set', target: { domain: `original.jy:role/${op.field}`, key: roleKey(op.field, a0) }, value: literal(a1) }];
    case 'roleAdd':
      return [{ op: 'add', target: { domain: `original.jy:role/${op.field}`, key: roleKey(op.field, a0) }, amount: literal(a1) }];
    case 'roleAdd0':
      return [{ op: 'add', target: { domain: `original.jy:role/${op.field}`, key: roleKey(op.field, 0) }, amount: literal(a0) }];
    case 'sceneReset':
      return [{ op: 'set', target: { domain: 'original.jy:scene-records', key: sceneRecordKey(a0) }, value: literal(0) }];
    case 'slotWrite': {
      const effects = [];
      for (let field = 0; field < SLOT_FIELDS; field++) {
        const value = args[2 + field];
        if (typeof value === 'number' && value !== -2)
          effects.push({ op: 'set', target: { domain: 'original.jy:scene-slots', key: slotKey(sceneName(a0), a1, field) }, value: literal(value) });
      }
      return effects;
    }
    case 'slotAdd':
      return [2, 3, 4].map(field => ({ op: 'add',
        target: { domain: 'original.jy:scene-slots', key: slotKey(sceneName(a0), a1, field) }, amount: literal(args[2 + field - 2]) }));
    case 'slotSet567':
      return [5, 6, 7].map(field => ({ op: 'set',
        target: { domain: 'original.jy:scene-slots', key: slotKey('current', a0, field) }, value: literal(a2) }));
    default:
      return [];
  }
}

function buildCondition(op, args) {
  const [a0, a1, a2] = args;
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
      return { op: 'compare', left: read('original.jy:scene-slots', slotKey('current', a0, 2)), relation: 'eq', right: literal(a1) };
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
        steps.push({ op: 'branch', condition: buildCondition(op, instruction.args), yes: yesTarget, no: noTarget });
        diagnostics.branches.push({ opcode: instruction.opcode, wordOffset: instruction.wordOffset, yes: yesTarget, no: noTarget });
        break;
      }
      case 'battle':
        steps.push({ op: 'invoke', command: { kind: 'battle', encounterId: `${PACKAGE_ID}:battle/${instruction.args[0]}` },
          outcomes: [{ id: 'victory', target: yesTarget }, { id: 'defeat', target: noTarget }, { id: 'escape', target: noTarget }] });
        diagnostics.branches.push({ opcode: instruction.opcode, wordOffset: instruction.wordOffset, yes: yesTarget, no: noTarget });
        break;
      case 'effect': {
        const effects = buildEffect(op, instruction.args, instruction);
        if (!effects.length) diagnostics.uninterpreted.push({ opcode: instruction.opcode, wordOffset: instruction.wordOffset, note: 'effect-empty' });
        // partyRemove is guarded by contains: removing a member who is not in the party is a
        // no-op, so events can run from a fresh preview state without LIST_MISSING.
        const plan = op.effect === 'partyRemove'
          ? { schemaVersion: 1,
              cases: [{ when: { op: 'contains', list: read('original.jy:party', partyKey),
                value: literal(String(instruction.args[0])) }, effects }],
              otherwise: [] }
          : { schemaVersion: 1, cases: [], otherwise: effects };
        steps.push({ op: 'decide', plan });
        break;
      }
      case 'end':
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
