# 🧪 E2E Tests for ADPA - Playwright

## Overview

End-to-end tests for the ADPA frontend, focusing on the refactored project page components. These tests ensure that our component extraction and refactoring maintains functionality and prevents regressions.

## ✅ What We Test

### **Refactored Components (All Under 500 Lines!)**
1. **DocumentsTab** (337 lines) - Document list, search, pagination
2. **OverviewTab** (327 lines) - Metrics, charts, project health
3. **StakeholdersTab** (408 lines) - Power/Interest Matrix, stakeholder management
4. **BaselineManagement** (1,048 lines) - Baseline extraction, drift detection
5. **VariablesTab** (378 lines) - Project variables and metadata
6. **TimelineTab** (322 lines) - Project phases, milestones, timeline

### **Test Coverage**
- ✅ Component rendering (no crashes)
- ✅ Tab navigation
- ✅ Data display
- ✅ User interactions
- ✅ Performance (load times)
- ✅ Console error detection
- ✅ Cross-browser compatibility (Chromium)

---

## 🚀 Quick Start

### **Prerequisites**
```bash
# Install dependencies (Playwright already installed)
pnpm install

# Install browsers (already done if you followed setup)
pnpm exec playwright install chromium
```

### **Running Tests**

```bash
# Run all E2E tests (headless)
pnpm test:e2e

# Run tests with UI (interactive mode)
pnpm test:e2e:ui

# Run tests in headed mode (see browser)
pnpm test:e2e:headed

# View test report
pnpm test:e2e:report
```

---

## 📁 Test Structure

```
e2e/
├── README.md                   # This file
├── project-page.spec.ts        # Main project page tests
└── smoke.spec.ts               # Basic smoke tests
```

### **Test Files**

#### `project-page.spec.ts`
Comprehensive tests for all refactored tab components:
- Documents Tab functionality
- Overview metrics and charts
- Stakeholders Power/Interest Matrix
- Baseline management features
- Variables display and copy functions
- Timeline phases and milestones
- Tab navigation
- Performance benchmarks

#### `smoke.spec.ts`
Quick smoke tests to verify basic functionality:
- Homepage loads
- Projects page loads
- No critical console errors

---

## 🎯 Test Scenarios

### **1. Component Rendering**
- ✅ Each tab loads without errors
- ✅ All UI elements are visible
- ✅ No console errors during render

### **2. Tab Navigation**
- ✅ Can switch between all tabs
- ✅ Tab content updates correctly
- ✅ No navigation errors

### **3. Data Display**
- ✅ Stats cards show data
- ✅ Lists/tables render
- ✅ Charts display (if data available)
- ✅ Empty states show appropriately

### **4. User Interactions**
- ✅ Buttons are clickable
- ✅ Forms can be filled
- ✅ Dialogs open/close
- ✅ Search works

### **5. Performance**
- ✅ Tabs load in < 2 seconds
- ✅ Page is responsive
- ✅ No memory leaks

---

## 🔧 Configuration

### `playwright.config.ts`

```typescript
export default defineConfig({
  testDir: './e2e',
  baseURL: 'http://localhost:3001',
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3001',
    reuseExistingServer: true,
  },
  // ... more config
});
```

Key settings:
- **Base URL**: http://localhost:3001 (Next.js dev server)
- **Auto-start dev server**: Yes
- **Retries**: 2 on CI, 0 locally
- **Screenshots**: On failure
- **Videos**: On failure
- **Trace**: On first retry

---

## 📊 CI/CD Integration

### **GitHub Actions Example**

```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm test:e2e
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## 🐛 Debugging Tests

### **Debug Mode**
```bash
# Run with Playwright Inspector
pnpm exec playwright test --debug

# Run specific test file
pnpm exec playwright test e2e/project-page.spec.ts

# Run specific test
pnpm exec playwright test -g "should load projects page"
```

### **View Trace**
```bash
# After a test failure, view the trace
pnpm exec playwright show-trace trace.zip
```

### **Screenshots and Videos**
After test failures, check:
- `test-results/` - Screenshots and videos
- `playwright-report/` - HTML report

---

## ✅ Best Practices

### **Writing New Tests**

1. **Use data-testid for stable selectors**
   ```typescript
   <button data-testid="generate-document">Generate</button>
   await page.getByTestId('generate-document').click();
   ```

2. **Wait for network idle**
   ```typescript
   await page.waitForLoadState('networkidle');
   ```

3. **Use meaningful assertions**
   ```typescript
   await expect(page.locator('h1')).toContainText('Project');
   ```

4. **Handle authentication**
   ```typescript
   test.beforeEach(async ({ page }) => {
     // Login or set auth cookies
   });
   ```

5. **Group related tests**
   ```typescript
   test.describe('Feature Name', () => {
     test('specific test', async ({ page }) => {});
   });
   ```

---

## 🎯 Test Maintenance

### **After Refactoring**
- ✅ Run full test suite
- ✅ Update selectors if component structure changed
- ✅ Add tests for new features
- ✅ Remove tests for deleted features

### **Regular Maintenance**
- Review flaky tests monthly
- Update Playwright regularly: `pnpm add -D @playwright/test@latest`
- Keep tests fast (< 30s per test)
- Remove redundant tests

---

## 📈 Coverage Goals

- **Component Rendering**: 100%
- **Critical User Flows**: 100%
- **Edge Cases**: 80%
- **Performance Tests**: Key pages only

---

## 🆘 Troubleshooting

### **Tests Timeout**
- Increase timeout in test: `test.setTimeout(60000)`
- Check if dev server is running
- Check network/database connections

### **Element Not Found**
- Check if component renders conditionally
- Wait for element: `await page.waitForSelector('.element')`
- Use flexible selectors: `text=/pattern/i`

### **Flaky Tests**
- Add explicit waits
- Check for race conditions
- Use `waitForLoadState('networkidle')`
- Avoid `waitForTimeout` (use proper waits instead)

---

## 📝 Test Checklist

Before committing:
- [ ] All tests pass locally
- [ ] No warnings in console
- [ ] Tests are fast (< 30s each)
- [ ] Selectors are stable
- [ ] Assertions are meaningful
- [ ] Edge cases covered
- [ ] Documentation updated

---

## 🎉 Success Metrics

After refactoring to components under 500 lines:
- ✅ All 6 tab components tested
- ✅ Zero console errors detected
- ✅ All tabs load in < 2 seconds
- ✅ 100% of critical flows covered
- ✅ Tests run in < 2 minutes total

---

## 📚 Resources

- [Playwright Documentation](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [API Reference](https://playwright.dev/docs/api/class-test)
- [Debugging Guide](https://playwright.dev/docs/debug)

---

**Happy Testing!** 🧪✨

