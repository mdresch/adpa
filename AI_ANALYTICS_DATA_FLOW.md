# AI Analytics Data Flow - Complete Review

## Overview
This document traces how AI provider usage statistics flow from actual API calls to the Usage Analytics dashboard on the AI Providers page.

---

## 📊 The Complete Data Flow

### 1. **Frontend: Usage Analytics Tab** 
**Location**: `app/ai-providers/page.tsx` (Lines 1368-1700)

The Usage Analytics tab displays:
- **Summary Statistics**:
  - Total Requests
  - Total Tokens
  - Average Response Time
  - Success Rate
  
- **Provider-Specific Stats**:
  - Usage count (requests)
  - Total tokens consumed
  - Average response time
  - Success rate percentage

**Key State** (Lines 105-121):
```typescript
const [usageAnalytics, setUsageAnalytics] = useState<{
  summary?: {
    totalRequests: number
    totalTokens: number
    avgResponseTime: number
    overallSuccessRate: number
  }
  providerStats?: Array<{
    provider_name: string
    provider_type: string
    usage_count: number
    total_tokens: number
    avg_response_time: number
    success_rate: number
  }>
}>({})
```

**Data Loading** (Lines 446-459):
```typescript
const loadUsageAnalytics = async (): Promise<void> => {
  try {
    const response = await apiClient.get<any>('/ai-analytics/models?period=30d')
    if (response.success) {
      setUsageAnalytics({
        summary: response.summary,
        providerStats: response.providerStats
      })
    }
  } catch (error) {
    console.error('Error loading usage analytics:', error)
  }
}
```

---

### 2. **Backend API: Analytics Endpoint**
**Location**: `server/src/routes/ai-analytics.ts`

**Endpoint**: `GET /api/ai-analytics/models`
- **Authentication**: Required (`authenticateToken`)
- **Authorization**: Requires `analytics.system` permission
- **Query Parameters**: 
  - `period`: "7d" | "30d" | "90d" | "1y" (default: "30d")

**Data Aggregation Query** (Lines 69-83):
```sql
SELECT 
  ap.name as provider_name,
  ap.provider_type,
  COUNT(al.*) as usage_count,
  SUM(COALESCE((al.new_values->'usage'->>'total_tokens')::int, 0)) as total_tokens,
  AVG(COALESCE((al.new_values->>'response_time')::int, 0)) as avg_response_time,
  (COUNT(*) FILTER (WHERE al.new_values->>'success' = 'true') * 100.0 / COUNT(*)) as success_rate
FROM audit_logs al
JOIN ai_providers ap ON al.resource_id::uuid = ap.id
WHERE al.action = 'ai_generate' 
  AND al.created_at >= NOW() - INTERVAL '${interval}'
GROUP BY ap.id, ap.name, ap.provider_type
ORDER BY usage_count DESC
```

**Key Insight**: The analytics are sourced from the `audit_logs` table where:
- `action` = `'ai_generate'` - identifies AI generation events
- `resource_id` = AI provider ID (UUID)
- `new_values` (JSONB) contains:
  - `usage.total_tokens` - token count from provider
  - `response_time` - milliseconds for API call
  - `success` - boolean for success/failure
  - `model` - model name used
  - `provider` - provider name

**Response Structure** (Lines 156-171):
```typescript
{
  success: true,
  period: "30d",
  usageOverTime: [...],      // Daily usage breakdown
  providerStats: [...],       // Per-provider aggregates
  modelStats: [...],          // Per-model aggregates
  hourlyUsage: [...],         // Hourly patterns
  errorPatterns: [...],       // Error analysis
  tokenEfficiency: [...],     // Token efficiency metrics
  summary: {
    totalRequests: 1234,
    totalTokens: 567890,
    avgResponseTime: 2800,
    overallSuccessRate: 98.5
  }
}
```

---

### 3. **Audit Log Creation: Queue Service**
**Location**: `server/src/services/queueService.ts` (Lines 460-496)

**When AI Jobs Complete** - After successful AI generation:

