# Activities vs Work Items: Understanding the Difference

**Date**: January 2025  
**Status**: Documentation  
**Purpose**: Clarify the distinction between PMBOK 7th Edition Activities and PMBOK 8th Edition Work Items

---

## 🎯 Executive Summary

**Activities** (PMBOK 7th Edition) and **Work Items** (PMBOK 8th Edition) serve different purposes in project management:

- **Activities** = **Planning & Scheduling** (What needs to be done, when, by whom)
- **Work Items** = **Execution & Tracking** (Actual work being performed, effort spent, progress made)

They complement each other: Activities define the plan, Work Items track the execution.

---

## 📊 Key Differences

### **1. PMBOK Framework Alignment**

| Aspect | Activities | Work Items |
|--------|-----------|------------|
| **PMBOK Edition** | 7th Edition (Process Groups) | 8th Edition (Performance Domains) |
| **Domain** | Planning Performance Domain | Project Work Performance Domain |
| **Focus** | Planning & Scheduling | Execution & Performance Tracking |
| **Lifecycle Stage** | Planning Phase | Execution Phase |

### **2. Purpose & Scope**

#### **Activities (PMBOK 7th Edition)**
- **Purpose**: Decompose work packages into actionable, schedulable units
- **Scope**: High-level planning and scheduling
- **Focus**: What needs to be done, when, dependencies, resource allocation
- **Example**: "Develop frontend module" (planned activity with duration, dependencies, assigned resources)

#### **Work Items (PMBOK 8th Edition)**
- **Purpose**: Track actual work execution with effort and progress details
- **Scope**: Day-to-day execution and performance tracking
- **Focus**: Actual hours worked, progress percentage, blockers, completion status
- **Example**: "Implement login component" (work item with 8 hours estimated, 6 hours actual, 75% complete, blocked by API dependency)

### **3. Data Structure Comparison**

#### **Activities Schema** (Planning-Focused)
```typescript
interface Activity {
  name: string                    // "Develop frontend module"
  description: string             // High-level description
  category?: string               // "development", "testing", "planning"
  phase?: string                 // "Phase 1", "Planning Phase"
  
  // Scheduling
  start_date?: string            // Planned start date
  end_date?: string             // Planned end date
  duration?: number              // Planned duration
  duration_unit?: 'days' | 'weeks' | 'months'
  dependencies?: string[]       // ["Activity 1", "Activity 2"]
  
  // Resource Planning
  assigned_to?: string           // "John Doe" or role
  effort_estimate?: number      // Estimated effort (planning)
  effort_unit?: 'hours' | 'days' | 'story_points'
  
  // Status (Planning Perspective)
  status: 'planned' | 'in_progress' | 'completed' | 'blocked' | 'cancelled'
  deliverable?: string          // Related deliverable
}
```

#### **Work Items Schema** (Execution-Focused)
```typescript
interface WorkItem {
  name: string                   // "Implement login component"
  description?: string           // Detailed task description
  activity_name?: string         // Links to parent Activity
  
  // Execution Tracking
  assigned_to?: string           // Specific person assigned
  estimated_hours?: number       // Estimated hours (from planning)
  actual_hours?: number         // ⭐ ACTUAL hours worked
  progress_percentage?: number  // ⭐ 0-100% completion
  
  // Execution Status
  status: 'todo' | 'in_progress' | 'review' | 'done' | 'blocked'
  blockers?: string[]           // ⭐ Current impediments
  completed_date?: string       // ⭐ When actually completed
  
  source_document?: string      // Where this was extracted from
}
```

### **4. Key Distinguishing Features**

#### **Activities** (Planning)
- ✅ **Schedule-oriented**: Start/end dates, duration, dependencies
- ✅ **Phase-aligned**: Belongs to project phases
- ✅ **WBS-linked**: Derived from Work Breakdown Structure
- ✅ **Resource planning**: Who should do it, estimated effort
- ✅ **Deliverable-linked**: Maps to project deliverables
- ❌ **No actual tracking**: Doesn't track actual hours or progress

#### **Work Items** (Execution)
- ✅ **Effort tracking**: Actual hours vs. estimated hours
- ✅ **Progress tracking**: Percentage complete (0-100%)
- ✅ **Blockers tracking**: Current impediments and blockers
- ✅ **Activity-linked**: Can reference parent Activity
- ✅ **Completion tracking**: Actual completion date
- ❌ **No scheduling**: Doesn't have start/end dates or dependencies

---

## 🔄 Relationship Between Activities and Work Items

### **One-to-Many Relationship**

```
Activity (Planning)
├── Work Item 1 (Execution)
├── Work Item 2 (Execution)
└── Work Item 3 (Execution)
```

**Example:**
- **Activity**: "Develop frontend module" (planned: 40 hours, 2 weeks, assigned to Frontend Team)
  - **Work Item 1**: "Implement login component" (estimated: 8h, actual: 6h, 75% done)
  - **Work Item 2**: "Build dashboard UI" (estimated: 16h, actual: 12h, 50% done, blocked by API)
  - **Work Item 3**: "Add user profile page" (estimated: 16h, actual: 0h, 0% done, todo)

### **How They Work Together**

1. **Planning Phase**: Activities are created from WBS decomposition
   - Define what needs to be done
   - Schedule activities with dependencies
   - Assign resources and estimate effort

2. **Execution Phase**: Work Items are created from Activities
   - Break down activities into actionable tasks
   - Track actual effort and progress
   - Identify blockers and impediments
   - Record actual completion dates

