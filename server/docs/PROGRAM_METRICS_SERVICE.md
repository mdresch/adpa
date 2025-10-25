# Program Metrics & Aggregation Service

## Overview
The Program Metrics Service provides aggregated metrics across all projects within a program, including budget, schedule, status, and risk metrics.

## Files Created

### 1. Service: `server/src/services/programMetricsService.ts`
Core service that aggregates metrics from projects within a program.

**Functions:**
- `calculateMetrics(programId: string)` - Main aggregation function that returns all metrics
- `getBudgetMetrics(programId: string)` - Aggregates budget data (sum of project budgets/costs)
- `getScheduleMetrics(programId: string)` - Calculates timeline metrics
- `getRiskMetrics(programId: string)` - Counts risks by severity across projects
- `getRAGStatus(programId: string)` - Determines overall RAG status (worst project status)
- `invalidateCache(programId: string)` - Clears cached metrics for a program

### 2. Routes: `server/src/routes/programRoutes.ts`
API endpoint for accessing program metrics.

**Endpoints:**
- `GET /api/programs/:id/metrics` - Get aggregated metrics for a program

### 3. Tests: `server/src/__tests__/services/programMetricsService.test.ts`
Comprehensive unit tests covering all service functions.

**Test Coverage:**
- 15 tests total
- 87% code coverage
- Tests for happy paths and edge cases
- Cache hit/miss scenarios
- Programs with no projects

## API Usage

### Get Program Metrics
```http
GET /api/programs/:id/metrics
Authorization: Bearer <token>
```

**Response:**
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

## Business Logic

### Budget Aggregation
- **Total Budget**: SUM of all project budgets
- **Total Spent**: SUM of all project actual costs
- **Remaining**: Total - Spent
- **Percent Spent**: (Spent / Total) * 100

### Schedule Metrics
- **Total Days**: Days from earliest project start to latest project end
- **Days Elapsed**: Days from earliest start to current date
- **Percent Complete**: (Days Elapsed / Total Days) * 100

### RAG Status
Overall program status follows the "worst wins" rule:
- If any project is RED → Program is RED
- If any project is AMBER (and none RED) → Program is AMBER
- If all projects are GREEN → Program is GREEN

### Risk Metrics
Counts all risks across projects in the program, grouped by severity:
- Critical
- High
- Medium
- Low

## Caching

### Redis Cache
- **Cache Key Format**: `program:metrics:{programId}`
- **TTL**: 5 minutes (300 seconds)
- **Cache Hit**: Returns cached data with `cached: true`
- **Cache Miss**: Calculates fresh data and caches it

### Cache Invalidation
Call `invalidateCache(programId)` when:
- A project within the program is updated
- Project budget/status changes
- Risks are added/updated
- Project dates change

## Database Schema Requirements

The service expects the following database structure:

### Required Tables
- `programs` - Program information
- `projects` - Must have `program_id` foreign key
- `risks` - Must have `project_id` foreign key

### Required Columns

**projects table:**
- `program_id` (UUID, foreign key to programs.id)
- `budget` (DECIMAL)
- `actual_cost` (DECIMAL)
- `status` (TEXT: 'green', 'amber', 'red')
- `start_date` (TIMESTAMP)
- `end_date` (TIMESTAMP)

**risks table:**
- `project_id` (UUID, foreign key to projects.id)
- `severity` (TEXT: 'critical', 'high', 'medium', 'low')

## Testing

### Run Tests
```bash
cd server
npm test -- programMetricsService.test.ts
```

### Run Tests with Coverage
```bash
cd server
npm test -- programMetricsService.test.ts --coverage
```

### Test Results
```
Test Suites: 1 passed, 1 total
Tests:       15 passed, 15 total
Coverage:    87.23% statements, 71.87% branches, 100% functions, 86.95% lines
```

## Dependencies

This implementation assumes the following Beacons are complete:
- **Beacon 1.1**: Programs table exists
- **Beacon 1.2**: Program CRUD API exists
- **Beacon 1.3**: Project-program linking (program_id column in projects table)

## Performance Considerations

1. **Parallel Queries**: All metric calculations run in parallel using `Promise.all()`
2. **Redis Caching**: Reduces database load for frequently accessed metrics
3. **Optimized Queries**: Uses aggregation functions (SUM, COUNT) at the database level
4. **Cache TTL**: 5-minute TTL balances freshness with performance

## Future Enhancements

Potential improvements:
1. Add milestone progress tracking
2. Include budget trend analysis
3. Add predictive metrics (projected completion date)
4. Implement automatic cache invalidation via database triggers
5. Add real-time updates via WebSocket

## Error Handling

The service includes comprehensive error handling:
- Database query errors are logged and re-thrown
- Cache errors are logged but don't break functionality
- All functions include try-catch blocks
- Graceful handling of missing data (returns zeros/empty arrays)

## Monitoring

Recommended monitoring:
- Cache hit rate (should be high for frequently accessed programs)
- Query performance (should be <100ms for most programs)
- Error rates in logs
- API response times
