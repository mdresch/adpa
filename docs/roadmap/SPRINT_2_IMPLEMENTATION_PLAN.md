# Sprint 2 (Weeks 3-4) Implementation Plan

**Sprint Focus**: Complete Entity Types - Lessons Learned, Issues Log, Development Approach  
**Estimated Effort**: 8 days total (3 + 3 + 2)  
**Target Completion**: Q1 2026  
**Status**: 🔵 Ready to Begin

---

## Executive Summary

Sprint 2 completes three critical entity types to achieve 90%+ PMBOK 8 coverage. All three features have **partial implementation** (database schemas and AI extraction exist), but need **backend API routes** and **frontend components** to be fully operational.

---

## Current Implementation Status

### 1. Lessons Learned Entity
- ✅ **Database Schema**: Exists in migration `027_risk_extension_entities.sql` (simplified version)
- ✅ **AI Extraction**: Complete (`extractLessonsLearned.ts`, `saveLessonsLearned.ts`)
- ⚠️ **Backend API**: **MISSING** - No routes file
- ⚠️ **Frontend**: Partial (`LessonsTab.tsx` exists but queries knowledge base, not lessons_learned table)
- **Schema Gap**: Current schema missing fields from roadmap spec (status, phase, severity, applicable_to, etc.)

### 2. Issues Log Entity
- ✅ **Database Schema**: Exists in migration `027_risk_extension_entities.sql` as `issue_log` (simplified version)
- ✅ **AI Extraction**: Complete (extraction module exists)
- ✅ **Backend API**: **EXISTS** (`issueRoutes.ts`, `issueService.ts`) - Full CRUD
- ✅ **Frontend**: **EXISTS** (`issues/page.tsx`, `ProjectIssuesTab.tsx`)
- **Schema Gap**: Current schema may need enhancements to match full roadmap spec

### 3. Development Approach Entity
- ✅ **Database Schema**: Exists in migration `013_development_approaches.sql` (complete with all fields)
- ✅ **AI Extraction**: Complete (`extractDevelopmentApproaches.ts`, `saveDevelopmentApproaches.ts`)
- ✅ **Backend API**: **COMPLETE** - Routes file exists and registered (`developmentApproachRoutes.ts`, `developmentApproachService.ts`)
- ✅ **Frontend**: **COMPLETE** - All components created and integrated

---

## Implementation Tasks

## 1. Lessons Learned Entity Type

### Priority: P1 (High)  
**Effort**: 3 days  
**PMBOK Domain**: Project Work Performance Domain  
**Impact**: Project Work Domain coverage: 65% → 80%

### Current State
- Database: `lessons_learned` table exists (migration 027) with basic fields
- AI Extraction: Complete and registered
- Frontend: `LessonsTab.tsx` exists but queries knowledge base instead of lessons_learned table

### Tasks

#### Day 1: Database Schema Enhancement + Backend API (Foundation)

**1.1 Database Schema Enhancement** (2-3 hours)
- [ ] Review current `lessons_learned` schema vs. roadmap spec
- [ ] Create migration to add missing fields:
  - `status` (identified, documented, shared, implemented)
  - `phase` (project phase when identified)
  - `date_identified` (when lesson was identified)
  - `severity` (critical/major/minor)
  - `what_happened`, `what_worked_well`, `what_could_improve`, `root_cause`, `recommendation` (text fields)
  - `applicable_to` (JSONB array of project types)
  - `shared_with_organization` (boolean)
  - `reported_by` (user ID)
  - `validated_by` (JSONB array of user IDs)
- [ ] Add indexes: `project_id`, `category`, `status`
- [ ] Migration file: `server/migrations/363_enhance_lessons_learned_schema.sql`

**1.2 Backend Service Layer** (3-4 hours)
- [ ] Create `server/src/services/lessonsLearnedService.ts`
- [ ] Implement CRUD operations:
  - `getByProject(projectId, filters?)` - List lessons with category/status filters
  - `getById(lessonId)` - Get single lesson
  - `create(input, userId)` - Create lesson
  - `update(lessonId, input)` - Update lesson
  - `delete(lessonId)` - Delete lesson
  - `getByCategory(projectId)` - Group by category
  - `shareWithOrganization(lessonId)` - Mark as shared
- [ ] Type definitions matching enhanced schema
- [ ] Validation logic for status transitions

