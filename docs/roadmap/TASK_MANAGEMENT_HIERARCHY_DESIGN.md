# Task Management & Checklist Hierarchy Design

**Date**: November 16, 2025  
**Status**: 📋 **DESIGN DOCUMENT**  
**Priority**: P0 (Core Project Management)  
**Standards**: PMBOK 8th Edition + PMI Program Management Standard

---

## 🎯 **Executive Summary**

This document defines what is maintained at each level (Portfolio, Program, Project) and designs a comprehensive task management and checklist system that integrates seamlessly across all three levels.

---

## 📊 **What is Maintained at Each Level**

### **1. PORTFOLIO LEVEL** (Strategic & Governance)

**Purpose**: Strategic oversight, resource optimization, and value maximization across all programs

**What's Maintained**:

| Category | What's Tracked | Examples |
|----------|---------------|----------|
| **Strategic Alignment** | Strategic objectives, themes, alignment scores | "Digital Transformation", "Cost Reduction", Alignment: 85% |
| **Governance** | Decision logs, approval workflows, policies | "Go/No-Go decisions", "Budget approvals", "Policy compliance" |
| **Performance** | Portfolio KPIs, health metrics, trends | Benefit Realization: 75%, Risk Status: Medium, Resource Utilization: 82% |
| **Financial** | Total budget, ROI, NPV, funding allocation | Portfolio Budget: $50M, ROI: 15%, NPV: $8M |
| **Risk** | Portfolio-level risks, systemic risks, risk exposure | "Market volatility", "Resource constraints", Total Exposure: $1.2M |
| **Resource** | Resource capacity, allocation, conflicts | Total FTE: 120, Allocated: 98, Conflicts: 2 |
| **Benefits** | Expected vs realized benefits across programs | Expected: $10M, Realized: $7.5M, Rate: 75% |
| **Optimization** | Portfolio composition, scenario analysis | "Terminate Program X", "Accelerate Program Y" |

**Key Characteristics**:
- **Time Horizon**: Quarterly/Annual
- **Granularity**: High-level metrics and trends
- **Focus**: Strategic decisions, resource optimization, value delivery
- **Tasks**: Strategic initiatives, governance activities, portfolio reviews
- **Checklists**: Portfolio review checklists, compliance checklists, decision frameworks

---

### **2. PROGRAM LEVEL** (Coordination & Integration)

**Purpose**: Coordinate multiple projects to deliver program benefits

**What's Maintained**:

| Category | What's Tracked | Examples |
|----------|---------------|----------|
| **Benefits Management** | Benefits register, realization tracking | "Customer Retention: $50k expected, $45k actual" |
| **Stakeholder Engagement** | Stakeholder register, satisfaction, communication | 15 stakeholders, Satisfaction: 88%, Communication plan |
| **Risk Management** | Program risks, cross-project risks, mitigation | "Resource conflict between Project A & B", Mitigation: 8 active |
| **Resource Coordination** | Shared resources, allocation matrix, conflicts | "Senior Developer shared across 3 projects", Utilization: 82% |
| **Financial Management** | Program budget, cost tracking, EVM | Budget: $10.5M, CPI: 0.96, SPI: 0.98 |
| **Schedule Management** | Program milestones, dependencies, critical path | 5 milestones, 12 dependencies, Critical path: 180 days |
| **Quality Management** | Quality standards, audits, conformance | Standards: ISO 9001, Audits: 3 passed, Score: 92% |
| **Integration** | Project dependencies, handoffs, alignment | 8 dependencies, 5 handoffs, Alignment: 90% |
| **Change Management** | Change requests, impact assessment, approvals | 12 changes, 8 approved, Impact: $200k, 15 days |

**Key Characteristics**:
- **Time Horizon**: Monthly/Quarterly
- **Granularity**: Project-level rollups and program-specific activities
- **Focus**: Coordination, integration, benefit delivery
- **Tasks**: Program activities, coordination tasks, integration tasks
- **Checklists**: Program review checklists, benefit tracking checklists, risk review checklists

---

