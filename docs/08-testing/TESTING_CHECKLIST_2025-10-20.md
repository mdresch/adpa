# Testing Checklist - October 20, 2025

## What's Actually Implemented ✅

### 1. Baseline Extraction (COMPLETED)
**Status**: ✅ Just completed for ADPA project

**What to Test**:
- [ ] Navigate to ADPA project (`/projects/45083436-7e90-4ecf-aa42-e4a73c4b64b7`)
- [ ] Click "Baseline" tab
- [ ] Verify baseline appears with all components:
  - [ ] Scope Baseline
  - [ ] Technical Baseline
  - [ ] Timeline Baseline
  - [ ] Cost Baseline
  - [ ] Resource Baseline
  - [ ] Success Criteria
- [ ] Check completeness cards at top (should show percentages)
- [ ] Verify quality audit section shows:
  - [ ] Overall Quality Score: 32
  - [ ] Feasibility Score: 72.5
  - [ ] PMBOK Compliance: 63
  - [ ] Red Flags: 2 (should be visible)
  - [ ] Warnings: 0

**Expected Result**: 
- Baseline created successfully
- 10 documents analyzed
- Processing time: ~4 minutes
- Version 1.0 in "draft" status

---

### 2. Baseline Approval Workflow (IMPLEMENTED)
**Status**: ✅ UI exists, backend exists

**What to Test**:
- [ ] Click "View Details" button on the baseline
- [ ] Verify dialog shows all 6 component cards with completeness %
- [ ] Scroll through all baseline components
- [ ] Check Quality Audit section:
  - [ ] Red Flags display (should be 2)
  - [ ] Warnings display (should be 0)
  - [ ] Feasibility Assessment
- [ ] Click "Approve Baseline" button
  - [ ] Should ask for confirmation
  - [ ] Should show success toast
  - [ ] Status should change to "approved"
- [ ] Try "Decline & Archive" button:
  - [ ] Should prompt for reason
  - [ ] Should archive (not delete) baseline
  - [ ] Should show success toast
- [ ] Try "Rerun with More Documents":
  - [ ] Should open extract dialog
  - [ ] Should pre-select current documents
  - [ ] Should allow adding more documents

**Expected Result**: 
- All buttons work
- Baseline status changes appropriately
- Toast notifications appear
- Data persists after page refresh

---

### 3. Quality Audit Display (IMPLEMENTED)
**Status**: ✅ Enhanced with color-coding

**What to Test**:
- [ ] In Baseline Details Dialog, find "Quality Audit" section
- [ ] Verify "Overall Completeness" has color coding:
  - Green (≥80%), Yellow (50-79%), Red (<50%)
- [ ] Verify "Consistency" score has color coding
- [ ] Check "Critical Issues Detected (Red Flags)" section:
  - [ ] Should show card for each red flag
  - [ ] Each card should have:
    - Title
    - Severity badge
    - Description
    - Evidence (bullet points)
    - Required Action
    - Blocking badge if applicable
- [ ] Check "Warnings" section (if any)
- [ ] Check "Feasibility Assessment":
  - [ ] Feasibility score (0-100)
  - [ ] Technical feasibility details
  - [ ] Resource feasibility details
  - [ ] Timeline feasibility details

**Expected Result**: 
- Quality audit is comprehensive
- Red flags are clearly visible
- Color coding helps identify issues
- Recommendations are actionable

---

### 4. Gantt Chart Visualization (IMPLEMENTED)
**Status**: ✅ Using frappe-gantt library

**What to Test**:
- [ ] In Baseline Details Dialog, scroll to "Timeline Baseline" section
- [ ] Verify Gantt chart renders
- [ ] Check milestones are displayed:
  - [ ] Milestone names
  - [ ] Start/end dates
  - [ ] Dependencies (if any)
  - [ ] Progress bars
- [ ] Test interactions:
  - [ ] Hover over milestone (should show tooltip)
  - [ ] Zoom controls (day/week/month view)
  - [ ] Scroll horizontally for long timelines

**Expected Result**: 
- Gantt chart displays correctly
- Milestones are visible and properly positioned
- Interactive features work
- Timeline is easy to read

---

## What's Only Documented (NOT Implemented) ❌

### 1. AI Page "Save to Existing Project" (DOCUMENTED ONLY)
**Status**: ❌ Feature spec created, not coded yet

**Location**: `docs/06-features/AI_PAGE_SAVE_TO_PROJECT.md`

**To Implement**:
- [ ] Add radio buttons to AI page (New Project / Existing Project)
- [ ] Add project dropdown
- [ ] Fetch project list from API
- [ ] Create `/projects/:id/context` API endpoint
- [ ] Enhance AI prompt with project context
- [ ] Save document to existing project
- [ ] Redirect to project page after generation

**Do NOT test this yet** - it's not implemented!

---

### 2. Enhanced Context for Change Requests (DOCUMENTED ONLY)
**Status**: ❌ Part of above feature, not coded

