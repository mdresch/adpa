# Task Stakeholder Assignment Review

**Date:** December 2024  
**Reviewer:** AI Assistant  
**Purpose:** Review current implementation and identify gaps for stakeholder assignment to tasks

---

## Executive Summary

The current tasks page (`app/projects/[id]/tasks/page.tsx`) has **basic task management** but **lacks stakeholder assignment functionality**. The system currently supports:

✅ **Team Member Assignment** (via `task_assignments` table)  
❌ **Stakeholder Assignment** (no junction table exists)  
❌ **Volunteering Stakeholder Tracking** (no concept implemented)

---

## Current Implementation Analysis

### 1. Tasks Page (`app/projects/[id]/tasks/page.tsx`)

**Current Features:**
- ✅ Task list display with filters
- ✅ Task details modal with tabs (Details, Resources, Dependencies, Hours, Source)
- ✅ Basic resource assignment UI (placeholder - shows TODO)
- ❌ No stakeholder assignment UI
- ❌ No distinction between team members and stakeholders

**Key Code References:**
```38:41:app/projects/[id]/tasks/page.tsx
  const handleAssignTask = (taskId: string) => {
    // TODO: Open assignment modal
    toast.info('Resource assignment - Coming in Phase 2')
  }
```

### 2. Task Resources View (`components/project/TaskResourcesView.tsx`)

**Current State:**
- Shows assigned user (from `task.assigned_user_id`)
- Displays role information (`task.required_role_name`)
- Has placeholder for "Assign Resource" button
- **Missing:** Stakeholder assignment section
- **Missing:** Volunteer contributor tracking

**Key Code References:**
```27:35:components/project/TaskResourcesView.tsx
  const handleAssignResource = () => {
    // TODO: Open ResourceAssignmentModal
    toast.info('Resource assignment modal - Coming soon!')
  }

  const handleUnassign = (userId: string) => {
    // TODO: Implement unassign
    toast.info('Unassign functionality - Coming soon!')
  }
```

### 3. Database Schema

#### ✅ Existing Tables

**`project_tasks`** (Migration 208)
- Contains task information
- Has `required_role_id` for role requirements
- No direct stakeholder linkage

**`task_assignments`** (Migration 208)
- Links tasks to **team members** (users) via `resource_assignment_id`
- Tracks planned hours, costs, allocation percentage
- Used for **paid employees/contractors** with roles
- Fields: `user_id`, `role_id`, `planned_hours`, `hourly_rate`, `planned_cost`

**`stakeholders`** (Migration 007)
- Contains stakeholder information per project
- Fields: `name`, `role`, `email`, `interest_level`, `influence_level`, `engagement_approach`
- **No relationship to tasks**

#### ❌ Missing Tables

**`task_stakeholders`** (Junction Table - **DOES NOT EXIST**)
- Needed to link stakeholders to tasks
- Should track:
  - Stakeholder contribution type (volunteer, reviewer, approver, contributor)
  - Contribution level (hours, percentage, or qualitative)
  - Status (assigned, active, completed)
  - Notes/expectations

---

## Gap Analysis

### Gap 1: No Stakeholder-Task Relationship

**Problem:**
- Stakeholders exist at project level but cannot be assigned to specific tasks
- No way to track which stakeholders are involved in task completion
- No distinction between:
  - **Team Members** (assigned via `task_assignments` - paid, have roles)
  - **Stakeholders** (should be assignable - may volunteer, review, approve)

**Impact:**
- Cannot track stakeholder engagement at task level
- Missing visibility into who needs to be informed/consulted for each task
- No way to manage volunteer contributions

### Gap 2: No UI for Stakeholder Assignment

**Problem:**
- `TaskResourcesView` only shows team member assignments
- No section for stakeholder assignments
- No modal/form to assign stakeholders to tasks

**Impact:**
- Users cannot assign stakeholders to tasks
- No visual distinction between team members and stakeholders

### Gap 3: No Volunteer Tracking

**Problem:**
- No concept of "volunteering stakeholders" who wish to contribute
- No way to track volunteer hours or contributions
- No mechanism to match volunteers with tasks needing help

**Impact:**
- Cannot leverage volunteer contributions
- Missing opportunity to engage stakeholders actively

