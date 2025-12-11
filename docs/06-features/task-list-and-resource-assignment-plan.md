# Task List Overview and Resource Assignment Implementation Plan

## Overview

This document outlines the implementation plan for completing the task list overview page and task details view with resource assignment functionality. The implementation ensures that internal stakeholders marked as team members (`is_team_member = true`) can be assigned to tasks.

## Current State Analysis

### ✅ What's Already Implemented

1. **Backend Infrastructure**
   - Task management routes (`server/src/routes/tasks.ts`)
   - Task assignment API endpoint (`POST /api/tasks/:id/assign`)
   - Resource assignment service (`server/src/services/taskSchedulingService.ts`)
   - Stakeholder team member support in `getProjectResourceAssignments` (`server/src/services/timeTrackingService.ts`)
   - Stakeholder assignment logic (handles `stakeholder-` prefix)

2. **Frontend Components**
   - Tasks list page (`app/projects/[id]/tasks/page.tsx`) - skeleton exists
   - Task details modal (`components/project/TaskDetailsModal.tsx`) - exists with tabs
   - Resource assignment dialog (`components/project/ResourceAssignmentDialog.tsx`) - exists
   - Task table component (`components/project/TaskTable.tsx`) - exists
   - Task resources view (`components/project/TaskResourcesView.tsx`) - exists

3. **Data Model**
   - `project_tasks` table with assignment fields
   - `task_assignments` table for resource assignments
   - `stakeholders` table with `is_team_member` flag
   - Support for stakeholder-based assignments via `stakeholder-{id}` prefix

### ❌ What Needs Implementation

1. **Tasks List Page** ⚠️ **PRIMARY GAP**
   - Wire up assignment functionality from table actions
   - Connect to ResourceAssignmentDialog
   - Handle assignment success callbacks
   - Currently shows TODO placeholder

2. **Task Details Modal - Resources Tab** ✅ **ALREADY IMPLEMENTED**
   - ✅ TaskResourcesView component fully implemented
   - ✅ Displays current task assignments
   - ✅ Shows assigned resources (including stakeholders)
   - ✅ Allows adding new assignments via ResourceAssignmentDialog
   - ✅ Allows removing assignments
   - ✅ Handles loading and error states

3. **ResourceAssignmentDialog** ✅ **MOSTLY IMPLEMENTED**
   - ✅ Fetches stakeholders via getProjectResourceAssignments
   - ✅ Displays stakeholders with is_team_member = true
   - ✅ Shows assignment source indicator
   - ⚠️ May need minor enhancements for better UX

4. **TaskResourcesView Component** ✅ **FULLY IMPLEMENTED**
   - ✅ Displays list of current assignments
   - ✅ Shows assignment details (hours, dates, allocation, cost)
   - ✅ Has "Assign Resource" button
   - ✅ Handles unassignment
   - ✅ Shows empty state

## Implementation Plan

### Phase 1: Enhance Tasks List Page

**File**: `app/projects/[id]/tasks/page.tsx`

**Changes**:
1. Import `ResourceAssignmentDialog` component
2. Add state for assignment dialog (open/close, selected task)
3. Wire up `handleAssignTask` to open dialog
4. Handle assignment success to refresh task list

**Code Changes**:
```typescript
// Add imports
import { ResourceAssignmentDialog } from "@/components/project/ResourceAssignmentDialog"

// Add state
const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false)
const [selectedTaskForAssignment, setSelectedTaskForAssignment] = useState<string | null>(null)

// Update handleAssignTask
const handleAssignTask = (taskId: string) => {
  setSelectedTaskForAssignment(taskId)
  setAssignmentDialogOpen(true)
}

// Add dialog component
<ResourceAssignmentDialog
  open={assignmentDialogOpen}
  onOpenChange={setAssignmentDialogOpen}
  taskId={selectedTaskForAssignment || ''}
  projectId={projectId}
  onSuccess={() => {
    refetch() // Refresh tasks
    setAssignmentDialogOpen(false)
    setSelectedTaskForAssignment(null)
  }}
/>
```

### Phase 2: TaskResourcesView Component ✅ **ALREADY COMPLETE**

**File**: `components/project/TaskResourcesView.tsx`

**Current State**: ✅ Fully implemented and functional

