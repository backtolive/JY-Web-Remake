import { test,expect } from '@playwright/test';
import { collisionDemo } from '../../tools/extractor/prepare-collision-demo.mjs';

test('identical GLB stones have independently walkable and blocked grid cells, including after load',async({page},info)=>{
  await page.goto('./');await expect(page.locator('.scene-frame')).toHaveAttribute('data-renderer','ready');
  await page.getByText('內容與測試設定',{exact:true}).click();
  const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'匯入本機地圖區域預覽',exact:true}).click();
  await(await chooser).setFiles({name:'mock-collision.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(collisionDemo()))});
  await expect(page.getByRole('heading',{name:'石頭碰撞對照',exact:true})).toBeVisible();
  await expect(page.locator('.scene-frame')).toHaveAttribute('data-renderer','ready');
  await expect(page.getByRole('region',{name:'預覽說明'})).toContainText('綠格（2,1）');
  await page.getByRole('button',{name:'向右下移動',exact:true}).click();
  await expect(page.getByRole('img',{name:'地圖位置：2, 1',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'儲存進度',exact:true}).click();
  await page.getByRole('button',{name:'向右下移動',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('前方無法通行');
  await expect(page.getByRole('img',{name:'地圖位置：2, 1',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'向左上移動',exact:true}).click();
  await expect(page.getByRole('img',{name:'地圖位置：1, 1',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'讀取進度',exact:true}).click();
  await expect(page.getByRole('img',{name:'地圖位置：2, 1',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'向右下移動',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('前方無法通行');
  await page.screenshot({path:info.outputPath('rock-collision-comparison.png'),fullPage:true});
});
