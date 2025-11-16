# TASK-1129: Regular Review Cadence (Monthly/Quarterly)

**Issue**: #406  
**Task ID**: TASK-1129  
**Status**: 🟡 **PLANNED - NOT YET IMPLEMENTED**  
**Priority**: Medium  
**Source**: PMI_COMPLETE_DOMAIN_MAPPING.md  
**Last Updated**: October 29, 2025

---

## Summary

Regular review cadence system for portfolio/program performance reviews is **planned but NOT implemented**. The system requires automated scheduling, tracking, and workflow for monthly/quarterly portfolio and program reviews as required by PMI Portfolio Performance Management standards.

**PMI Compliance**: The PMI validation criterion "Regular review cadence (monthly/quarterly)" requires a **formal review scheduling and tracking system**, which is **NOT YET IMPLEMENTED**.

---

## Current Status

### ✅ **Related Features Exist** (Partial Foundation - 20% Complete)

1. **Document Review Workflow** (✅ Functional):
   - ✅ Document review status tracking (`under_review`, `reviewed`, `published`)
   - ✅ Review queue management
   - ✅ Document review workflow exists
   - ⚠️ **NOT** for portfolio/program performance reviews

2. **Baseline Approval Workflow** (✅ Functional):
   - ✅ Baseline review and approval process
   - ✅ Review scheduling mentioned in documentation
   - ⚠️ **NOT** for regular portfolio/program reviews

3. **iBabs Integration** (✅ Functional):
   - ✅ Auto-scheduling for board reports (weekly)
   - ✅ Meeting detection and report generation
   - ⚠️ **NOT** for portfolio/program performance reviews

4. **Audit Logging** (✅ Functional):
   - ✅ `audit_logs` table exists
   - ✅ Action tracking and audit trail
   - ⚠️ **NOT** specifically for review cadence tracking

### ❌ **Not Implemented** (80% Remaining)

1. **Review Scheduling System**:
   - ❌ No `portfolio_reviews` table
   - ❌ No `program_reviews` table
   - ❌ No review schedule configuration
   - ❌ No automated review reminders
   - ❌ No review calendar integration

2. **Review Workflow**:
   - ❌ No review meeting creation workflow
   - ❌ No review agenda generation
   - ❌ No review decision tracking
   - ❌ No review action item tracking
   - ❌ No review completion tracking

3. **Review Reporting**:
   - ❌ No review history tracking
   - ❌ No review cadence compliance reporting
   - ❌ No missed review alerts
   - ❌ No review effectiveness metrics

4. **API Endpoints**:
   - ❌ No `/api/portfolio/reviews` endpoint
   - ❌ No `/api/programs/:id/reviews` endpoint
   - ❌ No `/api/reviews/schedule` endpoint
   - ❌ No `/api/reviews/reminders` endpoint

5. **UI Components**:
   - ❌ No review calendar view
   - ❌ No review scheduling interface
   - ❌ No review dashboard
   - ❌ No review history view
   - ❌ No review compliance dashboard

---

## PMI Requirement Analysis

### **PMI Domain 3: Portfolio Performance Management**

**Validation Checklist Item**: "Regular review cadence (monthly/quarterly)"

**PMI Definition**: 
- Portfolio performance reviews should be conducted on a regular, scheduled basis
- Reviews should be monthly (for active portfolios) or quarterly (for stable portfolios)
- Review cadence should be documented and tracked
- Review attendance and decisions should be recorded

**Required Features**:
1. **Review Schedule Configuration**:
   - Set review frequency (monthly/quarterly)
   - Configure review dates
   - Set review participants
   - Define review agenda template

2. **Review Tracking**:
   - Track review dates (scheduled vs actual)
   - Track review attendance
   - Track review decisions
   - Track review action items

3. **Review Compliance**:
   - Alert on missed reviews
   - Track review cadence adherence
   - Report on review history
   - Identify overdue reviews

4. **Review Workflow**:
   - Create review meetings
   - Generate review agendas
   - Capture review decisions
   - Track action items from reviews

---

## Evidence from Codebase

### 1. Roadmap References

**`docs/roadmap/PMI_COMPLETE_DOMAIN_MAPPING.md`** (Line 127):
```
- [ ] Regular review cadence (monthly/quarterly)
```

**Status**: Validation checklist item, **NOT CHECKED** (not implemented)

**`docs/roadmap/PMI_COMPLETE_DOMAIN_MAPPING.md`** (Line 119):
```
| Portfolio reviews | Review workflow | Meeting tracker | 📋 Phase 4 | P1 |
```

