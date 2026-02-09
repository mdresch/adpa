-- Rollback Migration: Remove added columns
-- Date: 2026-02-07
-- Description: Rollback script for add_missing_columns.sql

-- Drop indexes first
DROP INDEX IF EXISTS idx_satisfaction_surveys_score;
DROP INDEX IF EXISTS idx_utilization_records_period;
DROP INDEX IF EXISTS idx_risk_assessments_assessment_date;

-- Remove columns (in reverse order of addition)
ALTER TABLE resources 
DROP COLUMN IF EXISTS cost_estimate;

ALTER TABLE satisfaction_surveys 
DROP COLUMN IF EXISTS satisfaction_score;

ALTER TABLE resource_conflicts 
DROP COLUMN IF EXISTS impacted_activities;

ALTER TABLE utilization_records 
DROP COLUMN IF EXISTS period;

ALTER TABLE risk_triggers 
DROP COLUMN IF EXISTS indicator;

ALTER TABLE risk_assessments 
DROP COLUMN IF EXISTS assessment_date;