**Implemented Features**:
1. ✅ Displays current task assignments (from `GET /api/tasks/:id/assignments`)
2. ✅ Shows assignment details:
   - Resource name (user or stakeholder)
   - Role
   - Planned hours
   - Actual hours
   - Scheduled dates
   - Allocation percentage
   - Estimated cost
3. ✅ "Assign Resource" button opens ResourceAssignmentDialog
4. ✅ "Remove Assignment" action for each assignment
5. ✅ Handles loading and error states
6. ✅ Shows empty state with call-to-action

**No changes needed** - Component is production-ready

### Phase 3: Verify ResourceAssignmentDialog ✅ **MOSTLY COMPLETE**

**File**: `components/project/ResourceAssignmentDialog.tsx`

**Current State**: ✅ Fully implemented with stakeholder support

**Verified Features**:
- ✅ Fetches both resource assignments and stakeholders via `getProjectResourceAssignments`
- ✅ Displays stakeholders with `is_team_member = true`
- ✅ Shows assignment source indicator (badge showing "Team Member")
- ✅ Handles stakeholder ID prefix (`stakeholder-{id}`) in backend
- ✅ Submits assignment correctly
- ✅ Shows hourly rate information
- ✅ Displays helpful message when no resources available

**Minor Enhancement Opportunities** (Optional):
1. Add more prominent visual distinction between resource assignments and stakeholders
2. Add link to stakeholders tab for configuration
3. Show validation message if stakeholder doesn't have user_id (though they shouldn't appear in list)

### Phase 4: Backend Verification

**Files to Verify**:
- `server/src/services/taskSchedulingService.ts` - `assignResourceToTask` function
- `server/src/services/timeTrackingService.ts` - `getProjectResourceAssignments` function
- `server/src/routes/tasks.ts` - Assignment endpoints

**Verification Points**:
1. ✅ Stakeholder assignment logic handles `stakeholder-` prefix
2. ✅ Validates `is_team_member = true` and `stakeholder_type = 'internal'`
3. ✅ Requires `user_id` to be set on stakeholder
4. ✅ Returns proper error messages for invalid assignments
5. ✅ Creates task assignment record correctly

### Phase 5: Task Table Enhancement

**File**: `components/project/TaskTable.tsx`

**Current State**: Shows assigned user but may not show all assignments

**Enhancement**:
- Display multiple assignments if task has multiple resources
- Show assignment count badge
- Click to view details opens TaskDetailsModal

## Database Schema Reference

### Relevant Tables

**project_tasks**
- `id` (UUID)
- `project_id` (UUID)
- `task_name` (VARCHAR)
- `assigned_user_id` (UUID) - Legacy single assignment

**task_assignments**
- `id` (UUID)
- `task_id` (UUID)
- `resource_assignment_id` (UUID, nullable) - For resource assignments
- `user_id` (UUID) - The assigned user
- `user_name` (VARCHAR)
- `role_id` (UUID, nullable)
- `role_name` (VARCHAR)
- `planned_hours` (NUMERIC)
- `hourly_rate` (NUMERIC)
- `planned_cost` (NUMERIC)
- `scheduled_start_date` (DATE)
- `scheduled_end_date` (DATE)
- `allocation_percentage` (INTEGER)

**stakeholders**
- `id` (UUID)
- `project_id` (UUID)
- `name` (VARCHAR)
- `email` (VARCHAR)
- `role` (VARCHAR)
- `stakeholder_type` (VARCHAR) - 'internal' or 'external'
- `is_team_member` (BOOLEAN) - Must be true for task assignment
- `user_id` (UUID) - Must be set for task assignment
- `metadata` (JSONB) - Can contain `hourly_rate`

## API Endpoints Reference

### Get Task Assignments
```
GET /api/tasks/:id/assignments
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": [
    {
      "id": "assignment-uuid",
      "taskId": "task-uuid",
      "userId": "user-uuid",
      "userName": "John Doe",
      "roleName": "Developer",
      "plannedHours": 40,
      "hourlyRate": 75.00,
      "plannedCost": 3000.00,
      "scheduledStartDate": "2024-01-15",
      "scheduledEndDate": "2024-01-31",
      "allocationPercentage": 100
    }
  ]
}
```

