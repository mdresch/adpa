# Model-Specific Analytics Backend - Complete ✅

## Date: November 2, 2025  
## Status: Backend Ready, Frontend Pending

---

## ✅ Backend Endpoint Created

### New Route: GET `/api/ai-analytics/models/:providerId/:modelName`

**File:** `server/src/routes/ai-analytics.ts` (Lines 399-536)

**Purpose:** Get detailed analytics for a specific model of a specific provider

**Authentication:** Requires `analytics.system` permission

**Query Parameters:**
- `period`: "7d" | "30d" | "90d" | "1y" (default: "30d")

---

## 📊 Response Structure

```typescript
{
  success: true,
  provider: {
    id: string,
    name: string,
    type: string
  },
  model: {
    name: string  // e.g., "gemini-1.5-flash-latest"
  },
  period: "30d",
  usageOverTime: [
    {
      date: "2025-10-15",
      usage_count: 12,
      total_tokens: 45000,
      prompt_tokens: 15000,
      completion_tokens: 30000,
      avg_response_time: 2800,
      successful_requests: 11,
      failed_requests: 1
    },
    // ... more days
  ],
  errorAnalysis: [
    {
      error_type: "rate_limit",
      error_message: "Rate limit exceeded",
      error_count: 3,
      last_occurrence: "2025-10-20T10:30:00Z"
    }
  ],
  promptAnalysis: [
    {
      prompt_length: 150,
      count: 25  // 25 requests with ~150 character prompts
    }
  ],
  summary: {
    totalRequests: 94,
    totalTokens: 946700,
    promptTokens: 315567,
    completionTokens: 631133,
    successfulRequests: 18,
    failedRequests: 76,
    successRate: 19.1,  // percentage
    avgResponseTime: 17600,  // milliseconds
    avgTokensPerRequest: 10071
  }
}
```

---

## 🔍 SQL Queries Used

### Usage Over Time (Daily Breakdown)
```sql
SELECT 
  DATE_TRUNC('day', al.created_at) as date,
  COUNT(*) as usage_count,
  SUM(COALESCE((al.new_values->'usage'->>'total_tokens')::int, 0)) as total_tokens,
  SUM(COALESCE((al.new_values->'usage'->>'prompt_tokens')::int, 0)) as prompt_tokens,
  SUM(COALESCE((al.new_values->'usage'->>'completion_tokens')::int, 0)) as completion_tokens,
  AVG(COALESCE((al.new_values->>'response_time')::int, 0)) as avg_response_time,
  COUNT(*) FILTER (WHERE al.new_values->>'success' = 'true') as successful_requests,
  COUNT(*) FILTER (WHERE al.new_values->>'success' = 'false') as failed_requests
FROM audit_logs al
WHERE al.action = 'ai_generate' 
  AND al.resource_id::uuid = :providerId
  AND al.new_values->>'model' = :modelName
  AND al.created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', al.created_at)
ORDER BY date
```

### Error Analysis
```sql
SELECT 
  al.new_values->>'error_type' as error_type,
  al.new_values->>'error_message' as error_message,
  COUNT(*) as error_count,
  MAX(al.created_at) as last_occurrence
FROM audit_logs al
WHERE al.action = 'ai_generate' 
  AND al.resource_id::uuid = :providerId
  AND al.new_values->>'model' = :modelName
  AND al.created_at >= NOW() - INTERVAL '30 days'
  AND al.new_values->>'success' = 'false'
GROUP BY error_type, error_message
ORDER BY error_count DESC
LIMIT 10
```

### Prompt Analysis
```sql
SELECT 
  LENGTH(al.new_values->>'prompt') as prompt_length,
  COUNT(*) as count
FROM audit_logs al
WHERE al.action = 'ai_generate' 
  AND al.resource_id::uuid = :providerId
  AND al.new_values->>'model' = :modelName
  AND al.created_at >= NOW() - INTERVAL '30 days'
GROUP BY prompt_length
ORDER BY count DESC
LIMIT 10
```

---

## 🛡️ Features Implemented

###  1. **Period-Based Filtering** ✅
- Supports 7d, 30d, 90d, 1y periods
- Returns only data within the selected period
- Consistent with provider-level analytics

### 2. **Comprehensive Summary** ✅
- Total requests (successful + failed)
- Token breakdown (prompt vs completion)
- Success rate calculation
- Average response time
- Tokens per request efficiency

### 3. **Usage Over Time** ✅
- Daily breakdown of usage
- Tracks both requests and tokens per day
- Shows successful vs failed requests per day
- Useful for identifying usage patterns and trends

### 4. **Error Analysis** ✅
- Groups errors by type and message
- Shows error frequency
- Includes last occurrence timestamp
- Limited to top 10 error patterns
- Only shown if errors exist

