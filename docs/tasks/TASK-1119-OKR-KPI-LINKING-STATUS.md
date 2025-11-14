# TASK-1119: OKRs/KPIs Linked to Portfolio Components

**Issue**: #404  
**Task ID**: TASK-1119  
**Status**: 🟡 **PARTIALLY COMPLETE** (Database & API ✅, UI ⚠️)  
**Priority**: Medium  
**Source**: PMI_COMPLETE_DOMAIN_MAPPING.md

---

## Summary

OKRs and KPIs **can be linked** to portfolio components (programs, projects) through the database schema and API, but the UI for creating and managing these links is **not fully implemented**. The linking mechanism exists but may not be actively used or visible in the user interface.

---

## Current Status

### ✅ **Database Schema - COMPLETE**

#### 1. OKRs Table (`portfolio_okrs`)

**Linking Columns**:
- ✅ `entity_id UUID` - Stores program_id or project_id (line 36 in migration 331)
- ✅ `entity_type VARCHAR(50)` - 'program' or 'project' (line 37)
- ✅ `level VARCHAR(50)` - 'organization', 'portfolio', 'program', 'project' (line 35)
- ✅ Index on `(entity_type, entity_id)` for efficient queries (line 72)

**Schema**:
```sql
CREATE TABLE portfolio_okrs (
  id UUID PRIMARY KEY,
  level VARCHAR(50) CHECK (level IN ('organization', 'portfolio', 'program', 'project')),
  entity_id UUID, -- program_id or project_id (when level is 'program' or 'project')
  entity_type VARCHAR(50) CHECK (entity_type IN ('program', 'project') OR entity_type IS NULL),
  -- ... other columns
);
```

#### 2. KPIs Table (`portfolio_kpis`)

**Linking Columns**:
- ✅ `linked_okr_ids UUID[]` - Array of OKR IDs this KPI supports (line 143 in migration 332)
- ✅ `linked_program_ids UUID[]` - Array of program IDs (line 144)

**Schema**:
```sql
CREATE TABLE portfolio_kpis (
  id UUID PRIMARY KEY,
  linked_okr_ids UUID[], -- OKRs this KPI supports
  linked_program_ids UUID[], -- Programs this KPI tracks
  -- ... other columns
);
```

#### 3. Key Results Table (`portfolio_key_results`)

**Linking Columns**:
- ✅ `contributing_projects UUID[]` - Array of project IDs contributing to this KR (line 120 in migration 331)

**Schema**:
```sql
CREATE TABLE portfolio_key_results (
  id UUID PRIMARY KEY,
  okr_id UUID REFERENCES portfolio_okrs(id),
  contributing_projects UUID[], -- Projects driving this KR
  -- ... other columns
);
```

### ✅ **API Endpoints - COMPLETE**

#### OKR Routes (`server/src/routes/okrRoutes.ts`)

**Query Parameters Supported**:
- ✅ `entity_id` - Filter OKRs by program/project ID (line 119-120, 128-129)
- ✅ `entity_type` - Filter by 'program' or 'project' (line 120, 129)
- ✅ `level` - Filter by OKR level (line 117, 127)

**Example Usage**:
```typescript
// Get OKRs for a specific program
GET /api/okrs?level=program&entity_id={programId}&entity_type=program

// Get OKRs for a specific project
GET /api/okrs?level=project&entity_id={projectId}&entity_type=project
```

**Create/Update Support**:
- ✅ `createOKRSchema` accepts `entity_id` and `entity_type` (lines 40-41)
- ✅ `createKeyResultSchema` accepts `contributing_projects` array (line 85)
- ✅ `updateKeyResultSchema` accepts `contributing_projects` array (line 100)

#### Service Layer (`server/src/services/okrService.ts`)

**Query Support**:
- ✅ `getOKRs()` method supports filtering by `entity_id` and `entity_type` (lines 168-178)
- ✅ Queries properly filter OKRs by program/project

### ⚠️ **UI Components - PARTIAL**

#### OKR Dashboard (`app/portfolio/okrs/page.tsx`)

**Current State**:
- ✅ Displays OKRs at all levels (organization, portfolio, program, project)
- ✅ Interface includes `entity_id` and `entity_type` fields (lines 55-56)
- ⚠️ **No visible UI for filtering by program/project**
- ⚠️ **No visible UI for linking OKRs to programs/projects**
- ⚠️ Filter only supports `level` and `period`, not `entity_id` (lines 116-122)

**Missing Features**:
- ❌ Program/project selector when creating OKRs
- ❌ Display of which program/project an OKR is linked to
- ❌ Filter by program/project in dashboard
- ❌ Link/unlink OKRs from programs/projects

#### OKR Dialog (`components/okr/OKRDialog.tsx`)

**Needs Verification**: Check if dialog allows selecting program/project when creating OKR

#### KPI UI

**Status**: Need to check if KPI management UI exists and supports linking

---

## Evidence from Codebase

### 1. Database Schema ✅

**Migration 331** (`server/migrations/331_create_okrs.sql`):
- Line 36: `entity_id UUID` column defined
- Line 37: `entity_type VARCHAR(50)` column defined
- Line 72: Index on `(entity_type, entity_id)` created
- Line 82: Comment explains `entity_id` stores program_id or project_id

**Migration 332** (`server/migrations/332_create_strategic_framework_tables.sql`):
- Line 143: `linked_okr_ids UUID[]` column defined
- Line 144: `linked_program_ids UUID[]` column defined

### 2. API Support ✅

**OKR Routes** (`server/src/routes/okrRoutes.ts`):
- Lines 40-41: Schema accepts `entity_id` and `entity_type`
- Lines 85, 100: Schema accepts `contributing_projects` array
- Lines 119-120, 128-129: Query parameters support filtering by entity

