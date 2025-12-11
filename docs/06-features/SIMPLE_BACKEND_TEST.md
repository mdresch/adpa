# Simple Backend Test - Model Analytics

## Quick Test (1 Minute)

### Option 1: Browser Console (Easiest) ✅

1. **Open** http://localhost:3000 in your browser
2. **Login** if not already logged in
3. **Press F12** to open DevTools
4. **Click** Console tab
5. **Paste** this code and press Enter:

```javascript
const token = localStorage.getItem('token')

fetch('http://localhost:5000/api/ai-analytics/models/a2b3c4d5-e6f7-4890-9abc-def123456789/gemini-1.5-flash-latest?period=30d', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(data => {
  console.log('✅ SUCCESS:', data)
  console.log('\n📊 SUMMARY:')
  console.table(data.summary)
  console.log('\n📈 Usage days:', data.usageOverTime?.length)
  console.log('❌ Error patterns:', data.errorAnalysis?.length)
})
.catch(err => console.error('❌ ERROR:', err))
```

6. **Check the output** in the console

---

## What You Should See

If the endpoint works, you'll see:

```
✅ SUCCESS: { success: true, model: {...}, summary: {...}, ... }

📊 SUMMARY:
┌──────────────────────┬─────────┐
│      (index)         │ Values  │
├──────────────────────┼─────────┤
│ totalRequests        │    41   │
│ totalTokens          │ 1510982 │
│ successRate          │  19.5   │
│ avgResponseTime      │    0    │
│ avgTokensPerRequest  │  36824  │
└──────────────────────┴─────────┘

📈 Usage days: 15
❌ Error patterns: 2
```

---

## What Different Outputs Mean

### ✅ Success - Data Found
```
Total Requests: 41
Success Rate: 19.5%
```
**Action:** Backend works! Proceed with frontend component.

### ⚠️ Success - No Data
```
Total Requests: 0
Success Rate: 0%
```
**Reason:** This model hasn't been used yet, or model name doesn't match.  
**Action:** Try different model name like `gemini-2.5-flash` or `gemini-2.5-pro`

### ❌ Error 401 Unauthorized
```
{error: "User not found"}
```
**Reason:** Token is invalid or expired  
**Action:** Logout and login again at http://localhost:3000

### ❌ Error 404 Not Found
```
{error: "Provider not found"}
```
**Reason:** Provider ID doesn't exist  
**Action:** Check provider ID is correct

### ❌ Network Error
```
Failed to fetch
```
**Reason:** Backend not running  
**Action:** Start backend with `cd server && npm run dev`

---

## Try Different Models

If `gemini-1.5-flash-latest` returns no data, try these:

```javascript
// Test gemini-2.5-pro (57.3% of usage)
fetch('http://localhost:5000/api/ai-analytics/models/a2b3c4d5-e6f7-4890-9abc-def123456789/gemini-2.5-pro?period=30d', {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
}).then(r => r.json()).then(console.log)

// Test gemini-2.5-flash (25.0% of usage)
fetch('http://localhost:5000/api/ai-analytics/models/a2b3c4d5-e6f7-4890-9abc-def123456789/gemini-2.5-flash?period=30d', {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
}).then(r => r.json()).then(console.log)

// Test google/gemini-2.5-flash (17.1% of usage)
fetch('http://localhost:5000/api/ai-analytics/models/a2b3c4d5-e6f7-4890-9abc-def123456789/google%2Fgemini-2.5-flash?period=30d', {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
}).then(r => r.json()).then(console.log)
```

---

## ✅ Once Backend Confirmed

After you see the backend working, reply with:
- ✅ "Backend works! Saw X requests"
- Or ⚠️ "No data for gemini-1.5-flash-latest, but gemini-2.5-pro works"
- Or ❌ "Got error: [error message]"

Then I'll create the beautiful frontend component! 🎨

---

**Test now in browser console and let me know what you see!** 🚀

