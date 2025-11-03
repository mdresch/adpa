# AI Provider Analytics - Simple Implementation Guide

## Overview

You asked to see model-specific analytics on individual AI provider pages like:
`http://localhost:3000/ai-providers/[provider-id]` → Analytics tab

The **backend endpoint already exists** and works perfectly:
- **Endpoint**: `GET /api/ai-analytics/providers/:providerId?period=30d`
- **Returns**: Model-specific usage, tokens, response times, success rates
- **Source**: Real data from audit_logs table

## What Was Accomplished

✅ **Documentation Created**:
1. `AI_ANALYTICS_DATA_FLOW.md` - Complete technical review of how analytics data flows
2. `AI_PROVIDER_ANALYTICS_ENHANCEMENT.md` - Implementation plan and code samples
3. `AI_PROVIDER_ANALYTICS_IMPLEMENTATION_COMPLETE.md` - Status and testing guide

✅ **Backend Verified**:
- Endpoint exists at `server/src/routes/ai-analytics.ts`
- Returns model-specific statistics
- Aggregates from audit_logs where action='ai_generate'

❌ **Frontend Implementation**: File got complex during edits, was reset to clean state

## Current Status

The file `app/ai-providers/[id]/page.tsx` needs these changes:

### 1. Add State (around line 100)
```typescript
// Analytics state
const [analytics, setAnalytics] = useState<{
  period?: string
  usageOverTime?: Array<any>
  modelUsage?: Array<{
    model_name: string
    usage_count: number
    total_tokens: number
    avg_response_time: number
    success_rate: number
  }>
  errorAnalysis?: Array<any>
  summary?: {
    totalRequests: number
    totalTokens: number
    avgResponseTime: number
    totalErrors: number
  }
}>({})
const [analyticsPeriod, setAnalyticsPeriod] = useState<"7d" | "30d" | "90d" | "1y">("30d")
const [loadingAnalytics, setLoadingAnalytics] = useState(false)
```

### 2. Add Loading Function (around line 250)
```typescript
// Load provider analytics
const loadProviderAnalytics = async (period: string = analyticsPeriod) => {
  setLoadingAnalytics(true)
  try {
    const response = await apiClient.get<any>(`/ai-analytics/providers/${providerId}?period=${period}`)
    if (response.success) {
      setAnalytics({
        period: response.period,
        usageOverTime: response.usageOverTime,
        modelUsage: response.modelUsage,
        errorAnalysis: response.errorAnalysis,
        summary: response.summary
      })
    }
  } catch (err: any) {
    console.error("Failed to load analytics:", err)
  } finally {
    setLoadingAnalytics(false)
  }
}
```

### 3. Call on Mount (in existing useEffect around line 274)
```typescript
useEffect(() => {
  if (providerId) {
    loadProviderDetails()
    loadProviderAnalytics()  // ADD THIS LINE
  }
}, [providerId])
```

### 4. Reload on Period Change (new useEffect)
```typescript
useEffect(() => {
  if (providerId) {
    loadProviderAnalytics(analyticsPeriod)
  }
}, [analyticsPeriod])
```

### 5. Update Analytics Tab

Find the Analytics `<TabsContent>` (around line 1436) and add these sections:

**a) Period Selector** (at the top of Analytics tab):
```typescript
<div className="flex items-center justify-between mb-4">
  <h3 className="text-lg font-semibold">Provider Analytics</h3>
  <div className="flex items-center gap-2">
    {(['7d', '30d', '90d', '1y'] as const).map((period) => (
      <Button
        key={period}
        variant={analyticsPeriod === period ? 'default' : 'outline'}
        size="sm"
        onClick={() => setAnalyticsPeriod(period)}
      >
        {period === '7d' && '7 Days'}
        {period === '30d' && '30 Days'}
        {period === '90d' && '90 Days'}
        {period === '1y' && '1 Year'}
      </Button>
    ))}
  </div>
</div>
```

