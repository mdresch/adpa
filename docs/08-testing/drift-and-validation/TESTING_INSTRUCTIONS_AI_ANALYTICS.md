# Testing Instructions: AI Provider Analytics Feature

## Status: 🧪 Ready for Testing
## Commits: `080e64c` (feature) + `b82d59a` (bug fix)

---

## 🚀 Quick Start

### 1. Restart Backend Server (CRITICAL!)

The bug fix requires backend restart to take effect:

```powershell
# Stop current backend (Ctrl+C if running)
# Then start fresh:
cd D:\source\repos\adpa\server
npm run dev
```

### 2. Refresh Frontend

```powershell
# Frontend should already be running at http://localhost:3000
# If not:
cd D:\source\repos\adpa
pnpm dev
```

### 3. Hard Refresh Browser

- Press `Ctrl + Shift + R` (Windows)
- Or `Ctrl + F5`
- This clears cached JavaScript

---

## 📋 Testing Checklist

### Test 1: Navigate to Provider Analytics

1. Open: `http://localhost:3000/ai-providers/a2b3c4d5-e6f7-4890-9abc-def123456789`
2. Click the **"Analytics"** tab

**Expected:**
- Tab switches to Analytics view
- Period selector visible at top
- Loading spinner shows briefly
- Data loads within 1-2 seconds

---

### Test 2: Verify Summary Cards

**Check each of the 4 summary cards:**

#### Card 1: Total Requests
- ✅ Should show normal number (e.g., `164`, not `05915454030141428`)
- ✅ Label should say "Last 30 days"

#### Card 2: Total Tokens  
- ✅ Should show formatted number (e.g., `1.2M`, not `3.0024e+61M`)
- ✅ If >= 1 million: shows as `X.XM`
- ✅ If >= 1 thousand: shows as `X.XK`
- ✅ If < 1 thousand: shows full number

#### Card 3: Avg Response Time
- ✅ Should show actual time (e.g., `2.8s` or `450ms`, not `0ms`)
- ✅ If < 1000ms: shows as `XXXms`
- ✅ If >= 1000ms: shows as `X.Xs`

#### Card 4: Total Errors
- ✅ Should show `0` (green) or actual error count (red)
- ✅ Color coded correctly

---

### Test 3: Model Usage Breakdown (KEY FEATURE!)

**This section should show each model used by the provider:**

For example, if using Google AI, you might see:
- `gemini-2.0-flash`
- `gemini-1.5-pro`
- `gemini-1.5-flash`

**For EACH model, verify:**

#### ✅ Model Header
- Model name displayed clearly (e.g., "gpt-4")
- Usage count shows normal number (e.g., "45 requests")
- **Percentage should NOT be 0.0%** - should show actual distribution
  - Example: "75.0%" for primary model, "25.0%" for secondary
  - All percentages should sum to ~100%

#### ✅ Success Rate Badge
- Should show realistic percentage (typically 95-100%)
- **Should NOT show 19.1% or 0.0%** unless truly that low
- Green badge if >= 95%
- Red badge if < 95%

#### ✅ Progress Bar
- Visual bar showing usage distribution
- Width should match percentage
- Color-coded (blue/green/purple/orange)

#### ✅ Three Metric Cards

**1. Tokens:**
- Should show formatted number (e.g., `850K`, not `946.7K` with weird decimal)
- Format: `X.XM` for millions, `X.XK` for thousands

**2. Avg Speed:**
- Should show actual response time
- **Should NOT be 0ms** unless truly instant
- Example: `2.8s`, `1.2s`, `450ms`

**3. Tokens/Req:**
- Should show reasonable number (e.g., `18,889`)
- **Should NOT be decimal** like `10.071` (should be formatted as `10,071`)
- Calculated as: total_tokens / usage_count

---

### Test 4: Period Selector

**Click each period button:**

#### 7 Days Button
1. Click "7 Days"
2. Button should highlight (active state)
3. Data should reload (watch for brief spinner)
4. Summary cards should update
5. Model list might change (different models used in different periods)
6. Numbers should be smaller than 30-day view