---

## Recommended Solution

### Phase 1: Database Schema Enhancement

#### Create `task_stakeholders` Junction Table

```sql
CREATE TABLE IF NOT EXISTS task_stakeholders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
  stakeholder_id UUID NOT NULL REFERENCES stakeholders(id) ON DELETE CASCADE,
  
  -- Assignment Details
  assignment_type VARCHAR(50) DEFAULT 'contributor' CHECK (
    assignment_type IN (
      'contributor',      -- Actively working on task
      'reviewer',        -- Reviews task output
      'approver',        -- Approves task completion
      'consultant',       -- Provides input/advice
      'volunteer',        -- Volunteering time/skills
      'observer'          -- Kept informed
    )
  ),
  
  -- Contribution Tracking
  contribution_level VARCHAR(50),  -- 'high', 'medium', 'low', or hours
  estimated_hours DECIMAL(10,2),   -- If contributing time
  actual_hours DECIMAL(10,2),      -- Tracked volunteer hours
  
  -- Role in Task
  role_in_task VARCHAR(255),       -- e.g., "Subject Matter Expert", "Beta Tester"
  responsibilities TEXT[],          -- What they're responsible for
  
  -- Status
  status VARCHAR(50) DEFAULT 'assigned' CHECK (
    status IN ('assigned', 'active', 'completed', 'declined', 'on-hold')
  ),
  
  -- Engagement
  engagement_required BOOLEAN DEFAULT TRUE,
  communication_frequency VARCHAR(50),  -- 'daily', 'weekly', 'as-needed'
  
  -- Notes
  notes TEXT,
  expectations TEXT,               -- What's expected from stakeholder
  
  -- Audit
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_task_stakeholder UNIQUE(task_id, stakeholder_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_task_stakeholders_task ON task_stakeholders(task_id);
CREATE INDEX IF NOT EXISTS idx_task_stakeholders_stakeholder ON task_stakeholders(stakeholder_id);
CREATE INDEX IF NOT EXISTS idx_task_stakeholders_type ON task_stakeholders(assignment_type);
CREATE INDEX IF NOT EXISTS idx_task_stakeholders_status ON task_stakeholders(status);

COMMENT ON TABLE task_stakeholders IS 'Links stakeholders to tasks - tracks volunteer contributions and engagement';
COMMENT ON COLUMN task_stakeholders.assignment_type IS 'Type of stakeholder involvement (contributor, reviewer, volunteer, etc.)';
COMMENT ON COLUMN task_stakeholders.actual_hours IS 'Tracked volunteer hours for contributing stakeholders';
```

### Phase 2: Backend API Enhancement

#### Add Endpoints to `server/src/routes/tasks.ts`

```typescript
// POST /api/tasks/:id/stakeholders
// Assign stakeholder to task
router.post('/:id/stakeholders',
  authenticateToken,
  requirePermission('projects.manage'),
  validate(Joi.object({
    stakeholderId: Joi.string().uuid().required(),
    assignmentType: Joi.string().valid('contributor', 'reviewer', 'approver', 'consultant', 'volunteer', 'observer').required(),
    roleInTask: Joi.string().optional(),
    estimatedHours: Joi.number().min(0).optional(),
    contributionLevel: Joi.string().optional(),
    responsibilities: Joi.array().items(Joi.string()).optional(),
    notes: Joi.string().optional(),
    expectations: Joi.string().optional()
  })),
  async (req, res) => {
    // Implementation
  }
)

// GET /api/tasks/:id/stakeholders
// Get stakeholders assigned to task
router.get('/:id/stakeholders',
  authenticateToken,
  async (req, res) => {
    // Implementation
  }
)

// DELETE /api/tasks/:id/stakeholders/:stakeholderId
// Unassign stakeholder from task
router.delete('/:id/stakeholders/:stakeholderId',
  authenticateToken,
  requirePermission('projects.manage'),
  async (req, res) => {
    // Implementation
  }
)

// GET /api/tasks/:id/volunteers
// Get volunteering stakeholders for task
router.get('/:id/volunteers',
  authenticateToken,
  async (req, res) => {
    // Filter stakeholders with assignment_type = 'volunteer'
  }
)
```