**What Would Be Tested (once implemented)**:
- User selects existing project
- System fetches project context
- AI prompt includes project history
- Generated CR references actual project documents
- CR is contextually relevant

**Do NOT test this yet** - it's not implemented!

---

## Testing Priority

### High Priority (Test Now) 🔥
1. **Baseline Extraction Results** - Just completed, verify it worked
2. **Baseline Approval Flow** - Core feature, needs validation
3. **Quality Audit Display** - Critical for decision-making
4. **Gantt Chart** - Visual timeline component

### Medium Priority (Test After Fixes) ⚠️
1. Any bugs found in high-priority tests
2. Edge cases (empty baselines, missing data)
3. Error handling (network errors, API failures)

### Low Priority (Future) 📋
1. AI Page "Save to Project" feature (once implemented)
2. Enhanced context for CRs (once implemented)
3. Performance testing with large projects

---

## How to Report Issues

When you find a bug, provide:
1. **What you did** (steps to reproduce)
2. **What you expected** (expected behavior)
3. **What happened** (actual behavior)
4. **Console errors** (if any - check browser console)
5. **Backend logs** (if relevant - check server logs)

Example:
```
BUG: Baseline approval button not working

Steps:
1. Navigate to ADPA project
2. Click "Baseline" tab
3. Click "View Details"
4. Click "Approve Baseline"
5. Click "Confirm" in dialog

Expected: Baseline status changes to "approved", success toast appears
Actual: Nothing happens, no toast, status stays "draft"
Console: Error: Failed to approve baseline - 403 Forbidden
```

---

## Quick Test Commands

### Check Backend Logs
```powershell
cd D:\source\repos\adpa\server
Get-Content logs\combined.log -Tail 50
```

### Check Backend Status
```powershell
# In browser console
fetch('http://localhost:5000/health').then(r => r.json()).then(console.log)
```

### Check Database
```powershell
# Connect to database and check baselines
psql $env:DATABASE_URL -c "SELECT id, project_id, version, status, created_at FROM baselines ORDER BY created_at DESC LIMIT 5;"
```

---

## What We Know Works

Based on the logs, we know:
- ✅ Baseline extraction completed successfully
- ✅ 10 documents were analyzed
- ✅ AI generation worked (Google Gemini)
- ✅ Baseline was saved to database
- ✅ Quality audit ran successfully
- ✅ 2 red flags were detected
- ✅ Feasibility score calculated (72.5%)

---

## Start Here 👇

1. **Refresh your browser** at the ADPA project page
2. **Click the "Baseline" tab**
3. **Verify the baseline appears**
4. **Follow the testing checklist above**
5. **Report any issues you find**

Let me know what you discover! 🚀



## What's Actually Implemented ✅

### 1. Baseline Extraction (COMPLETED)
**Status**: ✅ Just completed for ADPA project

**What to Test**:
- [ ] Navigate to ADPA project (`/projects/45083436-7e90-4ecf-aa42-e4a73c4b64b7`)
- [ ] Click "Baseline" tab
- [ ] Verify baseline appears with all components:
  - [ ] Scope Baseline
  - [ ] Technical Baseline
  - [ ] Timeline Baseline
  - [ ] Cost Baseline
  - [ ] Resource Baseline
  - [ ] Success Criteria
- [ ] Check completeness cards at top (should show percentages)
- [ ] Verify quality audit section shows:
  - [ ] Overall Quality Score: 32
  - [ ] Feasibility Score: 72.5
  - [ ] PMBOK Compliance: 63
  - [ ] Red Flags: 2 (should be visible)
  - [ ] Warnings: 0

**Expected Result**: 
- Baseline created successfully
- 10 documents analyzed
- Processing time: ~4 minutes
- Version 1.0 in "draft" status

---

### 2. Baseline Approval Workflow (IMPLEMENTED)
**Status**: ✅ UI exists, backend exists

**What to Test**:
- [ ] Click "View Details" button on the baseline
- [ ] Verify dialog shows all 6 component cards with completeness %
- [ ] Scroll through all baseline components
- [ ] Check Quality Audit section:
  - [ ] Red Flags display (should be 2)
  - [ ] Warnings display (should be 0)
  - [ ] Feasibility Assessment
- [ ] Click "Approve Baseline" button
  - [ ] Should ask for confirmation
  - [ ] Should show success toast
  - [ ] Status should change to "approved"
- [ ] Try "Decline & Archive" button:
  - [ ] Should prompt for reason
  - [ ] Should archive (not delete) baseline
  - [ ] Should show success toast
- [ ] Try "Rerun with More Documents":
  - [ ] Should open extract dialog
  - [ ] Should pre-select current documents
  - [ ] Should allow adding more documents

**Expected Result**: 
- All buttons work
- Baseline status changes appropriately
- Toast notifications appear
- Data persists after page refresh

---

### 3. Quality Audit Display (IMPLEMENTED)
**Status**: ✅ Enhanced with color-coding

**What to Test**:
- [ ] In Baseline Details Dialog, find "Quality Audit" section
- [ ] Verify "Overall Completeness" has color coding:
  - Green (≥80%), Yellow (50-79%), Red (<50%)
