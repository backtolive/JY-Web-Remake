import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';

const directory = path.resolve('assets/generated/mvp');
const preview = existsSync(directory) ? readdirSync(directory)
  .filter(name => /^original-slice-[a-f0-9]{16}\.local\.json$/.test(name))
  .map(name => path.join(directory, name))
  .find(file => JSON.parse(readFileSync(file, 'utf8')).provenance?.sceneId === 26) : undefined;

test('Local original dialogue scene loads and its first adjacent event remains resumable', async ({ page }) => {
  test.skip(!preview, 'Local original data is not part of the repository or CI.');
  await page.goto('./');
  await page.locator('input[aria-label="選擇原版預覽包"]').setInputFiles(preview!);
  await expect(page.getByRole('heading', { name: '黑木崖', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '與鄰近人物互動' }).click();
  await expect(page.getByRole('region', { name: '對話' })).toBeVisible();
  await page.getByRole('button', { name: '存檔', exact: true }).click();
  await page.getByRole('button', { name: '儲存進度', exact: true }).click();
  await page.reload();
  await page.locator('input[aria-label="選擇原版預覽包"]').setInputFiles(preview!);
  await page.getByRole('button', { name: '存檔', exact: true }).click();
  await page.getByRole('button', { name: '讀取進度', exact: true }).click();
  await expect(page.getByRole('region', { name: '對話' })).toBeVisible();
});
