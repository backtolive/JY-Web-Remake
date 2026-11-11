import { test, expect } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

test('local source-derived ground preview renders and announces missing upper resources',async({page},info)=>{
  let file:string|undefined;
  try{file=readdirSync('assets/generated/ground-preview').filter(n=>n.endsWith('.local.json')).map(n=>join('assets/generated/ground-preview',n)).find(f=>JSON.parse(readFileSync(f,'utf8')).package.maps[0].name==='Ground Rules Preview');}catch{}
  test.skip(!file,'Local source-derived bundle is never required in CI');
  await page.goto('./');await expect(page.locator('.scene-frame')).toHaveAttribute('data-renderer','ready');
  await page.getByText('內容與測試設定',{exact:true}).click();
  const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'匯入本機地圖區域預覽',exact:true}).click();
  await(await chooser).setFiles(file!);
  await expect(page.getByRole('heading',{name:'Ground Rules Preview',exact:true})).toBeVisible();
  await expect(page.locator('.scene-frame')).toHaveAttribute('data-renderer','ready');
  await expect(page.getByRole('status')).toContainText('11 種資源尚未呈現');
  await page.screenshot({path:info.outputPath('local-ground-preview.png'),fullPage:true});
});

test('local reviewed rail proxies render and leave nine resource types pending',async({page},info)=>{
  let file:string|undefined;
  try{file=readdirSync('assets/generated/ground-preview').filter(n=>n.endsWith('.local.json')).map(n=>join('assets/generated/ground-preview',n)).find(f=>JSON.parse(readFileSync(f,'utf8')).package.maps[0].name==='Ground and Rail Preview');}catch{}
  test.skip(!file,'Local source-derived bundle is not required in CI');
  await page.goto('./');await expect(page.locator('.scene-frame')).toHaveAttribute('data-renderer','ready');
  await page.getByText('內容與測試設定',{exact:true}).click();
  const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'匯入本機地圖區域預覽',exact:true}).click();
  await(await chooser).setFiles(file!);
  await expect(page.getByRole('heading',{name:'Ground and Rail Preview',exact:true})).toBeVisible();
  await expect(page.locator('.scene-frame')).toHaveAttribute('data-renderer','ready');
  await expect(page.getByRole('status')).toContainText('9 種資源尚未呈現');
  await page.screenshot({path:info.outputPath('local-rail-preview.png'),fullPage:true});
});

test('local sign fragments become one grouped proxy while seven resource types remain pending',async({page},info)=>{
  let file:string|undefined;
  try{file=readdirSync('assets/generated/ground-preview').filter(n=>n.endsWith('.local.json')).map(n=>join('assets/generated/ground-preview',n)).find(f=>JSON.parse(readFileSync(f,'utf8')).package.maps[0].name==='Ground Rail and Sign Preview');}catch{}
  test.skip(!file,'Local source-derived group preview is not required in CI');
  await page.goto('./');await expect(page.locator('.scene-frame')).toHaveAttribute('data-renderer','ready');
  await page.getByText('內容與測試設定',{exact:true}).click();
  const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'匯入本機地圖區域預覽',exact:true}).click();
  await(await chooser).setFiles(file!);
  await expect(page.getByRole('heading',{name:'Ground Rail and Sign Preview',exact:true})).toBeVisible();
  await expect(page.locator('.scene-frame')).toHaveAttribute('data-renderer','ready');
  await expect(page.getByRole('status')).toContainText('7 種資源尚未呈現');
  await page.screenshot({path:info.outputPath('local-sign-preview.png'),fullPage:true});
});

test('local source rock ID loads a GLB placeholder alongside grouped structures',async({page},info)=>{
  let file:string|undefined;
  try{file=readdirSync('assets/generated/ground-preview').filter(n=>n.endsWith('.local.json')).map(n=>join('assets/generated/ground-preview',n)).find(f=>JSON.parse(readFileSync(f,'utf8')).package.maps[0].name==='Rock Model Preview');}catch{}
  test.skip(!file,'Source-derived preview remains local only');
  await page.goto('./');await expect(page.locator('.scene-frame')).toHaveAttribute('data-renderer','ready');
  await page.getByText('內容與測試設定',{exact:true}).click();
  const pending=page.waitForEvent('filechooser');await page.getByRole('button',{name:'匯入本機地圖區域預覽',exact:true}).click();
  await(await pending).setFiles(file!);
  await expect(page.getByRole('heading',{name:'Rock Model Preview',exact:true})).toBeVisible();
  await expect(page.locator('.scene-frame')).toHaveAttribute('data-renderer','ready');
  await expect(page.getByRole('status')).toContainText('6 種資源尚未呈現');
  await page.screenshot({path:info.outputPath('local-rock-glb.png'),fullPage:true});
});

test('local full placeholder region renders vegetation and reports no unmapped resources',async({page},info)=>{
  let file:string|undefined;
  try{file=readdirSync('assets/generated/ground-preview').filter(n=>n.endsWith('.local.json')).map(n=>join('assets/generated/ground-preview',n)).find(f=>JSON.parse(readFileSync(f,'utf8')).package.maps[0].name==='Full Placeholder Preview');}catch{}
  test.skip(!file,'Local source-derived full preview is not required in CI');
  await page.goto('./');await expect(page.locator('.scene-frame')).toHaveAttribute('data-renderer','ready');
  await page.getByText('內容與測試設定',{exact:true}).click();
  const pending=page.waitForEvent('filechooser');await page.getByRole('button',{name:'匯入本機地圖區域預覽',exact:true}).click();
  await(await pending).setFiles(file!);
  await expect(page.getByRole('heading',{name:'Full Placeholder Preview',exact:true})).toBeVisible();
  await expect(page.locator('.scene-frame')).toHaveAttribute('data-renderer','ready');
  await expect(page.getByRole('region',{name:'預覽說明'})).toContainText('樹木與草叢皆是低模 GLB');
  await expect(page.getByRole('status')).not.toContainText('尚未呈現');
  await expect.poll(()=>page.locator('.world-canvas').evaluate((source:HTMLCanvasElement)=>{
    const canvas=document.createElement('canvas');canvas.width=source.width;canvas.height=source.height;
    const ctx=canvas.getContext('2d')!;ctx.drawImage(source,0,0);const pixels=ctx.getImageData(0,0,canvas.width,Math.min(16,canvas.height)).data;
    let clippedLeaves=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i+1]!>pixels[i]!*1.15&&pixels[i+1]!>pixels[i+2]!*1.2)clippedLeaves++;
    return clippedLeaves;
  })).toBe(0);
  await page.screenshot({path:info.outputPath('full-placeholder-region.png'),fullPage:true});
});