### **3. PROJECT LEVEL** (Execution & Delivery)

**Purpose**: Execute work to deliver specific deliverables and outcomes

**What's Maintained**:

| Category | What's Tracked | Examples |
|----------|---------------|----------|
| **Work Breakdown Structure (WBS)** | Tasks, work packages, deliverables | 141 tasks, 25 work packages, 8 deliverables |
| **Task Management** | Task details, assignments, progress, dependencies | Task: "Design UI", Assigned: John, Progress: 60%, Blocks: 3 tasks |
| **Resource Assignment** | Team members, roles, hours, skills | "Senior Developer: 40h/week", "Designer: 20h/week" |
| **Schedule** | Task dates, milestones, critical path | Start: 2025-01-01, End: 2025-06-30, Milestones: 5 |
| **Cost Management** | Budget, actual costs, forecasts, variance | Budget: $500k, Actual: $450k, Forecast: $520k, Variance: -$20k |
| **Quality** | Quality criteria, acceptance criteria, testing | Criteria: 10 items, Tests: 45 passed, Defects: 3 |
| **Risks** | Project risks, mitigation plans, issues | Risks: 12, High: 2, Mitigations: 8 active |
| **Stakeholders** | Project stakeholders, communication, engagement | Stakeholders: 8, Communication: Weekly, Engagement: High |
| **Deliverables** | Deliverable list, status, acceptance | Deliverables: 8, Completed: 5, Accepted: 4 |
| **Change Requests** | Change requests, impact, approvals | Changes: 5, Approved: 3, Impact: $50k |

**Key Characteristics**:
- **Time Horizon**: Weekly/Daily
- **Granularity**: Detailed tasks, hours, specific deliverables
- **Focus**: Execution, delivery, quality
- **Tasks**: Work packages, activities, action items
- **Checklists**: Task completion checklists, quality checklists, deliverable acceptance checklists

---

## 🏗️ **Task Management Hierarchy Design**

### **Five-Level Hierarchical Structure**

```
PORTFOLIO
└── PROGRAM
    └── PROJECT
        └── TASK
            └── CHECKLIST ITEM (Subtask)
```

### **Detailed Hierarchy Example**

```
PORTFOLIO: "Digital Transformation Portfolio"
│
└── PROGRAM: "Customer Experience Program"
    │
    └── PROJECT: "Mobile App Redesign"
        │
        ├── TASK: "Design UI Mockups"
        │   ├── CHECKLIST ITEM: "Create wireframes"
        │   ├── CHECKLIST ITEM: "Get stakeholder approval"
        │   └── CHECKLIST ITEM: "Finalize designs"
        │
        ├── TASK: "Develop Backend API"
        │   ├── CHECKLIST ITEM: "Design API endpoints"
        │   ├── CHECKLIST ITEM: "Implement authentication"
        │   ├── CHECKLIST ITEM: "Write unit tests"
        │   └── CHECKLIST ITEM: "Code review"
        │
        └── TASK: "Conduct User Testing"
            ├── CHECKLIST ITEM: "Recruit test participants"
            ├── CHECKLIST ITEM: "Prepare test scenarios"
            ├── CHECKLIST ITEM: "Run testing sessions"
            └── CHECKLIST ITEM: "Analyze results"
```

### **Key Principle**

**Checklist Items are Subtasks**: Every checklist item belongs to a task. Tasks can exist at Portfolio, Program, or Project level, and each task can have multiple checklist items as its breakdown.

---

## 📋 **Database Schema Design**

### **Unified Task & Checklist Schema**

**Key Design Principle**: Tasks exist at Portfolio, Program, or Project level. Checklist items are always subtasks of tasks, regardless of which level the task belongs to.

