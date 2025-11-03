# Model Page Refactoring Plan

## Current Status
- **File:** `app/ai-providers/[id]/model/[modelId]/page.tsx`
- **Lines:** ~1500 lines (monolithic)
- **Tabs:** 4 tabs (Configuration, Testing, Analytics, Advanced)
- **Problem:** Too large to edit safely inline

---

## 🎯 Refactoring Strategy

### Phase 1: Create Separate Tab Components ✅

Extract each tab into its own component file:

```
components/ai-providers/model/
├── ModelConfigurationTab.tsx  (~300 lines)
├── ModelTestingTab.tsx        (~400 lines)
├── ModelAnalyticsTab.tsx      (~200 lines) ← NEW ENHANCED VERSION
└── ModelAdvancedTab.tsx       (~100 lines)
```

### Phase 2: Create Shared Components ✅

```
components/ai-providers/model/
├── ModelHeader.tsx            (Back button, title, status badges)
├── ModelOverviewCards.tsx     (4 summary cards at top)
└── ModelConfigurationForm.tsx (Form fields, save button)
```

### Phase 3: Slim Down Main Page ✅

Main page becomes ~200 lines:
- State management
- Data loading functions
- Layout structure
- Tab navigation
- Component composition

---

## 📋 Component Breakdown

### 1. ModelAnalyticsTab.tsx (NEW)

**Props:**
```typescript
interface ModelAnalyticsTabProps {
  model: ModelDetails
  providerId: string
  modelAnalytics: ModelAnalytics
  analyticsPeriod: "7d" | "30d" | "90d" | "1y"
  loadingAnalytics: boolean
  onPeriodChange: (period: "7d" | "30d" | "90d" | "1y") => void
}
```

**Sections:**
- Period Selector
- Summary Cards (4 cards)
- Token Breakdown (Prompt vs Completion)
- Usage Over Time Chart
- Error Analysis
- Empty State

**Size:** ~250 lines

### 2. ModelConfigurationTab.tsx

**Props:**
```typescript
interface ModelConfigurationTabProps {
  model: ModelDetails
  formState: ModelFormState
  saving: boolean
  onFormChange: (field: string, value: any) => void
  onSave: () => void
  onReset: () => void
}
```

**Sections:**
- Configuration Form
- Parameter Sliders
- Save/Reset Buttons

**Size:** ~200 lines

### 3. ModelTestingTab.tsx

**Props:**
```typescript
interface ModelTestingTabProps {
  model: ModelDetails
  testing: boolean
  testResults: TestResult[]
  testProgress: TestProgress
  onRunTest: (testId: string) => void
  onRunAllTests: () => void
}
```

**Sections:**
- Test Suite Selection
- Run Test Buttons
- Test Results Display
- Progress Indicators

**Size:** ~300 lines

### 4. ModelHeader.tsx

**Props:**
```typescript
interface ModelHeaderProps {
  model: ModelDetails
  providerId: string
  onBack: () => void
  onToggleActive: () => void
}
```

**Sections:**
- Back button
- Model name and badges
- Toggle active switch
- Provider link

**Size:** ~50 lines

---

## 🏗️ Implementation Plan

### Step 1: Create Component Files

```bash
mkdir -p components/ai-providers/model
```

Create 4 new files:
1. `components/ai-providers/model/ModelAnalyticsTab.tsx`
2. `components/ai-providers/model/ModelConfigurationTab.tsx`
3. `components/ai-providers/model/ModelTestingTab.tsx`
4. `components/ai-providers/model/ModelHeader.tsx`

### Step 2: Extract Analytics Tab First (Since That's What We Need)

**File:** `components/ai-providers/model/ModelAnalyticsTab.tsx`