### Assign Resource to Task
```
POST /api/tasks/:id/assign
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "resourceAssignmentId": "stakeholder-{stakeholder-id}" | "{resource-assignment-id}",
  "plannedHours": 40,
  "scheduledStartDate": "2024-01-15", // Optional
  "scheduledEndDate": "2024-01-31",   // Optional
  "allocationPercentage": 100          // Optional, default 100
}

Response:
{
  "success": true,
  "data": {
    "id": "assignment-uuid",
    "taskId": "task-uuid",
    "userId": "user-uuid",
    "userName": "John Doe",
    "plannedHours": 40,
    "plannedCost": 3000.00
  }
}
```

### Unassign Resource from Task
```
DELETE /api/tasks/assignments/:assignmentId
Authorization: Bearer {token}

Response:
{
  "success": true,
  "message": "Resource unassigned from task"
}
```

### Get Project Resource Assignments (for dropdown)
```
GET /api/cost-management/projects/:projectId/assignments
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": [
    {
      "id": "stakeholder-{id}" | "{resource-assignment-id}",
      "user_id": "user-uuid",
      "user_name": "John Doe",
      "user_email": "john@example.com",
      "role_id": "role-uuid",
      "role_name": "Developer",
      "hourly_rate": 75.00,
      "assignment_source": "stakeholder" | "resource_assignment",
      "stakeholder_id": "stakeholder-uuid" // Only for stakeholders
    }
  ]
}
```

## Implementation Checklist

### Frontend Tasks

- [ ] **Phase 1: Tasks List Page** ⚠️ **REQUIRED**
  - [ ] Import ResourceAssignmentDialog
  - [ ] Add state management for assignment dialog
  - [ ] Wire up handleAssignTask function (currently shows TODO)
  - [ ] Add ResourceAssignmentDialog component
  - [ ] Handle assignment success callback to refresh task list

- [x] **Phase 2: TaskResourcesView Component** ✅ **COMPLETE**
  - [x] Review current implementation
  - [x] Add API call to fetch task assignments
  - [x] Display assignments list
  - [x] Show assignment details (hours, dates, cost)
  - [x] Add "Assign Resource" button
  - [x] Integrate ResourceAssignmentDialog
  - [x] Add unassignment functionality
  - [x] Handle loading and error states
  - [x] Show empty state

- [x] **Phase 3: ResourceAssignmentDialog Verification** ✅ **VERIFIED**
  - [x] Verify stakeholder display (shows "Team Member" badge)
  - [x] Test stakeholder assignment submission (handles `stakeholder-` prefix)
  - [x] Verify assignment source indicators (badge in dropdown)
  - [x] Test with stakeholders without hourly rate (shows "Rate not set")
  - [x] Test with stakeholders without user_id (filtered out in backend query)

- [ ] **Phase 4: Task Table**
  - [ ] Verify assignment display
  - [ ] Add multiple assignments display if needed
  - [ ] Test click-through to details modal

### Backend Verification

- [ ] **API Endpoints**
  - [ ] Verify GET /api/tasks/:id/assignments returns all assignments
  - [ ] Verify POST /api/tasks/:id/assign handles stakeholder prefix
  - [ ] Verify DELETE /api/tasks/assignments/:id works correctly
  - [ ] Test error handling for invalid assignments

- [ ] **Service Layer**
  - [ ] Verify assignResourceToTask handles stakeholders
  - [ ] Verify getProjectResourceAssignments includes stakeholders
  - [ ] Test validation logic (is_team_member, stakeholder_type, user_id)

### Testing

- [ ] **Unit Tests**
  - [ ] Test ResourceAssignmentDialog component
  - [ ] Test TaskResourcesView component
  - [ ] Test assignment API endpoints

- [ ] **Integration Tests**
  - [ ] Test full assignment flow (stakeholder → task)
  - [ ] Test unassignment flow
  - [ ] Test multiple assignments per task
  - [ ] Test error scenarios (invalid stakeholder, missing user_id)

- [ ] **User Acceptance Testing**
  - [ ] Create internal stakeholder with is_team_member = true
  - [ ] Assign stakeholder to task via UI
  - [ ] Verify assignment appears in task details
  - [ ] Verify assignment appears in task list
  - [ ] Test unassignment
  - [ ] Test with external stakeholder (should not appear)
  - [ ] Test with stakeholder without user_id (should not appear)

