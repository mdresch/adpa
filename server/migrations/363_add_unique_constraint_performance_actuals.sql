-- Migration 363: Add Unique Constraint to Performance Actuals
-- Date: 2026-02-02
-- Purpose: Prevent duplicate performance actuals entries

BEGIN;

-- Add unique constraint to prevent duplicates
-- Based on project_id, entity_type, entity_name, and measurement_date
ALTER TABLE performance_actuals 
ADD CONSTRAINT unique_performance_actual 
UNIQUE (project_id, entity_type, entity_name, measurement_date);

-- Add comment explaining the constraint
COMMENT ON CONSTRAINT unique_performance_actual ON performance_actuals IS 
'Prevents duplicate performance entries for the same entity on the same date';

COMMIT;
