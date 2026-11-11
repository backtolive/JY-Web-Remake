import { test, expect } from '@playwright/test';

test('Mock authored floor, wall and stairs render while logical collision stays independent',async({page},info)=>{
  await page.goto('./');
  await expect(page.locator('.scene-frame')).toHaveAttribute('data-renderer','ready');
  await page.getByText('內容與測試設定',{exact:true}).click();
  const chooser=page.waitForEvent('filechooser');
  await page.getByRole('button',{name:'匯入本機地圖區域預覽',exact:true}).click();
  await (await chooser).setFiles('tests/fixtures/mock-primitive-workshop.json');
  await expect(page.getByRole('heading',{name:'Primitive Workshop',exact:true})).toBeVisible();
  await expect(page.locator('.scene-frame')).toHaveAttribute('data-renderer','ready');
  await expect(page.getByRole('img',{name:'地圖位置：1, 1',exact:true})).toBeVisible();
  // Grid-east points down-right in the fixed camera. The thin visual wall occupies blocked logical cell 2,1.
  await page.getByRole('button',{name:'向右下移動',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('前方無法通行');
  await expect(page.getByRole('img',{name:'地圖位置：1, 1',exact:true})).toBeVisible();
  await expect.poll(()=>page.locator('.world-canvas').evaluate((source:HTMLCanvasElement)=>{
    const canvas=document.createElement('canvas');canvas.width=source.width;canvas.height=source.height;
    const ctx=canvas.getContext('2d')!;ctx.drawImage(source,0,0);const {data}=ctx.getImageData(0,0,canvas.width,canvas.height);
    let wall=0,stairs=0;
    for(let i=0;i<data.length;i+=4){const r=data[i]!,g=data[i+1]!,b=data[i+2]!;
      if(r>100&&r>g*1.4&&r>b*1.3)wall++;
      if(r>100&&g>80&&r>g*1.05&&r<g*1.4&&g>b*1.2)stairs++;
    }
    return wall>100&&stairs>100;
  })).toBe(true);
  await page.screenshot({path:info.outputPath('mock-primitive-workshop.png'),fullPage:true});
});
