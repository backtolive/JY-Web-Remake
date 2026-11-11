import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {collisionDemo} from '../../tools/extractor/prepare-collision-demo.mjs';
import {placeholderRock} from '../../tools/extractor/placeholder-rock.mjs';

test('local GLB replacement calibrates shifted geometry for both stones; save/collision and restore remain intact',async({page},info)=>{
  await page.goto('./');await expect(page.locator('.scene-frame')).toHaveAttribute('data-renderer','ready');
  await page.getByText('內容與測試設定',{exact:true}).click();
  const choose=async(button:string,file:{name:string;mimeType:string;buffer:Buffer})=>{
    const event=page.waitForEvent('filechooser');await page.getByRole('button',{name:button,exact:true}).click();await(await event).setFiles(file);
  };
  await choose('匯入本機地圖區域預覽',{name:'mock-collision.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(collisionDemo()))});
  await expect(page.locator('.scene-frame')).toHaveAttribute('data-renderer','ready');
  const exportSave=async()=>{const event=page.waitForEvent('download');await page.getByRole('button',{name:'匯出存檔',exact:true}).click();const file=await(await event).path();return readFile(file!,'utf8');};
  const before=await exportSave();
  await choose('匯入替換 GLB',{name:'invalid.glb',mimeType:'model/gltf-binary',buffer:Buffer.from('broken')});
  await expect(page.getByRole('alert')).toContainText('LOCAL_MODEL_HEADER');
  await expect(page.getByRole('img',{name:'地圖位置：1, 1',exact:true})).toBeVisible();
  const replacement=placeholderRock({uniformScale:2,translation:[4,2,-3],color:[.18,.24,.4,1]});
  await choose('匯入替換 GLB',{name:'shifted-mock-rock.glb',mimeType:'model/gltf-binary',buffer:replacement.bytes});
  await expect(page.getByText(/已替換 2 個實例/)).toBeVisible();
  await expect(page.locator('.scene-frame')).toHaveAttribute('data-renderer','ready');
  expect(await exportSave()).toBe(before);
  const bluePixels=()=>page.locator('.world-canvas').evaluate((canvas:HTMLCanvasElement)=>{
    const c=document.createElement('canvas');c.width=canvas.width;c.height=canvas.height;const ctx=c.getContext('2d')!;ctx.drawImage(canvas,0,0);
    const p=ctx.getImageData(0,0,c.width,c.height).data;let blue=0;
    for(let i=0;i<p.length;i+=4)if(p[i+2]!>70&&p[i+2]!>p[i+1]!*1.07&&p[i+1]!>p[i]!*1.05)blue++;
    return blue;
  });
  await expect.poll(bluePixels).toBeGreaterThan(100);
  await page.screenshot({path:info.outputPath('replacement-calibrated.png'),fullPage:true});
  await page.getByRole('button',{name:'向右下移動',exact:true}).click();
  await expect(page.getByRole('img',{name:'地圖位置：2, 1',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'向右下移動',exact:true}).click();
  await expect(page.getByRole('status').first()).toContainText('前方無法通行');
  await page.getByRole('button',{name:'還原匯入時的模型',exact:true}).click();
  await expect.poll(bluePixels).toBeLessThan(50);
  await expect(page.getByRole('img',{name:'地圖位置：2, 1',exact:true})).toBeVisible();
  await page.screenshot({path:info.outputPath('replacement-restored.png'),fullPage:true});
});
