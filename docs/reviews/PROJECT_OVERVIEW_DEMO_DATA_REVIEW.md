# Project Overview Demo/Dummy Data Review

**Page:** `/projects/[id]` (Project Overview)  
**Date:** 2026-01-26  
**Project ID Reviewed:** `6b808dc1-0c22-405a-a6b6-984dbe664e8a`

---

## Summary

This review identifies all components in the project overview page that are using **demo, dummy, mock, or hardcoded data** instead of real API data. Components are categorized by severity and location.

---

## 🔴 Critical: Active Demo/Mock Data (Production Risk)

### 1. **Project Detail Page - Fallback Mock Data**
**File:** `app/projects/[id]/page.tsx`  
**Lines:** 345-359

**Issue:** When the API fails to fetch project data, the component falls back to hardcoded mock data:

```typescript
// Fallback to mock data
setProject({
  id: projectId,
  name: "Customer Portal Redesign",
  description: "Complete redesign of the customer-facing portal...",
  status: "active",
  framework: "PMBOK 7",
  priority: "high",
  owner_id: "user1",
  team_members: ["John Doe", "Jane Smith", "Mike Wilson", "Lisa Chen"],
  start_date: "2024-01-15",
  end_date: "2024-06-30",
  // ...
})
```

**Impact:** Users see incorrect project data if the API fails.  
**Recommendation:** Remove mock fallback; show error state instead.

---

### 2. **Document View Page - Mock Document Data**
**File:** `app/projects/[id]/documents/[docId]/view/page.tsx`  
**Lines:** 233-404, 566-574

**Issue:** Extensive mock document data used as fallback:

```typescript
// Mock data for demonstration
const mockDocument: DocumentData = {
  id: documentId,
  title: "Project Requirements Document",
  content: `# Project Requirements Document...`, // 200+ lines of hardcoded content
  author: "Project Manager",
  // ... full mock document structure
}

const mockVersions: VersionData[] = [
  { id: "v1", version: "1.0", ... },
  { id: "v2", version: "1.1", ... },
  { id: "v3", version: "1.2", ... }
]

