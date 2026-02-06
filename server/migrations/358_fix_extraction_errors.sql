-- Migration 358: Fix data extraction schema mismatches
-- Purpose:
-- 1. Add missing allocated_to column to contingency_reserves
-- 2. Fix performance_actuals unique constraint to allow multiple measurements over time and match code logic
-- 3. Relax team_agreements adherence_score check constraint

BEGIN;

-- 1. Contingency Reserves
ALTER TABLE contingency_reserves 
ADD COLUMN IF NOT EXISTS allocated_to TEXT;

-- 2. Performance Actuals
-- Drop old constraint if exists (it was strictly on entity, preventing history)
ALTER TABLE performance_actuals 
DROP CONSTRAINT IF EXISTS unique_performance_actual_entity;

-- Drop any other potential interfering unique indexes that might have been created manually
DROP INDEX IF EXISTS idx_performance_actuals_unique_measurement;

-- Create the correct unique index matching the desired logic (and updated code)
-- We exclude entity_id because it is often NULL in extraction, and we want to identify by name + DATE.
-- Note: code must be updated to ON CONFLICT (project_id, entity_type, entity_name, measurement_date)
ALTER TABLE performance_actuals 
ADD CONSTRAINT unique_performance_actual_measurement 
UNIQUE (project_id, entity_type, entity_name, measurement_date);

-- 3. Team Agreements
-- Drop the restrictive check constraint (likely generated with default settings causing errors for valid values)
ALTER TABLE team_agreements 
DROP CONSTRAINT IF EXISTS team_agreements_adherence_score_check;

-- Add a corrected check constraint allowing 0-10 or null
ALTER TABLE team_agreements 
ADD CONSTRAINT team_agreements_adherence_score_check 
CHECK (adherence_score >= 0 AND adherence_score <= 10);

COMMIT;
