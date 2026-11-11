import {test,expect} from '@playwright/test';
import {existsSync,readFileSync,readdirSync} from 'node:fs';
import path from 'node:path';
test('Original ground review displays each source independently',async({page},info)=>{
  test.skip(!existsSync('assets/generated/ground-id-review/review.local.html'),'Local original images are not committed.');
  await page.setViewportSize({width:1150,height:1250});
  await page.setContent(readFileSync('assets/generated/ground-id-review/review.local.html','utf8'));
  await expect(page.locator('article')).toHaveCount(21);
  await page.locator('section.cards').screenshot({path:info.outputPath('ground-21-originals.png')});
  await page.locator('section.cards').screenshot({path:'assets/generated/ground-id-review/ground-21-originals.png'});
  await page.locator('table').screenshot({path:info.outputPath('ground-id-grid.png')});
});

test('21 independent source materials preserve the original 64 cell bindings in WebGL',async({page},info)=>{
  const dir='assets/generated/ground-id-review';
  const filename=existsSync(dir)?readdirSync(dir).find(f=>/^scene1-independent-.*\.local\.json$/.test(f)):undefined;
  test.skip(!filename,'Local original images are not committed.');
  const file=path.resolve(dir,filename!),bundle=JSON.parse(readFileSync(file,'utf8'));
  expect(new Set(bundle.independentGround.bindings.map((b:{materialId:string})=>b.materialId)).size).toBe(21);
  const actual=bundle.independentGround.bindings.flatMap((b:{tileValue:number;cells:{relativeX:number;relativeY:number}[]})=>b.cells.map(c=>[c.relativeX,c.relativeY,b.tileValue].join(','))).sort();
  const expected=bundle.region.cells.map((c:{relativeX:number;relativeY:number;layers:{groundTileId:number}})=>[c.relativeX,c.relativeY,c.layers.groundTileId].join(',')).sort();
  expect(actual).toEqual(expected);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('./');await expect(page.locator('.scene-frame')).toHaveAttribute('data-renderer','ready');
  await page.getByText('內容與測試設定',{exact:true}).click();
  const pending=page.waitForEvent('filechooser');await page.getByRole('button',{name:'匯入本機地圖區域預覽',exact:true}).click();await(await pending).setFiles(file);
  await expect(page.getByRole('heading',{name:'Scene 1 Independent Ground Review',exact:true})).toBeVisible();
  await expect(page.locator('.scene-frame')).toHaveAttribute('data-renderer','ready',{timeout:30_000});
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.locator('.world-canvas').screenshot({path:info.outputPath('independent-ground.png')});
  await page.locator('.world-canvas').screenshot({path:'assets/generated/ground-id-review/independent-ground.png'});
  expect(errors).toEqual([]);
});
