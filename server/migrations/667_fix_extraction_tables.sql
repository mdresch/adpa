
-- Migration: 667_fix_extraction_tables
-- Description: Add missing columns to extraction tables

BEGIN;

-- Fix utilization_records
ALTER TABLE utilization_records 
ADD COLUMN IF NOT EXISTS planned_utilization_pct NUMERIC,
ADD COLUMN IF NOT EXISTS actual_utilization_pct NUMERIC,
ADD COLUMN IF NOT EXISTS variance_pct NUMERIC;

-- Fix capacity_forecasts
ALTER TABLE capacity_forecasts 
ADD COLUMN IF NOT EXISTS gap_hours NUMERIC;

COMMIT;
