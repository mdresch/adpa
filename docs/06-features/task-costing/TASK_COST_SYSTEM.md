# Task-Level Resource Cost System

## Overview

Complete system for calculating hourly and total resource costs at the task level, rolling up to project and portfolio financial metrics.

**Key Features**:
- ✅ Hourly cost calculation per resource (hourly_rate × allocation %)
- ✅ Total planned cost per resource (effective_hours × hourly_rate)
- ✅ Task total cost aggregation (sum of all assigned resources)
- ✅ Overtime tracking and cost calculation
- ✅ Actual vs planned variance analysis
- ✅ Cost breakdown by resource role/category
- ✅ Cost impact analysis for proposed changes
- ✅ Automatic task estimated cost updates

## Architecture

### Data Flow

```
TASK ASSIGNMENTS (scheduled resources)
├─ Resource 1 (hourly_rate, allocation %)
├─ Resource 2 (hourly_rate, allocation %)
└─ Resource 3 (hourly_rate, allocation %)
        ↓
COST CALCULATION
├─ Effective Hours = planned_hours × (allocation_percentage / 100)
├─ Planned Cost = effective_hours × hourly_rate
├─ Actual Cost = actual_hours × hourly_rate + overtime
└─ Variance = actual - planned
        ↓
TASK TOTAL COST
└─ Sum of all resource costs + overtime
        ↓
PROJECT AGGREGATION
└─ Sum of all task costs
        ↓
PORTFOLIO AGGREGATION
└─ Sum of all project costs (existing portfolioFinancialService)
```

## Database Structure

### Task Assignments (task_assignments table)
```sql
-- Planned Scheduling
planned_hours DECIMAL(10,2)      -- Total hours allocated to this resource
allocation_percentage DECIMAL(5,2) -- % of time on this task (default 100)
hourly_rate DECIMAL(10,2)        -- Resource hourly rate

-- Calculated Costs (from service)
planned_cost DECIMAL(15,2)       -- planned_hours × (allocation_percentage/100) × hourly_rate

-- Actual Tracking (from time entries)
actual_hours DECIMAL(10,2)       -- Sum of approved time entries
actual_cost DECIMAL(15,2)        -- Sum of time entry costs
overtime_hours DECIMAL(8,2)      -- Overtime hours logged
overtime_rate DECIMAL(10,2)      -- Overtime multiplier rate
overtime_cost DECIMAL(15,2)      -- overtime_hours × overtime_rate

-- Scheduling
scheduled_start_date DATE
scheduled_end_date DATE
```

### Project Tasks (project_tasks table)
```sql
-- Aggregated Costs (calculated from task assignments)
estimated_cost DECIMAL(15,2)     -- Sum of all assignments' planned_cost
actual_hours DECIMAL(10,2)       -- Sum of all assignments' actual_hours
actual_cost DECIMAL(15,2)        -- Sum of all assignments' actual_cost

-- Variance
hours_variance DECIMAL(10,2)     -- actual_hours - estimated_hours
cost_variance DECIMAL(15,2)      -- actual_cost - estimated_cost
```

## Service Functions

### 1. Calculate Single Resource Cost

```typescript
// Get cost details for one resource assigned to a task
const cost = await calculateTaskResourceCost(assignmentId);

// Returns:
{
  assignmentId: string,
  taskId: string,
  userId: string,
  userName: string,
  roleName: string,
  
  // Planned Costs
  plannedHours: 80,                  // Total hours planned
  hourlyRate: 150,                   // $/hour
  allocationPercentage: 50,          // 50% of time on this task
  effectiveHours: 40,                // 80 × (50/100) = 40 hours
  plannedCost: 6000,                 // 40 × 150 = $6000
  
  // Actual Costs
  actualHours: 42,
  actualCost: 6300,
  
  // Variance
  hoursVariance: 2,                  // 2 hours over
  costVariance: 300,                 // $300 over budget
  
  // Overtime
  overtimeHours: 3,
  overtimeRate: 225,                 // 1.5× regular rate
  overtimeCost: 675
}
```

### 2. Get Complete Task Cost Breakdown

```typescript
// Get all costs for a task including all resources
const breakdown = await getTaskCostBreakdown(taskId);

// Returns:
{
  taskId: string,
  taskName: "Implement Payment System",
  projectId: string,
  status: "in-progress",
  percentComplete: 65,
  
  // Aggregated Costs
  plannedTotalHours: 200,
  plannedTotalCost: 32000,           // Total of all resources
  
  actualTotalHours: 180,
  actualTotalCost: 31500,
  
  totalOvertimeHours: 10,
  totalOvertimeCost: 1500,
  
  // Task Variance
  hoursVariance: -20,                // 20 hours under
  costVariance: -500,                // $500 under budget
  variancePercentage: -1.56,         // -1.56% favorable
  
  // Resources Assigned
  resourceCount: 3,
  resources: [
    {
      // ... (individual resource costs as above)
    }
  ],
  
  // Cost by Category
  costByCategory: [
    {
      categoryName: "Senior Developer",
      categoryCode: "SENIOR_DEV",
      amount: 18000,
      hoursCount: 120
    },
    {
      categoryName: "QA Engineer",
      categoryCode: "QA_ENG",
      amount: 9000,
      hoursCount: 60
    }
  ]
}
```