#### Add Service Methods to `server/src/services/taskSchedulingService.ts`

```typescript
export interface TaskStakeholderAssignment {
  id: string
  taskId: string
  stakeholderId: string
  stakeholderName: string
  stakeholderEmail: string
  assignmentType: 'contributor' | 'reviewer' | 'approver' | 'consultant' | 'volunteer' | 'observer'
  roleInTask?: string
  estimatedHours?: number
  actualHours?: number
  contributionLevel?: string
  responsibilities?: string[]
  status: 'assigned' | 'active' | 'completed' | 'declined' | 'on-hold'
  notes?: string
  expectations?: string
}

export async function assignStakeholderToTask(
  taskId: string,
  stakeholderId: string,
  assignmentType: string,
  userId: string,
  options?: {
    roleInTask?: string
    estimatedHours?: number
    contributionLevel?: string
    responsibilities?: string[]
    notes?: string
    expectations?: string
  }
): Promise<TaskStakeholderAssignment>

export async function getTaskStakeholders(taskId: string): Promise<TaskStakeholderAssignment[]>

export async function getTaskVolunteers(taskId: string): Promise<TaskStakeholderAssignment[]>

export async function unassignStakeholderFromTask(
  taskId: string,
  stakeholderId: string
): Promise<void>
```

### Phase 3: Frontend UI Enhancement

#### Update `TaskResourcesView.tsx`

Add a new section for **Stakeholder Assignments**:

```typescript
// Add to TaskResourcesView component
<div className="space-y-6">
  {/* Existing Team Members Section */}
  <div>
    <h3 className="text-lg font-semibold">Assigned Team Members</h3>
    {/* Current team member assignment UI */}
  </div>

  {/* NEW: Stakeholder Assignments Section */}
  <div>
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold">Stakeholder Assignments</h3>
      <Button onClick={handleAssignStakeholder} size="sm">
        <UserPlus className="mr-2 h-4 w-4" />
        Assign Stakeholder
      </Button>
    </div>

    {/* Show assigned stakeholders grouped by type */}
    {taskStakeholders.map(group => (
      <div key={group.type} className="mb-4">
        <h4 className="text-sm font-semibold mb-2 capitalize">{group.type}s</h4>
        {group.stakeholders.map(stakeholder => (
          <StakeholderAssignmentCard
            key={stakeholder.id}
            stakeholder={stakeholder}
            onUnassign={handleUnassignStakeholder}
          />
        ))}
      </div>
    ))}

    {/* Show volunteering stakeholders separately */}
    {volunteers.length > 0 && (
      <div className="border-t pt-4 mt-4">
        <h4 className="text-sm font-semibold mb-2 text-green-700">
          Volunteering Contributors
        </h4>
        {volunteers.map(volunteer => (
          <VolunteerCard
            key={volunteer.id}
            volunteer={volunteer}
            onAccept={handleAcceptVolunteer}
            onDecline={handleDeclineVolunteer}
          />
        ))}
      </div>
    )}
  </div>
</div>
```

#### Create New Components

**`components/project/TaskStakeholderAssignmentModal.tsx`**
- Modal to assign stakeholders to tasks
- Form fields:
  - Stakeholder selector (dropdown with project stakeholders)
  - Assignment type (contributor, reviewer, approver, volunteer, etc.)
  - Role in task
  - Estimated hours (if volunteer/contributor)
  - Responsibilities
  - Notes/expectations

**`components/project/StakeholderAssignmentCard.tsx`**
- Card component showing stakeholder assignment
- Displays: name, role, assignment type, contribution level, status
- Actions: Edit, Unassign, View Details

**`components/project/VolunteerCard.tsx`**
- Special card for volunteering stakeholders
- Shows: name, skills, availability, proposed contribution
- Actions: Accept Volunteer, Decline, Request More Info

#### Update `hooks/use-tasks.ts`

Add hooks for stakeholder management:

