import {test,expect} from '@playwright/test';
import {existsSync,readdirSync,statSync,readFileSync} from 'node:fs';
import path from 'node:path';

test('Local world axes: two adjacent source axes and one known blocked neighbour',async({page},info)=>{
  const dir='assets/generated/world-preview';
  const file=existsSync(dir)?readdirSync(dir).filter(f=>/^world-.*\.local\.json$/.test(f)).sort((a,b)=>statSync(path.join(dir,a)).mtimeMs-statSync(path.join(dir,b)).mtimeMs).at(-1):undefined;
  test.skip(!file,'Local original data stays outside CI.');
  const full=path.resolve(dir,file!),bundle=JSON.parse(readFileSync(full,'utf8'));
  expect(bundle.package.entry.x).toBe(358);expect(bundle.package.entry.y).toBe(229);
  expect(bundle.package.maps[0].blocked.includes(228*480+358)).toBe(true);
  await page.goto('./');await expect(page.locator('.scene-frame')).toHaveAttribute('data-renderer','ready');
  await page.getByText('內容與測試設定',{exact:true}).click();
  const pending=page.waitForEvent('filechooser');await page.getByRole('button',{name:'匯入完整世界地圖',exact:true}).click();await(await pending).setFiles(full);
  await expect(page.locator('.scene-frame')).toHaveAttribute('data-renderer','ready',{timeout:20_000});
  const at=async(x:number,y:number)=>expect(page.getByRole('img',{name:`地圖位置：${x}, ${y}`,exact:true})).toBeVisible();
  await at(358,229);
  await page.getByRole('button',{name:'向右下移動',exact:true}).click();await at(359,229); // original X+
  await page.getByRole('button',{name:'向左下移動',exact:true}).click();await at(359,230); // original Y+
  await page.getByRole('button',{name:'向左上移動',exact:true}).click();await at(358,230);
  await page.getByRole('button',{name:'向右上移動',exact:true}).click();await at(358,229);
  await page.getByRole('button',{name:'向右上移動',exact:true}).click();await at(358,229);
  await expect(page.getByRole('status')).toContainText('前方無法通行');
  await page.locator('.world-canvas').screenshot({path:info.outputPath('world-axis-aligned.png')});
  await page.locator('.world-canvas').screenshot({path:'assets/generated/world-preview/world-axis-aligned.png'});
});