#### 30 Days Button
1. Click "30 Days"  
2. Should show more data than 7 days
3. Labels should say "Last 30 days"

#### 90 Days Button
1. Click "90 Days"
2. Should show even more data
3. Labels should say "Last 90 days"

#### 1 Year Button
1. Click "1 Year"
2. Should show most data
3. Labels should say "Last 1 year"

**Verify:**
- Only one button active at a time
- Numbers change between periods
- Buttons disable during loading
- No errors in console

---

### Test 5: Empty State

**To test empty state, try a provider with no usage:**

1. Navigate to a newly created provider
2. Click Analytics tab

**Expected:**
- Dashed border card
- BarChart icon (gray)
- Message: "No Usage Data Yet"
- "Generate Your First Document" button
- Clicking button should navigate to `/projects`

---

## 🐛 Known Issues to Watch For

### If Numbers Still Look Wrong:

**Problem:** Backend not restarted  
**Solution:** Stop and restart `cd server && npm run dev`

**Problem:** Browser cached old JavaScript  
**Solution:** Hard refresh (Ctrl+Shift+R)

**Problem:** Backend still processing old code  
**Solution:** Check backend terminal for any errors

---

## ✅ Success Criteria

The feature is working correctly when:

1. ✅ Total Requests is a normal number (not concatenated)
2. ✅ Total Tokens shows as K/M format (not scientific notation)
3. ✅ Model percentages sum to ~100%
4. ✅ Success rates are realistic (95-100% typically)
5. ✅ Response times show actual values (not all 0ms)
6. ✅ Tokens/Req shows whole numbers with formatting
7. ✅ Period selector changes the data
8. ✅ Model breakdown shows all models used
9. ✅ Visual elements render correctly (progress bars, badges)
10. ✅ Empty state shows when no data

---

## 📸 Expected Display (Example)

```
Provider Analytics
Detailed usage statistics and model performance

[7 Days] [30 Days] [90 Days] [1 Year]  ← Period Selector

┌─────────────┬─────────────┬──────────────┬──────────────┐
│ Total       │ Total       │ Avg Response │ Total        │
│ Requests    │ Tokens      │ Time         │ Errors       │
│             │             │              │              │
│ 164         │ 1.2M        │ 2.8s         │ 0            │
│             │             │              │              │
│ Last 30 days│ Processed   │ Avg latency  │ Failed       │
└─────────────┴─────────────┴──────────────┴──────────────┘

Model Usage Breakdown
Usage statistics per model for this provider

┌──────────────────────────────────────────────────────┐
│ ● gemini-2.0-flash                                   │
│   123 requests (75.0%)        [98.5% Success]        │
│   ████████████░░░                                    │
│   ┌───────────┬────────────┬──────────────┐         │
│   │ Tokens    │ Avg Speed  │ Tokens/Req   │         │
│   │ 850K      │ 2.8s       │ 6,910        │         │
│   └───────────┴────────────┴──────────────┘         │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│ ● gemini-1.5-pro                                     │
│   41 requests (25.0%)         [100.0% Success]       │
│   ████░░░░░░░░                                       │
│   ┌───────────┬────────────┬──────────────┐         │
│   │ Tokens    │ Avg Speed  │ Tokens/Req   │         │
│   │ 370K      │ 3.2s       │ 9,024        │         │
│   └───────────┴────────────┴──────────────┘         │
└──────────────────────────────────────────────────────┘
```

---

## 🎯 What Success Looks Like

**Numbers that make sense:**
- Requests: 1-10,000 range typically
- Tokens: Formatted as 123K, 1.2M, 45.6M
- Response Time: 0.5s - 10s range typically
- Success Rate: 95-100% typically
- Percentages: Sum to 100% across models

**If you see this, the feature is working! 🎉**

---

**Next Steps After Testing:**
1. Validate the numbers match your expectations
2. Test period selector thoroughly
3. Verify model breakdown is helpful
4. Let me know if anything looks wrong!

**Ready for your testing!** 🚀