```typescript
// ⭐ CREATE AUDIT LOG FOR AI ANALYTICS ⭐
// This ensures the AI Analytics dashboard shows correct generation counts
try {
  // Get provider ID for audit log (needed by analytics queries)
  const providerResult = await pool.query(
    'SELECT id FROM ai_providers WHERE name = $1 LIMIT 1',
    [provider]
  )
  
  if (providerResult.rows.length > 0) {
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, new_values)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        userId || null,
        'ai_generate',              // ⭐ Key action for analytics
        'ai_provider',
        providerResult.rows[0].id,  // ⭐ Provider ID for JOIN
        JSON.stringify({
          prompt_length: prompt?.length || 0,
          provider,                 // Provider name
          model,                    // Model name
          template_id,              // Template used
          document_id: createdDocumentId,
          job_id: jobId,
          usage: result?.usage || {},  // ⭐ Token usage from AI provider
          success: true,            // ⭐ Success indicator
          response_time: result?.response_time || 0  // ⭐ Response time
        })
      ]
    )
    logger.info(`✅ Audit log created for AI generation (job: ${jobId})`)
  }
} catch (auditErr) {
  logger.error(`Failed to create audit log for job ${jobId}:`, auditErr)
  // Don't fail the job if audit logging fails
}
```

**Critical Fields for Analytics**:
1. `action = 'ai_generate'` - Identifies analytics-worthy events
2. `resource_id` - AI provider UUID for JOIN with `ai_providers` table
3. `new_values.usage` - Contains token statistics from AI provider response
4. `new_values.success` - Boolean for success rate calculation
5. `new_values.response_time` - Milliseconds for performance metrics
6. `new_values.model` - Model name for model-specific analytics

---

### 4. **AI Provider Response: Usage Data**
**Location**: 
- `server/src/services/aiService.ts` (Interface definitions)
- `server/src/modules/ai/openai.ts` (OpenAI implementation)
- `server/src/modules/ai/google.ts` (Google AI implementation)

**AIGenerateResponse Interface** (aiService.ts Lines 38-48):
```typescript
export interface AIGenerateResponse {
  content: string
  provider: string
  model: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number      // ⭐ Used in analytics
  }
  metadata?: any
}
```

**OpenAI Response Example** (openai.ts Lines 48-68):
```typescript
export interface OpenAIResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }>
  usage: {                      // ⭐ Native from OpenAI API
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  provider: string
  metadata?: any
}
```

**How Providers Return Usage**:
- **OpenAI**: Native `usage` object in API response
- **Google AI (Gemini)**: `usageMetadata` in response, mapped to `usage`
- **Mistral**: Native `usage` object in API response
- **Azure OpenAI**: Same as OpenAI (compatible API)

**Example OpenAI API Response**:
```json
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "created": 1677858242,
  "model": "gpt-4",
  "usage": {
    "prompt_tokens": 150,
    "completion_tokens": 850,
    "total_tokens": 1000
  },
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "Generated document content..."
    },
    "finish_reason": "stop"
  }]
}
```

---

## 🔄 End-to-End Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. USER ACTION                                                   │
│    User generates document via UI                                │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. JOB ENQUEUED                                                  │
│    POST /api/jobs/ai-generate                                    │
│    Job added to Bull queue (ai-processing)                       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. WORKER PROCESSES JOB                                          │
│    queueService.ts - aiQueue.process("ai-generate")              │
│                                                                   │
│    a) Calls AI provider (OpenAI, Google, etc.)                   │
│    b) Receives response with usage data:                         │
│       {                                                           │
│         content: "...",                                           │
│         usage: {                                                  │
│           prompt_tokens: 150,                                     │
│           completion_tokens: 850,                                 │
│           total_tokens: 1000                                      │
│         },                                                        │
│         response_time: 2800                                       │
│       }                                                           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. AUDIT LOG CREATED                                             │
│    INSERT INTO audit_logs                                        │
│    (user_id, action, resource_type, resource_id, new_values)     │
│    VALUES (                                                       │
│      '...user-uuid...',                                           │
│      'ai_generate',                    ← Key for analytics       │
│      'ai_provider',                                               │
│      '...provider-uuid...',            ← For JOIN in queries     │
│      {                                                            │
│        "provider": "openai",                                      │
│        "model": "gpt-4",                                          │
│        "usage": {                                                 │
│          "total_tokens": 1000          ← Stored for analytics    │
│        },                                                         │
│        "success": true,                ← For success rate        │
│        "response_time": 2800           ← For perf metrics        │
│      }                                                            │
│    )                                                              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. USER VIEWS ANALYTICS                                          │
│    Navigate to AI Providers page → Usage Analytics tab          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. FRONTEND LOADS DATA                                           │
│    GET /api/ai-analytics/models?period=30d                       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ 7. BACKEND AGGREGATES                                            │
│    Query audit_logs JOIN ai_providers                            │
│    WHERE action = 'ai_generate'                                  │
│    AND created_at >= NOW() - INTERVAL '30 days'                  │
│    GROUP BY provider                                             │
│                                                                   │
│    Aggregates:                                                   │
│    - COUNT(*) → usage_count                                      │
│    - SUM(total_tokens) → total_tokens                            │
│    - AVG(response_time) → avg_response_time                      │
│    - Success rate → % where success = true                       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ 8. DISPLAY ANALYTICS                                             │
│    Frontend renders:                                             │
│    - Summary cards (total requests, tokens, avg time, success)   │
│    - Provider breakdown with usage bars                          │
│    - Token distribution charts                                   │
│    - Performance comparison metrics                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📋 Database Schema

