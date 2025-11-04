# Drift Resolution Testing Guide

**TASK-716: Create Baseline for Drift Resolution Testing**  
**Feature**: Automatic Drift Detection & Resolution  
**Related CR**: CR-2026-001 (Baseline Drift Detection)  
**Document Version**: 1.0  
**Last Updated**: 2025-11-04

---

## Overview

This guide provides step-by-step instructions for testing the Automatic Drift Detection & Resolution feature. This feature automatically detects when documents deviate from approved baselines and provides one-click AI-powered resolution to bring them back into alignment.

## Prerequisites

Before testing drift resolution, ensure:

1. ✅ **Backend server is running** (`cd server && npm run dev`)
2. ✅ **Frontend is running** (`pnpm dev`)
3. ✅ **Database is accessible** (PostgreSQL with baseline tables)
4. ✅ **You have a test project** with at least one document
5. ✅ **AI provider is configured** (OpenAI, Google AI, etc.)

---

## Quick Start: Create Test Baseline

### Method 1: Using the Script (Recommended)

The fastest way to create a comprehensive test baseline:

```bash
# Navigate to server directory
cd server

# Get your project ID (from UI or database)
# Then run:
npm run create-test-baseline <PROJECT_ID>

# Example:
npm run create-test-baseline 123e4567-e89b-12d3-a456-426614174000
```

**What this script does:**
- Creates a comprehensive baseline with all 13 entity types
- Includes 5 stakeholders, 4 risks, 6 milestones, 5 requirements, and more
- Auto-approves the baseline for immediate testing
- Outputs detailed summary of created baseline

**Script Options:**
```bash
# Create baseline WITHOUT auto-approval (requires manual approval in UI)
npm run create-test-baseline <PROJECT_ID> --no-auto-approve

# Create baseline WITH test entities (advanced)
npm run create-test-baseline <PROJECT_ID> --with-entities

# Show help
npm run create-test-baseline --help
```

### Method 2: Using the API

Create a baseline via REST API:

```bash
# Extract baseline from existing project documents
curl -X POST http://localhost:5000/api/baselines/extract \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "project_id": "YOUR_PROJECT_ID",
    "ai_provider": "openai",
    "ai_model": "gpt-4-turbo-preview"
  }'
```

### Method 3: Using the Web UI

1. Navigate to your project page
2. Click on "Baselines" tab
3. Click "Create Baseline" or "Extract from Documents"
4. Follow the wizard to configure baseline extraction
5. Review and approve the baseline

---

## Test Baseline Contents

The test baseline created by the script includes:

### Stakeholders (5)
- John Smith (Project Sponsor) - High influence/interest
- Sarah Chen (Project Manager) - High influence/interest
- Mike Johnson (Technical Lead) - Medium influence/interest
- Emily Davis (Business Analyst) - Medium influence/interest
- Alex Martinez (UX Designer) - Low influence/interest

### Risks (4)
- Vendor delivery delay (High probability, High impact)
- Skills gap in AI/ML (Medium probability, High impact)
- Integration complexity (Medium probability, Medium impact)
- Budget constraints (Low probability, High impact)

### Milestones (6)
- Requirements Finalized (2026-02-01)
- Architecture Approved (2026-02-15)
- Development Phase 1 Complete (2026-03-15)
- Testing Complete (2026-04-15)
- User Acceptance Testing (2026-05-01)
- Production Deployment (2026-06-01)

### Requirements (5)
- REQ-001: User authentication (High priority, Approved)
- REQ-002: Document generation (High priority, Approved)
- REQ-003: AI integration (High priority, Approved)
- REQ-004: Real-time collaboration (Medium priority, Approved)
- REQ-005: Analytics dashboard (Medium priority, Draft)

### Additional Components
- **Deliverables**: 4 items (Architecture doc, API docs, Training, Deployment)
- **Constraints**: 3 items (Technical, Regulatory, Business)
- **Assumptions**: 3 items
- **Budget**: $500,000 USD
- **Duration**: 6 months
- **Team**: 8 people across 5 roles

---

## Manual Testing Steps

Follow this comprehensive test plan from the [DRIFT_AUTO_RESOLUTION_FEATURE.md](../roadmap/DRIFT_AUTO_RESOLUTION_FEATURE.md):

### Test 1: Basic Drift Detection

**Objective**: Verify automatic drift detection when document is modified

1. **Create baseline** (if not already done)
   ```bash
   npm run create-test-baseline <PROJECT_ID>
   ```

