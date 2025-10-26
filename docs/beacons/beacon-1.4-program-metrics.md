# Beacon 1.4: Program Metrics & Aggregation Service

## Owner
Backend Agent #2 (can run parallel with Frontend agents)

## Duration
15-20 minutes with GitHub Copilot

## Dependencies
- Beacon 1.1: Programs table exists
- Beacon 1.2: Program CRUD API exists
- Beacon 1.3: Project-program linking (for aggregation)

## Epic
ADPA v3.0 - Program Management Foundation

## Description
Create a service that aggregates metrics from all projects within a program. Calculate total budget, total spent, overall RAG status, risk counts, and milestone progress. Cache results in Redis for performance.

---

## Requirements

### New Service: programMetricsService.ts

**Functions:**
- `calculateMetrics(programId: string)` - Main aggregation function
- `getBudgetMetrics(programId)` - Budget aggregation
- `getScheduleMetrics(programId)` - Timeline aggregation
- `getRiskMetrics(programId)` - Risk aggregation
- `getRAGStatus(programId)` - Calculate overall status

**Business Logic:**
- Total budget: SUM of all project budgets
- Total spent: SUM of all project actuals
- Overall status: WORST project status (if any red → program is red)
- Risk count: COUNT of high/critical risks across all projects
- Milestone progress: % of milestones completed across all projects

**Caching:**
- Cache results in Redis (5-minute TTL)
- Invalidate cache when any project in program changes
- Cache key format: `program:metrics:{programId}`

### Update Route: programRoutes.ts

**Add endpoint:**
- `GET /api/programs/:id/metrics` - Get aggregated metrics

**Response format:**
```json
{
  "success": true,
  "data": {
    "programId": "uuid",
    "budget": {
      "total": 12000000,
      "spent": 6000000,
      "remaining": 6000000,
      "percentSpent": 50
    },
    "schedule": {
      "totalDays": 180,
      "daysElapsed": 90,
      "percentComplete": 50
    },
    "status": {
      "overall": "green",
      "breakdown": {
        "green": 2,
        "amber": 1,
        "red": 0
      }
    },
    "risks": {
      "total": 15,
      "critical": 2,
      "high": 5,
      "medium": 6,
      "low": 2
    },
    "projects": {
      "total": 3,
      "active": 2,
      "completed": 1
    },
    "lastCalculated": "2025-10-25T10:00:00Z",
    "cached": true
  }
}
```

### Tests: programMetricsService.test.ts

**Test cases:**
- Calculate metrics for program with 3 projects
- Aggregate budget (sum of project budgets)
- Calculate RAG status (worst project status)
- Count risks by severity
- Handle program with no projects (return zeros)
- Cache invalidation when project updates
- Redis cache hit/miss scenarios

---

## Reference Files

**Study these patterns:**
- `server/src/services/projectService.ts` - Database query patterns
- `server/src/services/queueService.ts` - Redis caching patterns
- `server/src/routes/programRoutes.ts` - API endpoint patterns (Beacon 1.2)

**Use these utilities:**
- `server/src/utils/redis.ts` - Cache service (cache.get, cache.set)
- `server/src/utils/logger.ts` - Winston logger

---

## Output Files

1. `server/src/services/programMetricsService.ts` (new service)
2. `server/src/routes/programRoutes.ts` (add metrics endpoint)
3. `server/__tests__/services/programMetricsService.test.ts` (unit tests)

---

## Implementation Notes

**Database Queries:**
```sql
-- Get all projects in program
SELECT 
  id, name, budget, status, start_date, end_date
FROM projects 
WHERE program_id = $1;

-- Aggregate budget
SELECT 
  SUM(budget) as total_budget,
  SUM(actual_cost) as total_spent
FROM projects
WHERE program_id = $1;

-- Count risks by severity
SELECT 
  severity, COUNT(*) as count
FROM risks r
JOIN projects p ON r.project_id = p.id
WHERE p.program_id = $1
GROUP BY severity;
```

**RAG Status Logic:**
```typescript
// Overall status = worst project status
// red > amber > green
const calculateOverallStatus = (projectStatuses: string[]): string => {
  if (projectStatuses.includes('red')) return 'red';
  if (projectStatuses.includes('amber')) return 'amber';
  return 'green';
};
```

**Redis Caching:**
```typescript
const cacheKey = `program:metrics:${programId}`;
const cached = await cache.get(cacheKey);
if (cached) return JSON.parse(cached);

const metrics = await calculateMetrics(programId);
await cache.set(cacheKey, JSON.stringify(metrics), 300); // 5 min TTL
return metrics;
```

---

## Success Criteria

- [x] Metrics service calculates all required aggregations
- [x] Budget aggregation accurate (sum of projects)
- [x] RAG status logic correct (worst status wins)
- [x] Risk counting works across all projects
- [x] Redis caching implemented (5-min TTL)
- [x] Cache invalidation on project update
- [x] API endpoint returns metrics in correct format
- [x] Tests cover happy path + edge cases (no projects, cache scenarios)
- [x] 80%+ test coverage

---

## Time Estimate

**Traditional:** 8 hours (aggregation logic + caching + tests + debugging)
**With Copilot:** 15 minutes (AI generates, human reviews)
**Savings:** 97% faster!

---

**Status:** Ready for AI generation  
**Priority:** HIGH (needed for program dashboard)  
**Parallel:** Can develop with Beacon 2 (frontend) simultaneously

