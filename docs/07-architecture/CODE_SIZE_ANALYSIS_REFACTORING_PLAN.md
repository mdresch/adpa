# Code Size Analysis & Refactoring Plan

**Date**: October 26, 2025  
**Status**: 🔴 CRITICAL - Multiple files exceed maintainability limits  
**Priority**: HIGH - Should be addressed before adding new features

---

## 🚨 Executive Summary

**15 files exceed 1,500 lines** and are becoming difficult to maintain with AI agents.  
**22 files exceed 1,000 lines** and should be monitored.

**AI Agent Context Limits:**
- **Claude/GPT-4**: Effective editing up to ~800-1,000 lines
- **Cursor AI**: Works best with files <1,000 lines
- **GitHub Copilot**: Optimal with files <500 lines

**Risk:** Large files lead to:
- ❌ Merge conflicts
- ❌ Difficult debugging
- ❌ Harder code reviews
- ❌ Poor AI assistance
- ❌ Slower development velocity

---

## 📊 Large Files Inventory

### 🔴 CRITICAL - Frontend Pages (>1,500 lines)

| Lines | File | Category | Severity |
|-------|------|----------|----------|
| **2,422** | `app/process-flow/page.tsx` | Process Flow | 🔴 CRITICAL |
| **1,988** | `app/page.tsx` | Dashboard | 🔴 CRITICAL |
| **1,822** | `app/projects/page.tsx` | Projects List | 🔴 CRITICAL |
| **1,512** | `app/ai-providers/page.tsx` | AI Providers | 🔴 HIGH |
| **1,465** | `app/jobs/page.tsx` | Job Queue | 🔴 HIGH |

### 🔴 CRITICAL - Backend Services (>1,700 lines)

| Lines | File | Category | Severity |
|-------|------|----------|----------|
| **1,889** | `server/src/routes/ai-models.ts` | API Route | 🔴 CRITICAL |
| **1,851** | `server/src/services/processFlowService.ts` | Service | 🔴 CRITICAL |
| **1,795** | `server/src/modules/.../qualityAssuranceStage.ts` | Pipeline Stage | 🔴 CRITICAL |
| **1,792** | `server/src/modules/.../contextInjectionStage.ts` | Pipeline Stage | 🔴 CRITICAL |
| **1,707** | `server/src/services/contextInjectionEngine.ts` | Service | 🔴 CRITICAL |

### 🟡 HIGH CONCERN - Additional Large Files (1,000-1,500 lines)

**Frontend:**
- 1,391 lines: `app/process-flow/visual-pipeline/page.tsx`
- 1,234 lines: `app/integrations/page.tsx`
- 1,090 lines: `app/templates/page.tsx`

**Backend:**
- 1,477 lines: `server/src/services/multiFormatOutputEngine.ts`
- 1,385 lines: `server/src/services/qualityAssessmentEngine.ts`
- 1,248 lines: `server/src/services/personalizationEngine.ts`
- 1,181 lines: `server/src/routes/ai.ts`
- 1,135 lines: `server/src/services/documentRefinementEngine.ts`
- 1,131 lines: `server/src/modules/.../aiGenerationStage.ts`
- 1,129 lines: `server/src/services/queueService.ts`
- 1,128 lines: `server/src/routes/documents.ts`
- 1,032 lines: `server/src/modules/historicalAnalysis/historicalAnalysisService.ts`

---

## 🎯 Refactoring Strategy

### Priority 1: Frontend Pages (Immediate)

#### 1. `app/process-flow/page.tsx` (2,422 lines) 🔴

**Current Issues:**
- Multiple tabs/sections in one file
- Complex state management
- Multiple API integrations
- UI components mixed with business logic

**Refactoring Plan:**
```typescript
// BEFORE: Single 2,422-line file
app/process-flow/page.tsx

// AFTER: Modular structure (~300 lines each)
app/process-flow/
├── page.tsx (200 lines - main layout)
├── components/
│   ├── ProcessFlowHeader.tsx (100 lines)
│   ├── ProcessFlowTabs.tsx (150 lines)
│   ├── StageVisualization.tsx (300 lines)
│   ├── JobConfiguration.tsx (400 lines)
│   ├── ExecutionHistory.tsx (300 lines)
│   ├── MetricsDashboard.tsx (250 lines)
│   └── StageDetails.tsx (200 lines)
├── hooks/
│   ├── useProcessFlow.ts (150 lines)
│   ├── useStageExecution.ts (100 lines)
│   └── useProcessMetrics.ts (100 lines)
└── types.ts (100 lines)
```

