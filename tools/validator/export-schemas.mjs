import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { contentSchema, saveSchema } from '../../packages/game-core/src/schema.ts';
import { canonical } from '../../packages/game-core/src/content.ts';

const check=process.argv.includes('--check');
if(!check)await mkdir('schemas',{recursive:true});
for(const [file,schema] of [['game-content.schema.json',contentSchema],['save.schema.json',saveSchema]]){
  const target=`schemas/${file}`;
  if(check){if(canonical(JSON.parse(await readFile(target,'utf8')))!==canonical(schema))throw new Error(`STALE_SCHEMA:${target}`);}
  else await writeFile(target,JSON.stringify(schema,null,2)+'\n');
}
console.log(check?'Shared schemas match runtime validators':'Shared schemas exported');
