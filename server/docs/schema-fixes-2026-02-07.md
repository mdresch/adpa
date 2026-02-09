# Database Schema Fixes Applied

**Date**: 2026-02-07  
**Migration**: `fix_schema_issues.sql`

## Issues Resolved

### 1. ✅ risk_triggers Table
- **Added**: `response_action TEXT`
- **Purpose**: Store action to take when trigger is activated
- **Index**: Created for better query performance

### 2. ✅ resources Table  
- **Added**: `availability_pct NUMERIC(5,2) DEFAULT 100.00`
- **Purpose**: Track resource availability percentage (0-100)
- **Constraint**: Added check constraint to ensure valid percentage range
- **Index**: Created for better query performance

### 3. ✅ resource_conflicts Table
- **Added**: `resolution TEXT`
- **Purpose**: Store resolution details for conflicts
- **Index**: Created for better query performance

### 4. ✅ stakeholder_issues Table
- **Modified**: `reported_date` - Changed from NOT NULL to nullable
- **Purpose**: Allow draft issues without a reported date
- **Index**: Created for better query performance on non-null values

### 5. ✅ engagement_actions Table
- **Modified**: Expanded `action_type` check constraint
- **Added Types**: 
  - meeting, email, presentation, workshop, survey
  - interview, focus_group, newsletter, report, briefing
  - consultation, feedback_session, town_hall, webinar
  - training, demo, review, update, announcement, other
- **Purpose**: Support wider range of engagement action types

## Verification

Run the following to verify changes:

```sql
-- Check new columns exist
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name IN ('risk_triggers', 'resources', 'resource_conflicts', 'stakeholder_issues')
AND column_name IN ('response_action', 'availability_pct', 'resolution', 'reported_date');

-- Check engagement_actions constraint
SELECT pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'engagement_actions_action_type_check';
```

## Impact

These fixes resolve the following extraction errors:
- ❌ `column "response_action" of relation "risk_triggers" does not exist`
- ❌ `column "availability_pct" of relation "resources" does not exist`
- ❌ `column "resolution" of relation "resource_conflicts" does not exist`
- ❌ `null value in column "reported_date" violates not-null constraint`
- ❌ `new row violates check constraint "engagement_actions_action_type_check"`

## Files Created

1. **Migration**: `server/migrations/fix_schema_issues.sql`
2. **Apply Script**: `server/scripts/apply-schema-fixes.js`
3. **Documentation**: This file

## Next Steps

The project data extraction service should now work without these schema errors. Monitor logs for any remaining issues.