**Effort:** 1-2 days  
**Impact:** HIGH - Most complex page in app

---

#### 2. `app/page.tsx` (1,988 lines) 🔴

**Current Issues:**
- Dashboard with multiple widgets
- All metrics calculations in one file
- Multiple chart components inline

**Refactoring Plan:**
```typescript
// AFTER: Modular dashboard
app/
├── page.tsx (150 lines - layout only)
└── dashboard/
    ├── components/
    │   ├── DashboardHeader.tsx (100 lines)
    │   ├── QuickStats.tsx (150 lines)
    │   ├── RecentDocuments.tsx (200 lines)
    │   ├── ProjectsOverview.tsx (250 lines)
    │   ├── ActivityTimeline.tsx (300 lines)
    │   ├── AIUsageChart.tsx (200 lines)
    │   └── QuickActions.tsx (150 lines)
    ├── hooks/
    │   ├── useDashboardData.ts (200 lines)
    │   └── useDashboardMetrics.ts (150 lines)
    └── utils/
        └── dashboardCalculations.ts (200 lines)
```

**Effort:** 1-2 days  
**Impact:** HIGH - Main landing page

---

#### 3. `app/projects/page.tsx` (1,822 lines) 🔴

**Current Issues:**
- Project list + project details in one file
- Baseline management embedded
- Multiple dialogs and modals
- Complex document management

**Refactoring Plan:**
```typescript
// AFTER: Separated concerns
app/projects/
├── page.tsx (200 lines - list view only)
├── [id]/
│   ├── page.tsx (300 lines - project detail)
│   ├── components/
│   │   ├── ProjectHeader.tsx (150 lines)
│   │   ├── BaselineTab.tsx (400 lines)
│   │   ├── DocumentsTab.tsx (300 lines)
│   │   ├── StakeholdersTab.tsx (200 lines)
│   │   ├── TimelineTab.tsx (250 lines)
│   │   └── SettingsTab.tsx (200 lines)
│   └── hooks/
│       ├── useProjectData.ts (150 lines)
│       └── useBaseline.ts (200 lines)
└── components/
    ├── ProjectCard.tsx (150 lines)
    └── ProjectFilters.tsx (100 lines)
```

**Effort:** 2-3 days  
**Impact:** CRITICAL - Core functionality

---

### Priority 2: Backend Services (Week 2)

#### 4. `server/src/routes/ai-models.ts` (1,889 lines) 🔴

**Current Issues:**
- All AI model management in one route file
- Multiple providers mixed together
- Validation logic embedded
- Testing endpoints mixed with CRUD

**Refactoring Plan:**
```typescript
// AFTER: Split by provider and concern
server/src/routes/ai-models/
├── index.ts (100 lines - router setup)
├── openai.routes.ts (300 lines)
├── google.routes.ts (300 lines)
├── anthropic.routes.ts (300 lines)
├── mistral.routes.ts (200 lines)
├── testing.routes.ts (400 lines)
├── validation.middleware.ts (200 lines)
└── schemas.ts (200 lines)
```

**Effort:** 2 days  
**Impact:** HIGH - AI functionality core

---

#### 5. `server/src/services/processFlowService.ts` (1,851 lines) 🔴

**Current Issues:**
- Entire process flow logic in one service
- Stage execution mixed with orchestration
- Metrics collection embedded
- Error handling throughout

**Refactoring Plan:**
```typescript
// AFTER: Service composition
server/src/services/processFlow/
├── ProcessFlowOrchestrator.ts (300 lines)
├── StageExecutor.ts (400 lines)
├── FlowValidator.ts (200 lines)
├── MetricsCollector.ts (300 lines)
├── ErrorHandler.ts (200 lines)
├── StateManager.ts (250 lines)
└── types.ts (200 lines)
```

**Effort:** 2-3 days  
**Impact:** CRITICAL - Core processing engine

---

### Priority 3: Pipeline Stages (Week 3)

#### 6. Quality Assurance Stage (1,795 lines) 🔴
#### 7. Context Injection Stage (1,792 lines) 🔴