- [ ] Verify "Consistency" score has color coding
- [ ] Check "Critical Issues Detected (Red Flags)" section:
  - [ ] Should show card for each red flag
  - [ ] Each card should have:
    - Title
    - Severity badge
    - Description
    - Evidence (bullet points)
    - Required Action
    - Blocking badge if applicable
- [ ] Check "Warnings" section (if any)
- [ ] Check "Feasibility Assessment":
  - [ ] Feasibility score (0-100)
  - [ ] Technical feasibility details
  - [ ] Resource feasibility details
  - [ ] Timeline feasibility details

**Expected Result**: 
- Quality audit is comprehensive
- Red flags are clearly visible
- Color coding helps identify issues
- Recommendations are actionable

---

### 4. Gantt Chart Visualization (IMPLEMENTED)
**Status**: ✅ Using frappe-gantt library

**What to Test**:
- [ ] In Baseline Details Dialog, scroll to "Timeline Baseline" section
- [ ] Verify Gantt chart renders
- [ ] Check milestones are displayed:
  - [ ] Milestone names
  - [ ] Start/end dates
  - [ ] Dependencies (if any)
  - [ ] Progress bars
- [ ] Test interactions:
  - [ ] Hover over milestone (should show tooltip)
  - [ ] Zoom controls (day/week/month view)
  - [ ] Scroll horizontally for long timelines

**Expected Result**: 
- Gantt chart displays correctly
- Milestones are visible and properly positioned
- Interactive features work
- Timeline is easy to read

---

## What's Only Documented (NOT Implemented) ❌

### 1. AI Page "Save to Existing Project" (DOCUMENTED ONLY)
**Status**: ❌ Feature spec created, not coded yet

**Location**: `docs/06-features/AI_PAGE_SAVE_TO_PROJECT.md`

**To Implement**:
- [ ] Add radio buttons to AI page (New Project / Existing Project)
- [ ] Add project dropdown
- [ ] Fetch project list from API
- [ ] Create `/projects/:id/context` API endpoint
- [ ] Enhance AI prompt with project context
- [ ] Save document to existing project
- [ ] Redirect to project page after generation

**Do NOT test this yet** - it's not implemented!

---

### 2. Enhanced Context for Change Requests (DOCUMENTED ONLY)
**Status**: ❌ Part of above feature, not coded

**What Would Be Tested (once implemented)**:
- User selects existing project
- System fetches project context
- AI prompt includes project history
- Generated CR references actual project documents
- CR is contextually relevant

**Do NOT test this yet** - it's not implemented!

---

## Testing Priority

### High Priority (Test Now) 🔥
1. **Baseline Extraction Results** - Just completed, verify it worked
2. **Baseline Approval Flow** - Core feature, needs validation
3. **Quality Audit Display** - Critical for decision-making
4. **Gantt Chart** - Visual timeline component

### Medium Priority (Test After Fixes) ⚠️
1. Any bugs found in high-priority tests
2. Edge cases (empty baselines, missing data)
3. Error handling (network errors, API failures)

### Low Priority (Future) 📋
1. AI Page "Save to Project" feature (once implemented)
2. Enhanced context for CRs (once implemented)
3. Performance testing with large projects

---

## How to Report Issues

When you find a bug, provide:
1. **What you did** (steps to reproduce)
2. **What you expected** (expected behavior)
3. **What happened** (actual behavior)
4. **Console errors** (if any - check browser console)
5. **Backend logs** (if relevant - check server logs)

Example:
```
BUG: Baseline approval button not working

Steps:
1. Navigate to ADPA project
2. Click "Baseline" tab
3. Click "View Details"
4. Click "Approve Baseline"
5. Click "Confirm" in dialog

Expected: Baseline status changes to "approved", success toast appears
Actual: Nothing happens, no toast, status stays "draft"
Console: Error: Failed to approve baseline - 403 Forbidden
```

---

## Quick Test Commands

### Check Backend Logs
```powershell
cd D:\source\repos\adpa\server
Get-Content logs\combined.log -Tail 50
```

### Check Backend Status
```powershell
# In browser console
fetch('http://localhost:5000/health').then(r => r.json()).then(console.log)
```

### Check Database
```powershell
# Connect to database and check baselines
psql $env:DATABASE_URL -c "SELECT id, project_id, version, status, created_at FROM baselines ORDER BY created_at DESC LIMIT 5;"
```

---

## What We Know Works

Based on the logs, we know:
- ✅ Baseline extraction completed successfully
- ✅ 10 documents were analyzed
- ✅ AI generation worked (Google Gemini)
- ✅ Baseline was saved to database
- ✅ Quality audit ran successfully
- ✅ 2 red flags were detected
- ✅ Feasibility score calculated (72.5%)

---

## Start Here 👇

1. **Refresh your browser** at the ADPA project page
2. **Click the "Baseline" tab**
3. **Verify the baseline appears**
4. **Follow the testing checklist above**
5. **Report any issues you find**

Let me know what you discover! 🚀

