# Program Archive Feature

**Date**: October 31, 2025  
**Status**: ✅ **IMPLEMENTED**  
**Priority**: P1 (Business Rule Enforcement)  
**Effort**: 2 hours  

---

## 🎯 **Business Rule**

**Programs can ONLY be archived if ALL underlying projects are archived first.**

This prevents data integrity issues and ensures proper workflow:
1. Archive all projects in a program
2. Then archive the program itself
3. Unarchive program anytime (projects remain archived)

---

## ✅ **What Was Implemented**

### 1. Database Schema (Migration 202)
**File**: `server/migrations/202_add_program_archive_fields.sql`

**Programs Table**:
```sql
- archived BOOLEAN DEFAULT FALSE
- archived_at TIMESTAMP
- archived_by UUID REFERENCES users(id)
- INDEX idx_programs_archived
```

**Projects Table** (ensured):
```sql
- archived BOOLEAN DEFAULT FALSE
- archived_at TIMESTAMP
- archived_by UUID REFERENCES users(id)
- INDEX idx_projects_archived
- INDEX idx_projects_program_archived (program_id, archived)
```

---

### 2. Backend Service Methods
**File**: `server/src/services/programService.ts`

**New Methods**:

#### `canArchiveProgram(programId)`
**Purpose**: Check if program can be archived  
**Returns**:
```typescript
{
  canArchive: boolean,
  reason?: string,
  unarchivedCount?: number
}
```

**Logic**:
- ✅ If program has 0 projects → Can archive
- ✅ If ALL projects archived → Can archive
- ❌ If ANY project unarchived → Cannot archive

---

#### `archiveProgram(programId, userId)`
**Purpose**: Archive a program with validation  
**Validation**: Calls `canArchiveProgram()` first  
**Throws Error**: If validation fails  
**Records**: Who archived and when

---

#### `unarchiveProgram(programId)`
**Purpose**: Unarchive a program  
**Note**: Projects remain archived (no cascade)

---

### 3. Backend API Endpoints
**File**: `server/src/routes/programRoutes.ts`

**New Endpoints**:

#### `GET /api/programs/:id/can-archive`
**Purpose**: Check if program can be archived  
**Response**:
```json
{
  "success": true,
  "data": {
    "canArchive": false,
    "reason": "Cannot archive program: 3 project(s) are not archived yet",
    "unarchivedCount": 3
  }
}
```

---

#### `POST /api/programs/:id/archive`
**Purpose**: Archive a program  
**Auth**: Requires `programs.manage` permission  
**Validation**: Automatic (in service layer)  
**Response**: 400 if validation fails, 200 on success

---

#### `POST /api/programs/:id/unarchive`
**Purpose**: Unarchive a program  
**Auth**: Requires `programs.manage` permission  
**No Validation**: Can always unarchive

---

### 4. Frontend UI
**File**: `app/programs/[id]/page.tsx`

**Features**:

#### Archive Button
- Located in program header (top-right)
- Shows "Archive Program" or "Unarchive Program"
- Icon changes based on state
- Disabled during operation

---

#### Archive Dialog (Smart Validation)
**Scenario 1: Can Archive** (All projects archived)
```
✅ Archive Program?

Are you sure you want to archive this program? This will 
hide it from the active programs list, but it can be 
unarchived later.

[Cancel] [Archive Program]
```

**Scenario 2: Cannot Archive** (Has unarchived projects)
```
⚠️ Cannot Archive Program

┌─────────────────────────────────────────────┐
│ ⚠️  Cannot archive program: 3 project(s)    │
│     are not archived yet                     │
└─────────────────────────────────────────────┘

To archive this program, you must first archive 
all 3 underlying projects.

[Cancel]
```

---

#### Visual Indicators
- **Archived Badge**: 📦 ARCHIVED (gray badge in header)
- **Button State**: Changes between Archive/Unarchive
- **Loading State**: Spinner during operation
- **Toast Notifications**: Success/error feedback

---

## 🔐 **Security & Permissions**

### Required Permissions:
- **Archive**: `programs.manage`
- **Unarchive**: `programs.manage`
- **Check Status**: Any authenticated user

