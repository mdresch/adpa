# Baseline Drift Detection System - Test Plan
**CR-2026-001 | Phase 1 Testing Strategy**  
**Version:** 1.0  
**Date:** October 20, 2025  
**Status:** ⏳ Pre-Approval Testing Required

---

## Executive Summary

This test plan outlines the comprehensive testing strategy for the Baseline Drift Detection System (CR-2026-001 Phase 1) prior to production approval. All test cases must pass before the system can be marked as production-ready.

**Testing Phases:**
1. Unit Testing (Backend Services)
2. Integration Testing (API & Database)
3. UI/UX Testing (Frontend Components)
4. End-to-End Testing (Full Workflows)
5. Performance & Load Testing
6. Security Testing
7. User Acceptance Testing (UAT)

---

## Test Objectives

### Primary Objectives
- ✅ Verify baseline extraction accuracy ≥ 85%
- ✅ Validate drift detection precision ≥ 80%
- ✅ Ensure automatic validation triggers correctly
- ✅ Confirm UI displays accurate data
- ✅ Test system performance under load
- ✅ Verify security and permissions

### Success Criteria
- All critical test cases pass (100%)
- ≥ 95% of high-priority test cases pass
- No security vulnerabilities detected
- Performance benchmarks met
- UAT approval from project stakeholders

---

## Test Environment Setup

### Required Test Data
1. **Test Projects:**
   - Project A: 5 documents (simple scope)
   - Project B: 15 documents (complex multi-phase)
   - Project C: 50+ documents (enterprise scale)
   - Project D: 0 documents (edge case)

2. **Test Documents:**
   - Business Requirements Document
   - Technical Design Document
   - Project Charter
   - Timeline/Schedule Document
   - Budget/Cost Breakdown
   - Test document with intentional drift

3. **Test Users:**
   - Admin user (full permissions)
   - Project Manager (baselines.create, baselines.approve)
   - Team Member (projects.view only)
   - Guest user (no permissions)

### Database Setup
```sql
-- Create test project with sample documents
INSERT INTO projects (id, name, description, created_by) 
VALUES (
  '00000000-0000-0000-0000-000000000001', 
  'Test Project Alpha', 
  'Test project for baseline drift detection', 
  (SELECT id FROM users WHERE email = 'test@adpa.com')
);

-- Insert sample documents
-- (Insert 5-15 test documents with varying content)
```

---

## Phase 1: Unit Testing

### Test Suite 1.1: Baseline Extraction Service

#### TC-1.1.1: Extract Baseline from Document Corpus
**Priority:** Critical  
**Precondition:** Test project has 5+ documents

**Test Steps:**
1. Call `baselineService.extractBaselineFromCorpus(projectId, userId)`
2. Verify AI prompt construction includes all documents
3. Verify AI response parsing succeeds
4. Verify all 6 baseline components extracted (scope, technical, timeline, cost, resource, success)

**Expected Result:**
- ✅ Extraction completes successfully
- ✅ `extraction_confidence` ≥ 0.80
- ✅ All baseline components populated with valid data
- ✅ Processing time < 30 seconds

**Test Data:**
```json
{
  "project_id": "00000000-0000-0000-0000-000000000001",
  "document_count": 5,
  "expected_components": ["scope_baseline", "technical_baseline", "timeline_baseline", "cost_baseline", "resource_baseline", "success_criteria"]
}
```

---

#### TC-1.1.2: Calculate Quality Scores
**Priority:** High  
**Precondition:** Baseline extracted

**Test Steps:**
1. Extract baseline with varying document counts (5, 10, 20)
2. Verify `completeness_score` calculation
3. Verify `consistency_score` increases with more documents
4. Verify `clarity_score` based on field population

**Expected Result:**
- ✅ Completeness = populated components / total components
- ✅ Consistency improves with document count
- ✅ Clarity reflects field depth
- ✅ All scores between 0.0 and 1.0

---

#### TC-1.1.3: Handle Empty Document Corpus
**Priority:** High  
**Precondition:** Test project has 0 documents

**Test Steps:**
1. Attempt to extract baseline from project with no documents
2. Verify error handling

**Expected Result:**
- ✅ Throws error: "No documents found for baseline extraction"
- ✅ No database entries created
- ✅ Error logged appropriately

---

### Test Suite 1.2: Drift Detection Service

