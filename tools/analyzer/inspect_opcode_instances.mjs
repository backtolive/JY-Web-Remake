// Read-only: dump all instruction instances for a set of opcodes from the local corpus.
import { readFileSync, readdirSync } from 'node:fs';

const dir = 'assets/generated/event-corpus';
const file = readdirSync(dir).find(name => name.startsWith('all-events-') && name.endsWith('.local.json'));
if (!file) throw new Error('CORPUS_MISSING');
const bundle = JSON.parse(readFileSync(`${dir}/${file}`, 'utf8'));
const ops = new Set((process.argv[2] ?? '4,15,19,25,26,28,29,31,42,43,50,55,60,61,62,64,35,33,44').split(',').map(Number));
for (const event of bundle.events) {
  for (const instruction of event.instructions) {
    if (!ops.has(instruction.opcode)) continue;
    const targets = instruction.candidateBranchTargets ? ` -> ${instruction.candidateBranchTargets.join('/')}` : '';
    console.log(`e${event.eventId} w${instruction.wordOffset} op${instruction.opcode} ${JSON.stringify(instruction.args)}${targets}`);
  }
}
