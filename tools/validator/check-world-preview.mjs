import {readFile,writeFile} from 'node:fs/promises';
import {resolveContent,createGame,serializeSave,restoreSave} from '../../packages/game-core/src/index.ts';
import {decodeProjectedMap,visibleProjectedTiles} from '../../packages/game-data/src/projected-map.ts';
const file=process.argv[2];if(!file)throw new Error('Usage: node tools/validator/check-world-preview.mjs <world.json>');
const bundle=JSON.parse(await readFile(file)),content=await resolveContent([bundle.package]),state=createGame(content,42),map=content.maps[state.mapId];
const projected=await decodeProjectedMap(bundle.projectedMap),blocked=new Set(map.blocked),visited=new Uint8Array(map.width*map.height),queue=new Int32Array(visited.length);
let tail=1;queue[0]=state.y*map.width+state.x;visited[queue[0]]=1;let minX=state.x,maxX=state.x,minY=state.y,maxY=state.y;
for(let i=0;i<tail;i++){
  const cell=queue[i],x=cell%map.width,y=Math.floor(cell/map.width);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
  for(const [nx,ny] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]){
    if(nx<0||ny<0||nx>=map.width||ny>=map.height)continue;const n=ny*map.width+nx;
    if(visited[n]||blocked.has(n))continue;visited[n]=1;queue[tail++]=n;
  }
}
let restored=0;for(const index of [0,Math.floor(tail/4),Math.floor(tail/2),tail-1]){
  const c=queue[index],s={...state,x:c%map.width,y:Math.floor(c/map.width)};
  const result=restoreSave(content,serializeSave(content,s));if(result.x!==s.x||result.y!==s.y)throw new Error('WORLD_SAVE');restored++;
}
const groups=visibleProjectedTiles(projected,state.x,state.y);
const report={status:'PASS',cells:map.width*map.height,independentImages:projected.images.length,layerIds:projected.layers.map(l=>({id:l.id,usedIds:new Set(l.values).size-Number(l.values.includes(0)),nonzeroCells:l.values.reduce((n,v)=>n+Number(v>0),0)})),
  blocked:blocked.size,passable:visited.length-blocked.size,reachableFromEntry:tail,unreachablePassable:visited.length-blocked.size-tail,reachableBounds:{minX,maxX,minY,maxY},entry:content.entry,saveRoundTrips:restored,
  initialVisibleResources:groups.size,initialVisibleInstances:[...groups.values()].reduce((n,g)=>n+g.cells.length,0)};
await writeFile('assets/generated/world-preview/validation.local.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
