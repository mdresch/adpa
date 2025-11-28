# Task-Level Resource Cost System - Implementation Guide

## Quick Summary

Implemented a **complete task-level resource cost calculation system** that enables:

✅ **Hourly cost tracking** per resource (hourly_rate)  
✅ **Allocation-aware costing** (handle part-time assignments)  
✅ **Total task cost calculation** (sum of all resources)  
✅ **Automatic cost updates** when resources are assigned  
✅ **Variance analysis** (actual vs planned)  
✅ **Overtime tracking** with separate rates  
✅ **Cost impact analysis** for "what-if" scenarios  
✅ **Project aggregation** of all task costs  

## What Was Created

### 1. Backend Service (450 lines)
**File**: `server/src/services/taskCostService.ts`

**6 Core Functions**:
- `calculateTaskResourceCost()` - Cost for one resource
- `getTaskCostBreakdown()` - Complete task costs + all resources
- `getProjectTasksCostBreakdown()` - All tasks in a project
- `updateTaskEstimatedCost()` - Recalculate task cost from assignments
- `upsertTaskAssignmentWithCost()` - Add/update resource with automatic cost calc
- `calculateAssignmentCostImpact()` - "What-if" cost scenarios

**Key Interfaces**:
- `TaskResourceCost` - Single resource cost details
- `TaskCostBreakdown` - Complete task cost structure

### 2. API Routes (220 lines)
**File**: `server/src/routes/taskCosts.ts`

**5 Endpoints**:
```
GET    /api/tasks/:taskId/cost
GET    /api/tasks/:taskId/resources/:assignmentId/cost
GET    /api/projects/:projectId/tasks/costs
POST   /api/tasks/:taskId/resources/:assignmentId/cost-impact
POST   /api/tasks/:taskId/resources
```

All with:
- Full error handling
- Input validation
- Structured JSON responses
- Proper HTTP status codes

### 3. Documentation (400 lines)
**File**: `TASK_COST_SYSTEM.md`

Complete reference including:
- Architecture overview
- Database structure details
- All 6 service functions
- All 5 API endpoints
- Cost calculation examples
- Integration guide

### 4. Examples & Tests (200 lines)
**File**: `server/scripts/examples-task-cost.ts`

Demonstrates:
- Cost calculation examples
- API endpoint testing
- Expected responses
- Error handling

### 5. Server Integration
**File**: `server/src/server.ts` (modified)

Added:
- Import task cost routes
- Route registration at `/api/tasks`

## How It Works

### The Cost Calculation Formula

```
PLANNED COST CALCULATION:
═══════════════════════════════════════════════════════════════

Step 1: Calculate Effective Hours
  Effective Hours = Planned Hours × (Allocation % / 100)
  
  Example: 80 hours × (50% / 100) = 40 effective hours

Step 2: Calculate Planned Cost
  Planned Cost = Effective Hours × Hourly Rate
  
  Example: 40 hours × $150/hour = $6,000

Step 3: Aggregate to Task Total
  Task Total = Sum(all assigned resources)
  
  Example: Developer ($6,000) + QA ($2,000) + DevOps ($1,000) = $9,000

VARIANCE TRACKING:
═══════════════════════════════════════════════════════════════

  Hours Variance = Actual Hours - Effective Hours
  Cost Variance = Actual Cost - Planned Cost
  Variance % = (Cost Variance / Planned Cost) × 100
```

### Example: Three Resources on One Task

```
TASK: "Implement Payment Gateway" (80 total hours needed)

RESOURCE 1: Senior Developer
  - Planned Hours: 80 hours (on task)
  - Allocation: 100% (full time on this task)
  - Hourly Rate: $150
  - Effective Hours: 80 × (100/100) = 80 hours
  - Planned Cost: 80 × $150 = $12,000

RESOURCE 2: QA Engineer  
  - Planned Hours: 40 hours (on task)
  - Allocation: 50% (half time - other half on different task)
  - Hourly Rate: $100
  - Effective Hours: 40 × (50/100) = 20 hours
  - Planned Cost: 20 × $100 = $2,000

RESOURCE 3: DevOps Engineer
  - Planned Hours: 20 hours (on task)
  - Allocation: 25% (working on 4 tasks)
  - Hourly Rate: $130
  - Effective Hours: 20 × (25/100) = 5 hours
  - Planned Cost: 5 × $130 = $650

───────────────────────────────────────────────────────────────

TASK TOTAL:
  Total Planned Hours: 80
  Total Effective Hours: 105 (80 + 20 + 5)
  Total Planned Cost: $14,650
```