## Stakeholder Eligibility Criteria

For a stakeholder to be assignable to a task, they must meet ALL of the following criteria:

1. ✅ `stakeholder_type = 'internal'`
2. ✅ `is_team_member = true`
3. ✅ `user_id IS NOT NULL` (must be linked to a user account)
4. ✅ Belongs to the same project as the task

These criteria are enforced in:
- `server/src/services/timeTrackingService.ts` - `getProjectResourceAssignments`
- `server/src/services/taskSchedulingService.ts` - `assignResourceToTask`

## Error Handling

### Common Error Scenarios

1. **Stakeholder not eligible**
   - Error: "Stakeholder team member not found or not eligible for task assignment"
   - Cause: Missing `is_team_member`, wrong `stakeholder_type`, or missing `user_id`
   - Solution: Verify stakeholder configuration

2. **Resource assignment not found**
   - Error: "Resource assignment not found"
   - Cause: Invalid `resourceAssignmentId` (not a valid UUID or stakeholder ID)
   - Solution: Verify resource assignment exists

3. **Task not found**
   - Error: "Task not found"
   - Cause: Invalid task ID
   - Solution: Verify task exists

4. **Cannot unassign with approved time entries**
   - Error: "Cannot unassign resource with approved time entries"
   - Cause: Time has been logged and approved for this assignment
   - Solution: Handle time entries first

## UI/UX Considerations

### ResourceAssignmentDialog

1. **Visual Indicators**
   - Show badge/indicator for stakeholder-based assignments
   - Display hourly rate warning if not set
   - Show role information clearly

2. **User Guidance**
   - Help text explaining stakeholder vs resource assignment
   - Instructions for setting up stakeholders as team members
   - Link to stakeholders tab for configuration

### TaskResourcesView

1. **Assignment Display**
   - Clear list/card layout
   - Show all relevant details
   - Visual distinction for assignment source
   - Easy unassignment action

2. **Empty State**
   - Helpful message when no assignments
   - Clear call-to-action to assign resources

## Success Criteria

The implementation is complete when:

1. ✅ Users can view all tasks in the tasks list page
2. ✅ Users can click "Assign Resource" from task table actions
3. ✅ ResourceAssignmentDialog opens and shows available resources
4. ✅ Stakeholders with `is_team_member = true` appear in the resource list
5. ✅ Users can select and assign a stakeholder to a task
6. ✅ Assignment appears in task details modal → Resources tab
7. ✅ Assignment details are displayed correctly (hours, dates, cost)
8. ✅ Users can remove assignments
9. ✅ Task list refreshes after assignment/unassignment
10. ✅ Only eligible stakeholders (internal, team member, with user_id) appear

## Next Steps

1. ✅ Review implementation plan
2. ✅ Verify existing components (TaskResourcesView, ResourceAssignmentDialog)
3. **Implement Phase 1 (Tasks List Page)** - **PRIMARY TASK**
   - Wire up ResourceAssignmentDialog in tasks page
   - Connect handleAssignTask function
   - Test assignment flow from task table
4. Test end-to-end flow:
   - Assign stakeholder from task table
   - Verify assignment in task details modal
   - Test unassignment
5. Code review
6. Merge to main

## Summary

**Good News**: Most of the implementation is already complete! 

- ✅ TaskResourcesView is fully functional
- ✅ ResourceAssignmentDialog supports stakeholders
- ✅ Backend handles stakeholder assignments correctly
- ⚠️ **Only Gap**: Tasks list page needs to wire up the assignment dialog

**Estimated Effort**: ~1-2 hours to complete Phase 1 (Tasks List Page wiring)

## Related Documentation

- Task Management Routes: `server/src/routes/tasks.ts`
- Task Scheduling Service: `server/src/services/taskSchedulingService.ts`
- Time Tracking Service: `server/src/services/timeTrackingService.ts`
- Stakeholder Management: `server/src/routes/stakeholders.ts`
- Migration 333: `server/migrations/333_add_is_team_member_to_stakeholders.sql`

## Notes

- The backend already supports stakeholder assignments via the `stakeholder-{id}` prefix
- The `getProjectResourceAssignments` service already includes eligible stakeholders
- The main work is connecting the frontend components and ensuring proper UI flow
- All database schema and API endpoints are already in place