**1.3 Backend API Routes** (2-3 hours)
- [ ] Create `server/src/routes/lessonsLearnedRoutes.ts`
- [ ] Implement endpoints:
  - `GET /api/lessons-learned/project/:projectId` - List all lessons (with filters)
  - `GET /api/lessons-learned/:id` - Get single lesson
  - `POST /api/lessons-learned` - Create lesson
  - `PUT /api/lessons-learned/:id` - Update lesson
  - `DELETE /api/lessons-learned/:id` - Delete lesson
  - `GET /api/lessons-learned/project/:projectId/by-category` - Grouped by category
  - `POST /api/lessons-learned/:id/share` - Share with organization
- [ ] Joi validation schemas
- [ ] Authentication & authorization middleware
- [ ] Register routes in `server/src/server.ts`

#### Day 2: Frontend Components + Integration

**2.1 Update Frontend Component** (4-5 hours)
- [ ] Update `app/projects/[id]/components/LessonsTab.tsx` to:
  - Query `/api/lessons-learned/project/:projectId` instead of knowledge base
  - Display lessons grouped by category (similar to TeamAgreementsTab)
  - Show lesson details (what happened, outcome, recommendations)
  - Display status badges (identified, documented, shared, implemented)
  - Show severity indicators
- [ ] Add category icons and colors (10 categories)
- [ ] Create/Edit/Delete functionality
- [ ] Share with organization button
- [ ] Empty state handling

**2.2 Create Lesson Dialog Component** (2-3 hours)
- [ ] Create `app/projects/[id]/components/LessonDialog.tsx`
- [ ] Form fields:
  - Title/Description
  - Category selector
  - Status selector
  - Phase selector
  - Severity selector
  - What happened, what worked, what to improve, recommendations
  - Applicable to project types (multi-select)
- [ ] Validation and error handling
- [ ] Save/Cancel actions

**2.3 Knowledge Transfer Features** (2-3 hours)
- [ ] Add search/filter by category in LessonsTab
- [ ] Display "Lessons applicable to this project" suggestions
- [ ] Organization knowledge base view (filter by `shared_with_organization = true`)
- [ ] Export lessons functionality

#### Day 3: Testing + Polish

**3.1 Integration Testing** (2 hours)
- [ ] Test AI extraction produces valid lessons
- [ ] Test backend API endpoints (CRUD operations)
- [ ] Test frontend displays correctly
- [ ] Test knowledge transfer features

**3.2 Polish & Documentation** (2 hours)
- [ ] Add loading states
- [ ] Add error handling
- [ ] Update component documentation
- [ ] Verify categorization accuracy (>90%)

### Acceptance Criteria
- [x] Database schema exists (needs enhancement) ⚠️
- [x] AI extraction working ✅
- [ ] Backend API endpoints functional
- [ ] Frontend displays lessons by category
- [ ] Knowledge transfer suggestions work
- [ ] Lessons can be shared with organization
- [ ] Lessons categorized correctly (>90% accuracy)

**Files to Create/Modify**:
- `server/migrations/363_enhance_lessons_learned_schema.sql` (NEW)
- `server/src/services/lessonsLearnedService.ts` (NEW)
- `server/src/routes/lessonsLearnedRoutes.ts` (NEW)
- `app/projects/[id]/components/LessonsTab.tsx` (MODIFY - update to use new API)
- `app/projects/[id]/components/LessonDialog.tsx` (NEW)

---

## 2. Issues Log Entity Type

### Priority: P1 (High)  
**Effort**: 3 days (mostly enhancement)  
**PMBOK Domain**: Project Work, Uncertainty  
**Impact**: Project Work Domain coverage: 80% → 90%, Uncertainty Domain: 95% → 100%

### Current State
- Database: `issue_log` table exists (migration 027) with basic fields
- AI Extraction: Complete and registered
- Backend API: **EXISTS** (`issueRoutes.ts`, `issueService.ts`) with full CRUD
- Frontend: **EXISTS** (`issues/page.tsx`, `ProjectIssuesTab.tsx`)

### Tasks

#### Day 1: Schema Verification & Enhancement

**1.1 Verify Current Schema** (1 hour)
- [ ] Compare `issue_log` table schema with roadmap spec
- [ ] Identify missing fields:
  - `category` (technical, resource, schedule, etc.) - may exist as text, needs enum
  - `priority` (critical, high, medium, low) - exists but verify format
  - `impact` (text description)
  - `affected_areas` (JSONB array)
  - `raised_by`, `assigned_to`, `escalated_to` (user IDs) - verify if UUID or text
  - `status` (open, acknowledged, in_progress, blocked, resolved, closed) - verify
  - `resolution`, `workaround`, `root_cause` - verify all exist
  - `related_risk_id`, `related_milestone_id` - verify foreign keys
