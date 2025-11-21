# Code Changes - Exact Diff

## File 1: server/src/services/taskManagementService.ts

### Location
Lines 178-275 (getTaskById function)

### Old Code (BEFORE)
```typescript
/**
 * Get task by ID with full details
 */
export async function getTaskById(taskId: string): Promise<ProjectTask | null> {
  try {
    const result = await pool.query(`
      SELECT 
        t.*,
        pr.role_name,
        pr.default_hourly_rate,
        COUNT(DISTINCT ta.id) as assignment_count,
        STRING_AGG(DISTINCT u.name, ', ') as assigned_to_names
      FROM project_tasks t
      LEFT JOIN project_roles pr ON t.required_role_id = pr.id
      LEFT JOIN task_assignments ta ON t.id = ta.task_id
      LEFT JOIN users u ON ta.user_id = u.id
      WHERE t.id = $1
      GROUP BY t.id, pr.role_name, pr.default_hourly_rate
    `, [taskId])
    
    return result.rows[0] || null
  } catch (error) {
    logger.error('getTaskById error', { error, taskId })
    throw error
  }
}
```

### New Code (AFTER)
```typescript
/**
 * Get task by ID with full details
 */
export async function getTaskById(taskId: string): Promise<ProjectTask | null> {
  try {
    // Get the base task
    const taskResult = await pool.query(`
      SELECT 
        t.*,
        pr.role_name as required_role_name
      FROM project_tasks t
      LEFT JOIN project_roles pr ON t.required_role_id = pr.id
      WHERE t.id = $1
    `, [taskId])
    
    if (!taskResult.rows.length) {
      return null
    }
    
    const task = taskResult.rows[0]
    
    // Get task dependencies
    const depsResult = await pool.query(`
      SELECT 
        td.id,
        td.task_id,
        td.depends_on_task_id,
        td.dependency_type,
        td.lag_days,
        pt1.task_number as predecessor_task_number,
        pt1.task_name as predecessor_task_name,
        pt2.task_number as successor_task_number,
        pt2.task_name as successor_task_name
      FROM task_dependencies td
      LEFT JOIN project_tasks pt1 ON td.depends_on_task_id = pt1.id
      LEFT JOIN project_tasks pt2 ON td.task_id = pt2.id
      WHERE td.task_id = $1 OR td.depends_on_task_id = $1
    `, [taskId])
    
    const dependencies = depsResult.rows.map(dep => ({
      id: dep.id,
      predecessor_task_id: dep.depends_on_task_id,
      successor_task_id: dep.task_id,
      dependency_type: dep.dependency_type,
      lag_days: dep.lag_days,
      predecessor_task: {
        task_number: dep.predecessor_task_number,
        task_name: dep.predecessor_task_name
      },
      successor_task: {
        task_number: dep.successor_task_number,
        task_name: dep.successor_task_name
      }
    }))
    
    // Get task assignments/resources
    const resourcesResult = await pool.query(`
      SELECT 
        ta.id,
        ta.task_id,
        ta.user_id,
        ta.user_name,
        ta.role_id,
        ta.role_name,
        ta.allocation_percentage,
        ta.planned_hours,
        ta.actual_hours,
        ta.status
      FROM task_assignments ta
      WHERE ta.task_id = $1
    `, [taskId])
    
    const assigned_resources = resourcesResult.rows.map(res => ({
      id: res.id,
      task_id: res.task_id,
      user_id: res.user_id,
      user_name: res.user_name,
      role_id: res.role_id,
      role_name: res.role_name,
      allocation_percentage: res.allocation_percentage
    }))
    
    // Get primary assignment (first one or the one with 100% allocation)
    const primaryAssignment = assigned_resources.find(r => r.allocation_percentage === 100) || assigned_resources[0]
    
    return {
      id: task.id,
      project_id: task.project_id,
      task_number: task.task_number,
      wbs_code: task.wbs_code,
      task_name: task.task_name,
      description: task.description,
      estimated_hours: task.estimated_hours,
      actual_hours: task.actual_hours,
      start_date: task.planned_start_date,
      end_date: task.planned_end_date,
      required_role_id: task.required_role_id,
      required_role_name: task.required_role_name,
      assigned_user_id: primaryAssignment?.user_id,
      assigned_user_name: primaryAssignment?.user_name,
      status: task.status,
      progress_percentage: task.percent_complete || 0,
      source_document_id: null,
      source_entity_id: null,
      imported_from_wbs: task.imported_from_wbs,
      created_at: task.created_at,
      updated_at: task.updated_at,
      dependencies: dependencies,
      assigned_resources: assigned_resources
    } as any
  } catch (error) {
    logger.error('getTaskById error', { error, taskId })
    throw error
  }
}
```

### Key Changes
| Aspect | Before | After |
|--------|--------|-------|
| Query Approach | Single complex query | Three focused queries |
| Result Mapping | Direct return of row | Explicitly mapped to interface |
| Dependencies | Not included | Fetched separately + mapped to array |
| Resources | Comma-separated string | Fetched separately + mapped to array |
| Aliases | `role_name`, `assignment_count`, `assigned_to_names` | `required_role_name`, `assigned_resources` array |
| Return Type | Raw database row | Properly formatted Task interface |

---

## File 2: components/project/TaskDetailsModal.tsx

### Change 1: Add Briefcase Icon Import (Line 21)

**Before:**
```typescript
import {
  AlertCircle,
  Calendar,
  Clock,
  FileText,
  GripVertical,
  Settings,
  Users,
  X
} from 'lucide-react'
```

