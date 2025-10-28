import { test as setup, expect } from '@playwright/test';
import path from 'path';

/**
 * Authentication Setup for Playwright Tests
 * 
 * This file handles login once and saves the authentication state.
 * All tests can then reuse this authenticated state without logging in repeatedly.
 */

const authFile = path.join(__dirname, '../.auth/user.json');

setup('authenticate', async ({ page }) => {
  // Navigate to login page
  await page.goto('/auth/login');
  
  // Get credentials from environment variables (fallback to defaults for local dev)
  const email = process.env.TEST_USER_EMAIL || 'admin@adpa.com';
  const password = process.env.TEST_USER_PASSWORD || 'admin123';
  
  // Fill in login credentials
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  
  // Click login button (your form uses "Sign In" text - line 247)
  await page.click('button[type="submit"]:has-text("Sign In")');
  
  // Wait for redirect to homepage (your app redirects to "/" - line 45 of login page)
  await page.waitForURL('/', { timeout: 10000 });
  
  // Verify we're logged in
  const currentUrl = page.url();
  console.log('✅ Redirected to:', currentUrl);
  
  // Additional verification - check for logged-in UI elements
  const hasContent = await page.locator('body').isVisible();
  const notOnLogin = !currentUrl.includes('/auth/login');
  
  const isLoggedIn = hasContent && notOnLogin;
  
  if (!isLoggedIn) {
    // Take screenshot for debugging
    await page.screenshot({ path: 'debug-login-failed.png', fullPage: true });
    console.log('Login failed. Screenshot saved to debug-login-failed.png');
    console.log('Current URL:', currentUrl);
    console.log('Page title:', await page.title());
    throw new Error(`Login failed - still on login page. Check debug-login-failed.png for details.`);
  }
  
  console.log('✅ Login successful! Saving authentication state...');
  
  // Save authentication state
  await page.context().storageState({ path: authFile });
});

