# File #4 Refactoring Plan - Projects Detail Page

**File**: `app/projects/[id]/page.tsx`  
**Size**: 4,970 lines (LARGEST FILE!)  
**Target**: ~800-1000 lines main file  
**Expected Components**: 15-20  
**Estimated Time**: 2-3 hours  

---

## 📊 File Structure Analysis

### Major Sections Identified

**1. BaselineManagement Component** (Lines 146-1135, ~990 lines!)
- Already isolated component (inline)
- ✅ **IMMEDIATE EXTRACTION** (20% reduction in one step!)
- Complex baseline creation, approval, drift detection
- Multiple dialogs and states

**2. Main ProjectDetail Component** (Lines 1137-4970, ~3,833 lines)
Contains 7 major tabs:
- Overview Tab (~275 lines)
- Documents Tab (~214 lines)
- Stakeholders Tab (~275 lines)
- Baseline Tab (~4 lines - calls BaselineManagement)
- Variables Tab (~342 lines)
- Timeline Tab (~200 lines)
- Settings Tab (~150 lines)

**3. Multiple Inline Components/Sections**:
- Project header/breadcrumbs (~100 lines)
- Stats cards (~150 lines)
- Document list/grid (~300 lines)
- Stakeholder management (~400 lines)
- Charts (multiple Recharts) (~200 lines)
- Various dialogs (~800 lines total)

---

## 🎯 Extraction Strategy (20 Components Expected)

### Phase 1: Quick Wins (30 minutes)

**Step 1**: Extract BaselineManagement  
- Lines: ~990
- Impact: Immediate 20% reduction!
- Risk: Low (already isolated)

**Step 2**: Create Types File
- Centralize all interfaces
- Document, Stakeholder, ExtendedProject, etc.
- Expected: ~300 lines

**Step 3**: Extract Utilities
- Helper functions
- Formatters, calculations
- Expected: ~100 lines

### Phase 2: Tab Components (1-1.5 hours)

**Step 4-10**: Extract Each Tab (7 tabs)
- OverviewTab.tsx (~300 lines)
- DocumentsTab.tsx (~350 lines)
- StakeholdersTab.tsx (~450 lines)
- BaselineTab.tsx (~50 lines - wrapper)
- VariablesTab.tsx (~350 lines)
- TimelineTab.tsx (~250 lines)
- SettingsTab.tsx (~180 lines)

### Phase 3: Supporting Components (45 min)

**Step 11-15**: Extract UI Components
- ProjectHeader.tsx (~120 lines)
- ProjectStats.tsx (~180 lines)
- DocumentCard.tsx (~150 lines)
- StakeholderCard.tsx (~150 lines)
- Charts components (~200 lines total)

### Phase 4: Dialogs (30 min)

**Step 16-20**: Extract Dialog Components
- CreateDocumentDialog.tsx
- EditProjectDialog.tsx
- AddStakeholderDialog.tsx
- Various other dialogs

### Phase 5: Integration (30 min)

**Step 21**: Replace inline components with imports
**Step 22**: Update all component calls
**Step 23**: Remove old JSX (~3,900 lines!)
**Step 24**: Clean up imports

### Phase 6: Testing (15 min)

**Step 25**: Verify all tabs work
**Step 26**: Test all dialogs
**Step 27**: Confirm charts render
**Step 28**: Production validation

---

## 📈 Expected Results

### Before
```
File: 4,970 lines
Structure: Monolithic with inline components
Maintainability: ❌ CRITICAL (nearly 5K lines!)
```

### After
```
File: ~800-1000 lines
Structure: Component-based, clean tabs
Maintainability: ✅ Excellent
Components: ~20 focused files
```

### Reduction
```
Main file: 4,970 → ~900 lines (82% reduction!)
Largest reduction yet!
Most complex refactoring!
Highest impact!
```

---

## 🎯 Component List (Estimated)

### Core Components (must-extract)
1. ✅ BaselineManagement.tsx (~990 lines) ← START HERE
2. ⏳ OverviewTab.tsx (~300 lines)
3. ⏳ DocumentsTab.tsx (~350 lines)
4. ⏳ StakeholdersTab.tsx (~450 lines)
5. ⏳ VariablesTab.tsx (~350 lines)
6. ⏳ TimelineTab.tsx (~250 lines)
7. ⏳ SettingsTab.tsx (~180 lines)

### Supporting Components
8. ⏳ ProjectHeader.tsx (~120 lines)
9. ⏳ ProjectStats.tsx (~180 lines)
10. ⏳ DocumentCard.tsx (~150 lines)
11. ⏳ StakeholderCard.tsx (~150 lines)
12. ⏳ DocumentsChart.tsx (~100 lines)
13. ⏳ StakeholdersChart.tsx (~100 lines)

### Dialog Components
14. ⏳ CreateDocumentDialog.tsx (~150 lines)
15. ⏳ EditProjectDialog.tsx (~180 lines)
16. ⏳ AddStakeholderDialog.tsx (~150 lines)

### Utility Files
17. ⏳ types/index.ts (~300 lines)
18. ⏳ utils/helpers.ts (~100 lines)
19. ⏳ utils/chartData.ts (~80 lines)

**Total**: ~19 files, ~4,880 lines extracted

---

## ⏱️ Time Breakdown

- Analysis & Planning: 15 min ✅ (doing now)
- BaselineManagement extraction: 20 min
- Types & Utils: 30 min
- Tab components (7): 60-90 min
- Supporting components (6): 45 min
- Dialogs (3): 30 min
- Integration: 30 min
- Testing: 15 min

**Total**: 2.5-3 hours

---

## 🚀 Starting Now!

**Next Step**: Extract BaselineManagement component (990 lines → separate file)
**Impact**: Immediate 20% file reduction!
**Risk**: Low (already isolated)

Let's do this! 💪

