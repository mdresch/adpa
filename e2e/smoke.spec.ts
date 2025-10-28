import { test, expect } from '@playwright/test';
import { getProjectUrl } from './helpers/test-config';

/**
 * Smoke Tests - Quick Validation
 * 
 * Fast, simple tests to verify basic functionality.
 * Run these first before comprehensive E2E tests.
 * 
 * NOTE: These tests use authenticated state from auth.setup.ts
 */

test.describe('Smoke Tests', () => {
  test('homepage should load successfully', async ({ page }) => {
    const response = await page.goto('/');
    
    // Check response status (might redirect to login, that's OK)
    expect(response?.status()).toBeLessThan(500);
    
    // Page should render
    await expect(page.locator('body')).toBeVisible();
  });

  test('projects page should load without critical errors', async ({ page }) => {
    // Track console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Navigate to projects (authenticated via auth.setup.ts)
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');
    
    // Check page loaded (should see projects or "No projects" message)
    await expect(page.locator('body')).toBeVisible();
    
    // Should not have critical errors (some warnings/404s are OK)
    const criticalErrors = errors.filter(e => 
      !e.includes('Warning') && 
      !e.includes('Hydration') &&
      !e.includes('404') &&
      !e.includes('Failed to load')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });

  test('navigation should work', async ({ page }) => {
    await page.goto('/');
    
    // Look for navigation links
    const projectsLink = page.locator('a[href*="/projects"], button:has-text("Projects")');
    
    if (await projectsLink.count() > 0) {
      await projectsLink.first().click();
      await page.waitForLoadState('networkidle');
      
      // Should navigate successfully
      expect(page.url()).toContain('/projects');
    }
  });

  test('should not have TypeScript errors in browser console', async ({ page }) => {
    const tsErrors: string[] = [];
    
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('TypeError') || text.includes('ReferenceError')) {
        tsErrors.push(text);
      }
    });

    await page.goto('/projects');
    await page.waitForLoadState('networkidle');
    
    // Allow some time for any delayed scripts
    await page.waitForTimeout(2000);
    
    // Should have no TypeScript runtime errors
    expect(tsErrors).toHaveLength(0);
  });

  test('all refactored tab components exist in test project', async ({ page }) => {
    // Navigate to test project (authenticated already)
    await page.goto(getProjectUrl());
    await page.waitForLoadState('networkidle');
    
    // Check that all refactored tab components are accessible
    const expectedTabs = [
      'Documents',
      'Overview', 
      'Stakeholders',
      'Baseline',
      'Variables',
      'Timeline'
    ];
    
    for (const tabName of expectedTabs) {
      const tab = page.locator(`[role="tab"]:has-text("${tabName}"), button:has-text("${tabName}")`);
      
      // Tab should exist
      await expect(tab.first()).toBeVisible();
    }
  });
});

