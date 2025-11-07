# 📋 Agent 2: Task Management UI System

**Mission:** Build comprehensive task management interface  
**Priority:** 🔴 HIGH - Unlock WBS import value  
**Timeline:** 1-2 weeks  
**Effort Estimate:** 36-40 hours  
**Status:** Ready to start  
**Branch:** `feature/task-management-ui`

---

## 📋 **Executive Summary**

You are building the **Task Management UI** to display and manage the **141 tasks already imported** into the database from AI-extracted WBS data. This unlocks the full value of the AI Extraction → WBS Import pipeline.

**Current State:**
- ✅ Backend: 100% complete
- ✅ Database: 141 tasks ready in `project_tasks` table
- ✅ API Endpoints: All built and tested
- ❌ Frontend: Only import button exists (10% complete)

**Your Mission:**
Build a complete task management interface where users can:
1. View all 141 imported tasks
2. Filter, sort, and search tasks
3. View task details with dependencies and resources
4. Assign users to tasks
5. Log actual hours worked
6. Track progress visually
7. (Optional) Display Gantt chart and Kanban board

---

## 🎯 **Your Mission**

Build 7 core components that allow project managers to:
- **View** all project tasks in a sortable/filterable table
- **Edit** task details (name, description, hours, dates)
- **Assign** team members to tasks with role matching
- **Track** actual hours vs estimated hours
- **Visualize** dependencies and timeline (Gantt chart)
- **Manage** task status (planned → in progress → completed)
- **Report** on project progress and resource utilization

**End Goal:** Project manager opens Tasks tab → Sees 141 tasks → Assigns resources → Tracks progress → Project stays on schedule

---

## 🏗️ **Architecture Overview**

```
Tasks Tab Page
    ↓
┌──────────────────────────────────┐
│  Metrics Cards (4 cards)         │
│  - Total Tasks                   │
│  - Completed Tasks               │
│  - Total Hours (Est vs Actual)   │
│  - Unassigned Tasks              │
└──────────────────────────────────┘
    ↓
┌──────────────────────────────────┐
│  Filters & Search Bar            │
│  - Status filter                 │
│  - Role filter                   │
│  - Assigned user filter          │
│  - Search by name                │
└──────────────────────────────────┘
    ↓
┌──────────────────────────────────┐
│  Task Table Component            │
│  - Task #, WBS Code, Name        │
│  - Est Hours, Role, Assigned To  │
│  - Status, Progress %            │
│  - Actions (Edit, Assign, Log)   │
└──────────────────────────────────┘
    ↓
┌──────────────────────────────────┐
│  Task Details Modal              │
│  - View/edit all properties      │
│  - Assign resources              │
│  - Log hours                     │
│  - View dependencies             │
│  - View source document          │
└──────────────────────────────────┘
```

---

## 📦 **Deliverables (3 Phases)**

### **Phase 1: Core UI (Week 1)**
3 components, ~11 hours

**What You're Building:**
- Tasks Tab page with metrics
- Task Table component
- Filters and search functionality

**Deliverables:**
1. ✅ Display all 141 tasks in table
2. ✅ Filter by status, role, assigned user
3. ✅ Sort by any column
4. ✅ Search by task name
5. ✅ Metrics cards showing totals

---

### **Phase 2: Task Management (Week 2)**
3 components, ~10 hours

**What You're Building:**
- Task Details Modal
- Resource Assignment UI
- Log Hours functionality

**Deliverables:**
1. ✅ View/edit task details
2. ✅ Assign users to tasks
3. ✅ Log actual hours worked
4. ✅ Update task status
5. ✅ View source document link

---

### **Phase 3: Advanced Features (Optional, Week 3)**
3 components, ~17 hours

**What You're Building:**
- Gantt Chart visualization
- Kanban Board view
- Bulk operations

**Deliverables:**
1. ✅ Gantt chart with dependencies
2. ✅ Drag-and-drop Kanban board
3. ✅ Bulk assign/update tasks
4. ✅ Export to CSV/Excel
5. ✅ Critical path highlighting

---

## 📂 **Files You'll Create**

### **Frontend Pages (NEW)**

```
app/projects/[id]/tasks/
├── page.tsx                         # Main tasks tab
├── loading.tsx                      # Loading skeleton
└── error.tsx                        # Error boundary
```

### **Frontend Components (NEW)**

