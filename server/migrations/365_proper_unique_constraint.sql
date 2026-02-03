-- Migration 365: Create Proper Unique Constraint for Performance Actuals
-- Date: 2026-02-02
-- Purpose: Create unique constraint that prevents true duplicates regardless of measurement date

BEGIN;

-- Drop the existing constraint
ALTER TABLE performance_actuals 
DROP CONSTRAINT IF EXISTS performance_actuals_project_id_entity_type_entity_id_entity_key;

-- Create a proper unique constraint that prevents duplicates of the same entity
-- This ensures uniqueness based on project_id, entity_type, and entity_name only
-- Multiple entries for the same entity on different dates will be prevented
ALTER TABLE performance_actuals 
ADD CONSTRAINT unique_performance_actual_entity 
UNIQUE (project_id, entity_type, entity_name);

-- Add comment explaining the constraint
COMMENT ON CONSTRAINT unique_performance_actual_entity ON performance_actuals IS 
'Prevents duplicate performance entries for the same entity within the same project, regardless of measurement date';

COMMIT;