**OKR Service** (`server/src/services/okrService.ts`):
- Lines 168-178: `getOKRs()` method filters by `entity_id` and `entity_type`

### 3. UI Implementation ⚠️

**OKR Dashboard** (`app/portfolio/okrs/page.tsx`):
- Lines 55-56: Interface includes `entity_id` and `entity_type` fields
- Lines 116-122: Filter only uses `level` and `period`, not `entity_id`
- **Missing**: UI for selecting program/project when creating OKR
- **Missing**: Display of linked programs/projects

---

## Acceptance Criteria Status

### ✅ Database Schema
- [x] OKRs can be linked to programs (`entity_id` + `entity_type='program'`)
- [x] OKRs can be linked to projects (`entity_id` + `entity_type='project'`)
- [x] KPIs can be linked to OKRs (`linked_okr_ids` array)
- [x] KPIs can be linked to programs (`linked_program_ids` array)
- [x] Key Results can be linked to projects (`contributing_projects` array)

### ✅ API Endpoints
- [x] API accepts `entity_id` and `entity_type` when creating OKRs
- [x] API supports querying OKRs by program/project (`?entity_id=X&entity_type=program`)
- [x] API accepts `contributing_projects` when creating Key Results
- [x] Service layer supports filtering by entity

### ⚠️ UI Components
- [ ] UI allows selecting program/project when creating OKR
- [ ] UI displays which program/project an OKR is linked to
- [ ] UI allows filtering OKRs by program/project
- [ ] UI allows linking/unlinking OKRs from programs/projects
- [ ] UI displays KPIs linked to programs
- [ ] UI displays projects contributing to Key Results

### ❌ Integration
- [ ] Program detail page shows linked OKRs
- [ ] Project detail page shows linked OKRs
- [ ] OKR dashboard shows program/project context
- [ ] KPI dashboard shows linked programs

---

## Testing

### Manual Testing Needed

1. **API Testing**:
   - ✅ Create OKR with `entity_id` and `entity_type` via API
   - ✅ Query OKRs filtered by program/project
   - ✅ Create Key Result with `contributing_projects` array
   - ✅ Verify links are stored correctly

2. **UI Testing**:
   - ❓ Can users select program/project when creating OKR in UI?
   - ❓ Does OKR dashboard show which program/project OKRs are linked to?
   - ❓ Can users filter OKRs by program/project?
   - ❓ Do program/project detail pages show linked OKRs?

---

## Files Involved

1. **Database**:
   - `server/migrations/331_create_okrs.sql` - OKR schema with entity linking
   - `server/migrations/332_create_strategic_framework_tables.sql` - KPI schema with program linking

2. **Backend**:
   - `server/src/services/okrService.ts` - Service with entity filtering
   - `server/src/routes/okrRoutes.ts` - API routes with entity support

3. **Frontend**:
   - `app/portfolio/okrs/page.tsx` - OKR dashboard (needs enhancement)
   - `components/okr/OKRDialog.tsx` - OKR create/edit dialog (needs verification)

---

## Recommendation

### Current Status: 🟡 **PARTIALLY COMPLETE**

**What's Working**:
- ✅ Database schema supports linking
- ✅ API endpoints support linking
- ✅ Service layer supports querying by entity

**What's Missing**:
- ⚠️ UI for creating/managing links
- ⚠️ Display of links in dashboards
- ⚠️ Integration with program/project detail pages

### Action Required

**Option 1: Mark as Complete (If API Usage is Sufficient)**
- If the system is designed for API-first usage and UI is not required
- If users can link OKRs/KPIs via API calls
- **Status**: ✅ **COMPLETE** (API implementation sufficient)

**Option 2: Mark as Partial (If UI is Required)**
- If users need UI to create/manage links
- If program/project pages should display linked OKRs
- **Status**: 🟡 **PARTIAL** (Database & API ✅, UI ⚠️)

### Next Steps to Complete (If UI Required)

1. **Enhance OKR Dialog**:
   - Add program/project selector when `level` is 'program' or 'project'
   - Save `entity_id` and `entity_type` when creating OKR

2. **Enhance OKR Dashboard**:
   - Add filter by program/project
   - Display linked program/project name for each OKR
   - Add link to program/project detail page

3. **Enhance Program/Project Pages**:
   - Display linked OKRs on program detail page
   - Display linked OKRs on project detail page
   - Show KPIs linked to program

4. **Enhance Key Results**:
   - Display `contributing_projects` in Key Result card
   - Allow selecting projects when creating Key Result

---

## Related Documentation

- **Design Document**: `docs/roadmap/PORTFOLIO_OKR_INTEGRATION_ARCHITECTURE.md`
- **Roadmap**: `docs/roadmap/PMI_COMPLETE_DOMAIN_MAPPING.md` (Line 54)
- **Migration**: `server/migrations/331_create_okrs.sql`
- **Migration**: `server/migrations/332_create_strategic_framework_tables.sql`

---

## Conclusion

**Task Status**: 🟡 **PARTIALLY COMPLETE**

The linking mechanism is **fully implemented** at the database and API level. OKRs and KPIs **can be linked** to portfolio components (programs, projects) through:
- Database columns (`entity_id`, `entity_type`, `linked_program_ids`, `contributing_projects`)
- API endpoints (accept and filter by entity)
- Service layer (query by entity)

However, the **UI for creating and managing these links** appears to be **not fully implemented** or **not visible** in the current interface.

**Recommendation**: 
- If API usage is sufficient: ✅ **COMPLETE**
- If UI is required: 🟡 **PARTIAL** - Keep issue open until UI is implemented

---

**Last Updated**: 2024-01-XX  
**Status**: 🟡 **PARTIALLY COMPLETE** - Database & API ✅, UI ⚠️

