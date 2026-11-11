import { mkdir,writeFile,realpath,readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath,pathToFileURL } from 'node:url';
import { placeholderRock } from './placeholder-rock.mjs';
import { canonical,resolveContent } from '../../packages/game-core/src/content.ts';

/** Independent Mock; visual geometry never determines logical occupancy. */
export function collisionDemo(){
  const rock=placeholderRock(),id='mock.rock-collision',mapId=`${id}:map/demo`;
  const model={version:1,assetId:'authored.placeholder:rock',dataUri:rock.dataUri,sha256:rock.sha256,
    scale:{x:.7,y:.4,z:.6},offset:{x:0,y:0,z:0},rotationY:0};
  const cells=[];
  for(let y=0;y<4;y++)for(let x=0;x<5;x++){
    const color=y===1&&x===2?'#54a779':y===1&&x===3?'#c5635b':'#a8ad8b';
    cells.push({assets:[{asset:{kind:'box',color,height:.12,geometry:{version:1,classification:'mock',parts:[{
      size:{width:1,height:.12,depth:1},offset:{x:0,y:-.12,z:0},rotationY:0,material:{id:`mock:floor/${color.slice(1)}`,color}}]}},world:{x,y:0,z:y}}]});
  }
  for(const x of [2,3])cells.push({assets:[{asset:{kind:'box',color:'#665544',height:.4,model:structuredClone(model)},world:{x,y:0,z:1}}]});
  return {package:{manifest:{id,version:'0.1.0',schemaVersion:1,runtimeVersion:'0.1.0',kind:'base',classification:'mock',
    license:'Original Mock geometry and test content; no original game resources.',ruleset:'mock-grid-collision-v1',priority:0,dependencies:[]},
    entry:{mapId,x:1,y:1},maps:[{id:mapId,name:'Mock 石頭碰撞對照',width:5,height:4,blocked:[8],npcs:[],portals:[]}],
    dialogues:[],events:[],items:[],patches:[]},assembled:{version:'0.1.0',cells},
    previewNotes:['綠格（2,1）：裝飾石頭，可走入該格。','紅格（3,1）：阻擋石頭，整格無法通行。','兩顆使用相同 GLB 與尺寸；通行由獨立地圖設定決定。']};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  try{
    if(process.argv.length!==2)throw new Error('Usage: node tools/extractor/prepare-collision-demo.mjs');
    const bundle=collisionDemo();await resolveContent([bundle.package]);
    const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),output=path.join(project,'assets/generated/collision-demo');
    await mkdir(output,{recursive:true});
    const relative=path.relative(await realpath(path.join(project,'assets/generated')),await realpath(output));
    if(!relative||relative.startsWith('..')||path.isAbsolute(relative))throw new Error('OUTPUT_OUTSIDE_GENERATED');
    const destination=path.join(output,'mock-rock-collision.json');
    try{await writeFile(destination,JSON.stringify(bundle,null,2)+'\n',{flag:'wx'});}catch(error){if(error.code!=='EEXIST'||canonical(JSON.parse(await readFile(destination,'utf8')))!==canonical(bundle))throw error;}
    console.log(destination);
  }catch(error){console.error(error.message);process.exitCode=1;}
}
