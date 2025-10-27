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
  
  // Fill in login credentials
  // TODO: Replace with your test user credentials
  await page.fill('input[name="email"], input[type="email"]', 'admin@adpa.com');
  await page.fill('input[name="password"], input[type="password"]', 'admin123');
  
  // Click login button
  await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
  
  // Wait a bit for login to process
  await page.waitForTimeout(2000);
  
  // Check if login was successful by multiple criteria
  const currentUrl = page.url();
  console.log('Current URL after login attempt:', currentUrl);
  
  // Success if:
  // 1. We're no longer on /auth/login
  // 2. OR we can see typical logged-in elements
  const isOnLoginPage = currentUrl.includes('/auth/login');
  const hasProjects = await page.locator('text=Projects').count() > 0;
  const hasUserMenu = await page.locator('button:has-text("Logout"), [aria-label*="menu"], .user-menu, [data-testid*="user"]').count() > 0;
  const hasSidebar = await page.locator('nav, aside, [role="navigation"]').count() > 0;
  
  const isLoggedIn = !isOnLoginPage || hasProjects || hasUserMenu || hasSidebar;
  
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