**Status**: Planned for Phase 4, **NOT YET IMPLEMENTED**

**`docs/roadmap/PORTFOLIO_TASKS_IMPLEMENTATION_MATRIX.md`** (Line 312):
```
| Schedule reviews | Meeting scheduler | 📋 Phase 5A |
```

**Status**: Planned for Phase 5A, **NOT YET IMPLEMENTED**

### 2. Related Features (NOT the Same)

**Document Review Workflow** (`docs/06-features/DOCUMENT_REVIEW_WORKFLOW.md`):
- ✅ Exists for document reviews
- ❌ **NOT** for portfolio/program performance reviews
- ❌ **NOT** scheduled/automated reviews
- ❌ **NOT** cadence tracking

**Baseline Approval Workflow** (`docs/06-features/BASELINE_APPROVAL_WORKFLOW.md`):
- ✅ Exists for baseline approvals
- ❌ **NOT** for regular portfolio/program reviews
- ❌ **NOT** scheduled reviews
- ❌ **NOT** cadence tracking

**iBabs Auto-Scheduling** (`server/src/services/ibabsUploadService.ts`):
- ✅ Exists for board report generation
- ❌ **NOT** for portfolio/program reviews
- ❌ **NOT** review scheduling/tracking
- ❌ **NOT** cadence compliance

### 3. Database Tables

**Search Result**: No review scheduling tables found
- ❌ No `portfolio_reviews` table
- ❌ No `program_reviews` table
- ❌ No `review_schedules` table
- ❌ No `review_meetings` table
- ❌ No `review_decisions` table

**Finding**: Database schema not implemented.

### 4. API Routes

**Search Result**: No review scheduling routes found
- ❌ No routes matching `review.*schedule` or `review.*cadence` patterns
- ❌ No endpoints in `server/src/routes` for review scheduling

**Finding**: API endpoints not implemented.

---

## Planned Implementation

### Database Schema (Designed, Not Implemented)

Based on PMI requirements and roadmap:

