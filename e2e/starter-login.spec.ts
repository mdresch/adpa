import { test, expect } from '@playwright/test';

// Basic, resilient login flow using common selectors and env overrides
const EMAIL = process.env.ADPA_EMAIL || 'admin@adpa.com';
const PASSWORD = process.env.ADPA_PASSWORD || 'admin123';

async function performLogin(page) {
  const loginCandidates = ['/login', '/auth/login', '/auth/signin', '/'];
  for (const path of loginCandidates) {
    try {
      await page.goto(path, { waitUntil: 'networkidle' });
      const emailSel = 'input[name="email"], input[type="email"], #email';
      const passSel = 'input[name="password"], input[type="password"], #password';
      const email = await page.$(emailSel);
      const pass = await page.$(passSel);
      if (email && pass) {
        await email.fill(EMAIL);
        await pass.fill(PASSWORD);
        const submit = await page.$('button[type="submit"], button:has-text("Sign In"), button:has-text("Log In")');
        if (submit) await submit.click();
        else await pass.press('Enter');
        await page.waitForLoadState('networkidle');
        return;
      }
    } catch {}
  }
}

test.describe('Starter: Login', () => {
  test('user can log in (basic selectors)', async ({ page }) => {
    await performLogin(page);
    // Heuristic success checks - adapt to your app
    await expect(page).not.toHaveURL(/\/login/);
    // Check for any common app chrome
    const maybeAvatar = await page.$('[data-testid*="avatar"], [aria-label*="account"], img[alt*="avatar"]');
    expect(maybeAvatar).toBeTruthy();
  });
});
