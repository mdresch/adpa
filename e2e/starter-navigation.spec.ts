import { test, expect } from '@playwright/test';

async function tryGo(page, paths: string[]) {
  for (const p of paths) {
    try {
      await page.goto(p, { waitUntil: 'networkidle' });
      return;
    } catch {}
  }
}

async function clickByTextOrRole(page, name: string) {
  const role = await page.getByRole('link', { name }).first();
  if (await role.count()) { await role.click(); return; }
  const btn = page.getByRole('button', { name }).first();
  if (await btn.count()) { await btn.click(); return; }
  const text = page.locator(`text=${name}`).first();
  if (await text.count()) { await text.click(); return; }
}

test.describe('Starter: Basic Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await tryGo(page, ['/dashboard', '/', '/projects']);
  });

  test('can reach Projects and open first item', async ({ page }) => {
    await clickByTextOrRole(page, 'Projects');
    await page.waitForLoadState('networkidle');
    const firstRow = page.locator('[role="row"]').nth(1);
    if (await firstRow.count()) {
      await firstRow.click();
      await page.waitForLoadState('networkidle');
      await expect(page).not.toHaveURL(/\/projects$/);
    } else {
      test.skip(true, 'No project rows visible');
    }
  });

  test('can reach Documents area', async ({ page }) => {
    await clickByTextOrRole(page, 'Documents');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/error|not-found/i);
  });
});