**Note**: More effective hours than planned hours because resources are working multiple tasks (their effort is spread across tasks, but this task captures their full cost for the time allocated).

## API Usage Examples

### 1. Get Task Cost Breakdown

```bash
curl -X GET http://localhost:5000/api/tasks/550e8400-e29b-41d4-a716-446655440000/cost
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "taskId": "550e8400-e29b-41d4-a716-446655440000",
    "taskName": "Implement Payment Gateway",
    "projectId": "770e8400-e29b-41d4-a716-446655440000",
    "status": "in-progress",
    "percentComplete": 65,
    
    "plannedTotalHours": 105,
    "plannedTotalCost": 14650,
    
    "actualTotalHours": 110,
    "actualTotalCost": 15200,
    
    "hoursVariance": 5,
    "costVariance": 550,
    "variancePercentage": 3.75,
    
    "resourceCount": 3,
    "resources": [
      {
        "assignmentId": "660e8400-e29b-41d4-a716-446655440001",
        "userName": "John Smith",
        "roleName": "Senior Developer",
        "plannedHours": 80,
        "hourlyRate": 150,
        "allocationPercentage": 100,
        "effectiveHours": 80,
        "plannedCost": 12000,
        "actualHours": 85,
        "actualCost": 12750,
        "hoursVariance": 5,
        "costVariance": 750
      },
      // ... more resources
    ],
    
    "costByCategory": [
      {
        "categoryName": "Senior Developer",
        "amount": 12000,
        "hoursCount": 80
      },
      // ... more categories
    ]
  }
}
```

### 2. Get All Project Task Costs

```bash
curl -X GET http://localhost:5000/api/projects/770e8400-e29b-41d4-a716-446655440000/tasks/costs
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "tasks": [
      { /* task 1 */ },
      { /* task 2 */ },
      { /* task 3 */ }
    ],
    "totals": {
      "taskCount": 3,
      "plannedTotalCost": 45000,
      "actualTotalCost": 43500,
      "varianceCost": -1500,
      "plannedTotalHours": 300,
      "actualTotalHours": 290
    }
  }
}
```

### 3. Calculate Cost Impact

```bash
curl -X POST http://localhost:5000/api/tasks/550e8400-e29b-41d4-a716-446655440000/resources/660e8400-e29b-41d4-a716-446655440001/cost-impact \
  -H "Content-Type: application/json" \
  -d '{
    "plannedHours": 100,
    "hourlyRate": 175,
    "allocationPercentage": 75
  }'
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "currentCost": 12000,
    "newCost": 13125,
    "costDifference": 1125,
    "percentageChange": 9.38
  }
}
```

### 4. Create Task Assignment with Cost

```bash
curl -X POST http://localhost:5000/api/tasks/550e8400-e29b-41d4-a716-446655440000/resources \
  -H "Content-Type: application/json" \
  -d '{
    "resourceAssignmentId": "assignment-001",
    "userId": "user-001",
    "userName": "Jane Developer",
    "roleId": "role-001",
    "roleName": "Senior Developer",
    "plannedHours": 80,
    "hourlyRate": 150,
    "allocationPercentage": 50,
    "scheduledStartDate": "2025-11-21T00:00:00Z",
    "scheduledEndDate": "2025-12-19T00:00:00Z"
  }'
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "assignmentId": "new-uuid",
    "taskId": "550e8400-e29b-41d4-a716-446655440000",
    "userName": "Jane Developer",
    "roleName": "Senior Developer",
    "plannedHours": 80,
    "hourlyRate": 150,
    "allocationPercentage": 50,
    "effectiveHours": 40,
    "plannedCost": 6000,
    "actualHours": 0,
    "actualCost": 0,
    "hoursVariance": 0,
    "costVariance": 0
  },
  "message": "Task assignment created/updated with cost calculated"
}
```