**b) Update Summary Cards** - Replace the existing 4 cards with:
```typescript
<Card>
  <CardHeader className="pb-3">
    <CardTitle className="text-sm font-medium text-muted-foreground">
      Total Requests
    </CardTitle>
  </CardHeader>
  <CardContent>
    <div className="text-3xl font-bold">
      {(analytics.summary?.totalRequests || 0).toLocaleString()}
    </div>
    <p className="text-xs text-muted-foreground mt-2">
      Last {analyticsPeriod === '7d' ? '7 days' : analyticsPeriod === '30d' ? '30 days' : '...'}
    </p>
  </CardContent>
</Card>
// ... similar for other 3 cards
```

**c) Add Model Usage Breakdown** (the KEY feature!):
```typescript
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Zap className="h-5 w-5" />
      Model Usage Breakdown
    </CardTitle>
  </CardHeader>
  <CardContent>
    {analytics.modelUsage && analytics.modelUsage.length > 0 ? (
      <div className="space-y-4">
        {analytics.modelUsage.map((model, index) => {
          const percentage = (analytics.summary?.totalRequests || 0) > 0 
            ? (model.usage_count / analytics.summary!.totalRequests) * 100 
            : 0
          
          return (
            <div key={model.model_name} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-lg">{model.model_name}</span>
                <Badge>{model.success_rate.toFixed(1)}% Success</Badge>
              </div>
              
              {/* Progress bar */}
              <div className="w-full bg-muted rounded-full h-2.5 mb-3">
                <div 
                  className="h-2.5 rounded-full bg-blue-500"
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
              
              {/* Three metrics */}
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="text-center p-2 bg-muted rounded">
                  <div className="text-muted-foreground text-xs">Tokens</div>
                  <div className="font-bold">{model.total_tokens.toLocaleString()}</div>
                </div>
                <div className="text-center p-2 bg-muted rounded">
                  <div className="text-muted-foreground text-xs">Avg Speed</div>
                  <div className="font-bold">{model.avg_response_time}ms</div>
                </div>
                <div className="text-center p-2 bg-muted rounded">
                  <div className="text-muted-foreground text-xs">Tokens/Req</div>
                  <div className="font-bold">
                    {Math.round(model.total_tokens / model.usage_count)}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    ) : (
      <div className="text-center py-8">
        <BarChart3 className="h-12 w-12 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No model data for this period</p>
      </div>
    )}
  </CardContent>
</Card>
```

## Quick Test

1. Make the changes above
2. Start dev servers:
   ```bash
   pnpm dev
   cd server && npm run dev
   ```
3. Navigate to: `http://localhost:3000/ai-providers/[provider-id]`
4. Click "Analytics" tab
5. You should see:
   - Period selector buttons
   - Summary cards with period-specific data
   - **Model Usage Breakdown** showing each model with metrics

## What You'll See

For each model (e.g., gpt-4, gpt-3.5-turbo, gemini-pro):
- Model name
- Usage count and percentage
- Success rate badge  
- Visual progress bar
- **Three key metrics**:
  1. **Tokens**: Total consumed
  2. **Avg Speed**: Response time
  3. **Tokens/Req**: Efficiency

All data comes directly from actual AI API calls logged in audit_logs!

## Troubleshooting

**If you see compile errors**:
- Make sure all imports are correct
- Verify the state type definitions match

**If no data shows**:
- Check if provider has been used (audit_logs has entries)
- Run the SQL query from `AI_ANALYTICS_DATA_FLOW.md` to verify data exists
- Check browser console for API errors

**If build fails**:
- Reset file: `git checkout app/ai-providers/[id]/page.tsx`
- Start over with just one section at a time
- Test after each section

## Summary

✅ Backend is ready
✅ Endpoint works
✅ Documentation complete  
⏳ Frontend needs the 5 changes above

This will give you comprehensive, model-specific analytics showing exactly which models are being used, how much they cost (tokens), how fast they are, and how reliable they are!

