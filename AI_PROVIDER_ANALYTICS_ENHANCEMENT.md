# AI Provider Analytics Enhancement - Implementation Plan

## Status: Ready to Implement

This document describes the enhancement to show comprehensive, model-specific analytics on individual AI provider pages.

## Current Issue

The Analytics tab at `/ai-providers/[id]` currently displays:
- Basic usage stats from `provider.usage_stats` 
- Static, all-time metrics only
- No model-specific breakdown
- No time-based trends
- No error analysis

**Backend endpoint exists but is NOT used!**
- Endpoint: `GET /api/ai-analytics/providers/:providerId`
- Provides: Usage over time, model-specific stats, error analysis, summary

## Solution

### 1. State Already Added ✅
```typescript
const [analytics, setAnalytics] = useState<{...}>({})
const [analyticsPeriod, setAnalyticsPeriod] = useState<"7d" | "30d" | "90d" | "1y">("30d")
const [loadingAnalytics, setLoadingAnalytics] = useState(false)
```

### 2. Load Function Already Added ✅
```typescript
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

### 3. Update Analytics Tab JSX

Replace the entire Analytics `<TabsContent>` section (lines 1436-1828) with:

```tsx
<TabsContent value="analytics" className="space-y-4">
  {/* Period Selector */}
  <div className="flex items-center justify-between">
    <div>
      <h3 className="text-lg font-semibold">Provider Analytics</h3>
      <p className="text-sm text-muted-foreground">Detailed usage statistics and model performance</p>
    </div>
    <div className="flex items-center gap-2">
      {(['7d', '30d', '90d', '1y'] as const).map((period) => (
        <Button
          key={period}
          variant={analyticsPeriod === period ? 'default' : 'outline'}
          size="sm"
          onClick={() => setAnalyticsPeriod(period)}
          disabled={loadingAnalytics}
        >
          {period === '7d' && '7 Days'}
          {period === '30d' && '30 Days'}
          {period === '90d' && '90 Days'}
          {period === '1y' && '1 Year'}
        </Button>
      ))}
    </div>
  </div>

  {loadingAnalytics ? (
    <Card>
      <CardContent className="py-12">
        <div className="text-center">
          <Activity className="h-12 w-12 mx-auto mb-4 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </CardContent>
    </Card>
  ) : (
    <>
      {/* Summary Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
              Last {analyticsPeriod === '7d' ? '7 days' : analyticsPeriod === '30d' ? '30 days' : analyticsPeriod === '90d' ? '90 days' : '1 year'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Tokens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {(() => {
                const tokens = analytics.summary?.totalTokens || 0
                if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`
                if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`
                return tokens.toLocaleString()
              })()}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Tokens processed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Response Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {(() => {
                const ms = analytics.summary?.avgResponseTime || 0
                if (ms < 1000) return `${Math.round(ms)}ms`
                return `${(ms / 1000).toFixed(1)}s`
              })()}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Average latency
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${(analytics.summary?.totalErrors || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {(analytics.summary?.totalErrors || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Failed requests
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ⭐ MODEL-SPECIFIC USAGE - KEY FEATURE ⭐ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Model Usage Breakdown
          </CardTitle>
          <CardDescription>
            Usage statistics per model for this provider
          </CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.modelUsage && analytics.modelUsage.length > 0 ? (
            <div className="space-y-4">
              {analytics.modelUsage.map((model, index) => {
                const totalRequests = analytics.summary?.totalRequests || 0
                const percentage = totalRequests > 0 ? (model.usage_count / totalRequests) * 100 : 0
                const tokens = typeof model.total_tokens === 'number' ? model.total_tokens : parseInt(model.total_tokens) || 0
                const responseTime = typeof model.avg_response_time === 'number' ? model.avg_response_time : parseFloat(model.avg_response_time) || 0
                const successRate = typeof model.success_rate === 'number' ? model.success_rate : parseFloat(model.success_rate) || 0

                return (
                  <div key={model.model_name} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          index === 0 ? 'bg-blue-500' :
                          index === 1 ? 'bg-green-500' :
                          index === 2 ? 'bg-purple-500' : 'bg-orange-500'
                        }`} />
                        <div>
                          <span className="font-medium text-lg">{model.model_name}</span>
                          <p className="text-xs text-muted-foreground">
                            {model.usage_count} requests ({percentage.toFixed(1)}%)
                          </p>
                        </div>
                      </div>
                      <Badge variant={successRate >= 95 ? "default" : "destructive"}>
                        {successRate.toFixed(1)}% Success
                      </Badge>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-muted rounded-full h-2.5 mb-3">
                      <div 
                        className={`h-2.5 rounded-full transition-all ${
                          index === 0 ? 'bg-blue-500' :
                          index === 1 ? 'bg-green-500' :
                          index === 2 ? 'bg-purple-500' : 'bg-orange-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>

                    {/* Model metrics */}
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div className="text-center p-2 bg-muted rounded">
                        <div className="text-muted-foreground text-xs">Tokens</div>
                        <div className="font-bold text-blue-600">
                          {tokens >= 1000000 ? `${(tokens / 1000000).toFixed(1)}M` :
                           tokens >= 1000 ? `${(tokens / 1000).toFixed(1)}K` : 
                           tokens.toLocaleString()}
                        </div>
                      </div>
                      <div className="text-center p-2 bg-muted rounded">
                        <div className="text-muted-foreground text-xs">Avg Speed</div>
                        <div className="font-bold text-green-600">
                          {responseTime < 1000 ? `${Math.round(responseTime)}ms` : `${(responseTime / 1000).toFixed(1)}s`}
                        </div>
                      </div>
                      <div className="text-center p-2 bg-muted rounded">
                        <div className="text-muted-foreground text-xs">Tokens/Req</div>
                        <div className="font-bold text-purple-600">
                          {model.usage_count > 0 ? Math.round(tokens / model.usage_count).toLocaleString() : 0}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No model usage data for this period</p>
              <p className="text-xs text-muted-foreground mt-1">Generate documents to see model-specific analytics</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage Over Time */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Usage Over Time
          </CardTitle>
          <CardDescription>
            Daily usage patterns for the selected period
          </CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.usageOverTime && analytics.usageOverTime.length > 0 ? (
            <div className="space-y-2">
              {analytics.usageOverTime.slice(-14).map((day, index) => {
                const maxCount = Math.max(...(analytics.usageOverTime || []).map(d => d.usage_count))
                const percentage = maxCount > 0 ? (day.usage_count / maxCount) * 100 : 0
                const date = new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

                return (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-20 text-sm text-muted-foreground">{date}</div>
                    <div className="flex-1">
                      <div className="w-full bg-muted rounded-full h-6 flex items-center">
                        <div 
                          className="h-6 rounded-full bg-blue-500 flex items-center justify-end px-2"
                          style={{ width: `${percentage}%` }}
                        >
                          {day.usage_count > 0 && (
                            <span className="text-xs text-white font-medium">{day.usage_count}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="w-32 text-right text-sm">
                      {day.total_tokens >= 1000 ? `${(day.total_tokens / 1000).toFixed(1)}K` : day.total_tokens} tokens
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No usage data for this period</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Analysis */}
      {analytics.errorAnalysis && analytics.errorAnalysis.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Error Analysis
            </CardTitle>
            <CardDescription>
              Failed requests and error patterns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.errorAnalysis.map((error, index) => (
                <div key={index} className="p-3 border-l-4 border-l-red-500 bg-red-50 dark:bg-red-900/20 rounded">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="font-medium">{error.error_type || 'Unknown Error'}</div>
                      <div className="text-sm text-muted-foreground mt-1">{error.error_message}</div>
                      <div className="text-xs text-muted-foreground mt-2">
                        Last occurred: {new Date(error.last_occurrence).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                    <Badge variant="destructive">{error.error_count} times</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {(!analytics.summary || analytics.summary.totalRequests === 0) && (
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No Usage Data Yet</h3>
              <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                Start using this AI provider to generate documents and detailed analytics including model-specific metrics will appear here.
              </p>
              <Button onClick={() => router.push('/projects')}>
                <Zap className="h-4 w-4 mr-2" />
                Generate Your First Document
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )}
</TabsContent>
```

## Key Features

### 1. **Period Selector** 
- Buttons for 7d, 30d, 90d, 1y
- Dynamically reloads data when changed

### 2. **Enhanced Summary Cards**
- Uses `analytics.summary` instead of `provider.usage_stats`
- Shows period-specific data (not all-time)
- Format tokens as K/M for readability

### 3. **Model-Specific Breakdown** ⭐ **(Requested Feature)**
- Shows each model used by this provider
- Per-model metrics:
  - Usage count and percentage
  - Total tokens
  - Average response time
  - Success rate
  - Tokens per request
- Visual progress bars
- Color-coded badges

### 4. **Usage Over Time**
- Daily breakdown (last 14 days shown)
- Bar chart visualization
- Shows requests and tokens per day

### 5. **Error Analysis**
- Lists all errors in the period
- Error type, message, count
- Last occurrence timestamp
- Only shown if errors exist

### 6. **Loading State**
- Shows spinner while fetching
- Smooth transition

### 7. **Empty State**
- Helpful message if no data
- CTA button to generate first document

## Benefits

1. ✅ **Real data from audit_logs** - not estimates
2. ✅ **Model-specific visibility** - see which models are used and how they perform
3. ✅ **Time-based trends** - understand usage patterns
4. ✅ **Error tracking** - identify and fix issues
5. ✅ **Period comparison** - compare 7d vs 30d vs 90d
6. ✅ **Performance insights** - speed and reliability per model

## Next Steps

1. Replace the Analytics TabsContent in `app/ai-providers/[id]/page.tsx` (lines 1436-1828)
2. Test with a provider that has usage data
3. Verify model breakdown displays correctly
4. Test period selector (7d, 30d, 90d, 1y)
5. Verify error analysis displays when errors exist

## Testing Checklist

- [ ] Period selector changes data
- [ ] Model usage breakdown shows all models
- [ ] Model metrics are accurate (tokens, speed, success rate)
- [ ] Usage over time chart displays correctly
- [ ] Error analysis shows when errors exist
- [ ] Empty state appears when no data
- [ ] Loading spinner shows during fetch
- [ ] Navigation to projects works from empty state

