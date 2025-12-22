import { test, expect } from '@playwright/test';

// Lightweight smoke checks for core pages responding without obvious errors
const pages = [
  '/',
  '/dashboard',
  '/projects',
  '/documents',
  '/analytics',
];

test.describe('Starter: Smoke Suite', () => {
  for (const route of pages) {
    test(`loads ${route}`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      // Ensure no common fatal error patterns (tweak to your app)
      const bodyText = await page.locator('body').innerText();
      expect(bodyText).not.toMatch(/Unhandled|TypeError|ReferenceError|500|Exception/i);
    });
  }
});