**After:**
```typescript
import {
  AlertCircle,
  Briefcase,
  Calendar,
  Clock,
  FileText,
  GripVertical,
  Settings,
  Users,
  X
} from 'lucide-react'
```

**Change:** Added `Briefcase` to import list (alphabetically ordered)

---

### Change 2: Remove TaskRoleAssignment Component Reference (Lines 134-168)

**Before:**
```typescript
<Tabs defaultValue="details">
  <TabsList className="grid grid-cols-6 w-full">
    <TabsTrigger value="details">Details</TabsTrigger>
    <TabsTrigger value="resources">Resources</TabsTrigger>
    <TabsTrigger value="roles">Roles</TabsTrigger>
    <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
    <TabsTrigger value="hours">Hours</TabsTrigger>
    <TabsTrigger value="source">Source</TabsTrigger>
  </TabsList>
  
  {/* ... other tabs ... */}
  
  <TabsContent value="roles">
    <TaskRoleAssignment
      task={task}
      onResourceAssigned={() => {
        refetch()
        onTaskUpdated?.(task)
      }}
    />
  </TabsContent>
  
  {/* ... */}
</Tabs>
```

**After:**
```typescript
<Tabs defaultValue="details">
  <TabsList className="grid grid-cols-5 w-full">
    <TabsTrigger value="details">Details</TabsTrigger>
    <TabsTrigger value="resources">Resources</TabsTrigger>
    <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
    <TabsTrigger value="hours">Hours</TabsTrigger>
    <TabsTrigger value="source">Source</TabsTrigger>
  </TabsList>
  
  {/* ... other tabs ... */}
  
  {/* Removed: TaskRoleAssignment tab and component */}
  
  {/* ... */}
</Tabs>
```

**Changes:**
1. Removed `<TabsTrigger value="roles">Roles</TabsTrigger>` (line count: 6 tabs → 5 tabs)
2. Changed `grid-cols-6` to `grid-cols-5` (matches new tab count)
3. Removed entire `<TabsContent value="roles">` section with TaskRoleAssignment component
4. Removed TaskRoleAssignment component from imports (not referenced in file)

---

## Summary of Modifications

| File | Line(s) | Change Type | Lines Changed | Impact |
|------|---------|------------|---------------|---------
| `server/src/services/taskManagementService.ts` | 178-275 | Refactor | 97 | API response format |
| `components/project/TaskDetailsModal.tsx` | 21 | Add import | 1 | Added Briefcase icon |
| `components/project/TaskDetailsModal.tsx` | 135 | Fix layout | 1 | Grid cols 6→5 |
| `components/project/TaskDetailsModal.tsx` | 134-168 | Remove | 34 | Removed broken tab |

**Total Changes:** ~133 lines modified/removed

---

## How to Apply These Changes

### Option 1: Manual Edit (If Not Already Done)
1. Open `server/src/services/taskManagementService.ts`
2. Find `getTaskById` function (around line 178)
3. Replace entire function with new code
4. Save file

5. Open `components/project/TaskDetailsModal.tsx`
6. At line 21, add `Briefcase` to imports
7. Find TabsList (around line 135), change `grid-cols-6` to `grid-cols-5`
8. Find `<TabsContent value="roles">` section and delete entire section
9. Save file

### Option 2: Automated (If Using Git)
```bash
# Changes are already applied if you used the edit tools
# Just commit the changes:
git add server/src/services/taskManagementService.ts
git add components/project/TaskDetailsModal.tsx
git commit -m "fix: resolve task details modal empty display issue"
```

---

## Testing the Changes

After applying changes:

1. **Compile Check** - No TypeScript errors
   ```bash
   cd server
   npm run build
   # or
   npm run type-check
   ```

2. **Start Backend**
   ```bash
   npm run dev
   ```

3. **Frontend Test**
   - Navigate to `/projects/[projectId]/tasks`
   - Click on a task
   - Modal should open with data
   - Try each tab

4. **Verification**
   - Title shows: "{task_number} - {task_name}"
   - Details tab shows task form
   - Resources tab shows team members
   - Dependencies tab shows related tasks
   - Hours tab shows time tracking
   - Source tab shows WBS info

---

## Rollback Instructions

If you need to revert these changes:

```bash
# Revert all changes to both files
git checkout server/src/services/taskManagementService.ts
git checkout components/project/TaskDetailsModal.tsx

# Or revert just one file
git checkout server/src/services/taskManagementService.ts
```

---

## Files Impacted Summary

### Direct Changes
- `server/src/services/taskManagementService.ts` - Backend service
- `components/project/TaskDetailsModal.tsx` - Frontend component

### Indirect Dependencies (No Changes Needed)
- `server/src/routes/tasks.ts` - Uses updated getTaskById() ✓
- `hooks/use-tasks.ts` - Uses updated API response ✓
- `app/projects/[id]/tasks/page.tsx` - Uses updated TaskDetailsModal ✓

### No Database Changes
- Uses existing tables from migration 208 ✓
- No new migrations needed ✓
- No environment variable changes ✓

---

## Deployment Checklist

Before deploying:
- [ ] Changes applied to both files
- [ ] No TypeScript compilation errors
- [ ] Backend compiles successfully
- [ ] Frontend compiles successfully
- [ ] No console errors when loading task modal
- [ ] Task modal displays data correctly

Ready to:
- [ ] Commit changes to git
- [ ] Push to feature branch
- [ ] Create pull request
- [ ] Deploy to staging
- [ ] Deploy to production