### 3. Get All Project Tasks Costs

```typescript
// Get cost breakdown for entire project's tasks
const result = await getProjectTasksCostBreakdown(projectId);

// Returns:
{
  tasks: [
    { /* task cost breakdown 1 */ },
    { /* task cost breakdown 2 */ },
    // ... all tasks
  ],
  totals: {
    taskCount: 12,
    plannedTotalCost: 125000,
    actualTotalCost: 118500,
    varianceCost: -6500,
    plannedTotalHours: 800,
    actualTotalHours: 790
  }
}
```

### 4. Calculate Cost Impact

```typescript
// Calculate impact of changing an assignment
const impact = await calculateAssignmentCostImpact(assignmentId, {
  plannedHours: 100,          // Change from 80 to 100
  hourlyRate: 175,            // Change from 150 to 175
  allocationPercentage: 75    // Change from 50 to 75
});

// Returns:
{
  currentCost: 6000,          // Current: 40 × 150
  newCost: 9187.50,           // New: (100 × 0.75) × 175
  costDifference: 3187.50,    // $3187.50 increase
  percentageChange: 53.13     // 53.13% increase
}
```

### 5. Create/Update Task Assignment with Cost

```typescript
// Add or update a resource assignment to a task
const result = await upsertTaskAssignmentWithCost(taskId, {
  resourceAssignmentId: "uuid-of-project-assignment",
  userId: "uuid-of-user",
  userName: "John Smith",
  roleId: "uuid-of-role",
  roleName: "Senior Developer",
  plannedHours: 80,
  hourlyRate: 150,
  allocationPercentage: 50,  // 50% of time on this task
  scheduledStartDate: new Date("2025-11-21"),
  scheduledEndDate: new Date("2025-12-19")
});

// Returns: TaskResourceCost with calculated effective hours and cost
// Also: Automatically updates task's estimated_cost column
```

### 6. Update Task Estimated Cost

```typescript
// Recalculate task estimated cost from all assignments
const totalCost = await updateTaskEstimatedCost(taskId);
// Returns: $32000 (sum of all assignments)
```

## API Endpoints

### Get Task Cost Breakdown
```bash
GET /api/tasks/:taskId/cost

# Example
curl http://localhost:5000/api/tasks/550e8400-e29b-41d4-a716-446655440000/cost

# Response
{
  "success": true,
  "data": {
    "taskId": "550e8400-e29b-41d4-a716-446655440000",
    "taskName": "Implement Payment System",
    "plannedTotalCost": 32000,
    "actualTotalCost": 31500,
    "resources": [ ... ]
  }
}
```

### Get Resource Assignment Cost
```bash
GET /api/tasks/:taskId/resources/:assignmentId/cost

# Example
curl http://localhost:5000/api/tasks/550e8400-e29b-41d4-a716-446655440000/resources/660e8400-e29b-41d4-a716-446655440001/cost
```

### Get All Project Task Costs
```bash
GET /api/projects/:projectId/tasks/costs

# Example
curl http://localhost:5000/api/projects/770e8400-e29b-41d4-a716-446655440000/tasks/costs

# Response
{
  "success": true,
  "data": {
    "tasks": [ ... ],
    "totals": {
      "taskCount": 12,
      "plannedTotalCost": 125000,
      "actualTotalCost": 118500,
      "varianceCost": -6500
    }
  }
}
```

### Calculate Cost Impact
```bash
POST /api/tasks/:taskId/resources/:assignmentId/cost-impact
Content-Type: application/json

{
  "plannedHours": 100,
  "hourlyRate": 175,
  "allocationPercentage": 75
}

# Response
{
  "success": true,
  "data": {
    "currentCost": 6000,
    "newCost": 9187.50,
    "costDifference": 3187.50,
    "percentageChange": 53.13
  }
}
```

### Create/Update Task Assignment
```bash
POST /api/tasks/:taskId/resources
Content-Type: application/json

{
  "resourceAssignmentId": "uuid",
  "userId": "uuid",
  "userName": "John Smith",
  "roleId": "uuid",
  "roleName": "Senior Developer",
  "plannedHours": 80,
  "hourlyRate": 150,
  "allocationPercentage": 50,
  "scheduledStartDate": "2025-11-21T00:00:00Z",
  "scheduledEndDate": "2025-12-19T00:00:00Z"
}

# Response (201 Created)
{
  "success": true,
  "data": {
    "assignmentId": "new-uuid",
    "taskId": "...",
    "plannedCost": 6000,
    "effectiveHours": 40
  }
}
```