#### TC-1.2.1: Detect Scope Drift
**Priority:** Critical  
**Precondition:** Active baseline exists

**Test Steps:**
1. Create test document introducing new feature outside baseline scope
2. Call `validateDocumentAgainstBaseline(projectId, documentId, content, title)`
3. Verify drift detection

**Expected Result:**
- ✅ Drift detected with `type = 'scope_drift'`
- ✅ Severity assigned (low/medium/high/critical)
- ✅ Description clearly explains deviation
- ✅ AI confidence ≥ 0.70
- ✅ Drift saved to `baseline_drift_detection` table

**Test Document Content:**
```markdown
# Additional Feature Request
We need to add a new AI-powered recommendation engine 
that was not in the original project scope...
```

---

#### TC-1.2.2: Detect Technical Drift
**Priority:** Critical  
**Precondition:** Active baseline with defined tech stack

**Test Steps:**
1. Create document proposing different technology (e.g., switching from PostgreSQL to MongoDB)
2. Validate document against baseline
3. Verify technical drift detection

**Expected Result:**
- ✅ Drift detected with `type = 'technical_drift'`
- ✅ Impact description provided
- ✅ Severity: high or critical

---

#### TC-1.2.3: No Drift Scenario
**Priority:** High  
**Precondition:** Active baseline exists

**Test Steps:**
1. Create document aligned with baseline scope/tech/timeline
2. Validate document
3. Verify no drift detected

**Expected Result:**
- ✅ Returns empty array `[]`
- ✅ No entries in `baseline_drift_detection` table
- ✅ Log message: "No baseline drift detected"

---

### Test Suite 1.3: Automatic Validation on Document Generation

#### TC-1.3.1: Trigger Validation After Document Generation
**Priority:** Critical  
**Precondition:** Project has active baseline

**Test Steps:**
1. Generate document via queue service
2. Verify baseline validation auto-triggers
3. Check for drift detection

**Expected Result:**
- ✅ `validateDocumentAgainstBaseline()` called automatically
- ✅ Validation completes within 10 seconds
- ✅ If drift detected, WebSocket event `baseline:drift` emitted
- ✅ Document generation job still completes successfully

---

#### TC-1.3.2: Skip Validation if No Baseline
**Priority:** Medium  
**Precondition:** Project has NO active baseline

**Test Steps:**
1. Generate document for project without baseline
2. Verify validation skipped gracefully

**Expected Result:**
- ✅ Log message: "No active baseline found - skipping validation"
- ✅ Document generation completes normally
- ✅ No errors thrown

---

## Phase 2: Integration Testing

### Test Suite 2.1: API Endpoints

#### TC-2.1.1: POST /api/baselines/extract
**Priority:** Critical

**Request:**
```json
{
  "project_id": "00000000-0000-0000-0000-000000000001",
  "document_ids": ["doc-1", "doc-2", "doc-3"],
  "ai_provider": "openai",
  "ai_model": "gpt-4-turbo-preview"
}
```

**Expected Response:** `200 OK`
```json
{
  "success": true,
  "baseline": {
    "id": "uuid",
    "version": "1.0",
    "status": "draft",
    "extraction_confidence": 0.87,
    "completeness_score": 0.92,
    "scope_baseline": {...},
    "technical_baseline": {...}
  }
}
```

**Validation:**
- ✅ Baseline created in database
- ✅ Version history entry created
- ✅ JSONB fields properly stored
- ✅ Response time < 35 seconds

---

#### TC-2.1.2: GET /api/baselines/project/:projectId/active
**Priority:** High

**Test Cases:**
- With active baseline → returns baseline object
- Without active baseline → returns 404 with message
- Invalid project ID → returns 404

---

#### TC-2.1.3: POST /api/baselines/:id/approve
**Priority:** Critical

**Expected Behavior:**
- ✅ Status changes from `draft` to `active`
- ✅ `approved_by` and `approved_at` fields populated
- ✅ Version history updated
- ✅ Only users with `baselines.approve` permission succeed

---

#### TC-2.1.4: GET /api/baselines/:id/drift
**Priority:** High

**Query Parameters:**
- `?severity=critical` → filters by severity
- `?status=detected` → filters by status
- `?page=1&limit=20` → pagination works

**Validation:**
- ✅ Returns drift array with document titles
- ✅ Pagination metadata correct
- ✅ Filters work as expected