```
components/project/
├── TaskTable.tsx                    # Main task list table
├── TaskTableRow.tsx                 # Individual task row
├── TaskFilters.tsx                  # Filter controls
├── TaskMetrics.tsx                  # Metrics cards
├── TaskDetailsModal.tsx             # Task details dialog
├── TaskEditForm.tsx                 # Edit task form
├── ResourceAssignmentModal.tsx      # Assign resources
├── LogHoursModal.tsx                # Log hours dialog
├── TaskStatusBadge.tsx              # Status badge component
├── TaskProgressBar.tsx              # Progress indicator
├── GanttChart.tsx                   # Gantt chart (Phase 3)
├── KanbanBoard.tsx                  # Kanban view (Phase 3)
└── TaskBulkActions.tsx              # Bulk operations (Phase 3)
```

### **Hooks (NEW)**

```
hooks/
├── use-tasks.ts                     # Fetch & manage tasks
├── use-task-filters.ts              # Filter state management
└── use-task-mutations.ts            # Update task operations
```

---

## 🗄️ **Database Schema (Already Built)**

### **You'll Work With These Tables:**

**project_tasks** (READ/UPDATE)
- 141 tasks already populated
- Columns: task_number, wbs_code, task_name, estimated_hours, actual_hours, status, assigned_user_id, etc.

**task_dependencies** (READ/UPDATE)
- Task relationships already exist
- Columns: predecessor_task_id, successor_task_id, dependency_type, lag_days

**task_resources** (CREATE/UPDATE)
- You'll create resource assignments
- Columns: task_id, user_id, role_id, allocation_percentage

**project_roles** (READ)
- Available roles for matching
- Columns: id, role_name, hourly_rate

**users** (READ)
- Team members to assign
- Columns: id, name, email, role

---

## 🔌 **API Endpoints (Already Built)**

### **You'll Use These Endpoints:**

```typescript
// Get all tasks for project
GET /api/tasks/project/:projectId
Response: {
  success: true,
  data: [
    {
      id: UUID,
      task_number: "ACT-001",
      wbs_code: "5.1.1",
      task_name: "Requirements Analysis",
      description: "Gather and document requirements",
      estimated_hours: 40,
      actual_hours: 0,
      start_date: "2025-11-15",
      end_date: "2025-11-22",
      required_role_id: UUID,
      required_role_name: "Business Analyst",
      assigned_user_id: null,
      assigned_user_name: null,
      status: "planned",
      progress_percentage: 0,
      source_document_id: UUID,
      source_entity_id: "activity-001",
      imported_from_wbs: true,
      created_at: "2025-11-03T..."
    },
    // ... 140 more tasks
  ]
}

// Get single task with details
GET /api/tasks/:taskId
Response: {
  success: true,
  data: {
    ...task,
    dependencies: [
      { id, predecessor_task_id, successor_task_id, dependency_type, lag_days }
    ],
    assigned_resources: [
      { user_id, user_name, role_id, role_name, allocation_percentage }
    ],
    source_document: { id, title, url }
  }
}

// Update task
PUT /api/tasks/:taskId
Body: {
  task_name?: string,
  description?: string,
  estimated_hours?: number,
  start_date?: string,
  end_date?: string,
  status?: string,
  progress_percentage?: number
}
Response: { success: true, data: updatedTask }

// Assign resource to task
POST /api/tasks/:taskId/assign
Body: {
  user_id: UUID,
  role_id: UUID,
  allocation_percentage: 100
}
Response: { success: true, data: resourceAssignment }

// Unassign resource
DELETE /api/tasks/:taskId/assign/:userId
Response: { success: true }

// Log hours on task
POST /api/tasks/:taskId/log-hours
Body: {
  actual_hours: 8,
  date: "2025-11-15",
  notes: "Completed requirements gathering"
}
Response: { 
  success: true, 
  data: { 
    task_id, 
    actual_hours: 48, // cumulative
    progress_percentage: 60 // auto-calculated
  }
}

// Get task dependencies
GET /api/tasks/:taskId/dependencies
Response: {
  success: true,
  data: {
    predecessors: [{ id, task_number, task_name, dependency_type }],
    successors: [{ id, task_number, task_name, dependency_type }]
  }
}

// Create task dependency
POST /api/task-dependencies
Body: {
  predecessor_task_id: UUID,
  successor_task_id: UUID,
  dependency_type: "finish_to_start", // FS, SS, FF, SF
  lag_days: 0
}
Response: { success: true, data: dependency }

// Delete task dependency
DELETE /api/task-dependencies/:dependencyId
Response: { success: true }

// Get available users for assignment
GET /api/tasks/project/:projectId/team
Response: {
  success: true,
  data: [
    { user_id, name, email, role, available_hours }
  ]
}

// Get suggested resources for task
GET /api/tasks/:taskId/suggest-resources
Response: {
  success: true,
  data: [
    {
      user_id,
      name,
      role_match_score: 0.95,
      availability_score: 0.80,
      total_score: 0.88,
      current_allocation: 60,
      reason: "Role matches required skill, available 40% capacity"
    }
  ]
}
```