### Audit Trail:
- **Who**: `archived_by` user ID
- **When**: `archived_at` timestamp
- **Action Logged**: Winston logs

---

## 🧪 **Testing Scenarios**

### Scenario 1: Archive with No Projects
**Setup**: Program with 0 projects  
**Expected**: ✅ Can archive immediately  
**Result**: Program archived

---

### Scenario 2: Archive with All Projects Archived
**Setup**: Program with 5 projects, all archived  
**Expected**: ✅ Can archive  
**Result**: Program archived

---

### Scenario 3: Archive with Unarchived Projects
**Setup**: Program with 3 projects, 1 unarchived  
**Expected**: ❌ Cannot archive  
**Result**: Error dialog shown with count

---

### Scenario 4: Unarchive Program
**Setup**: Archived program  
**Expected**: ✅ Can unarchive  
**Result**: Program unarchived, projects remain archived

---

## 📊 **Database Queries Performance**

### Archive Check Query:
```sql
SELECT 
  COUNT(*) as total_projects,
  COUNT(*) FILTER (WHERE archived = true) as archived_projects,
  COUNT(*) FILTER (WHERE archived = false OR archived IS NULL) as unarchived_projects
FROM projects
WHERE program_id = $1
```

**Performance**: 
- ✅ Uses index `idx_projects_program_archived`
- ✅ Single query (no N+1)
- ✅ Fast even with 1000+ projects per program

---

## 🎯 **User Workflow**

### Complete Archive Workflow:

```
1. User navigates to program detail page
2. User clicks "Archive Program" button
   ├─ System checks if all projects archived
   │
   ├─ IF projects unarchived:
   │  ├─ Show warning dialog
   │  ├─ Display count of unarchived projects
   │  └─ Block archival
   │
   └─ IF all projects archived (or 0 projects):
      ├─ Show confirmation dialog
      ├─ User confirms
      ├─ Program archived
      ├─ Badge shows "📦 ARCHIVED"
      ├─ Button changes to "Unarchive Program"
      └─ Toast: "Program archived successfully"

3. User can unarchive anytime:
   ├─ Click "Unarchive Program"
   ├─ Program unarchived immediately
   ├─ Badge removed
   ├─ Button changes to "Archive Program"
   └─ Toast: "Program unarchived successfully"
```

---

## 🚀 **Benefits**

### Business Logic Enforcement:
- ✅ Prevents invalid program states
- ✅ Ensures data hierarchy integrity
- ✅ Clear user guidance when rules violated

### User Experience:
- ✅ Real-time validation feedback
- ✅ Clear error messages with counts
- ✅ One-click unarchive
- ✅ Visual status indicators

### Compliance:
- ✅ Audit trail (who archived, when)
- ✅ Reversible operation
- ✅ Permission-based access

---

## 📝 **Future Enhancements**

### Phase 2 Possibilities:
1. **Filter archived programs** on programs list page
2. **Bulk archive** multiple programs at once
3. **Archive history log** (show previous archive/unarchive events)
4. **Cascade option** (optional: archive all projects when archiving program)
5. **Scheduled archival** (auto-archive after X days inactive)
6. **Archive reasons** (required comment field)

---

## 🔗 **Related Files**

### Backend:
- `server/migrations/202_add_program_archive_fields.sql`
- `server/services/programService.ts`
- `server/routes/programRoutes.ts`

### Frontend:
- `app/programs/[id]/page.tsx`

### Scripts:
- `server/scripts/run-archive-migration.js`

---

## ✅ **Acceptance Criteria**

Phase 1 Complete:
- [x] Database schema supports archiving
- [x] Backend validates all projects archived
- [x] API endpoints created (archive/unarchive/check)
- [x] Frontend UI with validation dialog
- [x] Visual indicators (badge, button state)
- [x] Toast notifications
- [x] Audit trail (archived_by, archived_at)
- [x] Permission checks
- [x] Error handling

---

**Implemented By**: ADPA Development Team  
**Date**: October 31, 2025  
**Status**: ✅ Complete and Ready for Production

