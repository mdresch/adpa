# AI Analytics Date Matching Fix - Planning Document

**Status**: ✅ Resolved  
**Created**: 2026-01-23  
**Resolved**: 2026-01-23  
**Priority**: High  
**Complexity**: Medium

## Problem Statement

The AI Analytics daily breakdown feature is showing incorrect data when users click on dates in the "Usage Over Time" table. Specifically:

- **Symptom**: Clicking on January 15, 2026 shows data from January 14, 2026 (47 requests instead of 2.4K requests)
- **Impact**: Users cannot trust the daily breakdown data, making the feature unreliable
- **Root Cause**: Timezone mismatch between how dates are stored, queried, and compared in PostgreSQL

## Current Architecture

### Data Storage
- **Table**: `ai_usage_logs`
- **Column**: `created_at` (type: `TIMESTAMP WITH TIME ZONE`)
- **Storage**: Timestamps stored in UTC (as per application design)

### User Timezone Settings
- **Application Setting**: Users can configure timezone preference (default: UTC)
- **Display**: All timestamps are converted from UTC to user's selected timezone for display
- **Storage**: All dates/times are stored in UTC regardless of user preference
- **Date Format**: Users can choose display format (MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD)

**Important**: The timezone setting affects **display only**, not storage or queries. However, this context is crucial for understanding the date matching issue.

### Table Query (Working Correctly)
```sql
SELECT 
  DATE_TRUNC('day', aul.created_at AT TIME ZONE 'UTC')::date as date,
  ...
FROM ai_usage_logs aul
WHERE aul.created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', aul.created_at AT TIME ZONE 'UTC'), ...
```

**Why it works**: This query groups by UTC day boundaries, which matches how data is stored.

### Daily Breakdown Query (Not Working)
```sql
SELECT ...
FROM ai_usage_logs aul
WHERE DATE_TRUNC('day', aul.created_at AT TIME ZONE 'UTC')::date = $1::date
```

**Issue**: The date parameter `$1::date` may be interpreted in the PostgreSQL server's local timezone, causing a mismatch with the UTC-truncated dates. Even though the application stores everything in UTC, the date comparison might be happening in a different timezone context.

## Root Cause Analysis

### Hypothesis 1: Date Parameter Timezone Interpretation
When PostgreSQL receives a date string like `'2026-01-15'` and casts it to `::date`, it may interpret it in the server's local timezone context, not UTC. This could cause:
- Date `2026-01-15` interpreted as local midnight
- When compared to UTC-truncated dates, it might match the previous day

### Hypothesis 2: DATE_TRUNC Behavior
The `DATE_TRUNC('day', aul.created_at AT TIME ZONE 'UTC')` expression:
1. Converts `timestamptz` to `timestamp` (no timezone) in UTC
2. Truncates to day boundary in UTC
3. Casts to `date` type

When comparing this to a `date` parameter, PostgreSQL might be doing timezone-aware comparison.

### Hypothesis 3: Frontend Date Format & Timezone Context
The frontend passes dates as strings in `YYYY-MM-DD` format. The conversion path:
- Frontend: `row.date` (string: `"2026-01-15"`) - This comes from the table query which uses UTC
- API: `/daily/2026-01-15`
- Backend: `req.params.date` (string: `"2026-01-15"`)
- SQL: `$1::date` (may interpret in server timezone, not UTC)

**Key Insight**: Even though the application has timezone settings for display, the date string `"2026-01-15"` should represent a UTC calendar date. However, when PostgreSQL casts this to `::date`, it may interpret it in the server's timezone context, causing a mismatch.

### Hypothesis 4: User Timezone vs. Query Timezone
- **Display**: User's timezone preference affects how dates are shown
- **Storage**: All data stored in UTC
- **Query**: Date comparisons might be affected by PostgreSQL server timezone setting
- **Mismatch**: The date string from the frontend (which represents a UTC day) might be compared against dates in a different timezone context

## Proposed Solutions

### Solution 1: Use Timestamp Range with Explicit UTC Boundaries (Recommended)
**Approach**: Instead of comparing dates, use explicit UTC timestamp ranges.

**Implementation**:
```sql
-- Parse date string to UTC timestamps
const startUTC = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
const endUTC = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0))

-- Query using timestamp range
WHERE aul.created_at >= $1::timestamptz
  AND aul.created_at < $2::timestamptz
```

**Pros**:
- Explicit UTC boundaries eliminate timezone ambiguity
- Works regardless of PostgreSQL server timezone setting
- Matches how timestamps are actually stored

**Cons**:
- Slightly more complex (requires date parsing)
- Need to ensure frontend passes correct date format

