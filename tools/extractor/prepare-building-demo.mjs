import {mkdir,writeFile,readFile,realpath} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolveContent,canonical} from '../../packages/game-core/src/content.ts';

/** Independent authored test structure; does not infer any original roof or door. */
export function buildingDemo(){
  const id='mock.building-cutaway',mapId=`${id}:map/workshop`,cells=[],blocked=new Set();
  const part=(w,h,d,y,color)=>({size:{width:w,height:h,depth:d},offset:{x:0,y,z:0},rotationY:0,material:{id:`mock:${color.slice(1)}`,color}});
  function visual(x,z,parts,cutaway=false){cells.push({assets:[{asset:{height:1,color:parts[0].material.color,cutaway,
    geometry:{version:1,classification:'mock',parts}},world:{x,y:0,z}}]});}
  for(let z=0;z<7;z++)for(let x=0;x<7;x++)visual(x,z,[part(1,.12,1,-.12,x===3&&(z===4||z===5)?'#77ad88':'#c7c3ac')]);
  for(let x=1;x<=5;x++)for(let z=1;z<=4;z++)if(x===1||x===5||z===1||z===4){
    if(x===3&&z===4){visual(x,z,[part(1,.25,.15,1.35,'#9b713c')],true);continue;}
    blocked.add(z*7+x);
    const side=x===1||x===5;
    if(x===1&&z===2)visual(x,z,[part(.15,.6,1,0,'#ae8870'),part(.15,.35,1,1.25,'#ae8870')],true);
    else visual(x,z,[part(side?.15:1,1.6,side?1:.15,0,'#ae8870')],true);
  }
  // Roof is a separate view-only asset, not a ceiling collision volume.
  visual(3,2.5,[part(5,.2,4,1.8,'#536c8b')],true);
  visual(2,2,[part(.8,.12,.8,.65,'#8b623b')]);blocked.add(2*7+2);
  return {package:{manifest:{id,version:'0.1.0',schemaVersion:1,runtimeVersion:'0.1.0',kind:'base',classification:'mock',
    license:'Independent Mock building geometry; no original resources.',ruleset:'mock-building-cutaway-v1',priority:0,dependencies:[]},
    entry:{mapId,x:3,y:5},maps:[{id:mapId,name:'Mock 建築剖視測試',width:7,height:7,blocked:[...blocked].sort((a,b)=>a-b),npcs:[],portals:[]}],
    events:[],dialogues:[],items:[],patches:[]},assembled:{version:'0.1.0',cells},
    previewNotes:['入口（3,4）可通行，牆與桌子仍阻擋；窗洞不代表角色可以穿牆。','勾選下方選項隱藏屋頂與牆面，觀察室內；只改顯示，不改通行。','這是獨立 Mock 建築，不代表原版的屋頂、門扇或室內還原。']};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  try{
    if(process.argv.length!==2)throw new Error('Usage: node tools/extractor/prepare-building-demo.mjs');
    const bundle=buildingDemo();await resolveContent([bundle.package]);
    const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),output=path.join(project,'assets/generated/building-demo');
    await mkdir(output,{recursive:true});const relative=path.relative(await realpath(path.join(project,'assets/generated')),await realpath(output));
    if(!relative||relative.startsWith('..')||path.isAbsolute(relative))throw new Error('OUTPUT_OUTSIDE_GENERATED');
    const destination=path.join(output,'mock-building-cutaway.json'),text=JSON.stringify(bundle,null,2)+'\n';
    try{await writeFile(destination,text,{flag:'wx'});}catch(error){if(error.code!=='EEXIST'||canonical(JSON.parse(await readFile(destination,'utf8')))!==canonical(bundle))throw error;}
    console.log(destination);
  }catch(error){console.error(error.message);process.exitCode=1;}
}