2. **Edit a document** in the project
   - Add a new stakeholder: "Tom Wilson, Developer, Medium influence"
   - Remove one risk: "Budget constraints"
   - Change a milestone date: Move "Testing Complete" from Apr 15 to Apr 30

3. **Save the document**
   - Document should save successfully
   - Check for drift detection alert/notification

4. **Expected Result**:
   - ⚠️ Drift alert appears: "Baseline drift detected: 3 changes"
   - Alert shows drift summary:
     - ✅ 1 stakeholder added (not in baseline)
     - ✅ 1 risk removed (was in baseline)
     - ✅ 1 milestone date changed

### Test 2: Drift Resolution Preview

**Objective**: Verify AI-powered drift resolution preview

1. **Click "Resolve Drift with AI"** button from drift alert

2. **Wait for AI analysis** (should take 3-10 seconds)

3. **Review resolution preview**:
   - Should show all detected drift points
   - Should show proposed changes
   - Should identify which changes require approval

4. **Expected Result**:
   - ✅ Preview dialog appears with:
     - Drift points identified (3 in this case)
     - AI-recommended actions for each drift
     - Side-by-side comparison of changes
     - Strategy selection (Conservative/Balanced/Permissive)

### Test 3: Apply Resolution - Balanced Strategy (Recommended)

**Objective**: Test the balanced resolution strategy

1. **Select "Balanced" strategy** (default)

2. **Review proposed changes**:
   - New stakeholder "Tom Wilson" → Keep (minor change)
   - Removed risk "Budget constraints" → Restore (baseline item)
   - Milestone date change → Flag for approval (significant change)

3. **Click "Apply Resolution"**

4. **Expected Result**:
   - ✅ Document updated successfully
   - ✅ Drift marked as resolved
   - ✅ Success message: "Drift resolved! Document realigned with baseline"
   - ⚠️ Change request created for milestone date change

### Test 4: Conservative Strategy

**Objective**: Test strict baseline adherence

1. **Make the same changes** as in Test 1

2. **Click "Resolve Drift with AI"**

3. **Select "Conservative" strategy**

4. **Apply resolution**

5. **Expected Result**:
   - ✅ ALL changes reverted to baseline
   - ✅ New stakeholder removed
   - ✅ Risk restored
   - ✅ Milestone date reverted
   - ⚠️ All changes flagged for formal approval

### Test 5: Permissive Strategy

**Objective**: Test flexible adaptation

1. **Make the same changes** as in Test 1

2. **Click "Resolve Drift with AI"**

3. **Select "Permissive" strategy**

4. **Apply resolution**

5. **Expected Result**:
   - ✅ Most changes kept
   - ✅ New stakeholder retained
   - ⚠️ Only major changes (budget >10%, critical dates) flagged

### Test 6: All 13 Entity Types

**Objective**: Verify drift detection works for all entity types

Test drift detection for each entity type:

1. **Stakeholders** - Add/remove/modify ✅
2. **Risks** - Add/remove/modify ✅
3. **Milestones** - Add/remove/change dates ✅
4. **Requirements** - Add/remove/change priority ✅
5. **Deliverables** - Add/remove/change dates
6. **Constraints** - Add/remove
7. **Assumptions** - Add/remove
8. **Budget** - Increase/decrease amounts
9. **Resources** - Add/remove team members
10. **Tech Stack** - Add/remove technologies
11. **Success Criteria** - Add/remove KPIs
12. **Dependencies** - Add/remove
13. **Scope Boundaries** - Modify inclusions/exclusions

### Test 7: Drift Severity Levels

**Objective**: Verify drift severity calculation

| Drift Type | Severity | Test Scenario |
|------------|----------|---------------|
| **Low** | 1-4 drift points | Add 2 stakeholders, change 1 risk priority |
| **Medium** | 5-9 drift points | Add 3 stakeholders, remove 2 risks, change 2 milestones |
| **High** | 10+ drift points | Major document rewrite affecting 10+ entities |
| **Critical** | Any approval-required drift | Budget increase >10%, critical milestone slip |

### Test 8: End-to-End Workflow

**Complete workflow test:**

1. ✅ Create baseline (baseline exists, status = approved)
2. ✅ Edit document (add 2 stakeholders, remove 1 risk)
3. ✅ Save document → Drift detected automatically
4. ✅ Click "Resolve Drift" → AI analyzes drift
5. ✅ Preview changes → Review AI recommendations
6. ✅ Select strategy → Choose Balanced
7. ✅ Apply resolution → Document updated
8. ✅ Verify drift resolved → No more drift alerts
9. ✅ Check audit log → Resolution logged
10. ✅ Check change requests → Major changes flagged

---

## Verification Checklist

