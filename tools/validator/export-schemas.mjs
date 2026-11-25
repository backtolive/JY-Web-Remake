import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { contentSchema, saveSchema } from '../../packages/game-core/src/schema.ts';
import { decisionDomainsSchema, decisionStateSchema, decisionTransactionSchema,
  decisionPlanSchema, decisionConditionSchema } from '../../packages/game-core/src/decision-schema.ts';
import { decisionEventContentSchema, decisionEventSaveSchema } from '../../packages/game-core/src/decision-event-schema.ts';
import { controlledCommandSchema, controlledResultSchema, controlledEventContentSchema,
  controlledEventSaveSchema } from '../../packages/game-core/src/controlled-event-schema.ts';
import { unifiedSessionSaveSchema } from '../../packages/game-core/src/unified-session-schema.ts';
import { canonical } from '../../packages/game-core/src/content.ts';

const check=process.argv.includes('--check');
if(!check)await mkdir('schemas',{recursive:true});
for(const [file,schema] of [['game-content.schema.json',contentSchema],['save.schema.json',saveSchema],
  ['decision-domains.schema.json',decisionDomainsSchema],['decision-state.schema.json',decisionStateSchema],
  ['decision-transaction.schema.json',decisionTransactionSchema],['decision-plan.schema.json',decisionPlanSchema],
  ['decision-condition.schema.json',decisionConditionSchema],
  ['decision-event-content.schema.json',decisionEventContentSchema],['decision-event-save.schema.json',decisionEventSaveSchema],
  ['controlled-command.schema.json',controlledCommandSchema],['controlled-result.schema.json',controlledResultSchema],
  ['controlled-event-content.schema.json',controlledEventContentSchema],['controlled-event-save.schema.json',controlledEventSaveSchema],
  ['unified-session-save.schema.json',unifiedSessionSaveSchema]]){
  const target=`schemas/${file}`;
  if(check){if(canonical(JSON.parse(await readFile(target,'utf8')))!==canonical(schema))throw new Error(`STALE_SCHEMA:${target}`);}
  else await writeFile(target,JSON.stringify(schema,null,2)+'\n');
}
console.log(check?'Shared schemas match runtime validators':'Shared schemas exported');