---

## 🎨 **UI Component Specifications**

### **1. Tasks Tab** (`/app/projects/[id]/tasks/page.tsx`)

**Layout:**
```tsx
export default function TasksTab({ params }: { params: { id: string } }) {
  const projectId = params.id
  const { tasks, loading, error } = useTasks(projectId)
  const [filters, setFilters] = useTaskFilters()
  
  const filteredTasks = applyFilters(tasks, filters)
  
  const metrics = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    unassigned: tasks.filter(t => !t.assigned_user_id).length,
    estimatedHours: tasks.reduce((sum, t) => sum + (t.estimated_hours || 0), 0),
    actualHours: tasks.reduce((sum, t) => sum + (t.actual_hours || 0), 0)
  }
  
  return (
    <div className="space-y-6 p-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Tasks"
          value={metrics.total}
          icon={<ListTodo className="h-4 w-4" />}
        />
        <MetricCard
          title="Completed"
          value={metrics.completed}
          subtitle={`${Math.round(metrics.completed / metrics.total * 100)}%`}
          icon={<CheckCircle className="h-4 w-4 text-green-500" />}
        />
        <MetricCard
          title="Total Hours"
          value={`${metrics.actualHours} / ${metrics.estimatedHours}`}
          subtitle={`${Math.round(metrics.actualHours / metrics.estimatedHours * 100)}% complete`}
          icon={<Clock className="h-4 w-4" />}
        />
        <MetricCard
          title="Unassigned"
          value={metrics.unassigned}
          variant={metrics.unassigned > 0 ? 'warning' : 'default'}
          icon={<UserX className="h-4 w-4 text-orange-500" />}
        />
      </div>
      
      {/* Filters & Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Project Tasks ({filteredTasks.length})</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
              <Button onClick={handleCreateTask}>
                <Plus className="mr-2 h-4 w-4" />
                Add Task
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <TaskFilters filters={filters} onChange={setFilters} />
          
          {/* Task Table */}
          {loading ? (
            <TaskTableSkeleton />
          ) : error ? (
            <Alert variant="destructive">
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          ) : (
            <TaskTable
              tasks={filteredTasks}
              onEdit={handleEdit}
              onAssign={handleAssign}
              onLogHours={handleLogHours}
              onDelete={handleDelete}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

### **2. Task Table** (`/components/project/TaskTable.tsx`)

**Columns:**
- Task # (sortable)
- WBS Code (sortable)
- Task Name (searchable)
- Est Hours (sortable)
- Actual Hours (sortable)
- Role (filterable)
- Assigned To (filterable)
- Status (filterable, badge)
- Progress (visual bar)
- Actions (dropdown)

**Features:**
- Sort by clicking column headers
- Hover row for quick actions
- Color-coded status badges
- Progress bar visualization
- Action dropdown with Edit, Assign, Log Hours, Delete

```tsx
export function TaskTable({ tasks, onEdit, onAssign, onLogHours, onDelete }: TaskTableProps) {
  const [sortConfig, setSortConfig] = useState({ key: 'task_number', direction: 'asc' })
  
  const sortedTasks = sortTasks(tasks, sortConfig)
  
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead onClick={() => handleSort('task_number')} className="cursor-pointer">
            Task # {getSortIcon('task_number')}
          </TableHead>
          <TableHead onClick={() => handleSort('wbs_code')} className="cursor-pointer">
            WBS {getSortIcon('wbs_code')}
          </TableHead>
          <TableHead>Task Name</TableHead>
          <TableHead onClick={() => handleSort('estimated_hours')} className="cursor-pointer text-right">
            Est Hours {getSortIcon('estimated_hours')}
          </TableHead>
          <TableHead className="text-right">Actual Hours</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Assigned To</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Progress</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedTasks.map(task => (
          <TableRow key={task.id} className="hover:bg-accent">
            <TableCell className="font-mono text-sm">{task.task_number}</TableCell>
            <TableCell className="font-mono text-sm">{task.wbs_code}</TableCell>
            <TableCell>
              <div>
                <p className="font-medium">{task.task_name}</p>
                {task.description && (
                  <p className="text-sm text-muted-foreground truncate max-w-md">
                    {task.description}
                  </p>
                )}
              </div>
            </TableCell>
            <TableCell className="text-right">{task.estimated_hours || '-'}h</TableCell>
            <TableCell className="text-right">{task.actual_hours || 0}h</TableCell>
            <TableCell>
              <Badge variant="outline">{task.required_role_name || 'Not specified'}</Badge>
            </TableCell>
            <TableCell>
              {task.assigned_user_id ? (
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback>{getInitials(task.assigned_user_name)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{task.assigned_user_name}</span>
                </div>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">
                  Unassigned
                </Badge>
              )}
            </TableCell>
            <TableCell>
              <TaskStatusBadge status={task.status} />
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Progress value={task.progress_percentage} className="w-20" />
                <span className="text-sm text-muted-foreground">{task.progress_percentage}%</span>
              </div>
            </TableCell>
            <TableCell className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(task.id)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Task
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onAssign(task.id)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Assign Resource
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onLogHours(task.id)}>
                    <Clock className="mr-2 h-4 w-4" />
                    Log Hours
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onDelete(task.id)} className="text-destructive">
                    <Trash className="mr-2 h-4 w-4" />
                    Delete Task
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
```

### **3. Task Details Modal** (`/components/project/TaskDetailsModal.tsx`)

**Tabs:**
1. **Details** - View/edit task properties
2. **Resources** - Assign users, view allocation
3. **Dependencies** - View predecessors/successors
4. **Hours** - Log actual hours, view history
5. **Source** - Link to original document

**Features:**
- Edit task inline
- Assign multiple resources
- View dependency graph
- Log hours with date
- Quick actions (Start Task, Complete Task, etc.)

```tsx
export function TaskDetailsModal({ taskId, onClose }: TaskDetailsModalProps) {
  const { task, loading } = useTask(taskId)
  const [activeTab, setActiveTab] = useState('details')
  
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{task?.task_number}: {task?.task_name}</DialogTitle>
          <DialogDescription>
            WBS {task?.wbs_code} • {task?.required_role_name}
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
            <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
            <TabsTrigger value="hours">Hours</TabsTrigger>
            <TabsTrigger value="source">Source</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details">
            <TaskEditForm task={task} onSave={handleSave} />
          </TabsContent>
          
          <TabsContent value="resources">
            <ResourceAssignmentView taskId={taskId} />
          </TabsContent>
          
          <TabsContent value="dependencies">
            <TaskDependenciesView taskId={taskId} />
          </TabsContent>
          
          <TabsContent value="hours">
            <LogHoursView taskId={taskId} />
          </TabsContent>
          
          <TabsContent value="source">
            <SourceDocumentView documentId={task?.source_document_id} />
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

---

## 🧪 **Testing Requirements**

### **Component Tests**
```typescript
// TaskTable.test.tsx
describe('TaskTable', () => {
  it('renders all tasks', () => {
    render(<TaskTable tasks={mockTasks} />)
    expect(screen.getByText('ACT-001')).toBeInTheDocument()
    expect(screen.getByText('Requirements Analysis')).toBeInTheDocument()
  })
  
  it('sorts by task number', async () => {
    render(<TaskTable tasks={mockTasks} />)
    const taskNumberHeader = screen.getByText('Task #')
    await userEvent.click(taskNumberHeader)
    // Assert sorting
  })
  
  it('filters by status', async () => {
    render(<TasksTab params={{ id: 'project-1' }} />)
    const statusFilter = screen.getByLabelText('Status')
    await userEvent.selectOptions(statusFilter, 'completed')
    // Assert filtered results
  })
})

// useTasks.test.ts
describe('useTasks hook', () => {
  it('fetches tasks for project', async () => {
    const { result } = renderHook(() => useTasks('project-1'))
    await waitFor(() => {
      expect(result.current.tasks).toHaveLength(141)
      expect(result.current.loading).toBe(false)
    })
  })
})
```

### **Integration Tests**
```typescript
// Full workflow test
describe('Task Management Flow', () => {
  it('views task → assigns resource → logs hours → completes', async () => {
    // 1. Navigate to tasks tab
    render(<ProjectPage params={{ id: 'project-1' }} />)
    await userEvent.click(screen.getByText('Tasks'))
    
    // 2. View task details
    await userEvent.click(screen.getByText('ACT-001'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    
    // 3. Assign resource
    await userEvent.click(screen.getByText('Resources'))
    await userEvent.click(screen.getByText('Assign User'))
    await userEvent.selectOptions(screen.getByLabelText('User'), 'john-doe')
    await userEvent.click(screen.getByText('Assign'))
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    
    // 4. Log hours
    await userEvent.click(screen.getByText('Hours'))
    await userEvent.type(screen.getByLabelText('Hours'), '8')
    await userEvent.click(screen.getByText('Log Hours'))
    expect(screen.getByText('8h logged')).toBeInTheDocument()
    
    // 5. Complete task
    await userEvent.click(screen.getByText('Details'))
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'completed')
    await userEvent.click(screen.getByText('Save'))
    expect(screen.getByText('Task completed')).toBeInTheDocument()
  })
})
```

---

## 🎯 **Success Criteria**

### **Phase 1 Complete:**
- ✅ All 141 tasks displayed in table
- ✅ Filters work correctly (status, role, assigned user)
- ✅ Sort works on all columns
- ✅ Search finds tasks by name
- ✅ Metrics cards show correct totals
- ✅ Performance: < 500ms to render 141 tasks

### **Phase 2 Complete:**
- ✅ Task details modal opens on click
- ✅ Edit task fields and save successfully
- ✅ Assign user to task (10 assignments made)
- ✅ Log hours on task (5 hour logs made)
- ✅ View source document link works
- ✅ All CRUD operations working

### **Phase 3 Complete (Optional):**
- ✅ Gantt chart displays timeline
- ✅ Dependencies visualized correctly
- ✅ Kanban board allows drag & drop
- ✅ Bulk operations work for 10+ tasks
- ✅ Export to CSV downloads file

---

## 🔗 **Dependencies & Integration Points**

### **What's Already Built (Use These):**

**API Client** ✅
```typescript
import { apiClient } from '@/lib/api'

// Get tasks
const tasks = await apiClient.get(`/tasks/project/${projectId}`)

// Update task
await apiClient.put(`/tasks/${taskId}`, { status: 'completed' })
```

**Auth Context** ✅
```typescript
import { useAuth } from '@/contexts/AuthContext'

const { user } = useAuth()
// Check if user can edit tasks
const canEdit = user.role === 'admin' || user.role === 'project_manager'
```

**UI Components** ✅
```typescript
// All Radix UI components available
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  Card, CardHeader, CardTitle, CardContent,
  Badge, Button, Dialog, Select, Input, Progress
} from '@/components/ui'
```

### **Coordinate With Other Agents:**

**Agent 1 (Client Onboarding):**
- No conflicts - separate routes
- Both display documents list (use same Document component)

**Agent 3 (Template Optimization):**
- No conflicts - separate functionality
- You may reference quality_audits table (read-only)

---

## 🗓️ **Timeline & Milestones**

### **Week 1:**
- **Day 1:** Set up Tasks Tab page + routing
- **Day 2:** Build Task Table component
- **Day 3:** Add filters and sort functionality
- **Day 4:** Build Metrics Cards
- **Day 5:** Polish + test Phase 1

**Milestone:** Basic task viewing complete (141 tasks visible)

### **Week 2:**
- **Day 1:** Build Task Details Modal
- **Day 2:** Add Resource Assignment UI
- **Day 3:** Implement Log Hours feature
- **Day 4:** Add edit functionality
- **Day 5:** Polish + test Phase 2

**Milestone:** Full task management working

### **Week 3 (Optional):**
- **Day 1-2:** Build Gantt Chart
- **Day 3-4:** Build Kanban Board
- **Day 5:** Bulk operations + export

**Milestone:** Advanced visualizations complete

---

## 📞 **Communication Protocol**

### **Daily Standup (Async):**
Post in shared channel:
```
Agent 2 Update - Day X:
✅ Completed: Task Table rendering 141 tasks
🔄 In Progress: Adding sort functionality
⏳ Next: Build filters component
🚨 Blockers: None
```

### **Weekly Sync:**
- Demo task UI to team
- Coordinate merge timing with Agents 1 & 3
- Resolve any integration questions

### **Questions/Blockers:**
- Tag @Agent1 or @Agent3 if coordination needed
- No blockers expected (API already built)

---

## 🎓 **Key Technical Decisions**

### **1. State Management:**
**Use:** React hooks (useState, useEffect)  
**For complex state:** Consider Zustand if needed

### **2. Data Fetching:**
**Use:** Custom hooks (useTasks, useTask)  
**Pattern:**
```typescript
export function useTasks(projectId: string) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  
  useEffect(() => {
    fetchTasks()
  }, [projectId])
  
  const fetchTasks = async () => {
    try {
      const response = await apiClient.get(`/tasks/project/${projectId}`)
      setTasks(response.data)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }
  
  return { tasks, loading, error, refetch: fetchTasks }
}
```

### **3. Table Sorting:**
```typescript
function sortTasks(tasks: Task[], config: SortConfig) {
  return [...tasks].sort((a, b) => {
    const aValue = a[config.key]
    const bValue = b[config.key]
    
    if (aValue < bValue) return config.direction === 'asc' ? -1 : 1
    if (aValue > bValue) return config.direction === 'asc' ? 1 : -1
    return 0
  })
}
```

### **4. Filtering:**
```typescript
function applyFilters(tasks: Task[], filters: Filters) {
  return tasks.filter(task => {
    if (filters.status !== 'all' && task.status !== filters.status) return false
    if (filters.role !== 'all' && task.required_role_name !== filters.role) return false
    if (filters.assignedTo !== 'all' && task.assigned_user_id !== filters.assignedTo) return false
    if (filters.search && !task.task_name.toLowerCase().includes(filters.search.toLowerCase())) return false
    return true
  })
}
```

### **5. Gantt Chart Library (Phase 3):**
**Recommended:** `react-gantt-chart` or `frappe-gantt-react`  
**Alternative:** Custom D3.js visualization

---

## 📚 **Resources & References**

### **Documentation:**
- `docs/06-features/WBS_IMPORT_QUICK_START.md` - How WBS import works
- `server/src/services/wbsImportService.ts` - Backend implementation

### **Existing Code to Study:**
- `app/projects/[id]/documents/page.tsx` - Similar table pattern
- `components/project/BaselineManagement.tsx` - Similar modal pattern
- `app/jobs/page.tsx` - Similar metrics cards pattern

### **UI Inspiration:**
- Jira task management
- Asana project view
- Microsoft Project web

### **Libraries to Use:**
```json
{
  "react": "18.3.1",
  "@radix-ui/react-*": "latest",
  "lucide-react": "^0.263.1",
  "date-fns": "^2.30.0",
  "react-gantt-chart": "^0.3.0" // Phase 3
}
```

---

## ✅ **Checklist Before Starting**

- [ ] Read WBS_IMPORT_QUICK_START.md
- [ ] Review existing API endpoints (test with Postman/curl)
- [ ] Check database: Confirm 141 tasks exist
- [ ] Create branch: `feature/task-management-ui`
- [ ] Study similar UI patterns in codebase
- [ ] Set up test environment
- [ ] Review UI component library (Radix UI)
- [ ] Review coordination points with Agents 1 & 3

---

## 🎊 **Final Notes**

**You're unlocking the value of 141 tasks already in the database!**

The backend is 100% complete. Your focus is purely on the UI/UX to make task management delightful for project managers.

**Key Success Factors:**
1. **Performance:** 141 tasks should render quickly (< 500ms)
2. **Usability:** Intuitive filters and search
3. **Responsiveness:** Works on desktop (primary) and tablet
4. **Visual Design:** Use existing Radix UI components for consistency

**Take your time with the UX.** This is a heavily-used feature. Make it polished.

**Good luck, Agent 2! 🚀**

---

**Prepared for:** Agent 2  
**Date:** November 3, 2025  
**Status:** Ready to start  
**Questions?** Tag @ProjectLead or @Agent1 or @Agent3

