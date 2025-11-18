# TASK-1129: Regular Review Cadence (Monthly/Quarterly)

**Issue**: #406  
**Task ID**: TASK-1129  
**Status**: 🟢 **IMPLEMENTED - BACKEND COMPLETE**  
**Priority**: Medium  
**Source**: PMI_COMPLETE_DOMAIN_MAPPING.md  
**Last Updated**: November 16, 2025

---

## Summary

Regular review cadence system for portfolio/program performance reviews is **IMPLEMENTED** (backend complete). The system provides automated scheduling, tracking, and workflow for monthly/quarterly portfolio and program reviews as required by PMI Portfolio Performance Management standards.

**PMI Compliance**: The PMI validation criterion "Regular review cadence (monthly/quarterly)" requires a **formal review scheduling and tracking system**, which is **NOW IMPLEMENTED** (backend API complete, frontend pending).

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

### ✅ **Implemented** (Backend Complete - 60%)

1. **Review Scheduling System**:
   - ✅ `review_schedules` table created (migration 339)
   - ✅ `review_meetings` table created
   - ✅ `review_decisions` table created
   - ✅ `review_action_items` table created
   - ✅ Review schedule configuration API implemented
   - ⚠️ Automated review reminders (backend ready, job queue pending)
   - ⚠️ Review calendar integration (frontend pending)

2. **Review Workflow**:
   - ✅ Review meeting creation workflow (API complete)
   - ⚠️ Review agenda generation (backend ready, AI integration pending)
   - ✅ Review decision tracking (API complete)
   - ✅ Review action item tracking (API complete)
   - ✅ Review completion tracking (API complete)

3. **Review Reporting**:
   - ✅ Review history tracking (API complete)
   - ✅ Review cadence compliance reporting (view + API)
   - ⚠️ Missed review alerts (backend ready, notification job pending)
   - ⚠️ Review effectiveness metrics (data available, dashboard pending)

4. **API Endpoints**:
   - ✅ `GET/POST /api/programs/:id/reviews/schedule` - Schedule management
   - ✅ `GET/POST /api/programs/:id/reviews` - Review meetings
   - ✅ `GET/PUT /api/programs/:id/reviews/:meetingId` - Meeting details
   - ✅ `POST /api/programs/:id/reviews/:meetingId/decisions` - Decisions
   - ✅ `POST /api/programs/:id/reviews/:meetingId/action-items` - Action items
   - ✅ `GET /api/programs/:id/reviews/compliance` - Compliance status
   - ✅ `GET /api/reviews/upcoming` - Upcoming reviews
   - ✅ `GET /api/reviews/overdue` - Overdue reviews

5. **UI Components**:
   - ⚠️ Review calendar view (frontend pending)
   - ⚠️ Review scheduling interface (frontend pending)
   - ⚠️ Review dashboard (frontend pending)
   - ⚠️ Review history view (frontend pending)
   - ⚠️ Review compliance dashboard (frontend pending)

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

### ✅ Task Implementation Complete (Backend - 60%)
- [x] Review scheduling system implemented (database + API)
- [x] Review tracking functional (API complete)
- [x] Review compliance reporting working (view + API)
- [x] Review workflow functional (API complete)
- [x] Review decision tracking working (API complete)
- [x] Review action item tracking working (API complete)
- [ ] Review calendar functionality working (frontend pending)
- [ ] Review reminders automated (job queue pending)

### ⚠️ Tests Written and Passing (Pending)
- [ ] Unit tests for review scheduling service
- [ ] Integration tests for review API endpoints
- [ ] E2E tests for review workflow
- [ ] Tests for review compliance calculation

### ✅ Documentation Updated
- [x] Design documentation exists (roadmap references)
- [x] PMI requirement documented
- [x] Status document created (this document)
- [x] Database schema documented (migration 339)
- [x] API endpoints documented (reviewRoutes.ts)
- [ ] User guide for review scheduling (pending frontend)
- [ ] API documentation (pending - can be auto-generated)

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

**Current Status**: 🟡 **PARTIALLY COMPLIANT** (Backend Complete, Frontend Pending)

**What Exists**:
- ✅ Portfolio/program review scheduling system (database + API)
- ✅ Review cadence configuration (monthly/quarterly/bi-annually/annually)
- ✅ Review tracking (meetings, decisions, action items)
- ✅ Review compliance reporting (view + API)
- ✅ Review meeting workflow (API complete)
- ✅ Review decision tracking (API complete)
- ✅ Review action item tracking (API complete)
- ⚠️ Review calendar UI (frontend pending)
- ⚠️ Automated review reminders (job queue pending)

**What's Missing** (Required for Full PMI Compliance):
- ⚠️ Frontend UI for review scheduling and management
- ⚠️ Automated reminder job queue integration
- ⚠️ Review agenda generation (AI integration pending)

**PMI Compliance Score**: **60%** (Backend complete, frontend pending)

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

**Task Status**: 🟢 **IMPLEMENTED - BACKEND COMPLETE** (Frontend Pending)

The regular review cadence system for portfolio/program performance reviews is **IMPLEMENTED** (backend complete). The system provides:
- ✅ Database schema for review scheduling (migration 339)
- ✅ Backend service for review management (`reviewSchedulingService.ts`)
- ✅ Complete API endpoints for all review operations (`reviewRoutes.ts`)
- ✅ Compliance tracking view and API
- ⚠️ Frontend UI components (pending)
- ⚠️ Automated reminder jobs (pending)

**Recommendation**: Backend implementation is **COMPLETE**. Frontend UI components and automated reminder jobs are pending. This addresses the **critical PMI compliance requirement** for Portfolio Performance Management domain validation at the backend level.

**Next Steps**:
1. Create frontend UI components for review scheduling
2. Integrate automated reminder job queue
3. Write tests for backend services and API endpoints
4. Create user documentation

---

**Last Updated**: November 16, 2025  
**Status**: 🟢 **BACKEND IMPLEMENTED - FRONTEND PENDING**