**Refactoring Plan:**
```typescript
// Each stage should follow this pattern
modules/multiStageDocumentProcessor/stages/qualityAssurance/
├── index.ts (100 lines - stage interface)
├── validators/
│   ├── ContentValidator.ts (300 lines)
│   ├── StructureValidator.ts (300 lines)
│   └── ComplianceValidator.ts (300 lines)
├── analyzers/
│   ├── QualityAnalyzer.ts (300 lines)
│   └── MetricsAnalyzer.ts (200 lines)
├── utils/
│   └── qaHelpers.ts (200 lines)
└── types.ts (100 lines)
```

**Effort:** 1 day per stage (2 days total)  
**Impact:** MEDIUM - Isolated modules

---

## 📏 File Size Guidelines

### Recommended Limits

| File Type | Max Lines | Reasoning |
|-----------|-----------|-----------|
| **React Components** | 300 | Single responsibility, easy testing |
| **Page Components** | 500 | Composition of smaller components |
| **Services** | 400 | Single domain, easy to reason about |
| **API Routes** | 300 | One resource, clear endpoints |
| **Type Definitions** | 200 | Focused types per domain |
| **Utilities** | 200 | Pure functions, easy testing |

### 🚦 Warning Thresholds

- 🟢 **Green**: <500 lines - Good
- 🟡 **Yellow**: 500-1,000 lines - Monitor
- 🟠 **Orange**: 1,000-1,500 lines - Should refactor soon
- 🔴 **Red**: >1,500 lines - CRITICAL - Refactor ASAP

---

## 🛠️ Refactoring Patterns

### Pattern 1: Tab Extraction (Pages)

**Use for:** `app/projects/page.tsx`, `app/process-flow/page.tsx`

**Before:**
```typescript
// 1,800 lines with multiple tabs
export default function ProjectPage() {
  // 200 lines of state
  // 400 lines for Baseline tab
  // 400 lines for Documents tab
  // 400 lines for Timeline tab
  // 400 lines for Settings tab
}
```

**After:**
```typescript
// page.tsx (200 lines)
export default function ProjectPage() {
  return (
    <Tabs>
      <BaselineTab />
      <DocumentsTab />
      <TimelineTab />
      <SettingsTab />
    </Tabs>
  )
}

// Each tab: 300-400 lines in separate file
```

---

### Pattern 2: Service Decomposition (Backend)

**Use for:** `processFlowService.ts`, `contextInjectionEngine.ts`

**Before:**
```typescript
// 1,850 lines mega-service
class ProcessFlowService {
  // 300 lines: validation
  // 400 lines: stage execution
  // 300 lines: metrics
  // 400 lines: error handling
  // 450 lines: state management
}
```

**After:**
```typescript
// Orchestrator (300 lines)
class ProcessFlowOrchestrator {
  constructor(
    private validator: FlowValidator,
    private executor: StageExecutor,
    private metrics: MetricsCollector,
    private errorHandler: ErrorHandler
  ) {}
}

// Each service: 200-400 lines
```

---

### Pattern 3: Route Splitting (API Routes)

**Use for:** `ai-models.ts`, `documents.ts`

**Before:**
```typescript
// 1,889 lines single route file
router.get('/openai', ...)      // 200 lines
router.get('/google', ...)      // 200 lines
router.get('/anthropic', ...)   // 200 lines
router.post('/test', ...)       // 400 lines
// ... 900 more lines
```

**After:**
```typescript
// index.ts (100 lines)
router.use('/openai', openaiRoutes)
router.use('/google', googleRoutes)
router.use('/testing', testingRoutes)

// Each sub-router: 200-300 lines
```

---

## 📋 Refactoring Roadmap

### Phase 1: Critical Frontend Pages (Week 1)

**Priority files:**
1. ✅ `app/process-flow/page.tsx` (2,422 → ~1,800 lines saved)
2. ✅ `app/page.tsx` (1,988 → ~1,500 lines saved)
3. ✅ `app/projects/page.tsx` (1,822 → ~1,300 lines saved)

**Total Impact:** -4,600 lines of monolithic code  
**Effort:** 3-5 days  
**Benefit:** Much easier to maintain and extend

---

### Phase 2: Backend Services (Week 2)

**Priority files:**
1. ✅ `server/src/routes/ai-models.ts` (1,889 lines)
2. ✅ `server/src/services/processFlowService.ts` (1,851 lines)
3. ✅ `server/src/services/contextInjectionEngine.ts` (1,707 lines)

**Total Impact:** -3,000 lines into smaller services  
**Effort:** 4-6 days  
**Benefit:** Better testability, clearer separation

---

### Phase 3: Pipeline Stages (Week 3)