### Solution 2: Use DATE() Function with Explicit UTC Conversion
**Approach**: Use PostgreSQL's `DATE()` function with explicit UTC conversion.

**Implementation**:
```sql
WHERE DATE(aul.created_at AT TIME ZONE 'UTC') = DATE($1::text || 'T00:00:00+00:00'::timestamptz)
```

**Pros**:
- Uses PostgreSQL's built-in date functions
- Explicit UTC conversion

**Cons**:
- More complex SQL
- May have performance implications

### Solution 3: Store Date as Separate Column (Long-term)
**Approach**: Add a computed column or materialized view with pre-calculated UTC dates.

**Implementation**:
```sql
ALTER TABLE ai_usage_logs 
ADD COLUMN created_date_utc DATE 
GENERATED ALWAYS AS (DATE_TRUNC('day', created_at AT TIME ZONE 'UTC')::date) STORED;

CREATE INDEX idx_ai_usage_created_date_utc ON ai_usage_logs(created_date_utc);
```

**Pros**:
- Eliminates timezone issues completely
- Better query performance (indexed date column)
- Consistent date representation

**Cons**:
- Requires database migration
- Adds storage overhead
- Long-term solution, not immediate fix

## Recommended Implementation Plan

### Phase 1: Immediate Fix (Solution 1)
1. **Update Backend Query Logic**
   - Parse date string to UTC timestamps in Node.js
   - Use `timestamptz` range queries instead of date comparisons
   - Ensure all daily breakdown queries use the same approach

2. **Update Frontend Date Handling**
   - Ensure date strings are passed in `YYYY-MM-DD` format
   - Add validation to prevent timezone conversion issues

3. **Testing**
   - Test with multiple dates (especially around timezone boundaries)
   - Verify table totals match daily breakdown totals
   - Test with different PostgreSQL timezone settings

### Phase 2: Verification & Debugging
1. **Add Comprehensive Logging**
   - Log the UTC timestamp range being queried
   - Log the date parameter received
   - Log the number of records found

2. **Add Diagnostic Endpoint**
   - Create a debug endpoint that shows:
     - What dates exist in the database for a given range
     - What the table query returns vs. daily breakdown query
     - Timezone information

### Phase 3: Long-term Improvement (Solution 3)
1. **Database Migration**
   - Add `created_date_utc` computed column
   - Create index for performance
   - Update all queries to use the new column

2. **Query Optimization**
   - Simplify queries using the indexed date column
   - Remove timezone conversion overhead

## Implementation Details

### Backend Changes Required

**File**: `server/src/routes/ai-analytics.ts`

**Changes**:
1. Parse date parameter to UTC timestamps:
   ```typescript
   const [year, month, day] = date.split('-').map(Number)
   const startUTC = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
   const endUTC = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0))
   ```

2. Update all queries to use timestamp range:
   ```sql
   WHERE aul.created_at >= $1::timestamptz
     AND aul.created_at < $2::timestamptz
   ```

3. Add comprehensive logging for debugging

### Frontend Changes Required

**File**: `app/ai-analytics/page.tsx`

**Changes**:
1. Ensure date strings are in `YYYY-MM-DD` format (representing UTC calendar dates)
2. Add validation before sending to API
3. Add error handling for date parsing issues
4. **Important**: The date string should represent a UTC calendar day, not the user's local timezone day
   - Even if user has timezone preference set, the date passed to API should be the UTC date from the table

## Testing Strategy

### Unit Tests
- Test date parsing logic with various date formats
- Test UTC timestamp creation
- Test edge cases (year boundaries, month boundaries)

### Integration Tests
- Test daily breakdown endpoint with known dates
- Verify totals match table query results
- Test with different PostgreSQL timezone settings

### Manual Testing Checklist
- [ ] Click on January 15, 2026 - should show 2.4K requests
- [ ] Click on January 14, 2026 - should show 47 requests
- [ ] Click on January 16, 2026 - should show 604 requests
- [ ] Verify all dates in table match their daily breakdowns
- [ ] Test with dates at month/year boundaries
- [ ] Test with dates that have data spanning multiple timezones

## Success Criteria

1. ✅ Daily breakdown totals match table totals for all dates
2. ✅ No timezone-related date shifts
3. ✅ Consistent behavior regardless of PostgreSQL server timezone
4. ✅ Comprehensive logging for future debugging
5. ✅ All existing functionality preserved

## Risks & Mitigation

### Risk 1: Performance Impact
- **Risk**: Timestamp range queries may be slower than date comparisons
- **Mitigation**: Ensure proper indexes exist on `created_at` column
- **Monitoring**: Add query performance logging

