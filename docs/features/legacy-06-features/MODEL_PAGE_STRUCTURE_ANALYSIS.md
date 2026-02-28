# Model Page Structure Analysis

## File: app/ai-providers/[id]/model/[modelId]/page.tsx
## Total Lines: ~1500 lines
## Status: ⚠️ Too large - needs refactoring

---

## 📊 Current Structure

### Tabs (Lines 719-1493)
1. **Parameters Tab** (726-857) = ~131 lines
   - Model configuration form
   - Parameter inputs (context window, temperature, etc.)
   - Save/Reset buttons

2. **Testing Tab** (859-1126) = ~267 lines
   - Test suite runner
   - Multiple test types
   - Test results display
   - Progress indicators

3. **Analytics Tab** (1128-1455) = ~327 lines ⭐ TARGET
   - Current: Basic stats from `model.usage_stats`
   - Needs: Period selector, detailed analytics, charts

4. **Advanced Tab** (1457-1492) = ~35 lines
   - Model information
   - Provider details
   - Metadata

---

## 🎯 Refactoring Plan

### Phase 1: Extract Analytics Tab Component

**New File:** `components/ai-providers/model/ModelAnalyticsTab.tsx`

**Why Start Here:**
1. Analytics tab is the largest (327 lines)
2. It's what we need to enhance
3. Clear boundary (complete tab)
4. Self-contained logic

**Extraction Steps:**
1. Create new component file
2. Copy Analytics TabsContent content
3. Convert to component with props
4. Import in main page
5. Replace old code with `<ModelAnalyticsTab />`

**Result:** Main page: 1500 → 1200 lines (-300)

---

### Phase 2: Extract Testing Tab Component (Optional)

**New File:** `components/ai-providers/model/ModelTestingTab.tsx`

- Second largest (267 lines)
- Also self-contained
- Would reduce main page to ~900 lines

---

### Phase 3: Extract Shared Components (Optional)

**New Files:**
-  `components/ai-providers/model/ModelHeader.tsx`
- `components/ai-providers/model/ModelOverviewCards.tsx`

---

## 📝 Analytics Tab Component Design

### Props Interface

```typescript
export interface ModelAnalyticsTabProps {
  // Model info
  model: {
    id: string
    name: string
    providerId: string
  }
  
  // Analytics data
  modelAnalytics: {
    period?: string
    usageOverTime?: Array<{
      date: Date
      usage_count: number
      total_tokens: number
      prompt_tokens: number
      completion_tokens: number
      avg_response_time: number
      successful_requests: number
      failed_requests: number
    }>
    errorAnalysis?: Array<{
      error_type: string
      error_message: string
      error_count: number
      last_occurrence: Date
    }>
    summary?: {
      totalRequests: number
      totalTokens: number
      promptTokens: number
      completionTokens: number
      successfulRequests: number
      failedRequests: number
      successRate: number
      avgResponseTime: number
      avgTokensPerRequest: number
    }
  }
  
  // State
  analyticsPeriod: "7d" | "30d" | "90d" | "1y"
  loadingAnalytics: boolean
  
  // Handlers
  onPeriodChange: (period: "7d" | "30d" | "90d" | "1y") => void
}
```

### Component Structure

```typescript
export function ModelAnalyticsTab(props: ModelAnalyticsTabProps) {
  const router = useRouter()
  
  return (
    <div className="space-y-4">
      {/* Period Selector */}
      <PeriodSelector 
        selected={props.analyticsPeriod}
        onChange={props.onPeriodChange}
        disabled={props.loadingAnalytics}
      />
      
      {props.loadingAnalytics ? (
        <LoadingState />
      ) : (
        <>
          <SummaryCards summary={props.modelAnalytics.summary} period={props.analyticsPeriod} />
          <TokenBreakdown summary={props.modelAnalytics.summary} />
          <UsageOverTimeChart data={props.modelAnalytics.usageOverTime} />
          {props.modelAnalytics.errorAnalysis?.length > 0 && (
            <ErrorAnalysis errors={props.modelAnalytics.errorAnalysis} />
          )}
          {!props.modelAnalytics.summary?.totalRequests && <EmptyState />}
        </>
      )}
    </div>
  )
}
```