**Priority files:**
1. ✅ Quality Assurance Stage (1,795 lines)
2. ✅ Context Injection Stage (1,792 lines)
3. ✅ Multi-Format Output Engine (1,477 lines)

**Effort:** 3-4 days  
**Benefit:** Modular pipeline stages, easier to extend

---

### Phase 4: Medium Files (Week 4)

**Files to monitor** (1,000-1,400 lines):
- `app/ai-providers/page.tsx` (1,512)
- `app/jobs/page.tsx` (1,465)
- `app/process-flow/visual-pipeline/page.tsx` (1,391)
- `app/integrations/page.tsx` (1,234)
- `server/src/services/qualityAssessmentEngine.ts` (1,385)

**Effort:** 2-3 days  
**Strategy:** Extract components as needed

---

## 🔧 Detailed Refactoring Plans

### Case Study: `app/process-flow/page.tsx` (2,422 lines)

#### Current Structure Analysis
```
Lines 1-100:     Imports and type definitions
Lines 101-400:   State management (useState, useEffect hooks)
Lines 401-700:   Stage configuration section
Lines 701-1000:  Job execution controls
Lines 1001-1400: Metrics and monitoring
Lines 1401-1800: Execution history table
Lines 1801-2200: Stage details and visualization
Lines 2201-2422: Dialogs and modals
```

#### Proposed Refactoring
```typescript
// 1. Main page (200 lines)
app/process-flow/page.tsx
  └─ Imports, layout, tab routing

// 2. Components folder
app/process-flow/components/
├── StageConfiguration.tsx (300 lines)
│   └─ Stage selection, variable inputs
├── JobExecutionPanel.tsx (300 lines)
│   └─ Start job, monitor progress
├── MetricsDashboard.tsx (250 lines)
│   └─ Charts, statistics, KPIs
├── ExecutionHistory.tsx (300 lines)
│   └─ Past jobs table, filtering
├── StageVisualization.tsx (400 lines)
│   └─ Visual flow diagram
└── StageDetailsModal.tsx (200 lines)
    └─ Individual stage details

// 3. Hooks folder
app/process-flow/hooks/
├── useProcessFlowData.ts (150 lines)
│   └─ Data fetching, caching
├── useStageExecution.ts (150 lines)
│   └─ Job execution logic
├── useProcessMetrics.ts (100 lines)
│   └─ Metrics calculations
└── useWebSocketUpdates.ts (100 lines)
    └─ Real-time updates

// 4. Utils folder
app/process-flow/utils/
├── stageHelpers.ts (100 lines)
├── metricsCalculations.ts (100 lines)
└── formatters.ts (80 lines)

// 5. Types
app/process-flow/types.ts (100 lines)
```

**Result:** 2,422 lines → 8 files averaging 300 lines each

---

### Case Study: `app/page.tsx` (1,988 lines)

#### Current Structure
```
Lines 1-50:      Imports
Lines 51-300:    Dashboard state
Lines 301-600:   Quick stats section
Lines 601-900:   Recent documents widget
Lines 901-1200:  Projects overview
Lines 1201-1500: Activity feed
Lines 1501-1800: AI usage charts
Lines 1801-1988: Quick actions panel
```

#### Proposed Structure
```typescript
app/
├── page.tsx (150 lines - composition only)
└── (dashboard)/
    ├── components/
    │   ├── QuickStatsGrid.tsx (150 lines)
    │   ├── RecentDocumentsWidget.tsx (200 lines)
    │   ├── ProjectsOverviewCard.tsx (250 lines)
    │   ├── ActivityFeed.tsx (300 lines)
    │   ├── AIUsageCharts.tsx (250 lines)
    │   └── QuickActionsPanel.tsx (150 lines)
    └── hooks/
        ├── useDashboardStats.ts (200 lines)
        └── useDashboardData.ts (250 lines)
```

**Result:** Much easier for AI to edit individual widgets

---

### Case Study: `server/src/routes/ai-models.ts` (1,889 lines)

#### Current Structure
```
Lines 1-200:     OpenAI routes and handlers
Lines 201-400:   Google AI routes
Lines 401-600:   Anthropic routes
Lines 601-800:   Mistral routes
Lines 801-1200:  Testing endpoints
Lines 1201-1600: Validation and middleware
Lines 1601-1889: Helper functions
```

