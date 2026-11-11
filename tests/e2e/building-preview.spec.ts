import {test,expect} from '@playwright/test';
import {readdirSync,readFileSync} from 'node:fs';
import {join} from 'node:path';

test('local building doorway permits passage without executing untranslated events; cutaway preserves position',async({page},info)=>{
  let file:string|undefined;
  try{file=readdirSync('assets/generated/building-preview').filter(n=>n.endsWith('.local.json')).map(n=>join('assets/generated/building-preview',n)).find(f=>JSON.parse(readFileSync(f,'utf8')).package.maps[0].name==='Building Passage Preview');}catch{}
  test.skip(!file,'Source building data is local only');
  await page.goto('./');await expect(page.locator('.scene-frame')).toHaveAttribute('data-renderer','ready');
  await page.getByText('內容與測試設定',{exact:true}).click();
  const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'匯入本機地圖區域預覽',exact:true}).click();
  await(await chooser).setFiles(file!);
  await expect(page.getByRole('heading',{name:'Building Passage Preview',exact:true})).toBeVisible();
  await expect(page.locator('.scene-frame')).toHaveAttribute('data-renderer','ready');
  await expect(page.getByRole('region',{name:'預覽說明'})).toContainText('觸發腳本尚未轉換');
  await expect(page.getByRole('img',{name:'地圖位置：2, 5',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'向左下移動',exact:true}).click();
  await expect(page.getByRole('img',{name:'地圖位置：2, 4',exact:true})).toBeVisible();
  await page.getByRole('checkbox',{name:'隱藏屋頂與遮擋牆面（僅改顯示）',exact:true}).check();
  await expect(page.getByRole('img',{name:'地圖位置：2, 4',exact:true})).toBeVisible();
  await page.screenshot({path:info.outputPath('building-wall-gate.png'),fullPage:true});
});
