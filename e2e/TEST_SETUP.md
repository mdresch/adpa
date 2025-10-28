# 🚀 Quick Test Setup Guide

## ⚡ **5-Minute Setup (Fix Authentication Issue)**

### **Problem You're Seeing:**
Tests show "Authentication Required" instead of testing actual components.

### **Solution: 3 Easy Steps**

---

## Step 1: Create Test User Credentials

### **Option A: Use Existing Admin Account**
```bash
# Use your current admin credentials
TEST_USER_EMAIL=admin@adpa.com
TEST_USER_PASSWORD=admin123
```

### **Option B: Create Dedicated Test User**
```bash
# In your database, create a test user:
INSERT INTO users (email, password_hash, role)
VALUES ('test@adpa.com', 'hashed_password', 'admin');
```

---

## Step 2: Get a Test Project ID

### **Find an Existing Project:**

1. **Login to your app:**
   - Go to http://localhost:3001
   - Login with your credentials

2. **Navigate to any project:**
   - Click "Projects" in sidebar
   - Click on any project

3. **Copy the Project ID from URL:**
   ```
   URL: http://localhost:3001/projects/550e8400-e29b-41d4-a716-446655440000
                                       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                       THIS IS YOUR TEST PROJECT ID
   ```

4. **Save it for later**

---

## Step 3: Configure Test Environment

### **Create `.env.test` file in project root:**

```bash
# File: .env.test (create this file)

TEST_USER_EMAIL=admin@adpa.com
TEST_USER_PASSWORD=admin123
TEST_PROJECT_ID=550e8400-e29b-41d4-a716-446655440000
BASE_URL=http://localhost:3001
```

**Replace with your actual values!**

---

## Step 4: Update auth.setup.ts

Edit `e2e/auth.setup.ts` and verify the selectors match your login form:

```typescript
// Verify these selectors match your actual login page:
await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL)
await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD)
await page.click('button[type="submit"]')
```

**Check your login page HTML if tests fail here!**

---

## Step 5: Update test-config.ts

Edit `e2e/helpers/test-config.ts` line 12:

```typescript
// Change from:
testProjectId: process.env.TEST_PROJECT_ID || 'test-project-123',

// To your actual project ID:
testProjectId: process.env.TEST_PROJECT_ID || 'YOUR-ACTUAL-PROJECT-ID-HERE',
```

---

## ✅ **Verify Setup**

### **Run Tests:**

```bash
# Run in UI mode to see what's happening
pnpm test:e2e:ui
```

### **What Should Happen:**

1. ✅ Browser opens
2. ✅ Goes to `/auth/login`
3. ✅ Fills in email and password
4. ✅ Clicks login button
5. ✅ Redirects to `/projects`
6. ✅ Saves authentication state
7. ✅ Runs all tests with authentication
8. ✅ Tests navigate to your test project
9. ✅ All tabs are tested
10. ✅ All tests pass! 🎉

---

## 🐛 **Troubleshooting**

### **Issue: "Authentication Required" Still Showing**

**Check 1: Login Selectors**
```bash
# Verify your login form uses these field names:
<input name="email" />  <!-- or type="email" -->
<input name="password" /> <!-- or type="password" -->
<button type="submit">Login</button>
```

If different, update `e2e/auth.setup.ts`:
```typescript
await page.fill('YOUR-ACTUAL-EMAIL-SELECTOR', email)
await page.fill('YOUR-ACTUAL-PASSWORD-SELECTOR', password)
```

**Check 2: Login Response**
```bash
# After login, does the app redirect to /projects?
# If not, update auth.setup.ts line 21:
await page.waitForURL(/YOUR-ACTUAL-REDIRECT-PATTERN/)
```

**Check 3: Credentials**
```bash
# Are your test credentials correct?
# Try logging in manually first with the same credentials
```

---

### **Issue: "Project not found" or 403 Forbidden**

**Cause:** Test project ID doesn't exist or user doesn't have access

**Solution:**
1. Use a project YOU OWN
2. Make sure test user has access to that project
3. Update TEST_PROJECT_ID in .env.test

---

### **Issue: Tests are slow**

**Cause:** `waitForTimeout()` everywhere

**Solution:** Use specific waits
```typescript
// ❌ Slow
await page.waitForTimeout(2000)

// ✅ Fast
await expect(page.locator('text=Loaded')).toBeVisible()
```

---

## 🎯 **Quick Start (After Setup)**

```bash
# 1. Make sure dev server is running
pnpm dev  # Terminal 1

# 2. Run tests in UI mode (easiest to debug)
pnpm test:e2e:ui  # Terminal 2

# 3. Click "project-tabs.spec.ts" in the left sidebar

# 4. Watch tests run!
# - Should login automatically
# - Navigate to your test project
# - Test all 6 tabs
# - Show green checkmarks ✅
```

---

## 📝 **Example Configuration**

### **My Setup (Example):**

```bash
# .env.test
TEST_USER_EMAIL=admin@adpa.com
TEST_USER_PASSWORD=admin123
TEST_PROJECT_ID=a1b2c3d4-e5f6-7890-abcd-ef1234567890
BASE_URL=http://localhost:3001
```

### **My auth.setup.ts (Simplified):**

```typescript
import { test as setup } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '../.auth/user.json');

setup('authenticate', async ({ page }) => {
  await page.goto('/auth/login');
  
  // Fill login form
  await page.fill('input[name="email"]', 'admin@adpa.com');
  await page.fill('input[name="password"]', 'admin123');
  
  // Submit
  await page.click('button:has-text("Login")');
  
  // Wait for redirect
  await page.waitForURL('/projects');
  
  // Save auth
  await page.context().storageState({ path: authFile });
});
```

---

## 🎓 **Pro Tips**

### **Tip 1: Use a Dedicated Test Project**
- Create a project called "Playwright Test Project"
- Add sample documents, stakeholders, etc.
- Use this project ID for all tests
- Never delete it!

### **Tip 2: Run Smoke Tests Often**
```bash
# After any component change:
pnpm exec playwright test e2e/smoke.spec.ts

# Fast (30s), catches most issues
```

### **Tip 3: Use UI Mode for Debugging**
```bash
pnpm test:e2e:ui

# Pause at any step
# Inspect elements
# See network requests
# Debug issues visually
```

---

## ✅ **Success Checklist**

- [ ] Created .env.test with actual credentials
- [ ] Found a real project ID from your database
- [ ] Updated test-config.ts with project ID
- [ ] Verified login form selectors in auth.setup.ts
- [ ] Ran `pnpm test:e2e:ui`
- [ ] Saw browser login automatically
- [ ] Tests navigated to project page
- [ ] All tabs tested successfully
- [ ] Green checkmarks everywhere! ✅

---

## 🎉 **Once Working**

You'll have:
- ✅ Automated regression testing
- ✅ Confidence during refactoring
- ✅ Fast feedback (30s for smoke tests)
- ✅ Visual verification of changes
- ✅ No more manual clicking through tabs!

---

## 📞 **Still Having Issues?**

### **Quick Debug:**

```bash
# Run just the auth setup to see what happens
pnpm exec playwright test e2e/auth.setup.ts --headed

# Watch the browser:
# - Does it navigate to login page? ✅
# - Does it fill in credentials? ✅
# - Does it click login? ✅
# - Does it redirect after login? ✅
# - Does .auth/user.json get created? ✅

# If any step fails, that's where to fix!
```

---

**Need help? The auth setup is the key - get that working and everything else flows!** 🎭✨