3. **Monitoring Phase**: Compare Activities vs. Work Items
   - **Planned** (Activity): 40 hours estimated
   - **Actual** (Work Items): 18 hours worked so far
   - **Progress**: 45% complete (18/40 hours)
   - **Variance**: On track (or behind/ahead)

---

## 📋 Use Cases in Task List

### **When to Use Activities**

✅ **Use Activities for:**
- Project planning and scheduling
- Creating project timelines (Gantt charts)
- Resource allocation planning
- Dependency management
- High-level project tracking
- WBS decomposition
- Phase-based project management (PMBOK 7th Edition)

### **When to Use Work Items**

✅ **Use Work Items for:**
- Daily task tracking
- Effort logging (actual hours)
- Progress percentage tracking
- Blocker/impediment management
- Sprint/iteration planning (Agile)
- Team member workload tracking
- Performance measurement (PMBOK 8th Edition)

### **Recommended Approach: Hybrid**

**Best Practice**: Use both together

1. **Activities** = High-level project plan
   - Create from WBS
   - Schedule with dependencies
   - Assign to teams/roles

2. **Work Items** = Detailed execution tasks
   - Break down activities into work items
   - Assign to specific team members
   - Track daily progress and effort

3. **Task List Page** = Show both with filtering
   - **View**: "Activities" (planning view)
   - **View**: "Work Items" (execution view)
   - **View**: "Combined" (both together)

---

## 🎨 UI/UX Recommendations

### **Task List Page Structure**

```
┌─────────────────────────────────────────────────────────┐
│ Task List - Project: [Project Name]                      │
├─────────────────────────────────────────────────────────┤
│ View Toggle: [Activities] [Work Items] [Combined]      │
│ Filter: [Status] [Assigned To] [Phase] [Category]      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ ACTIVITIES VIEW (Planning)                               │
│ ┌────────────────────────────────────────────────────┐  │
│ │ ACT-001: Develop frontend module                  │  │
│ │ Phase: Phase 1 | Duration: 2 weeks                │  │
│ │ Assigned: Frontend Team                           │  │
│ │ Dependencies: ACT-002, ACT-003                    │  │
│ │ Status: In Progress                               │  │
│ │ [View Work Items →]                               │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ WORK ITEMS VIEW (Execution)                              │
│ ┌────────────────────────────────────────────────────┐  │
│ │ WI-001: Implement login component                  │  │
│ │ Activity: ACT-001                                 │  │
│ │ Assigned: John Doe                                │  │
│ │ Estimated: 8h | Actual: 6h | Progress: 75%        │  │
│ │ Blockers: API dependency                          │  │
│ │ Status: In Progress                               │  │
│ │ [Log Hours] [Update Progress]                     │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### **Key UI Differences**

| Feature | Activities View | Work Items View |
|---------|---------------|-----------------|
| **Columns** | Phase, Duration, Dependencies, Deliverable | Estimated Hours, Actual Hours, Progress %, Blockers |
| **Actions** | View Schedule, Assign Resources | Log Hours, Update Progress, Add Blocker |
| **Visualization** | Gantt Chart, Timeline | Burndown Chart, Progress Bars |
| **Focus** | Planning & Scheduling | Execution & Tracking |

---

## 🔍 Extraction Differences

### **Activities Extraction** (PMBOK 7th Edition)
- Extracted from: **Activity List**, **WBS**, **Schedule documents**
- Focus: Planning documents, project plans, schedules
- AI Prompt: "Extract activities, tasks, and work packages with timelines, dependencies, and resource assignments"

### **Work Items Extraction** (PMBOK 8th Edition)
- Extracted from: **Sprint backlogs**, **Task lists**, **Progress reports**, **Timesheets**
- Focus: Execution documents, progress reports, actual work performed
- AI Prompt: "Identify work items / tasks / backlog items with effort tracking details, actual hours, progress percentage, and blockers"

---

## 📈 PMBOK 8th Edition Alignment

### **Domain 4: Planning Performance Domain**
- **Activities** support this domain
- Focus: Creating project plans, schedules, resource allocation
- Outcome: Comprehensive project plan with scheduled activities

### **Domain 5: Project Work Performance Domain**
- **Work Items** support this domain
- Focus: Executing work, tracking performance, managing impediments
- Outcome: Actual work performed, effort tracked, progress measured

---

## ✅ Summary

| Aspect | Activities | Work Items |
|--------|-----------|------------|
| **Purpose** | Planning & Scheduling | Execution & Tracking |
| **PMBOK Edition** | 7th Edition | 8th Edition |
| **Domain** | Planning Performance Domain | Project Work Performance Domain |
| **Focus** | What, When, Who (planned) | Actual effort, progress, blockers |
| **Data** | Dates, duration, dependencies | Hours, progress %, blockers |
| **Use Case** | Project planning | Daily task tracking |
| **Relationship** | Parent (high-level) | Child (detailed execution) |

**Recommendation**: Use **Activities** for project planning and **Work Items** for execution tracking. The task list page should support both views, allowing users to switch between planning (Activities) and execution (Work Items) perspectives.

---

**Next Steps**:
1. ✅ Activities extraction implemented
2. ✅ Work Items extraction implemented
3. 🔄 Task list page UI enhancement (show both with filtering)
4. 🔄 Link Work Items to Activities (parent-child relationship)
5. 🔄 Progress aggregation (Activity progress = sum of Work Items progress)