## Database Integration

### Tables Used

**project_tasks**
- `estimated_cost` ← Updated by service
- `actual_hours` ← Aggregated from time entries
- `actual_cost` ← Aggregated from time entries

**task_assignments**
- `planned_hours` ← From user input
- `hourly_rate` ← From resource assignment
- `allocation_percentage` ← From user input (default 100%)
- `planned_cost` ← Calculated by service
- `actual_hours` ← Aggregated from time entries
- `actual_cost` ← Aggregated from time entries
- `overtime_hours`, `overtime_rate`, `overtime_cost` ← For overtime tracking

**time_entries**
- `hours_worked` ← User input
- `hourly_rate` ← Captured at time of entry
- `regular_cost`, `overtime_cost`, `total_cost` ← Calculated

## Key Features

### 1. Allocation-Aware Costing
Resources can work on multiple tasks simultaneously. Each task only pays for the allocated percentage.

```
Developer: 100 hours total
├─ Task A: 40 hours (40% allocation) → 40 hours cost
├─ Task B: 30 hours (30% allocation) → 30 hours cost
├─ Task C: 20 hours (20% allocation) → 20 hours cost
└─ Task D: 10 hours (10% allocation) → 10 hours cost
```

### 2. Automatic Updates
When you add/update a task assignment, the task estimated cost automatically recalculates.

### 3. Variance Tracking
Compares actual hours/costs from time entries with planned values.

```
Planned: 40 hours, $6,000
Actual: 42 hours, $6,300
Variance: +2 hours, +$300 (5% over)
```

### 4. Overtime Support
Separate tracking of overtime hours with multiplier rates.

```
Regular: 40 hours × $100 = $4,000
Overtime: 5 hours × $150 (1.5×) = $750
Total: $4,750
```

### 5. Cost Impact Analysis
Calculate cost changes before making assignments.

## Integration with Portfolio System

The task cost system feeds into the existing portfolio financial rollup:

```
Task Assignments + Time Entries
          ↓
    Task Costs (new service)
          ↓
  Project Task Aggregation
          ↓
   Project Financial Metrics
          ↓
 Portfolio Financial Rollup (existing)
          ↓
   Portfolio Dashboard
```

## Testing the System

### Run Example Script

```bash
# Display calculation examples
npx tsx server/scripts/examples-task-cost.ts

# Also test API endpoints
npx tsx server/scripts/examples-task-cost.ts --test-api
```

### Test with curl

```bash
# Get task cost
curl http://localhost:5000/api/tasks/{taskId}/cost

# Create assignment
curl -X POST http://localhost:5000/api/tasks/{taskId}/resources \
  -H "Content-Type: application/json" \
  -d '{ ... }'
```

## Performance Notes

- **Queries**: Optimized with indexes on task_id, user_id, resource_assignment_id
- **Aggregation**: Done at database level (SUM, COUNT)
- **Batch**: Get all project costs efficiently in single query
- **Caching**: Could cache task costs hourly if needed

## What's Next

1. **Frontend Integration**
   - Display task costs in task details page
   - Show resource allocation charts
   - Show cost variance warnings

2. **Budget Alerts**
   - Alert when task goes over budget
   - Track cost by task daily

3. **Reports**
   - Task-by-task cost report
   - Resource utilization by role
   - Budget variance analysis

4. **Advanced Features**
   - Multi-year project cost tracking
   - Forecast vs actual analysis
   - Cost optimization suggestions

## Files Summary

| File | Size | Purpose |
|------|------|---------|
| `server/src/services/taskCostService.ts` | 450 lines | Core service |
| `server/src/routes/taskCosts.ts` | 220 lines | API endpoints |
| `TASK_COST_SYSTEM.md` | 400 lines | Full documentation |
| `server/scripts/examples-task-cost.ts` | 200 lines | Examples & tests |

## Questions?

Refer to:
- **How it works**: See TASK_COST_SYSTEM.md
- **API details**: See taskCosts.ts route definitions
- **Service logic**: See taskCostService.ts function comments
- **Examples**: Run examples-task-cost.ts script

---

**Status**: ✅ Implementation Complete  
**Ready for**: Integration testing with real project data  
**Next**: Build frontend pages and reports
