
-- Migration to fix missing columns in extraction tables

-- Add missing columns to utilization_records
ALTER TABLE utilization_records 
ADD COLUMN IF NOT EXISTS planned_utilization_pct numeric,
ADD COLUMN IF NOT EXISTS actual_utilization_pct numeric,
ADD COLUMN IF NOT EXISTS variance_pct numeric;

-- Add missing columns to capacity_forecasts
ALTER TABLE capacity_forecasts 
ADD COLUMN IF NOT EXISTS gap_hours numeric;
