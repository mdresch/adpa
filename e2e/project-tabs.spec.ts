import { test, expect } from '@playwright/test';
import { getProjectUrl } from './helpers/test-config';

/**
 * Simplified E2E Tests for Project Page Tabs
 * 
 * Tests all 6 refactored tab components with authentication handled automatically.
 * These tests are focused and fast - perfect for regression testing during refactoring.
 */

test.describe('Project Page - Tab Components', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to test project (authentication already handled by auth.setup.ts)
    await page.goto(getProjectUrl());
    await page.waitForLoadState('networkidle');
  });

  test('should load project page successfully', async ({ page }) => {
    // Verify we're on a project page
    expect(page.url()).toContain('/projects/');
    
    // Should see project title or breadcrumb
    await expect(page.locator('h1, h2, [role="heading"]').first()).toBeVisible();
  });

  test.describe('Documents Tab', () => {
    test('should display documents tab (default)', async ({ page }) => {
      // Documents tab is default - should already be visible
      
      // Check for key elements
      await expect(page.locator('text=Total Documents')).toBeVisible();
      await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
      await expect(page.locator('button:has-text("Generate Document")')).toBeVisible();
    });

    test('should show document stats cards', async ({ page }) => {
      // All 4 stat cards should be visible
      await expect(page.locator('text=Total Documents')).toBeVisible();
      await expect(page.locator('text=Draft')).toBeVisible();
      await expect(page.locator('text=Published')).toBeVisible();
      await expect(page.locator('text=In Review')).toBeVisible();
    });
  });

  test.describe('Overview Tab', () => {
    test('should render overview tab', async ({ page }) => {
      // Click Overview tab
      await page.click('[role="tab"]:has-text("Overview"), button:has-text("Overview")');
      await page.waitForTimeout(500);
      
      // Check for key metrics
      await expect(page.locator('text=Progress')).toBeVisible();
      await expect(page.locator('text=Budget')).toBeVisible();
    });

    test('should show project health indicators', async ({ page }) => {
      await page.click('[role="tab"]:has-text("Overview")');
      await page.waitForTimeout(500);
      
      // Check for health section
      const healthIndicators = page.locator('text=/Project Health|Documentation Completion|Timeline Health/');
      await expect(healthIndicators.first()).toBeVisible();
    });
  });

  test.describe('Stakeholders Tab', () => {
    test('should render stakeholders tab', async ({ page }) => {
      // Click Stakeholders tab
      await page.click('[role="tab"]:has-text("Stakeholders")');
      await page.waitForTimeout(500);
      
      // Check for Power/Interest Matrix
      await expect(page.locator('text=Power/Interest Matrix')).toBeVisible();
    });

    test('should show stakeholder stats', async ({ page }) => {
      await page.click('[role="tab"]:has-text("Stakeholders")');
      await page.waitForTimeout(500);
      
      // Check for stats
      await expect(page.locator('text=Total Stakeholders')).toBeVisible();
      await expect(page.locator('button:has-text("Add Stakeholder")')).toBeVisible();
    });

    test('should display matrix quadrants', async ({ page }) => {
      await page.click('[role="tab"]:has-text("Stakeholders")');
      await page.waitForTimeout(500);
      
      // All 4 quadrants
      await expect(page.locator('text=Manage Closely')).toBeVisible();
      await expect(page.locator('text=Keep Satisfied')).toBeVisible();
      await expect(page.locator('text=Keep Informed')).toBeVisible();
      await expect(page.locator('text=Monitor')).toBeVisible();
    });
  });

  test.describe('Baseline Tab', () => {
    test('should render baseline tab', async ({ page }) => {
      // Click Baseline tab
      await page.click('[role="tab"]:has-text("Baseline")');
      await page.waitForTimeout(500);
      
      // Check for baseline content
      const baselineContent = page.locator('text=/Baseline|Extract|Drift/');
      await expect(baselineContent.first()).toBeVisible();
    });
  });

  test.describe('Variables Tab', () => {
    test('should render variables tab', async ({ page }) => {
      // Click Variables tab
      await page.click('[role="tab"]:has-text("Variables")');
      await page.waitForTimeout(500);
      
      // Check for variables content
      await expect(page.locator('text=Project Variables')).toBeVisible();
      await expect(page.locator('text=Basic Information')).toBeVisible();
    });

    test('should show project metadata', async ({ page }) => {
      await page.click('[role="tab"]:has-text("Variables")');
      await page.waitForTimeout(500);
      
      // Check for key metadata fields
      await expect(page.locator('text=Project Name')).toBeVisible();
      await expect(page.locator('text=Framework')).toBeVisible();
    });
  });

  test.describe('Timeline Tab', () => {
    test('should render timeline tab', async ({ page }) => {
      // Click Timeline tab
      await page.click('[role="tab"]:has-text("Timeline")');
      await page.waitForTimeout(500);
      
      // Check for timeline content
      await expect(page.locator('text=Project Phases')).toBeVisible();
    });

    test('should show timeline stats', async ({ page }) => {
      await page.click('[role="tab"]:has-text("Timeline")');
      await page.waitForTimeout(500);
      
      // Check for duration and stats
      const stats = page.locator('text=/Duration|Days Elapsed|Days Remaining/');
      await expect(stats.first()).toBeVisible();
    });
  });

  test.describe('Tab Navigation', () => {
    test('should navigate between all tabs without errors', async ({ page }) => {
      const tabs = ['Documents', 'Overview', 'Stakeholders', 'Baseline', 'Variables', 'Timeline'];
      
      for (const tabName of tabs) {
        // Click tab
        await page.click(`[role="tab"]:has-text("${tabName}"), button:has-text("${tabName}")`);
        await page.waitForTimeout(300);
        
        // Page should still be responsive
        await expect(page.locator('body')).toBeVisible();
      }
    });
  });

  test.describe('Component Performance', () => {
    test('all tabs should load quickly', async ({ page }) => {
      const tabs = ['Overview', 'Stakeholders', 'Variables', 'Timeline'];
      
      for (const tabName of tabs) {
        const startTime = Date.now();
        await page.click(`[role="tab"]:has-text("${tabName}")`);
        await page.waitForLoadState('networkidle');
        const loadTime = Date.now() - startTime;
        
        // Tab should load in less than 3 seconds
        expect(loadTime).toBeLessThan(3000);
      }
    });
  });
});

