# Testing Model Analytics Backend Endpoint

## Endpoint Details
- **URL:** `GET /api/ai-analytics/models/:providerId/:modelName`
- **Example:** `GET /api/ai-analytics/models/a2b3c4d5-e6f7-4890-9abc-def123456789/gemini-1.5-flash-latest?period=30d`
- **Status:** ✅ Backend Running on http://localhost:5000

---

## 🧪 Test Method 1: Browser DevTools (Easiest)

1. Open http://localhost:3000 in browser
2. Press F12 to open DevTools
3. Go to Console tab
4. Paste this code:

```javascript
// Get your auth token
const token = localStorage.getItem('token')

// Test gemini-1.5-flash-latest
fetch('http://localhost:5000/api/ai-analytics/models/a2b3c4d5-e6f7-4890-9abc-def123456789/gemini-1.5-flash-latest?period=30d', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
.then(r => r.json())
.then(data => {
  console.log('✅ Model Analytics Response:', data)
  console.log('\n📊 Summary:', data.summary)
  console.log('\n📈 Usage Over Time:', data.usageOverTime?.length, 'days')
  console.log('\n❌ Errors:', data.errorAnalysis?.length, 'error patterns')
  
  // Pretty print summary
  if (data.summary) {
    console.table({
      'Total Requests': data.summary.totalRequests,
      'Total Tokens': data.summary.totalTokens?.toLocaleString(),
      'Success Rate': data.summary.successRate?.toFixed(1) + '%',
      'Avg Response Time': data.summary.avgResponseTime + 'ms',
      'Tokens/Request': data.summary.avgTokensPerRequest
    })
  }
})
.catch(err => console.error('❌ Error:', err))
```

5. Check the console output

---

## Expected Output for gemini-1.5-flash-latest

Based on the provider analytics you showed:
```javascript
{
  success: true,
  provider: {
    id: "a2b3c4d5-e6f7-4890-9abc-def123456789",
    name: "Google AI",
    type: "google"
  },
  model: {
    name: "gemini-1.5-flash-latest"
  },
  period: "30d",
  summary: {
    totalRequests: 41,           // From provider: 41 requests (25.0%)
    totalTokens: 1510982,         // ~1.5M
    promptTokens: ...,
    completionTokens: ...,
    successfulRequests: 8,        // 19.5% of 41 ≈ 8
    failedRequests: 33,           // 80.5% failed
    successRate: 19.5,            // Matches provider display
    avgResponseTime: 0,           // Shows 0ms in provider view
    avgTokensPerRequest: 36824    // Matches provider: 36,824
  },
  usageOverTime: [
    { date: "2025-10-15", usage_count: 3, total_tokens: 110472, ... },
    { date: "2025-10-16", usage_count: 5, total_tokens: 184120, ... },
    // ... up to 30 days
  ],
  errorAnalysis: [
    // Will show errors if success rate is only 19.5%
  ]
}
```

---

## 🧪 Test Method 2: SQL Direct Query

Verify data exists in database:

```sql
-- Check if this specific model has data
SELECT 
  DATE_TRUNC('day', al.created_at) as date,
  COUNT(*) as usage_count,
  SUM((al.new_values->'usage'->>'total_tokens')::int) as total_tokens,
  COUNT(*) FILTER (WHERE al.new_values->>'success' = 'true') as successful,
  COUNT(*) FILTER (WHERE al.new_values->>'success' = 'false') as failed
FROM audit_logs al
WHERE al.action = 'ai_generate'
  AND al.resource_id::uuid = 'a2b3c4d5-e6f7-4890-9abc-def123456789'
  AND al.new_values->>'model' = 'gemini-1.5-flash-latest'
  AND al.created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', al.created_at)
ORDER BY date;
```

---

## 🧪 Test Method 3: Postman/Insomnia

```
GET http://localhost:5000/api/ai-analytics/models/a2b3c4d5-e6f7-4890-9abc-def123456789/gemini-1.5-flash-latest?period=30d

Headers:
Authorization: Bearer YOUR_JWT_TOKEN_HERE
Content-Type: application/json
```

---

## ✅ Success Criteria

The endpoint is working if you see:

1. ✅ `success: true`
2. ✅ `summary.totalRequests` matches the model's usage (should be ~41 for gemini-1.5-flash)
3. ✅ `summary.totalTokens` is around 1.5M
4. ✅ `summary.successRate` is ~19.5% (matches what provider page showed)
5. ✅ `summary.avgTokensPerRequest` is ~36,824
6. ✅ `usageOverTime` array has entries for days the model was used
7. ✅ `errorAnalysis` shows errors (since success rate is low)
8. ✅ No 500 errors, no crashes

---

## 🐛 Troubleshooting

### Issue: 401 Unauthorized
**Solution:** Make sure you're logged in at http://localhost:3000 first

### Issue: 404 Not Found  
**Solution:** Backend might not be running or endpoint URL is wrong

### Issue: Empty usageOverTime array
**Possible Causes:**
- Model name doesn't match exactly (case-sensitive!)
- No audit_logs for this model in the period
- Provider ID is wrong

### Issue: All values are 0
**Cause:** Model hasn't been used or audit_logs missing data

---

## 📊 Understanding the Data

From your provider analytics, we know:

**gemini-1.5-flash (combined variants):**
- Total: 41 + 28 = 69 requests
- But named differently: `gemini-2.5-flash` vs `google/gemini-2.5-flash`

**gemini-1.5-flash-latest:**
- Might be yet another naming variant
- Or might be zero usage (need to test)

**Test different model names:**
```javascript
// Try these variants:
'gemini-1.5-flash-latest'
'gemini-2.5-flash'
'google/gemini-2.5-flash'
'gemini-2.5-pro'
```

---

## 🎯 After Backend Test

Once you verify the backend works:

1. ✅ Confirm data structure is correct
2. ✅ Verify numbers match expectations
3. 📦 Then we'll create ModelAnalyticsTab component
4. 🔗 Wire it into the main page
5. 🎨 Beautiful UI displays the data

**Test the backend now and let me know what you see!** 🚀