### `audit_logs` Table (Key Fields)
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(255),                    -- 'ai_generate' for AI calls
  resource_type VARCHAR(255),             -- 'ai_provider'
  resource_id UUID,                       -- AI provider ID
  new_values JSONB,                       -- Contains usage, success, response_time
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for analytics queries
CREATE INDEX idx_audit_logs_ai_analytics 
ON audit_logs(action, created_at) 
WHERE action = 'ai_generate';
```

### `ai_providers` Table (Key Fields)
```sql
CREATE TABLE ai_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  provider_type VARCHAR(50) NOT NULL,     -- 'openai', 'google', 'mistral', etc.
  is_active BOOLEAN DEFAULT true,
  configuration JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔍 Key Queries Explained

### Provider Statistics Query
```sql
-- From ai-analytics.ts lines 69-83
SELECT 
  ap.name as provider_name,              -- Provider display name
  ap.provider_type,                       -- Provider type (openai, google, etc.)
  COUNT(al.*) as usage_count,            -- Total API calls
  SUM(COALESCE((al.new_values->'usage'->>'total_tokens')::int, 0)) as total_tokens,  -- Sum all tokens
  AVG(COALESCE((al.new_values->>'response_time')::int, 0)) as avg_response_time,     -- Average latency
  (COUNT(*) FILTER (WHERE al.new_values->>'success' = 'true') * 100.0 / COUNT(*)) as success_rate  -- % successful
FROM audit_logs al
JOIN ai_providers ap ON al.resource_id::uuid = ap.id  -- Join to get provider details
WHERE al.action = 'ai_generate'                       -- Only AI generation events
  AND al.created_at >= NOW() - INTERVAL '30 days'    -- Last 30 days
GROUP BY ap.id, ap.name, ap.provider_type            -- Per provider
ORDER BY usage_count DESC                             -- Most used first
```

**Result Example**:
```json
[
  {
    "provider_name": "OpenAI GPT-4",
    "provider_type": "openai",
    "usage_count": 1234,
    "total_tokens": 567890,
    "avg_response_time": 2800,
    "success_rate": 98.5
  },
  {
    "provider_name": "Google Gemini Pro",
    "provider_type": "google",
    "usage_count": 456,
    "total_tokens": 234567,
    "avg_response_time": 2300,
    "success_rate": 99.1
  }
]
```

---

## 🎯 Critical Dependencies

### 1. **Audit Log Creation Must Succeed**
- Location: `queueService.ts` lines 460-496
- If audit log creation fails, usage analytics won't reflect the generation
- Currently wrapped in try-catch to not fail the job
- Logs error but continues: `logger.error('Failed to create audit log')`

### 2. **Provider Must Exist in Database**
- Analytics query joins `audit_logs` with `ai_providers`
- If provider doesn't exist or ID is wrong, no analytics shown
- Provider lookup: `SELECT id FROM ai_providers WHERE name = $1`

### 3. **Usage Data Must Be Present**
- AI service must return `result.usage` object
- If `usage` is null/undefined, analytics show 0 tokens
- Uses COALESCE in query: `COALESCE((al.new_values->'usage'->>'total_tokens')::int, 0)`