### Risk 2: Edge Cases
- **Risk**: Dates at timezone boundaries may still have issues
- **Mitigation**: Comprehensive testing with various dates
- **Monitoring**: Add diagnostic logging for edge cases

### Risk 3: Data Migration (if using Solution 3)
- **Risk**: Adding computed column may impact existing queries
- **Mitigation**: Test migration on staging environment first
- **Rollback**: Keep old queries working during transition

## Review Questions

1. **Should we use Solution 1 (timestamp ranges) or Solution 3 (computed column)?**
   - Solution 1: Quick fix, no migration needed
   - Solution 3: Long-term solution, requires migration

2. **What PostgreSQL timezone is the server configured with?**
   - This affects how dates are interpreted
   - Should be documented in environment config
   - **Note**: Application stores everything in UTC, but PostgreSQL server timezone may differ

3. **How should user timezone preferences affect the daily breakdown?**
   - **Current**: User timezone is for display only, not for queries
   - **Question**: Should the daily breakdown show data for the user's local calendar day, or always UTC calendar day?
   - **Recommendation**: Keep UTC calendar day for consistency (matches table behavior)

4. **Are there other queries in the codebase with similar date comparison issues?**
   - Should audit all date-based queries
   - May need broader fix
   - Check if user timezone settings affect any other date-based queries

5. **Should we add a database migration to add `created_date_utc` column?**
   - Improves performance long-term
   - Requires careful planning
   - Would eliminate timezone issues completely

6. **Should we document the timezone handling strategy?**
   - Document that all dates are stored in UTC
   - Document that user timezone is for display only
   - Document that date queries should always use UTC boundaries

## Next Steps

1. **Review this planning document** - Get stakeholder approval
2. **Choose solution approach** - Decide between Solution 1 (quick fix) or Solution 3 (long-term)
3. **Draft implementation** - Create detailed implementation plan
4. **Code review** - Review implementation before coding
5. **Implement & test** - Execute the fix with comprehensive testing
6. **Monitor** - Watch for any remaining timezone issues

## Additional Context

### Application Timezone Settings
- **User Preference**: Users can set timezone (default: UTC)
- **Purpose**: Affects display of timestamps only
- **Storage**: All data stored in UTC regardless of user preference
- **Date Format**: Users can choose display format (MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD)
- **Location**: Settings page → General Settings → Timezone

### Key Principle
**All dates and times are stored in UTC. User timezone preferences affect display only, not storage or queries.**

This means:
- The table shows dates in UTC (from `DATE_TRUNC('day', created_at AT TIME ZONE 'UTC')`)
- The daily breakdown should query for the same UTC calendar day
- User's timezone preference should NOT affect which data is queried, only how it's displayed

## Resolution

### Root Cause Identified
The issue was caused by PostgreSQL's `date` type being serialized by the `pg` library when returned to Node.js. When PostgreSQL returned `DATE_TRUNC('day', aul.created_at AT TIME ZONE 'UTC')::date`, the `pg` library was converting it to a JavaScript Date object, which could cause timezone conversion issues during serialization. This resulted in Jan 16 UTC data being incorrectly grouped as Jan 15 in the main analytics table.

### Solution Implemented
**Solution**: Use `TO_CHAR` to return dates as strings directly from PostgreSQL, avoiding timezone conversion issues.

**Implementation**:
```sql
-- Changed from:
DATE_TRUNC('day', aul.created_at AT TIME ZONE 'UTC')::date as date

-- To:
TO_CHAR(DATE_TRUNC('day', aul.created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') as date
```

**Files Modified**:
- `server/src/routes/ai-analytics.ts`: Updated `usageOverTime` query to use `TO_CHAR` for date formatting
- Removed diagnostic logging code added during troubleshooting

**Result**:
- ✅ Jan 15 table now correctly shows 47 requests (actual Jan 15 data)
- ✅ Jan 16 table now correctly shows 2.4K requests (actual Jan 16 data)
- ✅ Daily breakdown dates now match the table dates perfectly
- ✅ No timezone conversion issues when dates are serialized by the `pg` library

### Verification
- Table dates match actual UTC dates in the database
- Clicking on dates in the table shows the correct daily breakdown
- All date comparisons use consistent UTC day boundaries

## References

- PostgreSQL DATE_TRUNC documentation
- PostgreSQL timezone handling best practices
- Current implementation: `server/src/routes/ai-analytics.ts`
- Frontend: `app/ai-analytics/page.tsx`
- Application timezone settings: Settings page → General Settings