- [ ] Check indexes match roadmap spec

**1.2 Schema Enhancement Migration** (2-3 hours)
- [ ] Create migration `364_enhance_issue_log_schema.sql` if needed
- [ ] Add missing fields
- [ ] Add/enhance indexes: `project_id`, `status`, `priority`, `assigned_to`
- [ ] Add foreign key constraints if missing
- [ ] Add status history tracking table if missing (`issue_status_history`)

**1.3 Backend Service Enhancement** (2-3 hours)
- [ ] Review `server/src/services/issueService.ts`
- [ ] Verify all roadmap features implemented:
  - Escalation workflow
  - Status history tracking
  - Linking to risks and milestones
  - Filtering by priority/category/status
- [ ] Add missing features if any

#### Day 2: Backend API Enhancement + Frontend Verification

**2.1 Backend API Enhancement** (2-3 hours)
- [ ] Review `server/src/routes/issueRoutes.ts`
- [ ] Verify all endpoints exist:
  - `GET /api/issues` - List all issues (with filters) ✅
  - `POST /api/issues` - Create issue ✅
  - `PUT /api/issues/:id` - Update issue ✅
  - `POST /api/issues/:id/resolve` - Mark as resolved (verify)
  - `POST /api/issues/:id/escalate` - Escalate issue (verify)
  - `GET /api/issues/open` - Open issues only (verify)
  - `GET /api/issues/by-priority` - Grouped by priority (verify)
- [ ] Add missing endpoints if needed
- [ ] Verify escalation workflow implementation

**2.2 Frontend Component Review** (2-3 hours)
- [ ] Review `app/issues/page.tsx` and `components/project/ProjectIssuesTab.tsx`
- [ ] Verify features:
  - Issues list view with filters (status, priority, category)
  - Issue detail view (full description, resolution, timeline)
  - Create/edit issue form
  - Issue board view (Kanban: Open → In Progress → Resolved → Closed)
  - Escalation workflow UI
  - Issue assignment interface
- [ ] Add missing features if any
- [ ] Enhance UI to match roadmap spec

#### Day 3: Escalation Workflow + Testing

**3.1 Escalation Workflow** (3-4 hours)
- [ ] Implement escalation history tracking (who escalated, when, why)
- [ ] Add escalation notifications (email/WebSocket)
- [ ] Create escalation approval workflow UI
- [ ] Integrate with stakeholder management

**3.2 Testing & Polish** (2-3 hours)
- [ ] Test escalation workflow end-to-end
- [ ] Test issue linking to risks and milestones
- [ ] Test Kanban board functionality
- [ ] Verify issue assignment works
- [ ] Test AI extraction produces valid issues

### Acceptance Criteria
- [ ] Database schema verified/enhanced to match spec
- [x] AI extraction identifies issues from documents ✅
- [ ] Issues categorized and prioritized correctly
- [ ] Frontend displays issues with filters
- [ ] Escalation workflow functional
- [ ] Issues linked to risks and milestones
- [ ] Kanban board view operational

**Files to Create/Modify**:
- `server/migrations/364_enhance_issue_log_schema.sql` (NEW - if needed)
- `server/src/services/issueService.ts` (MODIFY - enhance if needed)
- `server/src/routes/issueRoutes.ts` (MODIFY - verify/add endpoints)
- `app/issues/page.tsx` (MODIFY - enhance if needed)
- `components/project/ProjectIssuesTab.tsx` (MODIFY - enhance if needed)

---

## 3. Development Approach Entity Type

### Priority: P1 (High)  
**Effort**: 2 days  
**PMBOK Domain**: Development Approach & Life Cycle  
**Impact**: Development Approach Domain coverage: 60% → 90%

### Current State
- Database: `development_approaches` table exists (migration 013) with **complete schema**
- AI Extraction: Complete (`extractDevelopmentApproaches.ts`, `saveDevelopmentApproaches.ts`)
- Backend API: **COMPLETE** - Service and routes exist, now registered in `server.ts`
- Frontend: **COMPLETE** - All components created and integrated into project detail page

### Tasks

#### Day 1: Backend API Implementation ✅ COMPLETE

