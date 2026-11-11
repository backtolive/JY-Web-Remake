import {test,expect} from '@playwright/test';
import {existsSync,readdirSync,readFileSync,statSync} from 'node:fs';
import path from 'node:path';

const directory='assets/generated/art-sample';
const filename=existsSync(directory)?readdirSync(directory).filter(f=>/^scene1-art-.*\.local\.json$/.test(f)).sort((a,b)=>statSync(path.join(directory,a)).mtimeMs-statSync(path.join(directory,b)).mtimeMs).at(-1):undefined;
test('Local generated textured art renders in its source region',async({page},info)=>{
  test.skip(!filename,'Local source-derived art is deliberately absent from CI.');
  const file=path.resolve(directory,filename!),bundle=JSON.parse(readFileSync(file,'utf8'));
  expect(bundle.artSample.entries).toHaveLength(2);
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('./');await expect(page.locator('.scene-frame')).toHaveAttribute('data-renderer','ready');
  await page.getByText('內容與測試設定',{exact:true}).click();
  const pending=page.waitForEvent('filechooser');
  await page.getByRole('button',{name:'匯入本機地圖區域預覽',exact:true}).click();
  await(await pending).setFiles(file);
  await expect(page.getByRole('heading',{name:'Scene 1 Art Sample',exact:true})).toBeVisible();
  await expect(page.locator('.scene-frame')).toHaveAttribute('data-renderer','ready',{timeout:30_000});
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.screenshot({path:info.outputPath('scene1-generated-art.png'),fullPage:true});
  await page.locator('.world-canvas').screenshot({path:info.outputPath('scene1-art-canvas.png')});
  expect(errors).toEqual([]);
});