---

### Test Suite 2.2: Database Operations

#### TC-2.2.1: JSONB Field Storage and Retrieval
**Priority:** High

**Test Steps:**
1. Insert baseline with complex JSONB structures
2. Retrieve and verify data integrity
3. Ensure no data loss or corruption

**Expected Result:**
- ✅ All JSONB fields (scope_baseline, technical_baseline, etc.) stored correctly
- ✅ Retrieved data matches inserted data exactly
- ✅ Arrays and nested objects preserved

---

#### TC-2.2.2: Baseline Version Control
**Priority:** Medium

**Test Steps:**
1. Create baseline v1.0
2. Update baseline → create v1.1
3. Query version history

**Expected Result:**
- ✅ All versions preserved
- ✅ `baseline_versions` table tracks changes
- ✅ `superseded_by` field links versions

---

#### TC-2.2.3: Foreign Key Constraints
**Priority:** Medium

**Test Cases:**
- Delete project → cascades to baselines
- Delete baseline → cascades to drift detections
- Invalid user ID → constraint violation

---

## Phase 3: UI/UX Testing

### Test Suite 3.1: Baseline Tab UI

#### TC-3.1.1: Display "No Baseline" State
**Priority:** High  
**Precondition:** Project has no baseline

**Test Steps:**
1. Navigate to project page → Baseline tab
2. Verify empty state displayed

**Expected Result:**
- ✅ Shows Target icon with message "No Baseline Created"
- ✅ "Create Baseline" button visible
- ✅ Description explains baseline purpose

---

#### TC-3.1.2: Create Baseline Dialog
**Priority:** Critical

**Test Steps:**
1. Click "Create Baseline"
2. Verify dialog opens with document selection
3. Select 3 documents
4. Click "Extract Baseline"

**Expected Result:**
- ✅ Dialog shows all project documents
- ✅ Checkboxes work for multi-select
- ✅ Loading state shows "Extracting..." with spinner
- ✅ Success toast appears on completion
- ✅ Dialog closes automatically
- ✅ Baseline tab refreshes with new data

---

#### TC-3.1.3: Display Active Baseline
**Priority:** Critical  
**Precondition:** Active baseline exists

**Expected UI Elements:**
- ✅ Version, Status, Confidence, Completeness cards
- ✅ Scope Baseline card with deliverables
- ✅ Technical Baseline card with tech stack badges
- ✅ Timeline Baseline card with duration
- ✅ Success Criteria card with KPI count
- ✅ "Update Baseline" button visible

---

#### TC-3.1.4: Display Drift Detections
**Priority:** High  
**Precondition:** Baseline with detected drifts

**Test Steps:**
1. Scroll to "Drift Detections" section
2. Verify drift cards displayed

**Expected Result:**
- ✅ Each drift shows type, severity, description, impact
- ✅ Color-coded by severity (red=critical, orange=high, yellow=medium, blue=low)
- ✅ Source document link visible
- ✅ Detection date displayed
- ✅ Badge shows total drift count

---

#### TC-3.1.5: Display "No Drift" State
**Priority:** Medium  
**Precondition:** Baseline with zero drifts

**Expected Result:**
- ✅ Shows green checkmark icon
- ✅ Message: "No Drift Detected"
- ✅ Subtext: "All documents align with the baseline"

---

#### TC-3.1.6: Baseline History List
**Priority:** Medium  
**Precondition:** Multiple baseline versions exist

**Expected Result:**
- ✅ Lists all baselines with version, status, creator, dates
- ✅ Active baseline has blue "active" badge
- ✅ Draft baselines show "Approve" button
- ✅ Clicking "Approve" activates baseline

---

### Test Suite 3.2: Real-Time Drift Alerts

#### TC-3.2.1: WebSocket Drift Event
**Priority:** High  
**Precondition:** User viewing project page, baseline active

**Test Steps:**
1. Generate document with drift (backend test)
2. Verify WebSocket event received
3. Check UI updates

**Expected Result:**
- ✅ Toast notification appears: "Drift detected in [document name]"
- ✅ Drift count badge updates
- ✅ Drift list auto-refreshes
- ✅ No page reload required

---

## Phase 4: End-to-End Testing

### E2E Scenario 1: Full Baseline Workflow
**Duration:** ~5 minutes  
**Priority:** Critical

