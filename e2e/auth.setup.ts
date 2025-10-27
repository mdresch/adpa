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
  await page.fill('input[name="email"], input[type="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
  await page.fill('input[name="password"], input[type="password"]', process.env.TEST_USER_PASSWORD || 'password123');
  
  // Click login button
  await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
  
  // Wait for navigation to projects or home
  await page.waitForURL(/\/(projects|$)/, { timeout: 10000 });
  
  // Verify we're logged in by checking for logout button or user menu
  await expect(
    page.locator('button:has-text("Logout"), [aria-label*="user"], .user-menu').first()
  ).toBeVisible({ timeout: 5000 });
  
  // Save authentication state
  await page.context().storageState({ path: authFile });
});