```sql
-- Unified Tasks Table (supports Portfolio, Program, and Project levels)
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Hierarchy: Task belongs to Portfolio, Program, or Project
  level VARCHAR(50) NOT NULL, -- 'portfolio', 'program', 'project'
  
  -- Parent Reference (one of these will be set based on level)
  portfolio_id UUID REFERENCES programs(id), -- If level = 'portfolio'
  program_id UUID REFERENCES programs(id),    -- If level = 'program'
  project_id UUID REFERENCES projects(id),    -- If level = 'project'
  
  -- Task Hierarchy: Tasks can have parent tasks (for WBS breakdown)
  parent_task_id UUID REFERENCES tasks(id), -- NULL for top-level tasks
  
  -- Task Details
  task_name VARCHAR(255) NOT NULL,
  task_description TEXT,
  task_category VARCHAR(100), -- strategic-review, coordination, design, development, testing, etc.
  
  -- Assignment
  assigned_to UUID REFERENCES users(id),
  assigned_by UUID REFERENCES users(id),
  
  -- Status & Priority
  status VARCHAR(50) DEFAULT 'pending', -- pending, in-progress, completed, cancelled, blocked
  priority VARCHAR(50) DEFAULT 'medium', -- low, medium, high, critical
  
  -- Timeline
  due_date DATE,
  completed_date DATE,
  estimated_hours DECIMAL(10,2),
  actual_hours DECIMAL(10,2),
  
  -- Progress Tracking
  completion_percent INTEGER DEFAULT 0, -- 0-100 (calculated from checklist items)
  
  -- Context-Specific Fields (JSONB for flexibility)
  context_data JSONB, -- Stores level-specific data
  -- Portfolio: { strategic_objective_id, governance_decision_id }
  -- Program: { related_projects[], benefit_id, risk_id }
  -- Project: { wbs_code, phase, deliverables[] }
  
  -- Dependencies
  depends_on_tasks UUID[], -- Other tasks this depends on
  blocks_tasks UUID[], -- Tasks blocked by this
  
  -- Checklist Template
  checklist_template_id UUID REFERENCES checklist_templates(id),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX idx_tasks_level_portfolio ON tasks(level, portfolio_id) WHERE level = 'portfolio';
CREATE INDEX idx_tasks_level_program ON tasks(level, program_id) WHERE level = 'program';
CREATE INDEX idx_tasks_level_project ON tasks(level, project_id) WHERE level = 'project';
CREATE INDEX idx_tasks_parent ON tasks(parent_task_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to);

-- Checklist Items Table (Subtasks of Tasks)
CREATE TABLE checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  
  -- Checklist Item Details
  item_name VARCHAR(255) NOT NULL,
  item_description TEXT,
  
  -- Status & Priority
  status VARCHAR(50) DEFAULT 'pending', -- pending, in-progress, completed, blocked, skipped
  priority VARCHAR(50) DEFAULT 'medium', -- low, medium, high, critical
  
  -- Assignment
  assigned_to UUID REFERENCES users(id),
  assigned_by UUID REFERENCES users(id),
  
  -- Timeline
  due_date DATE,
  completed_date DATE,
  estimated_minutes INTEGER, -- Small items measured in minutes
  actual_minutes INTEGER,
  
  -- Dependencies (between checklist items)
  depends_on_items UUID[], -- Other checklist items this depends on
  blocks_items UUID[], -- Checklist items blocked by this
  
  -- Validation & Acceptance
  acceptance_criteria TEXT[], -- Array of criteria that must be met
  requires_validation BOOLEAN DEFAULT FALSE,
  requires_approval BOOLEAN DEFAULT FALSE,
  validated_by UUID REFERENCES users(id),
  validated_at TIMESTAMP,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  validation_notes TEXT,
  
  -- Quality Gates
  quality_gate_id UUID, -- Links to quality gate if this is a gate checkpoint
  must_pass_to_proceed BOOLEAN DEFAULT FALSE, -- Blocks parent task completion if not passed
  
  -- Deliverable Linkage
  deliverable_id UUID, -- Links to deliverable if this checklist item produces one
  
  -- Ordering
  display_order INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Indexes for checklist items
CREATE INDEX idx_checklist_items_task ON checklist_items(task_id);
CREATE INDEX idx_checklist_items_status ON checklist_items(status);
CREATE INDEX idx_checklist_items_assigned ON checklist_items(assigned_to);

-- Function to calculate task completion percent from checklist items
CREATE OR REPLACE FUNCTION calculate_task_completion(task_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  total_items INTEGER;
  completed_items INTEGER;
BEGIN
  SELECT 
    COUNT(*)::INTEGER,
    COUNT(*) FILTER (WHERE status = 'completed')::INTEGER
  INTO total_items, completed_items
  FROM checklist_items
  WHERE task_id = task_uuid;
  
  IF total_items = 0 THEN
    RETURN 0;
  END IF;
  
  RETURN ROUND((completed_items::DECIMAL / total_items::DECIMAL) * 100);
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update task completion percent
CREATE OR REPLACE FUNCTION update_task_completion()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE tasks
  SET completion_percent = calculate_task_completion(NEW.task_id),
      updated_at = NOW()
  WHERE id = NEW.task_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_task_completion
AFTER INSERT OR UPDATE OR DELETE ON checklist_items
FOR EACH ROW
EXECUTE FUNCTION update_task_completion();

-- Checklist Templates (Reusable templates for common task types)
CREATE TABLE checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  template_name VARCHAR(255) NOT NULL,
  template_description TEXT,
  task_type VARCHAR(100), -- design, development, testing, deployment, documentation, strategic-review, coordination
  
  -- Template Items (JSONB array of checklist item definitions)
  checklist_items JSONB NOT NULL, -- Array of checklist item definitions
  
  -- Applicable Level
  applicable_level VARCHAR(50), -- 'portfolio', 'program', 'project', 'all'
  
  -- Usage
  usage_count INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Example template structure (stored in checklist_items JSONB):
{
  "checklist_items": [
    {
      "item_name": "Create wireframes",
      "item_description": "Design low-fidelity wireframes for all screens",
      "estimated_minutes": 240,
      "requires_validation": true,
      "acceptance_criteria": ["Wireframes approved by product owner", "All user flows covered"],
      "display_order": 1
    },
    {
      "item_name": "Get stakeholder approval",
      "item_description": "Present wireframes to stakeholders and get sign-off",
      "estimated_minutes": 60,
      "requires_validation": true,
      "acceptance_criteria": ["Stakeholder sign-off received", "Feedback incorporated"],
      "display_order": 2
    },
    {
      "item_name": "Finalize designs",
      "item_description": "Create high-fidelity designs based on approved wireframes",
      "estimated_minutes": 480,
      "requires_validation": true,
      "acceptance_criteria": ["Designs match wireframes", "Design system compliance verified"],
      "display_order": 3
    }
  ]
}

-- Function to create checklist items from template
CREATE OR REPLACE FUNCTION create_checklist_from_template(
  p_task_id UUID,
  p_template_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  template_data JSONB;
  item JSONB;
  items_created INTEGER := 0;
BEGIN
  -- Get template data
  SELECT checklist_items INTO template_data
  FROM checklist_templates
  WHERE id = p_template_id;
  
  -- Create checklist items from template
  FOR item IN SELECT * FROM jsonb_array_elements(template_data)
  LOOP
    INSERT INTO checklist_items (
      task_id,
      item_name,
      item_description,
      estimated_minutes,
      requires_validation,
      acceptance_criteria,
      display_order,
      created_by
    )
    VALUES (
      p_task_id,
      item->>'item_name',
      item->>'item_description',
      (item->>'estimated_minutes')::INTEGER,
      COALESCE((item->>'requires_validation')::BOOLEAN, false),
      ARRAY(SELECT jsonb_array_elements_text(item->'acceptance_criteria')),
      COALESCE((item->>'display_order')::INTEGER, 0),
      (SELECT created_by FROM tasks WHERE id = p_task_id)
    );
    
    items_created := items_created + 1;
  END LOOP;
  
  -- Update template usage count
  UPDATE checklist_templates
  SET usage_count = usage_count + 1
  WHERE id = p_template_id;
  
  RETURN items_created;
END;
$$ LANGUAGE plpgsql;

---

## 🔗 **Cross-Level Relationships**

### **Task Dependencies (Unified)**

Since all tasks are in a single `tasks` table, dependencies are handled directly:

```sql
-- Task dependencies are stored in the tasks table itself
-- depends_on_tasks UUID[] -- Array of task IDs this task depends on
-- blocks_tasks UUID[] -- Array of task IDs blocked by this task