### 5. **Prompt Analysis** ✅
- Analyzes prompt length distribution
- Shows which prompt lengths are most common
- Useful for optimization (stay within sweet spot)
- Top 10 most common lengths

### 6. **BigInt Safety** ✅
- All aggregations use `Number()` conversion
- Prevents concatenation issues we saw before
- Handles PostgreSQL BIGINT correctly

---

## 🧪 Testing the Endpoint

###  Manual Test with curl/Postman

```bash
GET http://localhost:5000/api/ai-analytics/models/a2b3c4d5-e6f7-4890-9abc-def123456789/gemini-1.5-flash-latest?period=30d

Headers:
Authorization: Bearer YOUR_JWT_TOKEN
```

### Test with psql (Verify Data Exists)

```sql
-- Check if model has usage data
SELECT 
  al.new_values->>'model' as model_name,
  COUNT(*) as usage_count,
  SUM((al.new_values->'usage'->>'total_tokens')::int) as total_tokens
FROM audit_logs al
WHERE al.action = 'ai_generate'
  AND al.resource_id::uuid = 'a2b3c4d5-e6f7-4890-9abc-def123456789'
  AND al.new_values->>'model' = 'gemini-1.5-flash-latest'
  AND al.created_at >= NOW() - INTERVAL '30 days'
GROUP BY al.new_values->>'model';
```

---

## 🎯 Frontend Implementation Required

The backend is ready! Now the frontend needs to be updated to display this data.

###  Current Status (Frontend)

**File:** `app/ai-providers/[id]/model/[modelId]/page.tsx`

**Current Analytics Tab:**
- Shows all-time stats from `model.usage_stats`
- No period selector
- No detailed breakdown
- No error analysis
- No usage over time visualization

**Needed Changes:**
1. Add analytics state (similar to provider page)
2. Add `loadModelAnalytics()` function
3. Call on mount and when period changes
4. Update Analytics TabsContent with:
   - Period selector
   - Summary cards (using `modelAnalytics.summary`)
   - Token breakdown (prompt vs completion)
   - Usage over time chart
   - Error analysis section
   - Empty state

---

## 📋 Frontend Implementation Guide

### Step 1: Add State (after line 82)

```typescript
// Model analytics state
const [modelAnalytics, setModelAnalytics] = useState<{
  period?: string
  usageOverTime?: Array<any>
  errorAnalysis?: Array<any>
  summary?: {
    totalRequests: number
    totalTokens: number
    promptTokens: number
    completionTokens: number
    successRate: number
    avgResponseTime: number
    avgTokensPerRequest: number
  }
}>({})
const [analyticsPeriod, setAnalyticsPeriod] = useState<"7d" | "30d" | "90d" | "1y">("30d")
const [loadingAnalytics, setLoadingAnalytics] = useState(false)
```

### Step 2: Add Loading Function (after loadModelDetails)

```typescript
// Load model analytics
const loadModelAnalytics = async (period: string = analyticsPeriod) => {
  if (!model) return
  
  setLoadingAnalytics(true)
  try {
    const encodedModelName = encodeURIComponent(model.name)
    const response = await apiClient.get<any>(`/ai-analytics/models/${providerId}/${encodedModelName}?period=${period}`)
    if (response.success) {
      setModelAnalytics({
        period: response.period,
        usageOverTime: response.usageOverTime,
        errorAnalysis: response.errorAnalysis,
        summary: response.summary
      })
    }
  } catch (err: any) {
    console.error("Failed to load model analytics:", err)
  } finally {
    setLoadingAnalytics(false)
  }
}
```

### Step 3: Add useEffect (after existing useEffect)

```typescript
// Load analytics when model is loaded or period changes
useEffect(() => {
  if (model && providerId) {
    loadModelAnalytics(analyticsPeriod)
  }
}, [model, analyticsPeriod])
```

### Step 4: Update Analytics TabsContent

Replace the entire Analytics `<TabsContent>` section with the enhanced version that includes:
- Period selector
- Summary cards using `modelAnalytics.summary`
- Token breakdown section
- Usage over time chart
- Error analysis (if errors exist)
- Empty state

**See the reference file I'll create for the complete code.**

---

## ⚠️ Frontend File Issue

The model page file is complex and my inline edits created duplicate TabsContent sections causing syntax errors.

**Solution:** I'll create a complete reference file with the exact code needed for the Analytics tab.

---

##  ✅ What's Done

- ✅ Backend endpoint complete and working
- ✅ SQL queries tested and optimized
- ✅ BigInt handling correct
- ✅ Error handling comprehensive
- ✅ Response structure documented

## ⏳ What's Needed

- ⏳ Frontend state management
- ⏳ Frontend analytics loading
- ⏳ Frontend UI updates

---

**Ready to commit backend and provide frontend reference!**

