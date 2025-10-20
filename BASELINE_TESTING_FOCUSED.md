# Baseline System Testing - FOCUSED

**Date**: October 20, 2025  
**Goal**: Test ONLY the baseline features we already implemented  
**No Distractions**: Feedback system and AI page enhancements are PARKED

---

## What We Built (CR-2026-001: Baseline Drift Detection)

### Database Tables ✅
- `project_baselines` - Main baseline records
- `baseline_components` - Scope, technical, timeline, cost, resource, success criteria
- `baseline_versions` - Version history (for updates)
- `baseline_drift_detection` - Drift monitoring records
- `baseline_compliance_reviews` - PMBOK/compliance reviews
- `innovation_opportunities` - AI-detected opportunities

### Backend Services ✅
- Baseline extraction from document corpus
- Quality audit with red flags
- Approval workflow
- Decline & archive workflow
- Completeness score recalibration
- Formal baseline document generation

### Frontend UI ✅
- Baseline tab on project page
- "Create Baseline" button & dialog
- Document selection (checkboxes)
- Baseline history list
- "View Details" dialog with:
  - 6 completeness cards
  - All baseline components
  - Quality audit section (red flags, warnings, feasibility)
  - Gantt chart for timeline
- Approval buttons (Approve, Decline, Rerun)

---

## Testing Priority

### TEST 1: Baseline Extraction (ALREADY RAN)

**Status**: ✅ Extraction completed earlier today

**What Happened**:
- Project: ADPA Platform
- Documents: 10 analyzed
- Baseline ID: `b893e7a5-df0f-4727-a3d2-31ca325eddb3`
- Version: 1.0
- Status: Draft

**To Verify**:
1. Go to: `http://localhost:3000/projects/45083436-7e90-4ecf-aa42-e4a73c4b64b7`
2. Click "Baseline" tab
3. **Expected**: Baseline card appears
4. **Expected**: Shows "Version 1.0 (Draft)"
5. **Expected**: Shows "10 documents analyzed"
6. **Expected**: Shows "View Details" and "Approve Baseline" buttons

**Test Result**: [ ] Pass / [ ] Fail

---

### TEST 2: Baseline Details Dialog

**Steps**:
1. Click "View Details" on the baseline
2. Verify completeness cards at top (6 cards):
   - [ ] Scope Baseline (blue, % shown)
   - [ ] Technical Baseline (green, % shown)
   - [ ] Schedule Baseline (yellow, % shown)
   - [ ] Cost Baseline (orange, % shown)
   - [ ] Resource Baseline (purple, % shown)
   - [ ] Success Criteria (emerald, % shown)
3. Scroll through all baseline components
4. Verify each section has data

**Expected Data**:
- Scope: Goals, deliverables, exclusions
- Technical: Architecture, technologies, standards
- Timeline: Milestones with dates
- Cost: Budget items (may be incomplete)
- Resource: Team roles and responsibilities
- Success Criteria: Measurable goals

**Test Result**: [ ] Pass / [ ] Fail

---

### TEST 3: Quality Audit Display

**Steps**:
1. In "View Details" dialog
2. Find "Quality Audit" section
3. Verify displays:
   - [ ] Overall Completeness score (color-coded)
   - [ ] Consistency score (color-coded)
   - [ ] Overall Quality Score: 32
   - [ ] Feasibility Score: 72.5%
   - [ ] PMBOK Compliance: 63%

**Critical: Red Flags Section**:
- [ ] Section titled "🚨 Critical Issues Detected (2)"
- [ ] 2 red flag cards displayed
- [ ] Each card has:
  - Title
  - Severity badge
  - Description
  - Evidence (bullet points)
  - Required Action
  - Blocking indicator (if applicable)

**Test Result**: [ ] Pass / [ ] Fail

**Notes**: _Write what you see_

---

### TEST 4: Gantt Chart Rendering