---

## 🔧 Main Page Changes

### Before Refactoring (Current)

```typescript
// app/ai-providers/[id]/model/[modelId]/page.tsx (1500 lines)

export default function ModelDetails() {
  // ... 100 lines of state ...
  // ... 400 lines of functions ...
  
  return (
    <div>
      <Sidebar />
      <Header />
      <main>
        <Tabs>
          <TabsList>...</TabsList>
          
          <TabsContent value="parameters">
            {/* 131 lines of parameter form */}
          </TabsContent>
          
          <TabsContent value="testing">
            {/* 267 lines of testing UI */}
          </TabsContent>
          
          <TabsContent value="analytics">
            {/* 327 lines of analytics UI */}
          </TabsContent>
          
          <TabsContent value="advanced">
            {/* 35 lines of info */}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
```

### After Refactoring (Target)

```typescript
// app/ai-providers/[id]/model/[modelId]/page.tsx (~400 lines)

import { ModelAnalyticsTab } from "@/components/ai-providers/model/ModelAnalyticsTab"
// Import other tab components as needed

export default function ModelDetails() {
  // ... state (now includes modelAnalytics) ...
  // ... functions (now includes loadModelAnalytics) ...
  
  return (
    <div>
      <Sidebar />
      <Header />
      <main>
        <Tabs>
          <TabsList>...</TabsList>
          
          <TabsContent value="parameters">
            {/* Keep inline for now or extract later */}
          </TabsContent>
          
          <TabsContent value="testing">
            {/* Keep inline for now or extract later */}
          </TabsContent>
          
          <TabsContent value="analytics">
            <ModelAnalyticsTab
              model={model}
              modelAnalytics={modelAnalytics}
              analyticsPeriod={analyticsPeriod}
              loadingAnalytics={loadingAnalytics}
              onPeriodChange={setAnalyticsPeriod}
            />
          </TabsContent>
          
          <TabsContent value="advanced">
            {/* Keep inline - only 35 lines */}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
```

**Reduction:** 1500 lines → ~900 lines (if we extract Analytics + Testing tabs)

---

## 📋 Implementation Checklist

### Backend ✅
- [x] Create endpoint `/api/ai-analytics/models/:providerId/:modelName`
- [x] Implement SQL queries for usage, errors, prompts
- [x] Add BigInt-safe Number() conversions
- [x] Test endpoint manually
- [x] Commit to repository

### Frontend - Step 1: Test Backend
- [ ] Open browser DevTools
- [ ] Run test JavaScript from TEST_MODEL_ANALYTICS_BACKEND.md
- [ ] Verify response structure
- [ ] Confirm data looks correct

### Frontend - Step 2: Create Component
- [ ] Create `components/ai-providers/model/` directory
- [ ] Create `ModelAnalyticsTab.tsx` file
- [ ] Implement component with all sections
- [ ] Test component in isolation

### Frontend - Step 3: Integrate Component
- [ ] Add analytics state to main page
- [ ] Add `loadModelAnalytics()` function
- [ ] Add useEffect to load on mount
- [ ] Import ModelAnalyticsTab component
- [ ] Replace old TabsContent with component
- [ ] Test the integrated page

---

## 🚀 Benefits of Refactoring

### Code Quality
- ✅ Smaller, focused files
- ✅ Easier to read and understand
- ✅ Easier to test
- ✅ Easier to maintain

### Development
- ✅ No more syntax errors from large file edits
- ✅ Components can be developed independently
- ✅ Reusable across different pages
- ✅ Better TypeScript inference

### Performance
- ✅ Code splitting opportunities
- ✅ Lazy loading possible
- ✅ Smaller bundle sizes

---

## 📌 Recommended Next Steps

**Right Now:**
1. **Test the backend** using browser DevTools
2. Paste the JavaScript from TEST_MODEL_ANALYTICS_BACKEND.md
3. Check the console output
4. Tell me what you see!

**After Backend Confirmed:**
1. I'll create `ModelAnalyticsTab.tsx` component
2. We'll add it to the main page cleanly
3. Test the UI
4. Commit the working feature

**This approach is much safer!** No more syntax errors, clean separation of concerns.

Ready to test the backend? 🧪
