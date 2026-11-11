import { test,expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { placeholderRock } from '../../tools/extractor/placeholder-rock.mjs';

test('Mock GLB imports locally, hash mismatch preserves session, and completed model rendering permits collision checks',async({page},info)=>{
  const bundle=JSON.parse(readFileSync('tests/fixtures/mock-primitive-workshop.json','utf8'));
  bundle.package.maps[0].name='Mock Rock GLB';
  // Keep the logical wall but remove tall visual structures so they cannot occlude the small test model.
  bundle.assembled.cells=bundle.assembled.cells.slice(0,16);
  const rock=placeholderRock();
  const model={version:1,assetId:'authored.placeholder:rock',dataUri:rock.dataUri,sha256:rock.sha256,
    scale:{x:.7,y:.4,z:.6},offset:{x:0,y:0,z:0},rotationY:0};
  bundle.assembled.cells.push({assets:[{asset:{color:'#665544',height:.4,model},world:{x:2,y:0,z:2}}]});
  await page.goto('./');await expect(page.locator('.scene-frame')).toHaveAttribute('data-renderer','ready');
  await page.getByText('內容與測試設定',{exact:true}).click();
  const pick=async(data:unknown)=>{
    const pending=page.waitForEvent('filechooser');await page.getByRole('button',{name:'匯入本機地圖區域預覽',exact:true}).click();
    await(await pending).setFiles({name:'mock-rock.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});
  };
  const broken=structuredClone(bundle);broken.assembled.cells.at(-1).assets[0].asset.model.sha256='0'.repeat(64);
  await pick(broken);await expect(page.getByRole('alert')).toContainText('LOCAL_MODEL_HASH');
  await expect(page.getByRole('heading',{name:'練功房',exact:true})).toBeVisible();
  await pick(bundle);await expect(page.getByRole('heading',{name:'Rock GLB',exact:true})).toBeVisible();
  await expect(page.locator('.scene-frame')).toHaveAttribute('data-renderer','ready');
  await expect.poll(()=>page.locator('.world-canvas').evaluate((source:HTMLCanvasElement)=>{
    const c=document.createElement('canvas');c.width=source.width;c.height=source.height;
    const ctx=c.getContext('2d')!;ctx.drawImage(source,0,0);const pixels=ctx.getImageData(0,0,c.width,c.height).data;
    let stone=0;for(let i=0;i<pixels.length;i+=4){const r=pixels[i]!,g=pixels[i+1]!,b=pixels[i+2]!;
      if(r>40&&r<200&&r>g*1.03&&g>b*1.1)stone++;
    }return stone;
  })).toBeGreaterThan(150);
  await page.getByRole('button',{name:'向右下移動',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('前方無法通行');
  await page.screenshot({path:info.outputPath('mock-rock-glb.png'),fullPage:true});
});
