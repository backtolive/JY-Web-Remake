import {mkdir,writeFile,readFile,realpath} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {placeholderRock} from './placeholder-rock.mjs';
import {collisionDemo} from './prepare-collision-demo.mjs';

if(process.argv.length!==2)throw new Error('Usage: node tools/extractor/prepare-model-replacement-demo.mjs');
const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const output=path.join(project,'assets/generated/model-replacement-demo');await mkdir(output,{recursive:true});
const relative=path.relative(await realpath(path.join(project,'assets/generated')),await realpath(output));
if(!relative||relative.startsWith('..')||path.isAbsolute(relative))throw new Error('OUTPUT_OUTSIDE_GENERATED');
const variant=placeholderRock({uniformScale:2,translation:[4,2,-3],color:[.18,.24,.4,1]});
for(const [name,bytes] of [['mock-collision.json',Buffer.from(JSON.stringify(collisionDemo(),null,2)+'\n')],['shifted-blue-rock.glb',variant.bytes]]){
  const destination=path.join(output,name);
  try{await writeFile(destination,bytes,{flag:'wx'});}catch(error){if(error.code!=='EEXIST'||!Buffer.from(await readFile(destination)).equals(bytes))throw error;}
  console.log(destination);
}
