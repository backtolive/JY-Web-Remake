import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';

const directory = path.resolve('assets/generated/mvp');
const preview = existsSync(directory) ? readdirSync(directory)
  .filter(name => /^original-event-673-[a-f0-9]{16}\.local\.json$/.test(name))
  .map(name => path.join(directory, name))
  .find(file => JSON.parse(readFileSync(file, 'utf8')).provenance?.sceneId === 32) : undefined;

test('Scene 32 observed event 673 keeps position, dialogue and original overlays in one save', async ({ page }) => {
  test.skip(!preview, 'Local DOS data is not part of the repository or CI.');
  await page.goto('./');
  await page.locator('input[aria-label="選擇原版預覽包"]').setInputFiles(preview!);
  await expect(page.getByRole('heading', { name: '海邊小屋' })).toBeVisible();
  const status = page.locator('.map-coordinate');
  await expect(status).toContainText('目前資質 72');
  await expect(status).toContainText('事件槽 673');
  await expect(status).toContainText('X 31 · Y 24');
  await page.getByRole('button', { name: '與鄰近人物互動' }).click();
  await expect(page.getByRole('region', { name: '原版事件對話' })).toBeVisible();
  await page.getByRole('button', { name: '存檔', exact: true }).click();
  await page.getByRole('button', { name: '儲存進度', exact: true }).click();
  await page.reload();
  await page.locator('input[aria-label="選擇原版預覽包"]').setInputFiles(preview!);
  await page.getByRole('button', { name: '存檔', exact: true }).click();
  await page.getByRole('button', { name: '讀取進度', exact: true }).click();
  await expect(page.getByRole('region', { name: '原版事件對話' })).toBeVisible();
  for (let i = 0; i < 12; i++) await page.getByRole('region', { name: '原版事件對話' }).getByRole('button', { name: '繼續' }).click();
  await expect(page.getByRole('region', { name: '原版事件對話' })).toHaveCount(0);
  await expect(status).toContainText('目前資質 75');
  await expect(status).toContainText('事件槽 674');
  await page.getByRole('button', { name: '儲存進度', exact: true }).click();
  await page.locator('details.content-settings > summary').click();
  await page.getByRole('button', { name: '重新開始' }).click();
  await expect(status).toContainText('目前資質 72');
  await expect(status).toContainText('事件槽 673');
  await page.getByRole('button', { name: '讀取進度', exact: true }).click();
  await expect(status).toContainText('目前資質 75');
  await expect(status).toContainText('事件槽 674');
  await page.getByRole('button', { name: '上一份備份', exact: true }).click();
  await expect(status).toContainText('目前資質 72');
  await expect(page.getByRole('region', { name: '原版事件對話' })).toBeVisible();
});

test('Scene 32 marker cannot run without its source-locked adapter', async ({ page }) => {
  test.skip(!preview, 'Local DOS data is not part of the repository or CI.');
  const bundle = JSON.parse(readFileSync(preview!, 'utf8'));
  await page.goto('./');
  await page.locator('input[aria-label="選擇原版預覽包"]').setInputFiles({
    name: 'marker-only.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ package: bundle.package })),
  });
  await expect(page.getByRole('alert')).toContainText('ORIGINAL673_WEB_SOURCE_LOCK');
  await expect(page.getByRole('heading', { name: '海邊小屋' })).toHaveCount(0);
});
