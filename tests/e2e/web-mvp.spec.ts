import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test.beforeEach(async({page})=>{
  await page.goto('./');
  await expect(page.getByRole('heading',{name:'練功房',exact:true})).toBeVisible();
  await expect(page.locator('.scene-frame')).toHaveAttribute('data-renderer','ready');
});

async function position(page:Page,x:number,y:number){
  await expect(page.getByRole('img',{name:`地圖位置：${x}, ${y}`,exact:true})).toBeVisible();
}
async function startDialogue(page:Page){await page.getByRole('button',{name:/^與鄰近人物互動/}).click();await expect(page.getByRole('region',{name:'對話',exact:true})).toBeVisible();}
async function chooseReward(page:Page){await page.getByRole('button',{name:'繼續 ↵',exact:true}).click();await page.getByRole('button',{name:'01 領取 →',exact:true}).click();await expect(page.getByText('練習銅錢',{exact:true})).toBeVisible();}
async function settings(page:Page){await page.getByText('內容與測試設定',{exact:true}).click();}
async function pickFile(page:Page,buttonName:string,file:string){
  const pending=page.waitForEvent('filechooser');await page.getByRole('button',{name:buttonName,exact:true}).click();await(await pending).setFiles(file);
}

/** Read actual WebGL output pixels; no access to internal game/renderer state. */
async function playerPixels(page:Page){
  return page.locator('.world-canvas').evaluate((source:HTMLCanvasElement)=>{
    const canvas=document.createElement('canvas');canvas.width=source.width;canvas.height=source.height;
    const ctx=canvas.getContext('2d')!;ctx.drawImage(source,0,0);
    const {data}=ctx.getImageData(0,0,canvas.width,canvas.height),w=canvas.width,h=canvas.height;
    const mask=new Uint8Array(w*h);
    for(let i=0;i<mask.length;i++){
      const r=data[i*4]!,g=data[i*4+1]!,b=data[i*4+2]!;
      if(r<90&&g>50&&g<175&&b>35&&b<155&&g>r*1.3&&b>r*1.1)mask[i]=1;
    }
    let largest={x:0,y:0,count:0};
    for(let start=0;start<mask.length;start++)if(mask[start]){
      const queue=[start];mask[start]=0;let sx=0,sy=0,count=0;
      for(let n=0;n<queue.length;n++){
        const cell=queue[n]!,x=cell%w,y=Math.floor(cell/w);sx+=x;sy+=y;count++;
        for(const neighbor of [x>0?cell-1:-1,x<w-1?cell+1:-1,y>0?cell-w:-1,y<h-1?cell+w:-1]){
          if(neighbor>=0&&mask[neighbor]){mask[neighbor]=0;queue.push(neighbor);}
        }
      }
      if(count>largest.count)largest={x:sx/count,y:sy/count,count};
    }
    return largest;
  });
}
async function miniPlayerPixels(page:Page){
  return page.locator('.map-card .mini-map').evaluate((canvas:HTMLCanvasElement)=>{
    const {data}=canvas.getContext('2d')!.getImageData(0,0,canvas.width,canvas.height);
    let x=0,y=0,count=0;
    for(let i=0;i<data.length;i+=4)if(data[i]!<40&&data[i+1]!>40&&data[i+1]!<90&&data[i+2]!>35&&data[i+2]!<90){
      x+=(i/4)%canvas.width;y+=Math.floor(i/4/canvas.width);count++;
    }
    return {x:x/count,y:y/count,count};
  });
}
async function screenStep(page:Page,key:string,dx:number,dy:number){
  const miniBefore=await miniPlayerPixels(page);expect(miniBefore.count).toBeGreaterThan(0);
  const before=await playerPixels(page);expect(before.count).toBeGreaterThan(20);
  await page.keyboard.press(key);
  let last=before,stable=0;
  await expect.poll(async()=>{
    const current=await playerPixels(page);
    const sx=current.x-before.x,sy=current.y-before.y;
    const correct=(dx===0?Math.abs(sx)<3:sx*dx>5)&&(dy===0?Math.abs(sy)<3:sy*dy>5);
    stable=correct&&Math.abs(current.x-last.x)<0.6&&Math.abs(current.y-last.y)<0.6?stable+1:0;last=current;
    return stable>=2;
  },{intervals:[60,80,100],message:`${key} must move the rendered player in screen direction ${dx},${dy}`}).toBe(true);
  const miniAfter=await miniPlayerPixels(page);expect(miniAfter.count).toBeGreaterThan(0);
  const mx=miniAfter.x-miniBefore.x,my=miniAfter.y-miniBefore.y;
  expect(dx===0?Math.abs(mx)<2:mx*dx>2,`${key}: minimap horizontal direction matches WebGL`).toBe(true);
  expect(dy===0?Math.abs(my)<2:my*dy>2,`${key}: minimap vertical direction matches WebGL`).toBe(true);
}