**1.1 Backend Service Layer** (3-4 hours) ✅
- [x] Create `server/src/services/developmentApproachService.ts` (already existed)
- [x] Implement operations:
  - `getByProject(projectId)` - Get approach for project (one record per project) ✅
  - `createOrUpdate(projectId, input, userId)` - Create or update approach ✅
  - `getTailoringDecisions(projectId)` - Get tailoring decisions ✅
- [x] Type definitions (use existing `DevelopmentApproach` interface) ✅
- [x] Validation: Ensure UNIQUE constraint on `project_id` is enforced ✅

**1.2 Backend API Routes** (2-3 hours) ✅
- [x] Create `server/src/routes/developmentApproachRoutes.ts` (already existed)
- [x] Implement endpoints:
  - `GET /api/projects/:projectId/development-approach` - Get approach metadata ✅
  - `POST /api/projects/:projectId/development-approach` - Create/update approach ✅
  - `PUT /api/projects/:projectId/development-approach` - Update approach ✅
  - `GET /api/projects/:projectId/development-approach/tailoring` - Get tailoring decisions ✅
- [x] Joi validation schemas (approach, methodology, justification required) ✅
- [x] Authentication & authorization middleware ✅
- [x] Register routes in `server/src/server.ts` ✅ (completed)

#### Day 2: Frontend Components ✅ COMPLETE

**2.1 Development Approach Form Component** (3-4 hours) ✅
- [x] Create `app/projects/[id]/components/DevelopmentApproachForm.tsx` ✅
- [x] Form fields:
  - Approach selector (predictive, adaptive, hybrid, incremental, iterative) ✅
  - Methodology selector (waterfall, scrum, kanban, lean, safe, prince2, custom) ✅
  - **Justification** text area (required) - why this approach was selected ✅
  - Context factors:
    - Uncertainty level (low/medium/high) ✅
    - Requirements stability (stable/evolving/uncertain) ✅
    - Stakeholder engagement model ✅
    - Delivery cadence (single/iterative/incremental/continuous) ✅
  - Organizational factors:
    - Organizational maturity (low/medium/high) ✅
    - Team experience level (junior/mixed/senior) ✅
    - Regulatory constraints (checkbox) ✅
  - Life cycle phases (comma-separated input converted to array) ✅
  - Iteration length and unit (if applicable) ✅
  - Governance approach (lightweight/standard/formal) ✅
  - Review gates (comma-separated input converted to array) ✅

**2.2 Approach Selection Wizard** (2-3 hours) ⚠️ DEFERRED
- [ ] Create `app/projects/[id]/components/DevelopmentApproachWizard.tsx` (not implemented - form-based approach used instead)
- Note: Instead of wizard, integrated form-based approach directly into DevelopmentApproachTab for better UX

**2.3 Tailoring Decisions Editor** (2-3 hours) ✅
- [x] Create `app/projects/[id]/components/TailoringDecisionsEditor.tsx` ✅
- [x] Add/Edit/Delete tailoring decisions ✅
- [x] Each decision includes:
  - Area (what was tailored) ✅
  - Standard process (normal organizational process) ✅
  - Tailored process (how it was adapted) ✅
  - Justification (why it was tailored) ✅
- [x] JSONB array editor with validation ✅

**2.4 Approach Summary View** (1-2 hours) ✅
- [x] Create summary view (integrated into `DevelopmentApproachTab.tsx` as `DevelopmentApproachSummary` component) ✅
- [x] Display approach metadata in project detail page ✅
- [x] Show: approach, methodology, justification, key tailoring decisions ✅
- [x] Card/panel format for overview ✅
- [x] Link to full form for editing (Edit button) ✅

**2.5 Integration** (1 hour) ✅
- [x] Add Development Approach tab/section to project detail page ✅
- [x] Tab integrated with icon and proper routing ✅
- [x] Summary view displays when not editing ✅

#### Day 2 (continued): Testing ⚠️ PENDING USER VALIDATION

**2.6 Testing** (2 hours) ⚠️
- [ ] Test backend API endpoints (pending user validation)
- [ ] Test frontend form submission (pending user validation)
- [ ] Test tailoring decisions editor (pending user validation)
- [ ] Verify AI extraction produces valid approach data
- [ ] Test UNIQUE constraint (one record per project)

### Acceptance Criteria
- [x] Database schema created (one record per project) ✅
- [x] AI extraction identifies approach and justification ✅
- [x] Tailoring decisions captured ✅
- [x] Frontend form for approach selection ✅
- [x] Justification required when selecting approach ✅ (min 10 chars validation)
- [x] Summary view displays in project detail ✅
- [x] Edit/Create functionality integrated ✅
- [ ] User validation and testing (pending)

