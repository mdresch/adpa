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
  
  // Wait for navigation (any page is fine - login was successful if we leave /auth/login)
  try {
    await page.waitForURL(/^(?!.*\/auth\/login).*$/, { timeout: 10000 });
  } catch {
    // If redirect times out, check if we're already logged in by looking for projects or user menu
    const isLoggedIn = await page.locator('text=Projects, button:has-text("Logout"), .user-menu').first().isVisible();
    if (!isLoggedIn) {
      throw new Error('Login failed - still on login page or no user menu found');
    }
  }
  
  // Save authentication state
  await page.context().storageState({ path: authFile });
});