```typescript
export interface TaskStakeholder {
  id: string
  taskId: string
  stakeholderId: string
  stakeholderName: string
  stakeholderEmail: string
  assignmentType: 'contributor' | 'reviewer' | 'approver' | 'consultant' | 'volunteer' | 'observer'
  roleInTask?: string
  estimatedHours?: number
  actualHours?: number
  contributionLevel?: string
  responsibilities?: string[]
  status: 'assigned' | 'active' | 'completed' | 'declined' | 'on-hold'
  notes?: string
}

export function useTaskStakeholders(taskId: string) {
  // Fetch stakeholders assigned to task
}

export function useTaskStakeholderMutations(taskId: string, onSuccess?: () => void) {
  // assignStakeholder, unassignStakeholder, updateStakeholderAssignment
}
```

### Phase 4: Task Details Modal Enhancement

Update `TaskDetailsModal.tsx` to include a new tab:

```typescript
<TabsList className="grid grid-cols-6 w-full">
  <TabsTrigger value="details">Details</TabsTrigger>
  <TabsTrigger value="resources">Team</TabsTrigger>
  <TabsTrigger value="stakeholders">Stakeholders</TabsTrigger> {/* NEW */}
  <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
  <TabsTrigger value="hours">Hours</TabsTrigger>
  <TabsTrigger value="source">Source</TabsTrigger>
</TabsList>

<TabsContent value="stakeholders" className="mt-4">
  <TaskStakeholdersView task={task} onUpdate={handleTaskUpdate} />
</TabsContent>
```

---

## Implementation Priority

### 🔴 High Priority (Phase 1)
1. Create `task_stakeholders` database table
2. Add backend API endpoints for stakeholder assignment
3. Update `TaskResourcesView` to show stakeholder section
4. Create `TaskStakeholderAssignmentModal` component

### 🟠 Medium Priority (Phase 2)
5. Add volunteer tracking functionality
6. Create `VolunteerCard` component
7. Add volunteer acceptance/decline workflow
8. Update task details modal with stakeholders tab

### 🟡 Low Priority (Phase 3)
9. Add stakeholder contribution hours tracking
10. Create stakeholder engagement analytics
11. Add notifications for stakeholder assignments
12. Create volunteer matching suggestions

---

## Key Distinctions

### Team Members vs Stakeholders

| Aspect | Team Members | Stakeholders |
|--------|-------------|--------------|
| **Table** | `task_assignments` | `task_stakeholders` |
| **Relationship** | Via `resource_assignment_id` | Direct stakeholder link |
| **Compensation** | Paid (hourly rate) | May be volunteer |
| **Role** | Project role (Developer, PM, etc.) | Task-specific role |
| **Hours Tracking** | Billable hours | Volunteer hours |
| **Assignment Type** | Resource allocation | Engagement type |
| **Purpose** | Execute work | Review, approve, contribute |

### Assignment Types

1. **Contributor** - Actively working on task (like team member but stakeholder)
2. **Reviewer** - Reviews task output before completion
3. **Approver** - Must approve task completion
4. **Consultant** - Provides input/advice
5. **Volunteer** - Volunteering time/skills (no payment)
6. **Observer** - Kept informed of progress

---

## Testing Checklist

- [ ] Can assign stakeholder to task
- [ ] Can view assigned stakeholders per task
- [ ] Can unassign stakeholder from task
- [ ] Can distinguish team members from stakeholders
- [ ] Can track volunteer hours separately from billable hours
- [ ] Can filter tasks by stakeholder assignment
- [ ] Can see volunteering stakeholders who want to contribute
- [ ] Can accept/decline volunteer contributions
- [ ] UI clearly shows difference between team and stakeholders

---

## Next Steps

1. **Review this document** with stakeholders
2. **Approve database schema** changes
3. **Create migration** for `task_stakeholders` table
4. **Implement backend** API endpoints
5. **Build frontend** components
6. **Test** end-to-end functionality
7. **Document** user guide for stakeholder assignment

---

## Questions for Clarification

1. Should volunteering stakeholders be able to self-assign, or only project managers?
2. Do we need approval workflow for volunteer assignments?
3. Should volunteer hours be tracked differently from team member hours?
4. Do we need notifications when stakeholders are assigned to tasks?
5. Should stakeholders see their assigned tasks in a dashboard?

---

**Document Status:** Draft - Awaiting Review  
**Last Updated:** December 2024

