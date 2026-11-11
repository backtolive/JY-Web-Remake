import {test,expect} from '@playwright/test';
import {existsSync,readdirSync,readFileSync,statSync} from 'node:fs';
import path from 'node:path';
import {resolveContent,createGame,dispatch,serializeSave} from '../../packages/game-core/src/index';
test('Full local world imports, streams beyond a local tile window, and restores distant coordinates',async({page},info)=>{
  test.setTimeout(90_000);
  const dir='assets/generated/world-preview',file=existsSync(dir)?readdirSync(dir).filter(f=>/^world-.*\.local\.json$/.test(f)).sort((a,b)=>statSync(path.join(dir,a)).mtimeMs-statSync(path.join(dir,b)).mtimeMs).at(-1):undefined;
  test.skip(!file,'Local original world is not required in CI.');
  const full=path.resolve(dir,file!),bundle=JSON.parse(readFileSync(full,'utf8'));
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('./');await expect(page.locator('.scene-frame')).toHaveAttribute('data-renderer','ready');
  await page.getByText('內容與測試設定',{exact:true}).click();
  const pending=page.waitForEvent('filechooser');await page.getByRole('button',{name:'匯入完整世界地圖',exact:true}).click();await(await pending).setFiles(full);
  await expect(page.getByRole('heading',{name:'世界地圖原圖投影',exact:true})).toBeVisible();
  await expect(page.locator('.scene-frame')).toHaveAttribute('data-renderer','ready',{timeout:60_000});
  await page.locator('.world-canvas').screenshot({path:info.outputPath('world-entry.png')});
  await page.locator('.world-canvas').screenshot({path:'assets/generated/world-preview/world-entry.png'});
  const content=await resolveContent([bundle.package]);let state=createGame(content,42);
  // Derive an actual free path crossing a 16-cell partition; do not invent a test corridor in original data.
  const map=content.maps[state.mapId]!,blocked=new Set(map.blocked),start=state.y*480+state.x,previous=new Map<number,{from:number;direction:string}>(),queue=[start];previous.set(start,{from:-1,direction:''});let goal=start;
  const directions=[['east',1,0],['south',0,1],['west',-1,0],['north',0,-1]] as const;
  for(let i=0;i<queue.length;i++){
    const c=queue[i]!,x=c%480,y=Math.floor(c/480);
    if(Math.abs(x-state.x)+Math.abs(y-state.y)>=20){goal=c;break;}
    for(const [direction,dx,dy] of directions){const nx=x+dx,ny=y+dy,n=ny*480+nx;if(nx<0||ny<0||nx>=480||ny>=480||blocked.has(n)||previous.has(n))continue;previous.set(n,{from:c,direction});queue.push(n);}
  }
  const moves:string[]=[];for(let c=goal;c!==start;c=previous.get(c)!.from)moves.unshift(previous.get(c)!.direction);
  expect(moves.length).toBeGreaterThanOrEqual(20);
  const buttons:Record<string,string>={east:'向右下移動',south:'向左下移動',west:'向左上移動',north:'向右上移動'};
  for(const direction of moves){await page.getByRole('button',{name:buttons[direction]!,exact:true}).click();state=dispatch(content,state,{type:'MOVE',direction:direction as 'east'}).state;}
  await expect(page.getByRole('img',{name:`地圖位置：${state.x}, ${state.y}`,exact:true})).toBeVisible();
  await page.locator('.world-canvas').screenshot({path:info.outputPath('world-walked.png')});
  await page.getByRole('button',{name:'儲存進度',exact:true}).click();
  // Save import drives a far-away visible tile set through the same renderer update path.
  let far=-1;for(let i=map.width*300;i<map.width*470;i++)if(!blocked.has(i)){far=i;break;}
  expect(far).toBeGreaterThan(0);const farState={...state,x:far%480,y:Math.floor(far/480)};
  const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'匯入存檔',exact:true}).click();await(await chooser).setFiles({name:'world-save.json',mimeType:'application/json',buffer:Buffer.from(serializeSave(content,farState))});
  await expect(page.getByRole('img',{name:`地圖位置：${farState.x}, ${farState.y}`,exact:true})).toBeVisible();
  await page.locator('.world-canvas').screenshot({path:info.outputPath('world-distant.png')});
  await expect(page.getByRole('alert')).toHaveCount(0);expect(errors).toEqual([]);
});