```sql
-- Portfolio/Program Review Schedule
CREATE TABLE review_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID REFERENCES portfolios(id),
  program_id UUID REFERENCES programs(id),
  
  -- Schedule Configuration
  review_type VARCHAR(50),  -- 'portfolio_performance', 'program_performance', 'strategic', 'governance'
  frequency VARCHAR(20),     -- 'monthly', 'quarterly', 'bi-annually', 'annually'
  day_of_month INTEGER,      -- e.g., 1 (first Monday), 15 (mid-month)
  day_of_week VARCHAR(10),   -- 'monday', 'tuesday', etc.
  
  -- Participants
  required_attendees UUID[], -- User IDs
  optional_attendees UUID[],
  review_owner_id UUID REFERENCES users(id),
  
  -- Configuration
  agenda_template_id UUID,
  duration_minutes INTEGER DEFAULT 60,
  auto_generate_agenda BOOLEAN DEFAULT TRUE,
  send_reminders BOOLEAN DEFAULT TRUE,
  reminder_days_before INTEGER[] DEFAULT ARRAY[7, 1], -- 7 days and 1 day before
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Review Meetings (Actual Reviews)
CREATE TABLE review_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES review_schedules(id),
  portfolio_id UUID REFERENCES portfolios(id),
  program_id UUID REFERENCES programs(id),
  
  -- Meeting Details
  scheduled_date DATE NOT NULL,
  actual_date DATE,
  start_time TIME,
  end_time TIME,
  duration_minutes INTEGER,
  
  -- Status
  status VARCHAR(50),  -- 'scheduled', 'in-progress', 'completed', 'cancelled', 'postponed'
  
  -- Attendance
  attendees UUID[],    -- User IDs who attended
  absentees UUID[],    -- User IDs who were absent
  
  -- Outcomes
  decisions JSONB,     -- Review decisions made
  action_items JSONB,  -- Action items from review
  notes TEXT,
  
  -- Compliance
  was_on_time BOOLEAN, -- Was review held on scheduled date?
  was_complete BOOLEAN, -- Were all agenda items covered?
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Review Decisions
CREATE TABLE review_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_meeting_id UUID REFERENCES review_meetings(id),
  
  -- Decision Details
  decision_type VARCHAR(50),  -- 'approve', 'reject', 'defer', 'modify', 'escalate'
  decision_text TEXT,
  affected_projects UUID[],
  affected_programs UUID[],
  
  -- Approval
  approved_by UUID REFERENCES users(id),
  approval_date TIMESTAMP,
  
  -- Implementation
  implementation_deadline DATE,
  implementation_status VARCHAR(50), -- 'pending', 'in-progress', 'completed'
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Review Action Items
CREATE TABLE review_action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_meeting_id UUID REFERENCES review_meetings(id),
  
  -- Action Details
  action_text TEXT NOT NULL,
  assigned_to UUID REFERENCES users(id),
  due_date DATE,
  
  -- Status
  status VARCHAR(50),  -- 'open', 'in-progress', 'completed', 'cancelled'
  completed_at TIMESTAMP,
  completed_by UUID REFERENCES users(id),
  
  -- Tracking
  priority VARCHAR(20), -- 'high', 'medium', 'low'
  related_project_id UUID REFERENCES projects(id),
  related_program_id UUID REFERENCES programs(id),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Review Cadence Compliance View
CREATE VIEW review_cadence_compliance AS
SELECT 
  rs.id as schedule_id,
  rs.portfolio_id,
  rs.program_id,
  rs.review_type,
  rs.frequency,
  COUNT(rm.id) as total_reviews_held,
  COUNT(rm.id) FILTER (WHERE rm.was_on_time = TRUE) as on_time_reviews,
  COUNT(rm.id) FILTER (WHERE rm.status = 'completed') as completed_reviews,
  MAX(rm.actual_date) as last_review_date,
  CASE 
    WHEN rs.frequency = 'monthly' THEN MAX(rm.actual_date) + INTERVAL '1 month'
    WHEN rs.frequency = 'quarterly' THEN MAX(rm.actual_date) + INTERVAL '3 months'
    ELSE NULL
  END as next_review_due_date,
  CASE 
    WHEN rs.frequency = 'monthly' AND MAX(rm.actual_date) < NOW() - INTERVAL '1 month' THEN 'overdue'
    WHEN rs.frequency = 'quarterly' AND MAX(rm.actual_date) < NOW() - INTERVAL '3 months' THEN 'overdue'
    WHEN rs.frequency = 'monthly' AND MAX(rm.actual_date) >= NOW() - INTERVAL '1 month' THEN 'on-track'
    WHEN rs.frequency = 'quarterly' AND MAX(rm.actual_date) >= NOW() - INTERVAL '3 months' THEN 'on-track'
    ELSE 'no-reviews'
  END as compliance_status
FROM review_schedules rs
LEFT JOIN review_meetings rm ON rs.id = rm.schedule_id
WHERE rs.is_active = TRUE
GROUP BY rs.id, rs.portfolio_id, rs.program_id, rs.review_type, rs.frequency;
```

### API Endpoints (Designed, Not Implemented)

```
GET    /api/portfolio/:id/reviews/schedule          # Get review schedule
POST   /api/portfolio/:id/reviews/schedule          # Create/update schedule
GET    /api/portfolio/:id/reviews                   # List review meetings
POST   /api/portfolio/:id/reviews                   # Create review meeting
GET    /api/portfolio/:id/reviews/:meetingId        # Get review details
PUT    /api/portfolio/:id/reviews/:meetingId        # Update review
POST   /api/portfolio/:id/reviews/:meetingId/decisions  # Record decision
POST   /api/portfolio/:id/reviews/:meetingId/action-items  # Add action item
GET    /api/portfolio/:id/reviews/compliance        # Get compliance status

GET    /api/programs/:id/reviews/schedule           # Get review schedule
POST   /api/programs/:id/reviews/schedule           # Create/update schedule
GET    /api/programs/:id/reviews                    # List review meetings
POST   /api/programs/:id/reviews                    # Create review meeting
GET    /api/programs/:id/reviews/compliance         # Get compliance status

GET    /api/reviews/upcoming                        # Get upcoming reviews
GET    /api/reviews/overdue                         # Get overdue reviews
POST   /api/reviews/reminders                       # Send reminders
```

### UI Pages (Designed, Not Implemented)

```
/portfolio/:id/reviews
  ├─ Review Schedule Configuration
  ├─ Review Calendar View
  ├─ Review History
  ├─ Review Compliance Dashboard
  └─ Review Meeting Details

/programs/:id/reviews
  ├─ Review Schedule Configuration
  ├─ Review Calendar View
  ├─ Review History
  ├─ Review Compliance Dashboard
  └─ Review Meeting Details

/admin/reviews
  ├─ All Reviews Dashboard
  ├─ Compliance Report
  ├─ Overdue Reviews Alert
  └─ Review Analytics
```

---

## Acceptance Criteria Status