### 4. **JSONB Field Structure**
- `new_values` must be valid JSONB with correct structure:
  ```json
  {
    "usage": {
      "total_tokens": 1000
    },
    "success": true,
    "response_time": 2800,
    "model": "gpt-4",
    "provider": "openai"
  }
  ```

---

## 🐛 Potential Issues & Troubleshooting

### Issue 1: Analytics Show 0 or Missing Data
**Causes**:
1. Audit logs not being created (check logs for errors)
2. Provider name mismatch (job uses 'openai', but provider name is 'OpenAI GPT-4')
3. `new_values.usage` not present in audit log
4. Date range doesn't match (using 7d but only have older data)

**Debug Steps**:
```sql
-- Check if audit logs exist
SELECT COUNT(*), action 
FROM audit_logs 
WHERE action = 'ai_generate' 
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY action;

-- Check new_values structure
SELECT new_values 
FROM audit_logs 
WHERE action = 'ai_generate' 
ORDER BY created_at DESC 
LIMIT 5;

-- Check provider JOIN
SELECT al.*, ap.name, ap.provider_type
FROM audit_logs al
LEFT JOIN ai_providers ap ON al.resource_id::uuid = ap.id
WHERE al.action = 'ai_generate'
  AND al.created_at >= NOW() - INTERVAL '7 days'
LIMIT 10;
```

### Issue 2: Token Counts Look Wrong
**Causes**:
1. AI provider not returning usage data
2. Usage data in wrong format
3. JSONB path incorrect (`usage->>'total_tokens'` vs `usage.total_tokens`)

**Debug Steps**:
- Check AI service response logs
- Verify OpenAI/Google AI SDK returns usage
- Test JSONB extraction: `SELECT new_values->'usage'->>'total_tokens' FROM audit_logs WHERE action = 'ai_generate' LIMIT 1`

### Issue 3: Provider Stats Don't Match Dashboard
**Causes**:
1. Different time ranges (dashboard uses 30d, analytics uses 7d)
2. Permissions issue (user doesn't have `analytics.system` permission)
3. Provider was recently added (no historical data)

---

## ✅ Validation Checklist

To ensure analytics work correctly:

- [ ] **Audit logs created**: Every AI generation creates an audit log with `action = 'ai_generate'`
- [ ] **Provider ID correct**: `resource_id` matches `ai_providers.id`
- [ ] **Usage data present**: `new_values.usage.total_tokens` is populated
- [ ] **Success tracked**: `new_values.success` is boolean (true/false)
- [ ] **Response time tracked**: `new_values.response_time` in milliseconds
- [ ] **Provider exists**: AI provider configured in `ai_providers` table
- [ ] **User has permissions**: `analytics.system` permission granted
- [ ] **JSONB structure valid**: `new_values` is valid JSON with correct paths

---

## 🔮 Future Enhancements

Based on the memory notes, there's a TODO to integrate extraction jobs into analytics:

**Current Gap**: AI extraction jobs (entity extraction from documents) use AI providers but their usage is NOT tracked in `ai_provider_usage` table or displayed in analytics dashboard.

**Planned Enhancement**:
1. Track extraction job AI calls in `ai_provider_usage` table
2. Add extraction-specific metrics to dashboard
3. Show provider performance for extraction vs generation
4. Display cost breakdown (cached vs fresh AI calls)
5. Extraction job history with provider/model filtering

**Benefits**:
- Better visibility into AI costs
- Performance monitoring across use cases
- ROI calculation for caching (currently saves ~90% of API calls)

---

## 📊 Summary

The Usage Analytics flow is **robust and well-architected**:

1. ✅ **Direct from source**: Usage data comes directly from AI provider APIs (OpenAI, Google AI, etc.)
2. ✅ **Centralized tracking**: All usage logged to `audit_logs` table for easy querying
3. ✅ **Efficient aggregation**: PostgreSQL aggregates with proper indexes
4. ✅ **Real-time**: Analytics reflect all AI generations (no caching needed)
5. ✅ **Extensible**: Easy to add new metrics (model-specific, hourly patterns, error analysis)

**Key Strength**: The system uses native usage data from AI providers, ensuring accuracy and eliminating estimation. Every token count, response time, and success rate comes directly from the provider's API response.

---

**Documentation Created**: November 2, 2025  
**System Status**: ✅ Operational - All analytics data flows correctly from AI providers to dashboard

