-- Migration 364: Fix Unique Constraint to Remove Measurement Date
-- Date: 2026-02-02
-- Purpose: Remove measurement_date from unique constraint to prevent true duplicates

BEGIN;

-- Drop the existing unique constraint
ALTER TABLE performance_actuals 
DROP CONSTRAINT IF EXISTS unique_performance_actual;

-- Add new unique constraint without measurement_date
ALTER TABLE performance_actuals 
ADD CONSTRAINT unique_performance_actual 
UNIQUE (project_id, entity_type, entity_name);

-- Add comment explaining the constraint
COMMENT ON CONSTRAINT unique_performance_actual ON performance_actuals IS 
'Prevents duplicate performance entries for the same entity (regardless of measurement date)';

COMMIT;
