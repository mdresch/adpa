-- Migration: Add missing columns to various tables
-- Date: 2026-02-07
-- Description: Adds missing columns identified from extraction service errors

-- 1. Add assessment_date to risk_assessments table
ALTER TABLE risk_assessments 
ADD COLUMN IF NOT EXISTS assessment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Update existing rows to have a default assessment_date
UPDATE risk_assessments 
SET assessment_date = COALESCE(created_at, CURRENT_TIMESTAMP)
WHERE assessment_date IS NULL;

-- Make assessment_date NOT NULL after setting defaults
ALTER TABLE risk_assessments 
ALTER COLUMN assessment_date SET NOT NULL;

-- 2. Add indicator column to risk_triggers table
ALTER TABLE risk_triggers 
ADD COLUMN IF NOT EXISTS indicator TEXT;

-- 3. Add period column to utilization_records table
ALTER TABLE utilization_records 
ADD COLUMN IF NOT EXISTS period TEXT;

-- 4. Add impacted_activities column to resource_conflicts table
ALTER TABLE resource_conflicts 
ADD COLUMN IF NOT EXISTS impacted_activities JSONB DEFAULT '[]'::jsonb;

-- 5. Add satisfaction_score column to satisfaction_surveys table
ALTER TABLE satisfaction_surveys 
ADD COLUMN IF NOT EXISTS satisfaction_score NUMERIC(3,2) CHECK (satisfaction_score >= 0 AND satisfaction_score <= 10);

-- 6. Add cost_estimate column to resources table
ALTER TABLE resources 
ADD COLUMN IF NOT EXISTS cost_estimate NUMERIC(12,2);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_risk_assessments_assessment_date 
ON risk_assessments(assessment_date);

CREATE INDEX IF NOT EXISTS idx_utilization_records_period 
ON utilization_records(period);

CREATE INDEX IF NOT EXISTS idx_satisfaction_surveys_score 
ON satisfaction_surveys(satisfaction_score);

-- Add comments for documentation
COMMENT ON COLUMN risk_assessments.assessment_date IS 'Date when the risk assessment was performed';
COMMENT ON COLUMN risk_triggers.indicator IS 'Indicator or signal that triggers the risk';
COMMENT ON COLUMN utilization_records.period IS 'Time period for the utilization record (e.g., Q1 2026, Jan 2026)';
COMMENT ON COLUMN resource_conflicts.impacted_activities IS 'JSON array of activity IDs impacted by the resource conflict';
COMMENT ON COLUMN satisfaction_surveys.satisfaction_score IS 'Satisfaction score from 0 to 10';
COMMENT ON COLUMN resources.cost_estimate IS 'Estimated cost for the resource';
