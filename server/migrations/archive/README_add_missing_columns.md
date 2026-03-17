# Database Migration: Add Missing Columns

## Overview
This migration adds missing columns to several tables that were identified from extraction service errors.

## Migration File
- **Forward Migration**: `migrations/add_missing_columns.sql`
- **Rollback Migration**: `migrations/rollback_missing_columns.sql`

## Changes

### 1. `risk_assessments` Table
- **Added Column**: `assessment_date TIMESTAMP NOT NULL`
- **Default**: `CURRENT_TIMESTAMP`
- **Purpose**: Date when the risk assessment was performed
- **Index**: `idx_risk_assessments_assessment_date`

### 2. `risk_triggers` Table
- **Added Column**: `indicator TEXT`
- **Purpose**: Indicator or signal that triggers the risk

### 3. `utilization_records` Table
- **Added Column**: `period TEXT`
- **Purpose**: Time period for the utilization record (e.g., Q1 2026, Jan 2026)
- **Index**: `idx_utilization_records_period`

### 4. `resource_conflicts` Table
- **Added Column**: `impacted_activities JSONB`
- **Default**: `'[]'::jsonb`
- **Purpose**: JSON array of activity IDs impacted by the resource conflict

### 5. `satisfaction_surveys` Table
- **Added Column**: `satisfaction_score NUMERIC(3,2)`
- **Constraint**: `CHECK (satisfaction_score >= 0 AND satisfaction_score <= 10)`
- **Purpose**: Satisfaction score from 0 to 10
- **Index**: `idx_satisfaction_surveys_score`

### 6. `resources` Table
- **Added Column**: `cost_estimate NUMERIC(12,2)`
- **Purpose**: Estimated cost for the resource

## Running the Migration

### Apply Migration
```bash
# From the server directory
node scripts/run-migration.js add_missing_columns.sql

# Or using the migration number (if numbered)
node scripts/run-migration.js add_missing_columns
```

### Rollback Migration
```bash
node scripts/run-migration.js rollback_missing_columns.sql
```

## Verification

After running the migration, verify the changes:

```sql
-- Check risk_assessments columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'risk_assessments'
ORDER BY ordinal_position;

-- Check risk_triggers columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'risk_triggers'
ORDER BY ordinal_position;

-- Check utilization_records columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'utilization_records'
ORDER BY ordinal_position;

-- Check resource_conflicts columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'resource_conflicts'
ORDER BY ordinal_position;

-- Check satisfaction_surveys columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'satisfaction_surveys'
ORDER BY ordinal_position;

-- Check resources columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'resources'
ORDER BY ordinal_position;
```

## Impact

This migration resolves the following extraction errors:
- ✅ `null value in column "assessment_date" of relation "risk_assessments" violates not-null constraint`
- ✅ `column "indicator" of relation "risk_triggers" does not exist`
- ✅ `column "period" of relation "utilization_records" does not exist`
- ✅ `column "impacted_activities" of relation "resource_conflicts" does not exist`
- ✅ `column "satisfaction_score" of relation "satisfaction_surveys" does not exist`
- ✅ `column "cost_estimate" of relation "resources" does not exist`

## Notes

- The migration uses `IF NOT EXISTS` clauses to be idempotent
- Existing `risk_assessments` rows will have their `assessment_date` set to `created_at` or `CURRENT_TIMESTAMP`
- All new columns are nullable except `assessment_date` (which gets a default value first)
- Indexes are added for commonly queried columns
- Column comments are added for documentation