// Fallback to mock data if API fails
setDocument(mockDocument)
setVersions(mockVersions)
toast.error("Failed to load document from API, showing demo data")
```

**Impact:** Users see fake document content when API fails.  
**Recommendation:** Remove mock fallback; show error state with retry option.

---

### 3. **Baseline Management - Hardcoded Completeness Percentages**
**File:** `app/projects/[id]/components/BaselineManagement.tsx`  
**Lines:** 1159-1165

**Issue:** Hardcoded completeness percentages for baseline components:

```typescript
{[
  { name: 'Scope', key: 'scope_baseline', completeness: 100, color: 'blue' },
  { name: 'Technical', key: 'technical_baseline', completeness: 100, color: 'green' },
  { name: 'Schedule', key: 'timeline_baseline', completeness: 75, color: 'yellow' },
  { name: 'Cost', key: 'cost_baseline', completeness: 50, color: 'orange' },
  { name: 'Resource', key: 'resource_baseline', completeness: 60, color: 'purple' },
  { name: 'Success Criteria', key: 'success_criteria', completeness: 90, color: 'emerald' }
].map((component) => {
  // Uses component.completeness (hardcoded) when hasData is true
  <Progress value={hasData ? component.completeness : 0} />
})}
```

**Impact:** Shows incorrect completeness percentages even when real baseline data exists. The baseline object has an overall `completeness_score` (0-1) from the API, but per-component completeness is hardcoded.  
**Recommendation:** 
- Option A: Calculate per-component completeness by counting populated fields vs. expected fields for each baseline component (scope_baseline, technical_baseline, etc.)
- Option B: If per-component scores aren't available, use the overall `viewingBaseline.completeness_score` divided proportionally, or show "—" for individual components
- Remove hardcoded `completeness: 100, 75, 50, 60, 90` values

---

## 🟡 Medium: Placeholder/Demo Data (User Confusion)

### 4. **Project Dashboard V0 - Hardcoded "Last Extract" Time**
**File:** `components/project/ProjectDashboardV0.tsx`  
**Lines:** 337-342

**Issue:** Hardcoded "2 hours ago" for last extraction time:

```typescript
// Note: lastExtract would need to come from API if available
lastExtract: "2 hours ago", // TODO: Fetch from API if available
```

**Impact:** All entities show the same "2 hours ago" timestamp regardless of actual extraction time.  
**Recommendation:** Fetch real `last_extracted_at` or `extraction_timestamp` from extraction API/entity metadata.

---

### 5. **Documents Tab - Mock Data for Demonstration**
**File:** `app/projects/[id]/documents/page.tsx`  
**Lines:** 332-337

**Issue:** Mock document data used for demonstration:

```typescript
// Use mock data for demonstration
{
  template_id: null, // Mock data - no template ID
  // ... other mock fields
}
```

**Impact:** May appear in UI during development/testing.  
**Recommendation:** Remove or clearly mark as dev-only; ensure production doesn't use this.

---

## 🟢 Low: UI Placeholders (Acceptable)

### 6. **Input Placeholders**
**Files:** Multiple components  
**Status:** ✅ **Acceptable** - These are UI placeholders, not data

Examples:
- `placeholder="Enter document name"`
- `placeholder="Search documents..."`
- `placeholder="Select status"`

These are standard form placeholders and are fine.

---

## ✅ Components Using Real Data

The following components **correctly** fetch and display real API data:

1. **OverviewTab** (`app/projects/[id]/components/OverviewTab.tsx`)
   - ✅ PMBOK 8 domain metrics from `/project-data-extraction/${projectId}/summary`
   - ✅ Document quality metrics from `getProjectDocuments()`
   - ✅ Issue stats from `/issues/stats/${projectId}`
   - ✅ Document status distribution chart (from `documentStats`)
   - ✅ Project health indicators (calculated from real data)

2. **PerformanceDashboard** (`components/project/PerformanceDashboard.tsx`)
   - ✅ Performance summary from `/performance-actuals/${projectId}/summary`
   - ✅ Performance actuals from `/performance-actuals/${projectId}`
   - ✅ All KPIs (SPI, CPI, quality scores) from real data

3. **Key Metrics Cards** (OverviewTab)
   - ✅ Progress, Budget, Manager, Team Members, Documents, Issues — all from real project/stakeholder/document data

---

## Recommendations by Priority

### Priority 1: Remove Mock Fallbacks
1. **Remove mock project fallback** in `app/projects/[id]/page.tsx` (lines 345-359)
   - Replace with proper error state UI
   - Show "Failed to load project" message with retry button

2. **Remove mock document fallback** in `app/projects/[id]/documents/[docId]/view/page.tsx` (lines 233-404, 566-574)
   - Replace with error state
   - Keep mock data only for development/testing (behind feature flag)

### Priority 2: Fix Hardcoded Values
3. **Calculate baseline completeness** from real data in `BaselineManagement.tsx`
   - Count populated fields vs. expected fields per baseline component
   - Remove hardcoded `completeness: 100, 75, 50, 60, 90` values

4. **Fetch real last extraction time** in `ProjectDashboardV0.tsx`
   - Add `last_extracted_at` or `extraction_timestamp` to entity extraction API response
   - Use `formatRelativeTime()` helper (already exists in codebase)

### Priority 3: Clean Up Development Code
5. **Remove or flag mock data** in `documents/page.tsx`
   - Add `if (process.env.NODE_ENV === 'development')` guard
   - Or remove entirely if not needed

---

## Files to Update

1. `app/projects/[id]/page.tsx` - Remove mock project fallback
2. `app/projects/[id]/documents/[docId]/view/page.tsx` - Remove mock document fallback
3. `app/projects/[id]/components/BaselineManagement.tsx` - Calculate completeness from real data
4. `components/project/ProjectDashboardV0.tsx` - Fetch real last extraction time
5. `app/projects/[id]/documents/page.tsx` - Remove or guard mock data

---

## Testing Checklist

After fixes:
- [ ] Project page shows error state (not mock data) when API fails
- [ ] Document view shows error state (not mock content) when API fails
- [ ] Baseline completeness percentages match actual baseline data
- [ ] Last extraction times are real timestamps from API
- [ ] No "demo data" toasts appear in production
- [ ] All charts and metrics reflect real project data

---

## Notes

- **OverviewTab** is well-implemented: all metrics come from real APIs
- **PerformanceDashboard** is well-implemented: uses real performance actuals
- Most issues are **fallback mock data** that should be replaced with error states
- The **BaselineManagement** hardcoded completeness is the most misleading (shows fake percentages)