After running tests, verify:

- [ ] **Drift Detection Works**
  - [ ] Drift detected automatically on document save
  - [ ] Drift alert appears immediately
  - [ ] Drift count is accurate
  - [ ] Drift severity calculated correctly

- [ ] **Drift Resolution Works**
  - [ ] "Resolve Drift" button triggers AI analysis
  - [ ] AI analysis completes in < 10 seconds
  - [ ] Resolution preview shows all changes
  - [ ] Side-by-side diff is clear and accurate

- [ ] **Resolution Strategies Work**
  - [ ] Conservative: Reverts all changes
  - [ ] Balanced: Keeps minor, flags major
  - [ ] Permissive: Keeps most changes

- [ ] **Data Integrity**
  - [ ] Applied resolution updates document correctly
  - [ ] Drift record marked as resolved
  - [ ] Audit log created
  - [ ] Change requests created for major changes

- [ ] **User Experience**
  - [ ] UI is responsive and intuitive
  - [ ] Error messages are clear
  - [ ] Loading states shown during AI processing
  - [ ] Success/error notifications work

---

## Troubleshooting

### Issue: "No active baseline found"

**Solution**: Create and approve a baseline first
```bash
npm run create-test-baseline <PROJECT_ID>
```

### Issue: "Drift detection not working"

**Checks**:
1. Verify baseline status is 'approved' or 'active'
2. Check database: `SELECT * FROM project_baselines WHERE project_id = '<PROJECT_ID>'`
3. Verify drift detection is enabled in project settings
4. Check server logs for errors

### Issue: "AI resolution fails"

**Checks**:
1. Verify AI provider API key is configured
2. Check AI provider has sufficient quota/credits
3. Review server logs for AI API errors
4. Try switching to different AI provider

### Issue: "Resolution doesn't apply changes"

**Checks**:
1. Verify user has permission to edit documents
2. Check database for transaction errors
3. Verify document is not locked by another user
4. Review audit logs for failed operations

---

## Database Queries for Verification

### Check Baseline Status
```sql
SELECT 
  id, version, status, approved_at,
  extraction_confidence, completeness_score
FROM project_baselines
WHERE project_id = '<PROJECT_ID>'
ORDER BY created_at DESC;
```

### Check Detected Drifts
```sql
SELECT 
  id, detection_type, drift_severity, 
  drift_description, status, created_at
FROM baseline_drift_detection
WHERE project_id = '<PROJECT_ID>'
ORDER BY created_at DESC
LIMIT 10;
```

### Check Baseline Components
```sql
SELECT 
  component_type, COUNT(*) as count
FROM baseline_components bc
JOIN project_baselines pb ON bc.baseline_id = pb.id
WHERE pb.project_id = '<PROJECT_ID>'
  AND pb.status = 'approved'
GROUP BY component_type
ORDER BY component_type;
```

### Check Audit Trail
```sql
SELECT 
  action, resource_type, details, created_at
FROM audit_logs
WHERE details::jsonb @> '{"driftRecordId": "<DRIFT_ID>"}'
ORDER BY created_at DESC;
```

---

## Performance Benchmarks

Expected performance metrics:

| Operation | Target | Acceptable | Notes |
|-----------|--------|-----------|-------|
| **Baseline Creation** | < 30s | < 60s | Depends on document count and AI provider |
| **Drift Detection** | < 2s | < 5s | Per document save |
| **AI Resolution Analysis** | < 5s | < 10s | Depends on drift complexity |
| **Apply Resolution** | < 1s | < 3s | Database update only |

---

## Next Steps

After completing manual testing:

1. **Document Issues**: Report any bugs or unexpected behavior
2. **Automated Tests**: Convert manual tests to automated E2E tests
3. **User Acceptance**: Get stakeholder sign-off
4. **Production Deployment**: Deploy to production environment

---

## Related Documentation

- [DRIFT_AUTO_RESOLUTION_FEATURE.md](../roadmap/DRIFT_AUTO_RESOLUTION_FEATURE.md) - Feature specification
- [CR-2026-001_Baseline_Drift_Detection.md](../roadmap/change-requests/CR-2026-001_Baseline_Drift_Detection.md) - Change request
- [BASELINE_DRIFT_DETECTION_TEST_PLAN.md](../06-features/BASELINE_DRIFT_DETECTION_TEST_PLAN.md) - Detailed test plan

---

**Questions or Issues?**
- Check server logs: `server/logs/combined.log`
- Review API documentation: `http://localhost:5000/api-docs`
- Contact: Development Team

---

*This guide is part of TASK-716: Create baseline for drift resolution testing*
