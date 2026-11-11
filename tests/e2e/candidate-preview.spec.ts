import { test, expect } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

function candidateFile() {
  const dir = 'assets/generated/mvp';
  try {
    for (const name of readdirSync(dir)) {
      if (!name.endsWith('.local.json')) continue;
      const bundle = JSON.parse(readFileSync(join(dir, name), 'utf8'));
      if (bundle?.package?.manifest?.version === '0.2.0' && bundle?.package?.maps?.[0]?.npcs?.length >= 3) return join(dir, name);
    }
  } catch {}
  return null;
}

test('candidate original preview imports and renders when available', async ({ page }) => {
  const file = candidateFile();
  test.skip(!file, 'candidate package is generated locally and is not present in CI');
  await page.goto('./');
  await expect(page.locator('.scene-frame')).toHaveAttribute('data-renderer', 'ready');
  await page.getByText('內容與測試設定').click();
  const pending = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: '匯入本機原版預覽包', exact: true }).click();
  await (await pending).setFiles(file!);
  await expect(page.getByRole('status')).toContainText('原版預覽包已在本機載入');
  await expect(page.locator('.scene-frame')).toHaveAttribute('data-renderer', 'ready');
});
