/**
 * Test Configuration for ADPA E2E Tests
 * 
 * Centralized configuration for test users, projects, and environment settings.
 */

import type { Page } from '@playwright/test'

export const testConfig = {
  // Test user credentials
  // Set these in your environment or .env.test file
  testUser: {
    email: process.env.TEST_USER_EMAIL || 'admin@adpa.com',
    password: process.env.TEST_USER_PASSWORD || 'admin123',
  },
  
  // Test project ID (replace with an actual project ID from your database)
  // You can find this by:
  // 1. Login to http://localhost:3001
  // 2. Navigate to a project
  // 3. Copy the ID from the URL: /projects/{THIS-IS-THE-ID}
  testProjectId: process.env.TEST_PROJECT_ID || 'test-project-123',
  
  // Base URL
  baseUrl: process.env.BASE_URL || 'http://localhost:3001',
  
  // Timeouts
  timeouts: {
    default: 30000,      // 30 seconds
    navigation: 10000,   // 10 seconds
    slow: 60000,         // 60 seconds for AI operations
  },
};

/**
 * Get test project URL
 */
export function getProjectUrl(projectId?: string): string {
  return `/projects/${projectId || testConfig.testProjectId}`;
}

/**
 * Login helper for tests that don't use auth.setup
 */
export async function login(page: Page) {
  await page.goto('/auth/login');
  await page.fill('input[name="email"], input[type="email"]', testConfig.testUser.email);
  await page.fill('input[name="password"], input[type="password"]', testConfig.testUser.password);
  await page.click('button[type="submit"], button:has-text("Login")');
  await page.waitForURL(/\/(projects|$)/, { timeout: testConfig.timeouts.navigation });
}