## Cost Calculation Examples

### Example 1: Simple Single Resource

**Task**: Implement Login Module (40 hours planned)  
**Resource**: Developer (rate: $100/hour, 100% allocation)

```
Effective Hours = 40 × (100/100) = 40 hours
Planned Cost = 40 × $100 = $4,000
```

### Example 2: Part-Time Allocation

**Task**: Code Review (20 hours)  
**Resource**: Senior Developer (rate: $150/hour, 50% allocation)

```
Effective Hours = 20 × (50/100) = 10 hours
Planned Cost = 10 × $150 = $1,500

(This developer spends 20 hours on the task,
 but only 10 count as cost since they're 50% allocated)
```

### Example 3: Multiple Resources

**Task**: API Development (80 hours)

```
Resource 1: Developer (40 hours, $100/hr, 100% alloc)
  → Effective: 40 hours, Cost: $4,000

Resource 2: Architect (30 hours, $150/hr, 50% alloc)  
  → Effective: 15 hours, Cost: $2,250

Resource 3: QA (20 hours, $80/hr, 100% alloc)
  → Effective: 20 hours, Cost: $1,600

Task Total: 75 effective hours, $7,850 cost
```

### Example 4: Overtime

**Task**: Bug Fixes (40 hours + 5 hours overtime)  
**Resource**: Developer (rate: $100/hr, overtime: $150/hr)

```
Regular Cost = 40 × $100 = $4,000
Overtime Cost = 5 × $150 = $750
Total Cost = $4,750
```

### Example 5: Variance Analysis

**Planned**: 50 hours, $5,000  
**Actual**: 55 hours, $5,750

```
Hours Variance = 55 - 50 = +5 hours (over)
Cost Variance = $5,750 - $5,000 = +$750 (over)
Variance % = ($750 / $5,000) × 100 = 15% over budget
```

## Files Created

| File | Purpose | Lines |
|------|---------|-------|
| `server/src/services/taskCostService.ts` | Core service with 6 main functions | 450 |
| `server/src/routes/taskCosts.ts` | 5 API endpoints with validation | 220 |
| `TASK_COST_SYSTEM.md` | This documentation | ~400 |

## Integration with Portfolio System

The task cost system feeds into the portfolio financial rollup:

```
Task Costs
    ↓
Project Tasks Aggregation → project.estimated_cost
    ↓
Portfolio Financial Service
    ├─ totalBudget (sum of project budgets)
    ├─ totalActualCost (sum of actual task costs)
    ├─ costVariance (sum of task variances)
    └─ ROI, NPV, payback period calculations
```

## Key Design Decisions

1. **Allocation Percentage**: Allows sharing resources across tasks
   - A developer can be 50% on Task A, 30% on Task B, 20% on Task C
   - Each task only pays for the allocated portion

2. **Effective Hours**: Separate from planned hours
   - Planned hours = total time person spends on task
   - Effective hours = hours actually costed (planned × allocation %)
   
3. **Automatic Updates**: Task cost updates when assignments change
   - Adding/removing resources recalculates task cost
   - Project rolls up from all task costs

4. **Variance Tracking**: Actual vs planned
   - Captures hours and cost variance
   - Helps identify over/under budget tasks

5. **Overtime Support**: Tracked separately
   - Allows overtime multipliers (1.5×, 2×)
   - Calculated separately from regular hours

## Performance Considerations

- **Indexes**: On task_id, user_id, resource_assignment_id for fast lookups
- **Aggregation**: Sums calculated at database level (SUM, COUNT)
- **Caching**: Task costs could be cached hourly if needed
- **Batch Operations**: Get all project costs in one query

## Testing

Example curl commands:

```bash
# Get task cost
curl -X GET http://localhost:5000/api/tasks/{taskId}/cost

# Get project task costs
curl -X GET http://localhost:5000/api/projects/{projectId}/tasks/costs

# Calculate cost impact
curl -X POST http://localhost:5000/api/tasks/{taskId}/resources/{assignmentId}/cost-impact \
  -H "Content-Type: application/json" \
  -d '{"plannedHours": 100, "hourlyRate": 175}'

# Create task assignment with cost
curl -X POST http://localhost:5000/api/tasks/{taskId}/resources \
  -H "Content-Type: application/json" \
  -d '{
    "resourceAssignmentId": "uuid",
    "userId": "uuid",
    "plannedHours": 80,
    "hourlyRate": 150,
    "allocationPercentage": 50
  }'
```

## Next Steps

1. **Integration Testing**
   - Test with real project data
   - Verify variance calculations
   - Check overtime logic

2. **Frontend Dashboard**
   - Display task cost breakdown
   - Show resource allocation charts
   - Highlight variance warnings

3. **Budget Alerts**
   - Alert when task goes over budget
   - Track burndown by task

4. **Reporting**
   - Task-by-task cost report
   - Resource utilization by role
   - Budget variance analysis