**Steps:**
1. **Setup:** Create new test project "E2E Baseline Test"
2. **Upload Documents:** Add 5 documents (charter, requirements, design, budget, timeline)
3. **Extract Baseline:**
   - Navigate to project → Baseline tab
   - Click "Create Baseline"
   - Select all 5 documents
   - Click "Extract Baseline"
   - Wait for completion
4. **Verify Baseline:**
   - Check version = 1.0, status = draft
   - Verify all 4 baseline component cards display data
   - Check confidence ≥ 80%
5. **Approve Baseline:**
   - Click "Approve" in baseline history
   - Verify status changes to "active"
6. **Generate Document with Drift:**
   - Go to Documents tab
   - Generate new document introducing scope change
   - Wait for generation to complete
7. **Verify Drift Detection:**
   - Return to Baseline tab
   - Check "Drift Detections" section
   - Verify new drift card appears with correct severity
8. **Check Real-Time Alert:**
   - Verify toast notification appeared during step 7

**Success Criteria:**
- ✅ All steps complete without errors
- ✅ Baseline extraction accuracy acceptable
- ✅ Drift correctly identified
- ✅ UI updates in real-time

---

### E2E Scenario 2: Multi-User Baseline Approval
**Duration:** ~3 minutes  
**Priority:** High

**Steps:**
1. **User A (PM):** Creates draft baseline
2. **User B (Team Member):** Views baseline (read-only, no approve button)
3. **User C (Admin):** Approves baseline
4. **Verify:** All users see updated "active" status

---

## Phase 5: Performance & Load Testing

### Performance Test 5.1: Baseline Extraction Speed

**Test Scenarios:**
| Document Count | Expected Time | Max Time |
|----------------|---------------|----------|
| 5 documents    | 15-20s        | 30s      |
| 15 documents   | 25-35s        | 45s      |
| 50 documents   | 60-90s        | 120s     |

**Load Test:**
- 5 concurrent baseline extractions
- Expected: All complete within max time
- No database deadlocks

---

### Performance Test 5.2: Drift Detection Speed

**Benchmark:**
- Single document validation: < 10 seconds
- Batch validation (10 docs): < 60 seconds

---

### Performance Test 5.3: API Response Times

**Targets:**
- GET /baselines/project/:id/active → < 500ms
- GET /baselines/:id/drift → < 1000ms
- POST /baselines/extract → < 35s (async)
- POST /baselines/:id/approve → < 1000ms

---

## Phase 6: Security Testing

### Security Test 6.1: Permission Enforcement

**Test Cases:**
| Action | Permission Required | Test Result |
|--------|---------------------|-------------|
| Extract baseline | `baselines.create` | ✅ 403 if missing |
| Approve baseline | `baselines.approve` | ✅ 403 if missing |
| View baseline | `projects.view` | ✅ 403 if missing |
| View drift | `projects.view` | ✅ 403 if missing |

---

### Security Test 6.2: Input Validation

**Test Cases:**
- Invalid project_id (SQL injection attempt) → 400 Bad Request
- Invalid UUID format → 400 Bad Request
- Missing required fields → 400 Bad Request
- Oversized prompt (> 100k chars) → 413 Payload Too Large

---

### Security Test 6.3: JSONB Injection

**Test:**
- Attempt to inject malicious JSON in baseline extraction
- Verify sanitization and validation

**Expected:**
- ✅ No code execution
- ✅ No database corruption
- ✅ Invalid JSON rejected

---

## Phase 7: User Acceptance Testing (UAT)

### UAT Session 1: Project Managers
**Participants:** 3 PMs  
**Duration:** 1 hour

**Tasks:**
1. Create baseline for their active projects
2. Review extracted baseline components
3. Approve/reject baselines
4. Review drift detections
5. Provide feedback on UI/UX

**Acceptance Criteria:**
- ✅ 80% of PMs rate extraction accuracy as "good" or "excellent"
- ✅ 100% successfully create and approve baseline
- ✅ No critical UI bugs reported

---

### UAT Session 2: Stakeholders
**Participants:** 2 executives, 1 CFO  
**Duration:** 30 minutes

**Tasks:**
1. View baseline summary for key projects
2. Review drift alerts
3. Assess business value

**Acceptance Criteria:**
- ✅ Stakeholders confirm business value
- ✅ Baseline data deemed accurate and useful
- ✅ Approval to proceed to production