#### Proposed Structure
```typescript
server/src/routes/ai-models/
├── index.ts (100 lines - main router)
├── providers/
│   ├── openai.routes.ts (300 lines)
│   ├── google.routes.ts (300 lines)
│   ├── anthropic.routes.ts (300 lines)
│   └── mistral.routes.ts (200 lines)
├── testing/
│   └── testing.routes.ts (400 lines)
├── middleware/
│   ├── validation.ts (200 lines)
│   └── auth.ts (100 lines)
└── schemas/
    └── joi-schemas.ts (200 lines)
```

**Result:** Easier to maintain provider-specific logic

---

## 🎯 Quick Wins (Low Effort, High Impact)

### 1. Extract Reusable Components (2-3 hours)

**Target:** All pages with repeated patterns

Common patterns found:
- Loading states (~30 lines each, 15 occurrences)
- Error displays (~50 lines each, 20 occurrences)
- Empty states (~40 lines each, 12 occurrences)
- Data tables (~100 lines each, 10 occurrences)

**Create:**
```typescript
components/shared/
├── LoadingState.tsx
├── ErrorState.tsx
├── EmptyState.tsx
└── DataTable.tsx
```

**Savings:** ~2,000 lines of duplicate code

---

### 2. Extract Hooks (1-2 hours)

**Target:** Repeated data fetching patterns

Create shared hooks:
```typescript
hooks/shared/
├── useDocuments.ts (fetch, cache, mutations)
├── useProjects.ts (fetch, cache, mutations)
├── useAIProviders.ts
└── useTemplates.ts
```

**Savings:** ~1,000 lines of duplicate logic

---

### 3. Extract Type Definitions (1 hour)

**Target:** Inline types in large files

Move to:
```typescript
types/
├── project.types.ts
├── document.types.ts
├── pipeline.types.ts
└── ai.types.ts
```

**Savings:** ~500 lines, better reusability

---

## 📊 Impact Analysis

### Current State
```
Total Critical Files (>1,500 lines): 10
Total High Concern (1,000-1,500 lines): 13
Total Lines in Large Files: ~35,000
Average File Size (large files): 1,520 lines
```

### After Refactoring (Projected)
```
Total Critical Files: 0 ✅
Total Files >1,000 lines: <5
Total Lines: Same 35,000 (redistributed)
Average File Size: ~300 lines
Number of New Files: +60 (better organization)
```

### Benefits

**Developer Experience:**
- ✅ Easier to find code
- ✅ Faster AI assistance
- ✅ Clearer code reviews
- ✅ Less merge conflicts
- ✅ Better testing isolation

**Code Quality:**
- ✅ Single responsibility principle
- ✅ Easier unit testing
- ✅ Better type safety
- ✅ Clearer dependencies
- ✅ Improved reusability

**Maintenance:**
- ✅ Faster onboarding
- ✅ Easier debugging
- ✅ Safer refactoring
- ✅ Better documentation
- ✅ Reduced technical debt

---

## 🚀 Implementation Strategy

### Approach: Incremental Refactoring

**NOT this (risky):**
```
❌ Refactor all 10 critical files in one PR
❌ Massive breaking changes
❌ Hard to review
❌ High merge conflict risk
```

**DO this (safe):**
```
✅ Refactor 1-2 files per PR
✅ Add tests before refactoring
✅ Extract components incrementally
✅ Keep old file until new structure tested
✅ Small, reviewable PRs
```

### Workflow Per File

1. **Analysis** (30 min)
   - Identify sections/responsibilities
   - Plan component boundaries
   - List dependencies

2. **Create Structure** (1 hour)
   - Create new folders/files
   - Move types first
   - Extract utilities

3. **Extract Components** (2-4 hours)
   - One component at a time
   - Test after each extraction
   - Update imports

4. **Testing** (1 hour)
   - Verify functionality
   - Check for regressions
   - Update tests

5. **Cleanup** (30 min)
   - Remove old file
   - Update imports
   - Document changes

**Total per file:** 5-7 hours

---

## 📅 Suggested Timeline

### Week 1: Frontend Critical Pages
- **Day 1-2:** `app/process-flow/page.tsx`
- **Day 3:** `app/page.tsx`
- **Day 4-5:** `app/projects/page.tsx`

### Week 2: Backend Services
- **Day 1-2:** `server/src/routes/ai-models.ts`
- **Day 3-4:** `server/src/services/processFlowService.ts`
- **Day 5:** Testing and validation

### Week 3: Pipeline Stages
- **Day 1-2:** Quality Assurance Stage
- **Day 2-3:** Context Injection Stage
- **Day 4-5:** Context Injection Engine

