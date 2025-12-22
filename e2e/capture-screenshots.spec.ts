import { test, expect, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Config via env or defaults
const BASE_URL = process.env.ADPА_URL || process.env.ADPA_URL || 'https://adpa.vercel.app';
const EMAIL = process.env.ADPA_EMAIL || 'admin@adpa.com';
const PASSWORD = process.env.ADPA_PASSWORD || 'admin123';
const OUT_DIR = path.resolve('screenshots');

async function ensureDir(dir: string) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function safeScreenshot(page: Page, filename: string) {
  await ensureDir(OUT_DIR);
  const full = path.join(OUT_DIR, filename);
  await page.screenshot({ path: full, fullPage: true });
  console.log(`Saved: ${full}`);
}

async function login(page: Page) {
  // Try common login routes
  const loginUrls = [
    `${BASE_URL}/login`,
    `${BASE_URL}/auth/login`,
    `${BASE_URL}/auth/signin`,
    `${BASE_URL}/` // Some apps redirect to login from home when unauthenticated
  ];

  for (const url of loginUrls) {
    try {
      await page.goto(url, { waitUntil: 'networkidle' });
      // Try typical selectors
      const emailSel = 'input[name="email"], input[type="email"], #email';
      const passSel = 'input[name="password"], input[type="password"], #password';
      const buttonSel = 'button[type="submit"], button:has-text("Sign In"), button:has-text("Log In")';

      const emailInput = await page.$(emailSel);
      const passInput = await page.$(passSel);

      if (emailInput && passInput) {
        await emailInput.fill(EMAIL);
        await passInput.fill(PASSWORD);
        const btn = await page.$(buttonSel);
        if (btn) {
          await btn.click();
        } else {
          // Press Enter as fallback
          await passInput.press('Enter');
        }
        // Wait for either dashboard or user menu
        await page.waitForLoadState('networkidle');
        // Heuristic: see if we left the login page
        if (!(await page.url()).includes('/login')) return;
      }
    } catch (e) {
      // Continue to next URL
    }
  }
}

// Utility to click a tab by visible text if present
async function clickTab(page: Page, tabText: string) {
  const tab = await page.$(`role=tab[name="${tabText}"]`);
  if (tab) {
    await tab.click();
    await page.waitForLoadState('networkidle');
  } else {
    const link = await page.$(`text=${tabText}`);
    if (link) {
      await link.click();
      await page.waitForLoadState('networkidle');
    }
  }
}

// Attempt to open first item in a list/grid
async function openFirstRow(page: Page) {
  const row = await page.$('[role="row"] >> nth=1');
  if (row) {
    await row.click();
    await page.waitForLoadState('networkidle');
    return true;
  }
  const card = await page.$('[data-testid*="card"], .card, a[href*="/projects/"]');
  if (card) {
    await card.click();
    await page.waitForLoadState('networkidle');
    return true;
  }
  return false;
}

// The suite runs serially to reuse the same session

test.describe.configure({ mode: 'serial' });

test('Capture: login', async ({ page }) => {
  await login(page);
  await safeScreenshot(page, 'login-after.png');
});

test('Capture: Governance – Drift views', async ({ page }) => {
  // Try to reach projects, then a project, then Baselines -> Drift
  const candidates = [`${BASE_URL}/projects`, `${BASE_URL}/portfolio`, `${BASE_URL}/programs`, `${BASE_URL}/`];
  for (const url of candidates) {
    try {
      await page.goto(url, { waitUntil: 'networkidle' });
      const opened = await openFirstRow(page);
      if (opened) break;
    } catch {}
  }

  await clickTab(page, 'Baselines');
  await clickTab(page, 'Drift');
  await safeScreenshot(page, 'governance-drift-01-list.png');

  // Attempt to open first drift item
  const driftRow = await page.$('[role="row"], li, .item');
  if (driftRow) {
    await driftRow.click();
    await page.waitForTimeout(400);
  }
  await safeScreenshot(page, 'governance-drift-02-detail.png');

  // Try to open auto-resolve modal
  const autoBtn = await page.$('button:has-text("Auto-resolve"), button:has-text("Auto resolve")');
  if (autoBtn) {
    await autoBtn.click();
    await page.waitForTimeout(300);
  }
  await safeScreenshot(page, 'governance-drift-03-auto-resolve.png');

  // Escalate dialog
  const escBtn = await page.$('button:has-text("Escalate")');
  if (escBtn) {
    await escBtn.click();
    await page.waitForTimeout(300);
  }
  await safeScreenshot(page, 'governance-drift-04-escalate.png');

  // Baseline update flow
  await clickTab(page, 'Baselines');
  const baselineBtn = await page.$('button:has-text("Create Baseline"), button:has-text("Update Baseline"), a:has-text("+ Create Baseline")');
  if (baselineBtn) {
    await baselineBtn.click();
    await page.waitForTimeout(300);
  }
  await safeScreenshot(page, 'governance-drift-05-baseline-update.png');

  // Audit
  await clickTab(page, 'Activity');
  await safeScreenshot(page, 'governance-drift-06-audit.png');
});

// Digital Signing – attempt Documents area

test('Capture: Digital Signing flows', async ({ page }) => {
  const candidates = [`${BASE_URL}/documents`, `${BASE_URL}/projects`, `${BASE_URL}/`];
  let opened = false;
  for (const url of candidates) {
    try {
      await page.goto(url, { waitUntil: 'networkidle' });
      opened = await openFirstRow(page);
      if (opened) break;
    } catch {}
  }

  // Try to open Send for Signature flow (menu or button)
  const actionsBtn = await page.$('button:has-text("Actions"), [data-testid="actions"]');
  if (actionsBtn) {
    await actionsBtn.click();
  }
  const sendBtn = await page.$('text=Send for Signature');
  if (sendBtn) {
    await sendBtn.click();
    await page.waitForTimeout(300);
  }
  await safeScreenshot(page, 'signing-01-send.png');

  // Status/Timeline
  await clickTab(page, 'Signing');
  await safeScreenshot(page, 'signing-02-status.png');

  // Audit trail
  await clickTab(page, 'Audit');
  await safeScreenshot(page, 'signing-03-audit.png');

  // Signed copy location
  await clickTab(page, 'Files');
  await safeScreenshot(page, 'signing-04-signed-copy.png');

  // Compliance export
  const compliancePaths = [`${BASE_URL}/compliance`, `${BASE_URL}/quality`, `${BASE_URL}/reports`];
  for (const url of compliancePaths) {
    try {
      await page.goto(url, { waitUntil: 'networkidle' });
      break;
    } catch {}
  }
  await safeScreenshot(page, 'signing-05-compliance-export.png');
});

// Executive Analytics – dashboard

test('Capture: Executive Analytics dashboard', async ({ page }) => {
  const paths = [`${BASE_URL}/analytics`, `${BASE_URL}/dashboard`, `${BASE_URL}/`];
  for (const url of paths) {
    try {
      await page.goto(url, { waitUntil: 'networkidle' });
      break;
    } catch {}
  }
  await safeScreenshot(page, 'exec-analytics-01-overview.png');

  // Filters panel
  const filterBtn = await page.$('button:has-text("Filters"), [aria-label="Filters"], [data-testid*="filters"]');
  if (filterBtn) {
    await filterBtn.click();
    await page.waitForTimeout(200);
  }
  await safeScreenshot(page, 'exec-analytics-02-filters.png');

  // Trend chart – just capture the page; if a chart exists it will be included
  await safeScreenshot(page, 'exec-analytics-03-trend.png');

  // Drilldown: click first tile/card/table row
  await openFirstRow(page);
  await safeScreenshot(page, 'exec-analytics-04-drilldown.png');

  // Export modal
  const exportBtn = await page.$('button:has-text("Export"), [aria-label="Export"], [data-testid*="export"]');
  if (exportBtn) {
    await exportBtn.click();
    await page.waitForTimeout(200);
  }
  await safeScreenshot(page, 'exec-analytics-05-export.png');
});
