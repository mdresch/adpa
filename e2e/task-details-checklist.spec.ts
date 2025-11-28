import { test, expect } from '@playwright/test';

/**
 * E2E: Task Details Checklist Validation
 *
 * This test suite validates that tasks created (manually or via AI extraction/import)
 * meet the requirements in TASK_DETAILS_FIX_CHECKLIST.md:
 * - Start/end date, duration
 * - Suggested resources/roles
 * - AI extraction traceability (source document)
 */

test.describe('Task Details - Checklist Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a project page (assumes authentication is handled)
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');
    // Click into the first project (customize selector as needed)
    const projectLink = page.locator('a[href*="/projects/"]').first();
    await projectLink.click();
    await page.waitForLoadState('networkidle');
  });

  test('Task displays start/end date and duration', async ({ page }) => {
    // Navigate to Tasks tab (customize selector as needed)
    await page.click('[role="tab"], button:has-text("Tasks")');
    // Open first task details
    const taskRow = page.locator('[data-testid="task-row"]').first();
    await taskRow.click();
    // Check for start date, end date, and duration fields
    await expect(page.locator('text=/Start Date/i')).toBeVisible();
    await expect(page.locator('text=/End Date/i')).toBeVisible();
    await expect(page.locator('text=/Duration|Estimated Hours/i')).toBeVisible();
  });

  test('Task displays suggested resources/roles', async ({ page }) => {
    // Assumes task details modal is open from previous test or repeat steps
    await expect(page.locator('text=/Suggested Resource|Assigned Resource|Role/i')).toBeVisible();
  });

  test('AI-extracted task shows source document', async ({ page }) => {
    // Filter or select a task known to be AI-extracted (customize as needed)
    // Example: tasks with a special icon or label
    const aiTask = page.locator('[data-testid="task-row"][data-source="ai"]').first();
    await aiTask.click();
    // Check for source document reference
    await expect(page.locator('text=/Source Document|Extracted from/i')).toBeVisible();
  });
});