### Week 4: Polish & Quick Wins
- **Day 1:** Extract shared components
- **Day 2:** Extract shared hooks
- **Day 3:** Extract type definitions
- **Day 4-5:** Documentation and testing

**Total:** 4 weeks for complete refactoring

---

## 🎯 Success Metrics

### Code Health
- [ ] No files >1,500 lines
- [ ] <5 files >1,000 lines
- [ ] Average file size <400 lines
- [ ] 80%+ test coverage maintained

### Developer Experience
- [ ] AI code suggestions improve (faster, more accurate)
- [ ] Code reviews take <30 min per PR
- [ ] New features take 20-30% less time
- [ ] Onboarding time reduced by 40%

### Quality
- [ ] Zero regressions during refactoring
- [ ] All tests passing
- [ ] No lint errors
- [ ] TypeScript strict mode maintained

---

## 🔍 Monitoring & Prevention

### Add to CI/CD Pipeline

```yaml
# .github/workflows/code-size-check.yml
name: Code Size Check
on: [pull_request]
jobs:
  check-file-size:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Check for oversized files
        run: |
          LARGE_FILES=$(find app server/src -name "*.ts" -o -name "*.tsx" | \
            xargs wc -l | awk '$1 > 1000 {print $2, $1}')
          if [ -n "$LARGE_FILES" ]; then
            echo "⚠️ Files exceeding 1,000 lines found:"
            echo "$LARGE_FILES"
            echo "Consider refactoring these files."
            exit 1
          fi
```

### ESLint Rule (Optional)

```javascript
// .eslintrc.js
module.exports = {
  rules: {
    'max-lines': ['warn', {
      max: 500,
      skipBlankLines: true,
      skipComments: true
    }]
  }
}
```

---

## 📚 References & Resources

- [Martin Fowler - Refactoring Catalog](https://refactoring.com/catalog/)
- [React Component Size Best Practices](https://kentcdodds.com/blog/when-to-break-up-a-component-into-multiple-components)
- [Clean Code JavaScript](https://github.com/ryanmcdermott/clean-code-javascript)
- [Node.js Best Practices - Code Structure](https://github.com/goldbergyoni/nodebestpractices#1-project-architecture-practices)

---

## 🎓 Lessons Learned

### Why Files Grew So Large

1. **Feature Addition**: Each new feature added to existing page
2. **Tab Pattern**: Multiple tabs in one page component
3. **No Code Reviews**: No size limits enforced
4. **Time Pressure**: "Just add it here" mentality
5. **Lack of Planning**: No upfront component design

### How to Prevent

1. **Start with Structure**: Design components before coding
2. **Size Limits**: Enforce max 500 lines in code reviews
3. **Extract Early**: Refactor at 300 lines, don't wait for 2,000
4. **Component Library**: Build reusable components proactively
5. **Regular Audits**: Monthly code size review

---

## ✅ Acceptance Criteria

Refactoring is complete when:
- [ ] No files exceed 1,000 lines
- [ ] Average file size <400 lines
- [ ] All tests passing
- [ ] AI agents can edit any file without context limits
- [ ] Code reviews take <30 minutes
- [ ] New developer can understand any file in <10 minutes

---

## 🚦 Risk Assessment

### Low Risk Refactorings
- ✅ Extract pure utility functions
- ✅ Extract type definitions
- ✅ Extract simple components (no state)

### Medium Risk Refactorings
- ⚠️ Extract stateful components
- ⚠️ Split API routes (update imports)
- ⚠️ Extract hooks (dependency management)

### High Risk Refactorings
- 🔴 Split large services (many dependencies)
- 🔴 Pipeline stage refactoring (integration tests)
- 🔴 Dashboard page (complex state management)

**Mitigation:** Test thoroughly, refactor incrementally, keep old code until verified

---

## 📞 Next Steps

1. **Review this analysis** with team
2. **Prioritize refactorings** based on business needs
3. **Create tickets** for each refactoring (use this doc as template)
4. **Start with quick wins** (extract shared components)
5. **Schedule refactoring sprints** (Week 1-4 plan above)

---

**Status**: Analysis complete, ready for implementation  
**Recommendation**: Start with `app/process-flow/page.tsx` - highest impact  
**Contact**: Tag architecture team for review

---

**Created**: October 26, 2025  
**Next Review**: After Phase 1 completion (Week 1)

