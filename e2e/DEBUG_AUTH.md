# 🔍 Debug Playwright Authentication

## Error You're Seeing:
```
Error: Login failed - still on login page or no user menu found
```

---

## 🎯 **Quick Fix Guide**

### **Step 1: Run Auth Setup with Debugging**

```bash
# Run in headed mode to WATCH what happens
pnpm exec playwright test e2e/auth.setup.ts --headed

# What to observe:
1. Does browser open? ✅
2. Does it go to /auth/login? ✅
3. Does it fill email field? ← Watch this
4. Does it fill password field? ← Watch this
5. Does it click Login button? ← Watch this
6. Does page change after clicking? ← KEY MOMENT
```

**Updated auth.setup.ts will now:**
- ✅ Take screenshot (`debug-login-failed.png`) if login fails
- ✅ Print current URL to console
- ✅ Print page title to console
- ✅ Check multiple success indicators

---

### **Step 2: Check the Screenshot**

After it fails, look at: `debug-login-failed.png`

**What to look for:**
- Still on login page? → Credentials wrong or button didn't click
- On error page? → Check error message
- On projects page? → Success indicators wrong

---

### **Step 3: Check Console Output**

The test will now print:
```
Current URL after login attempt: http://localhost:3001/...
Page title: ADPA Admin Portal
```

**This tells you:**
- Where you ended up
- What page loaded
- If redirect happened

---

## 🔧 **Common Fixes**

### **Fix 1: Wrong Credentials**

Check if `admin@adpa.com` / `admin123` exists in your database:

```sql
-- Check your database:
SELECT * FROM users WHERE email = 'admin@adpa.com';

-- If no result, create the user or use different credentials
```

**Then update** `e2e/auth.setup.ts` lines 19-20 with correct credentials.

---

### **Fix 2: Login Form Selectors Don't Match**

Your login form might use different field names. 

**Check your actual login page:**
```tsx
// Does your login use:
<input name="email" />        ← Standard
<input id="email" />          ← Different!
<input placeholder="Email" /> ← Different!
```

**Update selectors in auth.setup.ts:**
```typescript
// If using id instead of name:
await page.fill('#email', 'admin@adpa.com');
await page.fill('#password', 'admin123');

// If using placeholder:
await page.fill('input[placeholder="Email"]', 'admin@adpa.com');
```

---

### **Fix 3: Login Button Selector**

Your login button might have different text:

**Check your button:**
```tsx
<button>Login</button>        ← Works
<button>Sign In</button>      ← Works  
<button>Log In</button>       ← Works
<button>Enter</button>        ← Doesn't work!
```

**Update line 23:**
```typescript
// Add your button text:
await page.click('button:has-text("Your Button Text")');
```

---

### **Fix 4: Redirect URL Pattern**

After login, where does your app redirect?

**Common patterns:**
- `/projects` ✅
- `/` (homepage) ✅
- `/dashboard` ← Different!
- `/app` ← Different!

**Updated code already handles this!** It checks:
- ✅ URL changed from /auth/login
- ✅ "Projects" text visible
- ✅ User menu visible
- ✅ Sidebar/nav visible

---

## 🎯 **Debugging Commands**

### **Run with Maximum Debug Info:**

```bash
# Headed mode (watch browser) + debug console
pnpm exec playwright test e2e/auth.setup.ts --headed --debug

# This will:
- Open browser you can see
- Pause at each step
- Let you inspect elements
- Show you exactly where it fails
```

---

### **Check What Playwright Sees:**

Add this temporarily to `auth.setup.ts` after line 26:

```typescript
await page.waitForTimeout(2000);

// DEBUG: See what's on the page
console.log('=== DEBUG INFO ===');
console.log('Current URL:', page.url());
console.log('Page title:', await page.title());

// Check for elements
console.log('Has "Projects" text:', await page.locator('text=Projects').count());
console.log('Has Logout button:', await page.locator('button:has-text("Logout")').count());
console.log('Has navigation:', await page.locator('nav, aside').count());

// Take screenshot
await page.screenshot({ path: 'debug-after-login.png', fullPage: true });
console.log('Screenshot saved to debug-after-login.png');
```

---

## 💡 **Most Likely Issues**

### **1. Wrong Credentials** (70% of cases)
- Email doesn't exist in database
- Password is incorrect
- User is disabled

**Solution:** Use credentials that definitely work

---

### **2. Wrong Field Selectors** (20% of cases)
- Login form uses `id` instead of `name`
- Fields have different attributes

**Solution:** Inspect your login page HTML and update selectors

---

### **3. CSRF or Validation** (10% of cases)
- Form requires CSRF token
- Client-side validation preventing submit

**Solution:** Usually works with real browser, but check for validation errors

---

## ✅ **Try This Right Now:**

```bash
# Run with headed mode to SEE what's happening:
pnpm exec playwright test e2e/auth.setup.ts --headed

# WATCH:
1. Browser opens
2. Goes to login page
3. Types email
4. Types password
5. Clicks button
6. What happens next? ← THIS IS THE KEY

# Does it:
- Stay on login page? → Wrong credentials
- Show error message? → Check what error says
- Redirect but fail detection? → Success indicators wrong
- Not even click? → Button selector wrong
```

---

## 📸 **Screenshot Will Tell All**

After running, check `debug-login-failed.png`:
- Still on login page? → Login didn't work
- On projects page? → Detection logic is wrong (easy fix!)
- On error page? → Read the error message

---

**Run the headed mode test and tell me what you see! We'll fix it together.** 🔧✨