-- Helper function to check if task can start (all dependencies completed)
CREATE OR REPLACE FUNCTION can_task_start(p_task_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  dependency_ids UUID[];
  incomplete_count INTEGER;
BEGIN
  -- Get dependencies
  SELECT depends_on_tasks INTO dependency_ids
  FROM tasks
  WHERE id = p_task_id;
  
  -- If no dependencies, task can start
  IF dependency_ids IS NULL OR array_length(dependency_ids, 1) IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Check if all dependencies are completed
  SELECT COUNT(*) INTO incomplete_count
  FROM unnest(dependency_ids) AS dep_id
  WHERE EXISTS (
    SELECT 1 FROM tasks WHERE id = dep_id AND status != 'completed'
  );
  
  RETURN incomplete_count = 0;
END;
$$ LANGUAGE plpgsql;

-- View for dependency visualization
CREATE VIEW task_dependency_view AS
SELECT 
  t.id as task_id,
  t.task_name,
  t.level,
  t.status,
  t.depends_on_tasks,
  t.blocks_tasks,
  can_task_start(t.id) as can_start,
  (
    SELECT COUNT(*) 
    FROM unnest(COALESCE(t.depends_on_tasks, ARRAY[]::UUID[])) AS dep_id
    WHERE EXISTS (
      SELECT 1 FROM tasks WHERE id = dep_id AND status != 'completed'
    )
  ) as incomplete_dependencies
FROM tasks t;
```

---

## 📊 **Task Management UI Design**

### **Unified Task View Component**

All task views follow the same pattern: **Tasks → Checklist Items**

### **1. Portfolio Level - Task View**

**Route**: `/portfolio/tasks`

**UI Structure**:
```
Portfolio Tasks
├── Task: "Conduct Portfolio Review Q1 2026"
│   ├── Checklist Item: "Review strategic alignment scores"
│   ├── Checklist Item: "Assess portfolio health metrics"
│   ├── Checklist Item: "Review financial performance"
│   └── Checklist Item: "Make go/no-go decisions"
│
├── Task: "Approve Program Budgets"
│   ├── Checklist Item: "Review budget proposals"
│   ├── Checklist Item: "Validate against strategic objectives"
│   └── Checklist Item: "Get executive approval"
│
└── Task: "Optimize Resource Allocation"
    ├── Checklist Item: "Analyze resource capacity"
    ├── Checklist Item: "Identify resource conflicts"
    └── Checklist Item: "Implement reallocation"
```

**UI Components**:
```typescript
interface PortfolioTaskView {
  // Filter by task category
  filters: {
    category: 'strategic-review' | 'governance' | 'optimization' | 'financial-review'
    status: 'pending' | 'in-progress' | 'completed'
    assignedTo: string
  }
  
  // Task List with Expandable Checklist Items
  tasks: Task[] // level = 'portfolio'
  
  // Task Detail View (when expanded)
  taskDetail: {
    task: Task
    checklistItems: ChecklistItem[] // Subtasks
    dependencies: Task[]
    context: {
      strategicObjective?: StrategicObjective
      governanceDecision?: GovernanceDecision
    }
  }
  
  // Quick Actions
  quickActions: {
    createTask: (category: string) => void
    applyTemplate: (templateId: string) => void
    bulkCreateChecklist: (taskId: string, items: ChecklistItemInput[]) => void
  }
}
```

---

### **2. Program Level - Task View**

**Route**: `/programs/[id]/tasks`

**UI Structure**:
```
Program Tasks
├── Task: "Coordinate Project A & B Integration"
│   ├── Checklist Item: "Schedule integration meeting"
│   ├── Checklist Item: "Define handoff criteria"
│   └── Checklist Item: "Complete handoff"
│
├── Task: "Review Benefits Realization"
│   ├── Checklist Item: "Update benefits register"
│   ├── Checklist Item: "Calculate realization rate"
│   └── Checklist Item: "Report to stakeholders"
│
└── Task: "Conduct Stakeholder Survey"
    ├── Checklist Item: "Prepare survey questions"
    ├── Checklist Item: "Distribute survey"
    └── Checklist Item: "Analyze results"
```

**UI Components**:
```typescript
interface ProgramTaskView {
  // Task Categories Tabs
  tabs: {
    coordination: Task[] // level = 'program', category = 'coordination'
    integration: Task[]
    benefits: Task[]
    risks: Task[]
    stakeholders: Task[]
  }
  
  // Task Detail View
  taskDetail: {
    task: Task
    checklistItems: ChecklistItem[] // Subtasks
    crossProjectImpact: {
      affectedProjects: Project[]
    }
    context: {
      relatedProjects?: Project[]
      benefitId?: string
      riskId?: string
    }
  }
  
  // Checklist Templates (Program-specific)
  templates: ChecklistTemplate[] // applicable_level = 'program'
}
```

---

### **3. Project Level - Task View** (Enhanced)

**Route**: `/projects/[id]/tasks`

**UI Structure**:
```
Project Tasks
├── Task: "Design UI Mockups" (Parent Task)
│   ├── Checklist Item: "Create wireframes"
│   ├── Checklist Item: "Get stakeholder approval"
│   └── Checklist Item: "Finalize designs"
│
├── Task: "Develop Backend API"
│   ├── Checklist Item: "Design API endpoints"
│   ├── Checklist Item: "Implement authentication"
│   ├── Checklist Item: "Write unit tests"
│   └── Checklist Item: "Code review"
│
└── Task: "Conduct User Testing"
    ├── Checklist Item: "Recruit test participants"
    ├── Checklist Item: "Prepare test scenarios"
    ├── Checklist Item: "Run testing sessions"
    └── Checklist Item: "Analyze results"
```

**UI Components**:
```typescript
interface ProjectTaskView {
  // Multiple Views
  views: {
    list: TaskListView // Flat list with expandable checklist items
    gantt: GanttChartView // Timeline with tasks and checklist items
    kanban: KanbanBoardView // Tasks in columns, checklist items as sub-cards
    wbs: WBSHierarchyView // Hierarchical tree (tasks → checklist items)
  }
  
  // Task Detail Modal/Expanded View
  taskDetail: {
    task: Task // level = 'project'
    checklistItems: ChecklistItem[] // Subtasks (expandable)
    parentTask?: Task // If this is a subtask
    childTasks?: Task[] // If this has subtasks (WBS hierarchy)
    dependencies: {
      dependsOn: Task[]
      blocks: Task[]
    }
    timeEntries: TimeEntry[]
    comments: Comment[]
    attachments: Attachment[]
  }
  
  // Checklist Management
  checklistManagement: {
    // Templates
    templates: ChecklistTemplate[] // applicable_level = 'project'
    
    // Actions
    createFromTemplate: (taskId: string, templateId: string) => Promise<void>
    bulkCreate: (taskId: string, items: ChecklistItemInput[]) => Promise<void>
    autoGenerate: (taskId: string, taskType: string) => Promise<void>
    
    // Checklist Item Actions
    addChecklistItem: (taskId: string, item: ChecklistItemInput) => Promise<void>
    updateChecklistItem: (itemId: string, updates: Partial<ChecklistItem>) => Promise<void>
    deleteChecklistItem: (itemId: string) => Promise<void>
    reorderChecklistItems: (taskId: string, itemIds: string[]) => Promise<void>
  }
  
  // Task Actions
  taskActions: {
    createTask: (parentTaskId?: string) => Promise<void>
    assignTask: (taskId: string, userId: string) => Promise<void>
    updateStatus: (taskId: string, status: string) => Promise<void>
    addDependency: (taskId: string, dependsOnTaskId: string) => Promise<void>
  }
}
```

---

### **4. Checklist Item Component** (Reusable)

**Component**: `ChecklistItemCard.tsx`

```typescript
interface ChecklistItemCardProps {
  item: ChecklistItem
  task: Task
  level: 'portfolio' | 'program' | 'project'
  onUpdate: (itemId: string, updates: Partial<ChecklistItem>) => void
  onDelete: (itemId: string) => void
  showDependencies?: boolean
}

// Features:
// - Checkbox for completion
// - Status badge
// - Assignee avatar
// - Due date indicator
// - Progress indicator (if has sub-items)
// - Validation badge (if requires validation)
// - Quality gate indicator (if is quality gate)
// - Expandable details (description, acceptance criteria, validation notes)
```

---

## ✅ **Checklist System Design**

### **Checklist Templates by Task Type**

**Key Principle**: Checklist items are subtasks. Templates define standard checklist items for common task types.

#### **Portfolio-Level Task Templates**

1. **Strategic Review Task Template**
   ```
   Task: "Conduct Portfolio Review Q1 2026"
   Checklist Items:
   ├── Review strategic alignment scores
   ├── Assess portfolio health metrics
   ├── Review financial performance (budget vs actual)
   ├── Evaluate risk exposure
   ├── Review resource utilization
   ├── Assess benefit realization
   ├── Make go/no-go decisions
   └── Update portfolio roadmap
   ```

2. **Governance Decision Task Template**
   ```
   Task: "Approve Program Budget"
   Checklist Items:
   ├── Identify decision required
   ├── Gather relevant data
   ├── Consult governance board
   ├── Document decision rationale
   ├── Communicate decision
   └── Track decision outcomes
   ```

3. **Resource Optimization Task Template**
   ```
   Task: "Optimize Resource Allocation"
   Checklist Items:
   ├── Analyze resource capacity
   ├── Identify resource conflicts
   ├── Evaluate allocation efficiency
   ├── Propose reallocation
   ├── Get approval
   ├── Implement changes
   └── Monitor impact
   ```

---

#### **Program-Level Task Templates**

1. **Benefits Review Task Template**
   ```
   Task: "Review Benefits Realization"
   Checklist Items:
   ├── Update benefits register
   ├── Track expected vs actual values
   ├── Calculate realization rate
   ├── Identify benefits at risk
   ├── Update benefit owners
   └── Report to stakeholders
   ```

2. **Risk Review Task Template**
   ```
   Task: "Review Program Risks"
   Checklist Items:
   ├── Review risk register
   ├── Assess risk probability/impact
   ├── Update mitigation status
   ├── Identify new risks
   ├── Escalate critical risks
   └── Update risk dashboard
   ```

3. **Integration Task Template**
   ```
   Task: "Coordinate Project A & B Integration"
   Checklist Items:
   ├── Identify integration points
   ├── Map dependencies
   ├── Define handoff criteria
   ├── Schedule handoff meeting
   ├── Verify deliverables
   ├── Complete handoff
   └── Update integration status
   ```

---

#### **Project-Level Task Templates**

1. **Design Task Template**
   ```
   Task: "Design UI Mockups"
   Checklist Items:
   ├── Create wireframes
   ├── Get stakeholder approval
   └── Finalize designs
   ```

2. **Development Task Template**
   ```
   Task: "Develop Backend API"
   Checklist Items:
   ├── Design API endpoints
   ├── Implement authentication
   ├── Write unit tests
   ├── Code review
   ├── Integration tests
   └── Documentation
   ```

3. **Testing Task Template**
   ```
   Task: "Conduct User Testing"
   Checklist Items:
   ├── Recruit test participants
   ├── Prepare test scenarios
   ├── Run testing sessions
   └── Analyze results
   ```

4. **Quality Gate Task Template**
   ```
   Task: "Quality Gate: Code Review"
   Checklist Items:
   ├── Code review completed
   ├── Unit tests passed (>80% coverage)
   ├── Integration tests passed
   ├── Performance tests passed
   ├── Security scan passed
   └── Documentation updated
   ```

---

## 🎯 **Implementation Priority**

### **Phase 1: Foundation** (Week 1-2)

1. **Database Schema**
   - Create unified `tasks` table (supports portfolio/program/project levels)
   - Create `checklist_items` table (subtasks of tasks)
   - Create `checklist_templates` table
   - Migrate existing `project_tasks` to unified `tasks` table
   - Create database functions (calculate_task_completion, create_checklist_from_template)
   - Create triggers (auto-update task completion percent)

2. **API Endpoints**
   - Unified tasks CRUD (`/api/tasks`) - supports all levels
   - Checklist items CRUD (`/api/tasks/:id/checklist-items`)
   - Checklist templates CRUD (`/api/checklist-templates`)
   - Apply template to task (`POST /api/tasks/:id/apply-template`)
   - Task dependencies (`/api/tasks/:id/dependencies`)

---

### **Phase 2: UI Components** (Week 3-4)

1. **Unified Task List Component**
   - Task list with filters (level, category, status, assignee)
   - Expandable task rows showing checklist items
   - Task detail modal/expanded view
   - Checklist item management (add, edit, delete, reorder)

2. **Portfolio Task View** (`/portfolio/tasks`)
   - Filter by task category (strategic-review, governance, optimization)
   - Task cards with checklist items
   - Quick actions (create task, apply template)

3. **Program Task View** (`/programs/[id]/tasks`)
   - Task category tabs (coordination, integration, benefits, risks)
   - Cross-project impact indicators
   - Program-specific checklist templates

4. **Project Task View** (`/projects/[id]/tasks`) - Enhanced
   - Multiple views (list, Gantt, Kanban, WBS)
   - WBS hierarchy support (parent tasks → child tasks → checklist items)
   - Checklist template selector
   - Bulk checklist creation
   - Checklist progress tracking (auto-calculates task completion %)

---

### **Phase 3: Advanced Features** (Week 5-6)

1. **Task Dependencies**
   - Dependency visualization (graph view)
   - Impact analysis (what tasks are blocked)
   - Cascade status updates (when dependency completes)
   - Dependency health checker

2. **Checklist Automation**
   - Auto-generate checklist items from templates
   - Smart checklist suggestions (AI-powered based on task type)
   - Checklist completion validation (enforce quality gates)
   - Auto-calculate task completion % from checklist items

3. **WBS Hierarchy Support**
   - Parent-child task relationships
   - Hierarchical checklist items (checklist items can have sub-items if needed)
   - Rollup progress (parent task completion = weighted average of children)

4. **Reporting & Analytics**
   - Task completion rates by level (portfolio/program/project)
   - Checklist completion trends
   - Dependency health dashboard
   - Bottleneck identification
   - Time tracking (estimated vs actual for tasks and checklist items)

---

## 📈 **Success Metrics**

### **Portfolio Level**
- ✅ 100% of strategic initiatives tracked as tasks
- ✅ Quarterly review tasks completed on time
- ✅ Governance decision tasks documented within 48 hours
- ✅ Checklist items completed for all portfolio tasks

### **Program Level**
- ✅ 100% of program coordination tasks tracked
- ✅ Benefits review tasks completed monthly (with checklist items)
- ✅ Risk review tasks completed bi-weekly (with checklist items)
- ✅ Integration tasks have complete checklist items

### **Project Level**
- ✅ 100% of project tasks have checklist items
- ✅ Checklist item completion rate >90%
- ✅ Quality gate checklist items enforced before task completion
- ✅ Task completion % auto-calculated from checklist items

---

## 🚀 **Next Steps**

1. **Approve Design**: Review and approve this design document
2. **Create Migration**: Database schema migration (Migration 338)
3. **Build APIs**: Backend service layer for all task types
4. **Build UI**: Frontend components for task management
5. **Test Integration**: End-to-end testing across all levels

---

**Status**: ✅ Design Complete - Ready for Implementation  
**Estimated Effort**: 6 weeks  
**Business Value**: Complete task visibility across Portfolio → Program → Project hierarchy