```typescript
"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Activity, 
  Clock, 
  BarChart3, 
  AlertCircle,
  Zap
} from "@/components/ui/icons-shim"

interface ModelAnalyticsTabProps {
  model: {
    name: string
    id: string
  }
  modelAnalytics: {
    summary?: {
      totalRequests: number
      totalTokens: number
      promptTokens: number
      completionTokens: number
      successRate: number
      avgResponseTime: number
      avgTokensPerRequest: number
    }
    usageOverTime?: Array<{
      date: Date
      usage_count: number
      total_tokens: number
      prompt_tokens: number
      completion_tokens: number
    }>
    errorAnalysis?: Array<{
      error_type: string
      error_message: string
      error_count: number
      last_occurrence: Date
    }>
  }
  analyticsPeriod: "7d" | "30d" | "90d" | "1y"
  loadingAnalytics: boolean
  onPeriodChange: (period: "7d" | "30d" | "90d" | "1y") => void
}

export function ModelAnalyticsTab({
  model,
  modelAnalytics,
  analyticsPeriod,
  loadingAnalytics,
  onPeriodChange
}: ModelAnalyticsTabProps) {
  const router = useRouter()

  return (
    <div className="space-y-4">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Model Analytics: {model.name}</h3>
          <p className="text-sm text-muted-foreground">Performance and usage statistics</p>
        </div>
        <div className="flex items-center gap-2">
          {(['7d', '30d', '90d', '1y'] as const).map((period) => (
            <Button
              key={period}
              variant={analyticsPeriod === period ? 'default' : 'outline'}
              size="sm"
              onClick={() => onPeriodChange(period)}
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

      {/* REST OF THE ANALYTICS UI... */}
      {/* (Summary cards, token breakdown, usage chart, error analysis) */}
    </div>
  )
}
```

### Step 3: Update Main Page to Use Component

**In** `app/ai-providers/[id]/model/[modelId]/page.tsx`:

```typescript
import { ModelAnalyticsTab } from "@/components/ai-providers/model/ModelAnalyticsTab"

// ... existing code ...

<TabsContent value="analytics">
  <ModelAnalyticsTab
    model={model}
    modelAnalytics={modelAnalytics}
    analyticsPeriod={analyticsPeriod}
    loadingAnalytics={loadingAnalytics}
    onPeriodChange={setAnalyticsPeriod}
  />
</TabsContent>
```

**Benefits:**
- Main page: 1500 lines → ~800 lines
- Analytics tab: Isolated, testable, reusable
- No more inline edit syntax errors
- Clean separation of concerns

---

## 🧪 Backend Testing First

Before we refactor, let's verify the backend works!

### Test Endpoint Manually

Open browser DevTools (F12) → Console, paste:

```javascript
// Get your auth token
const token = localStorage.getItem('token')

// Test the endpoint
fetch('http://localhost:5000/api/ai-analytics/models/a2b3c4d5-e6f7-4890-9abc-def123456789/gemini-1.5-flash-latest?period=30d', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
.then(r => r.json())
.then(data => {
  console.log('Model Analytics Response:', data)
  console.log('Summary:', data.summary)
  console.log('Usage Over Time:', data.usageOverTime)
})
```

**Expected Output:**
```javascript
{
  success: true,
  provider: { id: "...", name: "Google AI", type: "google" },
  model: { name: "gemini-1.5-flash-latest" },
  period: "30d",
  summary: {
    totalRequests: 41,
    totalTokens: 1510982,
    promptTokens: ...,
    completionTokens: ...,
    successRate: 19.5,
    avgResponseTime: 0,
    avgTokensPerRequest: 36824
  },
  usageOverTime: [ ... ],
  errorAnalysis: [ ... ]
}
```

---

## 📝 Next Steps

### Immediate:
1. ✅ Backend endpoint committed
2. 🧪 **Test backend endpoint** (paste JavaScript above in browser)
3. ✅ Verify data looks correct

### Then (After Backend Verified):
4. 📦 Create component directory structure
5. ✏️ Extract ModelAnalyticsTab component
6. 🔗 Wire up to main page
7. 🧪 Test the UI

**This approach is safer and more maintainable!**

Let me know what you see when you test the backend endpoint! 🚀