test('actual rendered movement follows arrows; collision, quick chord and exits stay correct',async({page},info)=>{
  await page.getByRole('button',{name:'向左移動',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('前方無法通行');await position(page,1,1);
  // A quick two-key chord must reach the adjacent exit instead of taking an extra single-key step.
  await page.keyboard.down('w');await page.keyboard.down('d');await page.keyboard.up('d');await page.keyboard.up('w');
  await expect(page.getByRole('heading',{name:'庭院',exact:true})).toBeVisible();
  await expect(page.locator('.scene-frame')).toHaveAttribute('data-renderer','ready');
  await page.getByRole('button',{name:'向右移動',exact:true}).click();await position(page,2,2);
  // Allow the visible actor to settle before the pixel-based directional checks.
  let previous=await playerPixels(page),stable=0;
  await expect.poll(async()=>{const p=await playerPixels(page);stable=p.count>20&&Math.abs(p.x-previous.x)<0.5&&Math.abs(p.y-previous.y)<0.5?stable+1:0;previous=p;return stable>=2;},{intervals:[80,100]}).toBe(true);
  await screenStep(page,'ArrowRight',1,0);await position(page,3,3);
  await screenStep(page,'ArrowLeft',-1,0);await position(page,2,2);
  await screenStep(page,'ArrowUp',0,-1);await position(page,1,3);
  await screenStep(page,'ArrowDown',0,1);await position(page,2,2);
  await page.screenshot({path:info.outputPath('screen-relative-movement.png'),fullPage:true});
});

test('dialogue and choice survive refresh; one-time reward and backup restore work',async({page})=>{
  await startDialogue(page);await page.getByRole('button',{name:'儲存進度',exact:true}).click();
  await page.reload();await page.getByRole('button',{name:'讀取進度',exact:true}).click();
  await expect(page.getByRole('region',{name:'對話',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'繼續 ↵',exact:true}).click();
  await page.getByRole('button',{name:'儲存進度',exact:true}).click();
  await page.reload();await page.getByRole('button',{name:'讀取進度',exact:true}).click();
  await expect(page.getByRole('region',{name:'選擇回應',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'01 領取 →',exact:true}).click();
  await expect(page.getByText('練習銅錢',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'繼續 ↵',exact:true}).click();
  await startDialogue(page);await page.getByRole('button',{name:'繼續 ↵',exact:true}).click();
  await page.getByRole('button',{name:'01 領取 →',exact:true}).click();
  await expect(page.getByRole('region',{name:'對話',exact:true})).toHaveCount(0);
  await expect(page.locator('.inventory-list')).toContainText('× 1');
  await page.getByRole('button',{name:'上一份備份',exact:true}).click();
  await expect(page.getByRole('region',{name:'對話',exact:true})).toBeVisible();
  await expect(page.locator('.inventory-list')).toHaveCount(0);
});

test('downloaded save reimports; MOD mismatch and broken JSON leave progress intact',async({page},info)=>{
  await startDialogue(page);await chooseReward(page);
  const pending=page.waitForEvent('download');await page.getByRole('button',{name:'匯出存檔',exact:true}).click();
  const download=await pending;expect(download.suggestedFilename()).toBe('jianghu-save.json');
  const file=info.outputPath('exported-mock-save.json');await download.saveAs(file);
  const raw=await readFile(file,'utf8');expect(JSON.parse(raw).state.inventory['mock.wuxia:item/coin']).toBe(1);
  await settings(page);await page.getByRole('button',{name:'重新開始',exact:true}).click();
  await expect(page.locator('.inventory-list')).toHaveCount(0);
  await pickFile(page,'匯入存檔',file);await expect(page.locator('.inventory-list')).toContainText('× 1');
  await expect(page.getByRole('region',{name:'對話',exact:true})).toContainText('你獲得一枚');
  await page.getByRole('checkbox').check();await startDialogue(page);
  await expect(page.getByRole('region',{name:'對話',exact:true})).toContainText('Mock MOD 已載入');
  await pickFile(page,'匯入存檔',file);
  await expect(page.getByRole('alert')).toContainText('內容包或 MOD 不同');
  await expect(page.getByRole('region',{name:'對話',exact:true})).toContainText('Mock MOD 已載入');
  await page.getByRole('button',{name:'關閉訊息',exact:true}).click();
  await page.getByLabel('選擇存檔').setInputFiles({name:'broken.json',mimeType:'application/json',buffer:Buffer.from('{broken')});
  await expect(page.getByRole('alert')).toContainText('有效的 JSON');
  await expect(page.getByRole('region',{name:'對話',exact:true})).toContainText('Mock MOD 已載入');
});

test.describe('touch viewport',()=>{
test.use({hasTouch:true});
test('narrow viewport and pointer controls remain usable without horizontal overflow',async({page},info)=>{
  await page.setViewportSize({width:390,height:844});
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
  await page.getByRole('button',{name:'向上移動',exact:true}).tap();await position(page,0,2);
  await page.getByRole('button',{name:'向下移動',exact:true}).tap();await position(page,1,1);
  await page.screenshot({path:info.outputPath('mobile-controls.png'),fullPage:true});
});
});