### ❌ Task Implementation Complete
- [ ] Review scheduling system implemented
- [ ] Review calendar functionality working
- [ ] Review reminders automated
- [ ] Review tracking functional
- [ ] Review compliance reporting working
- [ ] Review workflow functional
- [ ] Review decision tracking working
- [ ] Review action item tracking working

### ❌ Tests Written and Passing
- [ ] Unit tests for review scheduling service
- [ ] Integration tests for review API endpoints
- [ ] E2E tests for review workflow
- [ ] Tests for review compliance calculation

### ✅ Documentation Updated
- [x] Design documentation exists (roadmap references)
- [x] PMI requirement documented
- [x] Status document created (this document)
- [ ] User guide for review scheduling (not created)
- [ ] API documentation (not created)

### ❌ Code Reviewed and Approved
- [ ] Implementation code reviewed (not implemented)
- [ ] Database schema reviewed (not implemented)
- [ ] API design reviewed (not implemented)

---

## Implementation Timeline

According to `PMI_COMPLETE_DOMAIN_MAPPING.md`:

**Phase 4: Advanced Features** (Weeks 5-8)
- Week 6: Stakeholder & Governance
  - [ ] Governance board
  - [ ] Decision log
  - [ ] **Review scheduling** (mentioned but not detailed)

**Phase 5A: Communication & Reporting** (Week 8+)
- [ ] Communication center
- [ ] Report builder
- [ ] **Meeting scheduler** (mentioned)

**Status**: Not yet started (planned for Phase 4-5A)

---

## PMI Validation Criterion Assessment

**Criterion**: "Regular review cadence (monthly/quarterly)"

**Current Status**: ❌ **NON-COMPLIANT**

**What Exists**:
- ✅ Document review workflow (different purpose)
- ✅ Baseline approval workflow (different purpose)
- ✅ Audit logging (general purpose)
- ✅ iBabs auto-scheduling (different purpose)

**What's Missing** (Required for PMI Compliance):
- ❌ Portfolio/program review scheduling system
- ❌ Review cadence configuration (monthly/quarterly)
- ❌ Review calendar and tracking
- ❌ Automated review reminders
- ❌ Review compliance reporting
- ❌ Review meeting workflow
- ❌ Review decision tracking
- ❌ Review action item tracking

**PMI Compliance Score**: **0%** (No dedicated review cadence system exists)

---

## Recommendation

### Current Status: 🟡 **PLANNED - NOT COMPLETE**

**Action Required**:
1. **Do NOT close issue #406** - Implementation not complete
2. **Update task status** to "In Progress" when implementation begins
3. **Follow implementation plan** in roadmap (Phase 4-5A)
4. **Start with review scheduling foundation** (database schema + basic API)

### Next Steps to Complete

1. **Database Implementation**:
   - Create migrations for review scheduling tables
   - Implement indexes and constraints
   - Add seed data for testing

2. **Backend Implementation**:
   - Create review scheduling service (`reviewSchedulingService.ts`)
   - Implement API routes (`reviewRoutes.ts`)
   - Add review reminder automation
   - Add review compliance calculation

3. **Frontend Implementation**:
   - Create review schedule configuration UI
   - Create review calendar component
   - Create review dashboard
   - Create review meeting interface

4. **Testing**:
   - Write unit tests
   - Write integration tests
   - Write E2E tests

5. **Documentation**:
   - Update user guide
   - Create API documentation
   - Update completion status

---

## Related Documentation

- **Roadmap**: `docs/roadmap/PMI_COMPLETE_DOMAIN_MAPPING.md`
- **Portfolio Tasks**: `docs/roadmap/PORTFOLIO_TASKS_IMPLEMENTATION_MATRIX.md`
- **Document Review**: `docs/06-features/DOCUMENT_REVIEW_WORKFLOW.md`
- **Baseline Approval**: `docs/06-features/BASELINE_APPROVAL_WORKFLOW.md`

---

## Conclusion

**Task Status**: 🟡 **PLANNED - NOT YET IMPLEMENTED**

The regular review cadence system for portfolio/program performance reviews is **NOT implemented**. While related features exist (document reviews, baseline approvals, iBabs scheduling), there is **NO dedicated system** for scheduling, tracking, and managing regular portfolio/program performance reviews as required by PMI standards.

**Recommendation**: Keep issue #406 **OPEN** until implementation is complete. This is a **critical PMI compliance requirement** that must be implemented for Portfolio Performance Management domain validation.

---

**Last Updated**: October 29, 2025  
**Status**: 🟡 **PLANNED - AWAITING IMPLEMENTATION**

