# Portfolio Financial Rollup Implementation Summary

## Overview
Created a comprehensive portfolio financial aggregation service that rolls up labor costs (hours × hourly rates) and expense categories from all projects and programs into portfolio-level financial metrics.

## Files Created

### 1. Backend Service
**File**: `server/src/services/portfolioFinancialService.ts`

**Purpose**: Aggregate financial metrics from all projects and programs at the portfolio level

**Key Functions**:
- `getPortfolioFinancialMetrics()` - Portfolio-wide financial metrics including:
  - Budget metrics (total budget, actual cost, forecast, remaining, variance)
  - Labor costs (internal & external labor hours and costs)
  - Expense categories (cloud, AI services, software, equipment, materials, overhead)
  - Financial analysis (ROI, NPV, payback period)
  - Project performance (on-time %, on-budget %, completion rate)

- `getPortfolioCostBreakdown()` - Cost distribution by category
  - Shows amount, percentage of total, percentage of budget
  - Counts projects per category

- `getProgramFinancialMetrics(programId)` - Program-level financial summary
  - Nested aggregation for specific program

**Data Sources**:
- Projects table: budget, actual_cost, forecast_cost, expected_benefits, and category costs
- Time entries: Labor hours (filtered by approval status)
- Resource assignments: Cost category mapping

### 2. Backend Routes
**File**: `server/src/routes/portfolioFinancial.ts`

**Endpoints**:
- `GET /api/portfolio/financial` - Portfolio-level metrics
- `GET /api/portfolio/cost-breakdown` - Cost breakdown by category
- `GET /api/portfolio/program/:programId/financial` - Program-level metrics

**Features**:
- Error handling with detailed error responses
- Try-catch blocks for database errors
- Proper HTTP status codes (400, 500)

### 3. Frontend Page
**File**: `app/portfolio-financial/page.tsx`

**Components**:
- Key financial cards (total budget, actual cost, remaining budget, ROI)
- Labor cost breakdown (internal vs external with hours)
- Expense categories display
- Cost distribution bar charts
- Project status metrics
- Schedule performance (on-time %, completion %)
- Budget performance (on-budget %, utilization %)
- Financial analysis section (expected benefits, NPV, payback period)

**Features**:
- Loading state with spinner
- Error handling with detailed error messages
- Real-time data fetching from API
- Responsive grid layout (mobile-friendly)
- Color-coded metrics (green for positive, red for negative)

### 4. Formatting Utilities
**File**: `lib/utils/formatUtils.ts`

**Functions**:
- `formatCurrency(amount)` - Format USD with M/K abbreviations
- `formatPercentage(value)` - Format percentages with decimals
- `formatNumber(value)` - Format numbers with thousand separators
- `formatHours(hours)` - Format hours as "40h 30m"
- `formatDate(date)` - Format dates as "Jan 15, 2025"
- `formatDateTime(date)` - Format datetime with time

## Database Architecture

### Data Flow
```
Time Entries (hours) × Resource Assignments (hourly rate)
        ↓
    Projects (aggregate cost by category)
        ↓
    Programs (aggregate from projects)
        ↓
    Portfolio (aggregate from all projects & programs)
```

### Projects Table Columns Used
- `budget` - Approved project budget
- `actual_cost` - Actual costs incurred
- `forecast_cost` - Forecasted cost at completion
- `expected_benefits` - Expected financial benefits
- `internal_labor_cost` - Cost of internal employees
- `external_labor_cost` - Cost of contractors
- `cloud_infrastructure_cost` - AWS, Azure, hosting
- `ai_services_cost` - AI API costs
- `software_tools_cost` - Licenses and subscriptions
- `equipment_cost` - Hardware costs
- `materials_cost` - Supplies and consumables
- `overhead_cost` - Shared service costs
- `status` - Project status (completed, active, etc.)
- `percent_complete` - Project completion percentage
- `health_score` - Project health rating

### Key Calculations

#### Budget Metrics
- **Budget Variance** = Total Budget - Total Actual Cost
- **Budget Variance %** = (Budget Variance / Total Budget) × 100
- **Budget Utilization** = (Total Actual Cost / Total Budget) × 100

#### Financial Analysis
- **ROI** = ((Expected Benefits - Total Budget) / Total Budget) × 100
- **NPV** = Expected Benefits - Total Budget
- **Payback Period** = Total Budget / (Expected Benefits / 12) [in months]

#### Performance Metrics
- **On-Time %** = (Projects with ≥100% completion / Total Projects) × 100
- **On-Budget %** = (Projects with actual ≤ budget / Total Projects) × 100
- **At Risk** = Projects with health score < 60

#### Cost Breakdown
- Calculates cost per category as percentage of:
  - Total portfolio cost
  - Total portfolio budget
  - Number of projects using the category

## Integration

### Server Setup (server/src/server.ts)
1. Added import for portfolio financial routes
2. Registered routes at `/api/portfolio` prefix
3. Routes handle all errors with proper HTTP responses

### Frontend Integration
- Uses `NEXT_PUBLIC_API_URL` environment variable
- Falls back to `http://localhost:3001` for local development
- Handles fetch errors with user-friendly messages

## Usage Examples

### Get Portfolio Financial Metrics
```typescript
const response = await fetch(`${API_URL}/portfolio/financial`);
const { data: metrics } = await response.json();
```

### Get Cost Breakdown
```typescript
const response = await fetch(`${API_URL}/portfolio/cost-breakdown`);
const { data: breakdown } = await response.json();
```

### Get Program Financials
```typescript
const response = await fetch(`${API_URL}/portfolio/program/${programId}/financial`);
const { data: metrics } = await response.json();
```

## Performance Considerations

1. **Aggregation Queries**: Uses SUM and COALESCE for efficient aggregation
2. **Filtering**: Excludes archived projects and items
3. **Indexes**: Relies on existing database indexes on budget and cost columns
4. **Response Format**: Returns calculated metrics, not raw data

## Next Steps

1. **Test Data**: Run integration tests with existing project data
2. **Performance**: Monitor query performance with large datasets
3. **Caching**: Consider caching portfolio metrics (refresh hourly)
4. **Alerts**: Add alerts for budget overruns or schedule slips
5. **Drill-Down**: Link financial metrics to project/program details
6. **Export**: Add PDF/CSV export functionality
7. **Comparison**: Add year-over-year and period-over-period comparisons

## Files Modified

- `server/src/server.ts` - Added portfolio financial routes registration