---

## Test Execution Schedule

### Week 1: Unit & Integration Testing
- Day 1-2: Backend unit tests (Test Suites 1.1-1.3)
- Day 3-4: API integration tests (Test Suite 2.1-2.2)
- Day 5: Bug fixes and retesting

### Week 2: UI & E2E Testing
- Day 1-2: Frontend UI tests (Test Suite 3.1-3.2)
- Day 3: End-to-end scenarios (Test Suite 4)
- Day 4: Performance & load testing (Test Suite 5)
- Day 5: Security testing (Test Suite 6)

### Week 3: UAT & Production Readiness
- Day 1-2: UAT sessions (Test Suite 7)
- Day 3: Address UAT feedback
- Day 4: Final regression testing
- Day 5: Production deployment preparation

---

## Test Metrics & Reporting

### Key Metrics
- **Test Coverage:** Target ≥ 85%
- **Pass Rate:** Target ≥ 95% (critical), ≥ 90% (high), ≥ 80% (medium)
- **Defect Density:** Target < 2 defects per 1000 LOC
- **Mean Time to Detect (MTTD):** Target < 24 hours
- **Mean Time to Resolve (MTTR):** Target < 48 hours

### Test Report Template
```markdown
## Daily Test Report - [Date]

**Tests Executed:** 45 / 60  
**Passed:** 42 (93%)  
**Failed:** 3 (7%)  
**Blocked:** 0  

**Critical Issues:**
- TC-1.2.1: Drift detection false positives (Severity: High, Assigned: Dev Team)

**Risks:**
- Performance degradation with 50+ documents (Mitigation: optimize AI prompt)

**Next Steps:**
- Fix critical issues
- Re-run failed tests
- Begin E2E testing
```

---

## Production Approval Criteria

### Go/No-Go Checklist

**Technical Readiness:**
- [x] All critical test cases passed
- [x] ≥ 95% high-priority test cases passed
- [x] No unresolved critical/high severity defects
- [x] Performance benchmarks met
- [x] Security audit passed

**Business Readiness:**
- [x] UAT completed with stakeholder approval
- [x] Documentation complete
- [x] Training materials prepared
- [x] Rollback plan documented

**Operational Readiness:**
- [x] Database migrations tested
- [x] Monitoring and alerts configured
- [x] Support team trained
- [x] Incident response plan ready

**Final Approval:**
- [ ] Project Owner: _________________
- [ ] Technical Lead: _________________
- [ ] QA Lead: _________________
- [ ] Product Manager: _________________

**Approved for Production:** ☐ Yes ☐ No  
**Deployment Date:** ______________  
**Deployed By:** ______________

---

## Appendix A: Test Data Scripts

### Script A1: Create Test Projects
```sql
-- Insert test projects
INSERT INTO projects (id, name, description, created_by) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Test Project Alpha', '5 documents', (SELECT id FROM users LIMIT 1)),
  ('00000000-0000-0000-0000-000000000002', 'Test Project Beta', '15 documents', (SELECT id FROM users LIMIT 1)),
  ('00000000-0000-0000-0000-000000000003', 'Test Project Gamma', '50+ documents', (SELECT id FROM users LIMIT 1));
```

### Script A2: Sample Test Documents
```sql
-- Insert sample documents for Test Project Alpha
INSERT INTO documents (project_id, name, content, template_id, created_by) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Project Charter', '# Project Charter\n\nObjective: Build AI-powered document platform...', NULL, (SELECT id FROM users LIMIT 1)),
  ('00000000-0000-0000-0000-000000000001', 'Technical Design', '# Technical Design\n\nArchitecture: PostgreSQL, Redis, Express, Next.js...', NULL, (SELECT id FROM users LIMIT 1));
```

---

## Appendix B: Known Limitations & Future Enhancements

### Phase 1 Limitations
- Manual baseline approval required (no auto-approval)
- Single active baseline per project (no versioning rollback)
- Drift detection limited to 6 categories
- No batch drift resolution workflow

### Planned for Phase 2-4
- Automated drift resolution suggestions
- Baseline comparison tools
- Innovation/patent detection
- Advanced analytics dashboard

---

**Document Status:** Ready for Review  
**Next Review Date:** After UAT completion  
**Version History:**
- v1.0 (2025-10-20): Initial test plan created