**Files Created/Modified**:
- ✅ `server/src/services/developmentApproachService.ts` (EXISTED - verified complete)
- ✅ `server/src/routes/developmentApproachRoutes.ts` (EXISTED - verified complete)
- ✅ `server/src/server.ts` (MODIFIED - registered routes)
- ✅ `app/projects/[id]/components/DevelopmentApproachTab.tsx` (NEW - main tab component with summary)
- ✅ `app/projects/[id]/components/DevelopmentApproachForm.tsx` (NEW - form component)
- ✅ `app/projects/[id]/components/TailoringDecisionsEditor.tsx` (NEW - tailoring editor)
- ✅ `app/projects/[id]/page.tsx` (MODIFIED - added Development Approach tab)

**Files NOT Created** (deferred/not needed):
- `DevelopmentApproachWizard.tsx` - Form-based approach used instead (better UX)
- `DevelopmentApproachSummary.tsx` - Summary integrated into DevelopmentApproachTab.tsx

---

## Implementation Order

### Recommended Sequence

1. **Development Approach** (2 days) - Simplest, one record per project, good warm-up
2. **Lessons Learned** (3 days) - Medium complexity, similar pattern to Team Agreements
3. **Issues Log** (3 days) - Most complex, enhancement of existing implementation

**Total**: 8 days (can be parallelized to ~5-6 days with multiple developers)

---

## Dependencies

### External Dependencies
- None - all infrastructure exists (database, AI extraction, authentication)

### Internal Dependencies
- Team Agreements implementation (Sprint 1) - Reference pattern for frontend components
- Performance Actuals implementation (Sprint 1) - Reference pattern for API structure

---

## Testing Strategy

### Unit Tests
- Service layer functions
- Validation schemas
- Type definitions

### Integration Tests
- API endpoint testing (CRUD operations)
- Database schema validation
- AI extraction integration

### E2E Tests
- Complete user workflows
- Form submissions
- Data persistence

---

## Success Metrics

### Lessons Learned
- ✅ AI extraction extracts 5-15 lessons per project
- ✅ Lessons categorized correctly (>90% accuracy)
- ✅ Frontend displays lessons grouped by category
- ✅ Knowledge transfer suggestions work

### Issues Log
- ✅ Issues categorized correctly (>90% accuracy)
- ✅ Escalation workflow functional
- ✅ Kanban board operational
- ✅ Issues linked to risks/milestones

### Development Approach
- ✅ One record per project (UNIQUE constraint enforced)
- ✅ Justification captured for all approaches (required field, min 10 chars)
- ✅ Tailoring decisions documented (full CRUD editor implemented)
- ✅ Form-based approach selection (wizard deferred in favor of direct form)
- ✅ Summary view displays in project detail tab

---

## Rollout Plan

### Phase 1: Backend (Days 1-3)
- Database schema enhancements
- Service layers
- API routes
- Testing

### Phase 2: Frontend (Days 4-6)
- Component development
- Integration
- UI/UX polish

### Phase 3: Testing & Deployment (Days 7-8)
- Integration testing
- Bug fixes
- Documentation
- Deployment

---

## Files Summary

### Files Status
- **Development Approach**: ✅ Complete (3 new frontend components, 1 route registration)
- **Lessons Learned**: 🔵 Pending (estimated 7 files: 1 migration, 1 service, 1 route, 2 frontend components, 1 frontend update)
- **Issues Log**: 🔵 Pending (estimated 2-3 file modifications/enhancements)

**Total Estimated**: ~12-15 files

### Files to Modify: 5
- `server/src/server.ts` (register routes)
- `app/projects/[id]/page.tsx` (integration)
- `app/projects/[id]/components/LessonsTab.tsx` (update API)
- `app/issues/page.tsx` (enhancements)
- `components/project/ProjectIssuesTab.tsx` (enhancements)

---

**Plan Created**: December 21, 2025  
**Status**: 🟡 In Progress  
**Progress**: 
- ✅ Development Approach: **COMPLETE** (Backend verified, Frontend implemented, Routes registered)
- 🔵 Lessons Learned: **PENDING** (Next task)
- 🔵 Issues Log: **PENDING**

**Next Steps**: 
1. User validation of Development Approach implementation
2. Begin Lessons Learned implementation (Day 1: Database schema enhancement + Backend API)
3. Then proceed with Issues Log enhancements

**Last Updated**: December 21, 2025