**Steps**:
1. In "View Details" dialog
2. Scroll to "Timeline Baseline" section
3. Look for Gantt chart

**Expected**:
- [ ] Gantt chart renders (not just blank space)
- [ ] Milestones appear as bars
- [ ] Dates are readable
- [ ] Can hover over bars (tooltip appears)

**Test Result**: [ ] Pass / [ ] Fail

**Notes**: _Does it render? Any errors?_

---

### TEST 5: Approve Baseline

**Steps**:
1. In "View Details" dialog
2. Click "Approve Baseline" button
3. Confirm approval (if prompted)

**Expected**:
- [ ] Success toast appears
- [ ] Status changes from "Draft" to "Approved"
- [ ] Baseline card updates
- [ ] Dialog closes (or stays open with updated status)

**Test Result**: [ ] Pass / [ ] Fail

**Notes**: _What happened?_

---

### TEST 6: Decline & Archive Baseline

**Steps**:
1. Create a new baseline (or use existing draft)
2. Click "Decline & Archive"
3. Enter reason: "Red flags need resolution"

**Expected**:
- [ ] Prompt appears for reason
- [ ] Success toast: "Baseline declined and archived"
- [ ] Baseline removed from active view
- [ ] Baseline appears in history with status "Declined"
- [ ] Can still view archived baseline

**Test Result**: [ ] Pass / [ ] Fail

---

### TEST 7: Rerun Baseline Extraction

**Steps**:
1. Click "Rerun with More Documents"
2. Verify extract dialog opens
3. Check current documents are pre-selected

**Expected**:
- [ ] Extract dialog opens
- [ ] All 10 previous documents are checked
- [ ] Can select additional documents
- [ ] Info toast appears
- [ ] Can extract new baseline

**Test Result**: [ ] Pass / [ ] Fail

---

### TEST 8: Generate Formal Baseline Document

**Steps**:
1. In "View Details" dialog
2. Click "Generate Formal Document" button

**Expected**:
- [ ] New dialog opens with 2 tabs:
  - "Baseline Document" - Formatted PMBOK-style output
  - "Missing Details" - Gap analysis with recommendations
- [ ] Document tab shows markdown content
- [ ] Missing Details tab shows recommended templates to create

**Test Result**: [ ] Pass / [ ] Fail

---

## What We're NOT Testing (Parked for Later)

- ❌ AI Page "Save to Project" - Feature complete, will test later
- ❌ Feedback Intelligence System - Only database schema created
- ❌ Automatic drift detection - Not implemented yet
- ❌ Cascading updates - Not implemented yet
- ❌ Document version control - Not implemented yet

---

## Database Tables Status

| Table | Records | Purpose | Used In UI? |
|-------|---------|---------|-------------|
| `project_baselines` | 1+ | Main baseline | ✅ YES - Baseline tab |
| `baseline_components` | 6 per baseline | Individual components | ✅ YES - Details dialog |
| `baseline_versions` | 1+ | Version history | ❓ NOT TESTED |
| `baseline_drift_detection` | 0 | Drift records | ❌ NO - Not implemented |
| `baseline_compliance_reviews` | 1 per baseline | Compliance data | ✅ YES - Quality audit |
| `innovation_opportunities` | Variable | AI suggestions | ❓ NOT TESTED |

---

## Success Criteria

The baseline system is **WORKING** if:

1. ✅ Can extract baseline from documents
2. ✅ Baseline appears on Baseline tab
3. ✅ Can view baseline details
4. ✅ Quality audit displays red flags
5. ✅ Can approve baseline
6. ✅ Can decline baseline
7. ✅ Gantt chart renders
8. ✅ Can generate formal document

**Minimum Bar**: 6 out of 8 tests pass

---

## Start Testing NOW

1. **Refresh** your browser at ADPA project page
2. **Click** "Baseline" tab
3. **Follow** the tests above in order
4. **Report** results for each test

---

**Focus Mode Activated: Baseline Testing Only** 🎯

