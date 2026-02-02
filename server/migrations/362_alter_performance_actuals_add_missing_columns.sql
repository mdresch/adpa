-- Migration 362: Add Missing Columns to Performance Actuals Table
-- Date: 2025-12-12
-- Purpose: Add missing columns to existing performance_actuals table
--          Adds: baseline_id, EVM metrics, source_document_id

BEGIN;

-- Add baseline_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'performance_actuals' AND column_name = 'baseline_id'
  ) THEN
    -- Check if baselines table exists before adding foreign key
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'baselines'
    ) THEN
      ALTER TABLE performance_actuals 
      ADD COLUMN baseline_id UUID REFERENCES baselines(id);
      
      CREATE INDEX IF NOT EXISTS idx_performance_actuals_baseline 
      ON performance_actuals(baseline_id) WHERE baseline_id IS NOT NULL;
      
      RAISE NOTICE 'Added baseline_id column with foreign key to baselines';
    ELSE
      -- Add column without foreign key if baselines table doesn't exist
      ALTER TABLE performance_actuals 
      ADD COLUMN baseline_id UUID;
      
      CREATE INDEX IF NOT EXISTS idx_performance_actuals_baseline 
      ON performance_actuals(baseline_id) WHERE baseline_id IS NOT NULL;
      
      RAISE NOTICE 'Added baseline_id column (baselines table not found, no foreign key constraint)';
    END IF;
  ELSE
    RAISE NOTICE 'baseline_id column already exists';
  END IF;
END $$;

-- Add EVM metrics columns if they don't exist
DO $$
BEGIN
  -- earned_value
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'performance_actuals' AND column_name = 'earned_value'
  ) THEN
    ALTER TABLE performance_actuals 
    ADD COLUMN earned_value DECIMAL(15,2);
    RAISE NOTICE 'Added earned_value column';
  END IF;
  
  -- actual_cost_evm
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'performance_actuals' AND column_name = 'actual_cost_evm'
  ) THEN
    ALTER TABLE performance_actuals 
    ADD COLUMN actual_cost_evm DECIMAL(15,2);
    RAISE NOTICE 'Added actual_cost_evm column';
  END IF;
  
  -- planned_value
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'performance_actuals' AND column_name = 'planned_value'
  ) THEN
    ALTER TABLE performance_actuals 
    ADD COLUMN planned_value DECIMAL(15,2);
    RAISE NOTICE 'Added planned_value column';
  END IF;
  
  -- schedule_performance_index
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'performance_actuals' AND column_name = 'schedule_performance_index'
  ) THEN
    ALTER TABLE performance_actuals 
    ADD COLUMN schedule_performance_index DECIMAL(5,3);
    RAISE NOTICE 'Added schedule_performance_index column';
  END IF;
  
  -- cost_performance_index
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'performance_actuals' AND column_name = 'cost_performance_index'
  ) THEN
    ALTER TABLE performance_actuals 
    ADD COLUMN cost_performance_index DECIMAL(5,3);
    RAISE NOTICE 'Added cost_performance_index column';
  END IF;
END $$;

-- Add source_document_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'performance_actuals' AND column_name = 'source_document_id'
  ) THEN
    -- Check if documents table exists before adding foreign key
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'documents'
    ) THEN
      ALTER TABLE performance_actuals 
      ADD COLUMN source_document_id UUID REFERENCES documents(id);
      RAISE NOTICE 'Added source_document_id column with foreign key to documents';
    ELSE
      -- Add column without foreign key if documents table doesn't exist
      ALTER TABLE performance_actuals 
      ADD COLUMN source_document_id UUID;
      RAISE NOTICE 'Added source_document_id column (documents table not found, no foreign key constraint)';
    END IF;
  ELSE
    RAISE NOTICE 'source_document_id column already exists';
  END IF;
END $$;

-- Update the trigger function to include EVM calculations if it doesn't already
CREATE OR REPLACE FUNCTION calculate_performance_variances()
RETURNS TRIGGER AS $$
DECLARE
  planned_duration_days INTEGER;
BEGIN
  -- Calculate schedule variance
  IF NEW.planned_end_date IS NOT NULL AND NEW.actual_end_date IS NOT NULL THEN
    NEW.schedule_variance_days := EXTRACT(DAY FROM (NEW.actual_end_date - NEW.planned_end_date))::INTEGER;
    
    -- Calculate schedule variance percentage
    IF NEW.planned_start_date IS NOT NULL AND NEW.planned_end_date IS NOT NULL THEN
      planned_duration_days := EXTRACT(DAY FROM (NEW.planned_end_date - NEW.planned_start_date))::INTEGER;
      IF planned_duration_days > 0 THEN
        NEW.schedule_variance_percent := (NEW.schedule_variance_days::DECIMAL / planned_duration_days::DECIMAL) * 100;
      END IF;
    END IF;
  END IF;
  
  -- Calculate cost variance
  IF NEW.planned_cost IS NOT NULL AND NEW.actual_cost IS NOT NULL THEN
    NEW.cost_variance := NEW.planned_cost - NEW.actual_cost;
    IF NEW.planned_cost > 0 THEN
      NEW.cost_variance_percent := (NEW.cost_variance / NEW.planned_cost) * 100;
    END IF;
  END IF;
  
  -- Calculate progress variance
  IF NEW.planned_progress_percent IS NOT NULL AND NEW.actual_progress_percent IS NOT NULL THEN
    NEW.progress_variance := NEW.actual_progress_percent - NEW.planned_progress_percent;
  END IF;
  
  -- Calculate EVM metrics (only if columns exist)
  -- Earned Value (EV) = % complete * planned cost
  IF NEW.planned_cost IS NOT NULL AND NEW.actual_progress_percent IS NOT NULL THEN
    NEW.earned_value := (NEW.actual_progress_percent / 100.0) * NEW.planned_cost;
  END IF;
  
  -- Actual Cost (AC) = actual_cost
  IF NEW.actual_cost IS NOT NULL THEN
    NEW.actual_cost_evm := NEW.actual_cost;
  END IF;
  
  -- Planned Value (PV) = planned_cost (for simplicity, can be enhanced with time-phased budget)
  IF NEW.planned_cost IS NOT NULL THEN
    NEW.planned_value := NEW.planned_cost;
  END IF;
  
  -- Schedule Performance Index (SPI) = EV / PV
  IF NEW.earned_value IS NOT NULL AND NEW.planned_value IS NOT NULL AND NEW.planned_value > 0 THEN
    NEW.schedule_performance_index := NEW.earned_value / NEW.planned_value;
  END IF;
  
  -- Cost Performance Index (CPI) = EV / AC
  IF NEW.earned_value IS NOT NULL AND NEW.actual_cost_evm IS NOT NULL AND NEW.actual_cost_evm > 0 THEN
    NEW.cost_performance_index := NEW.earned_value / NEW.actual_cost_evm;
  END IF;
  
  -- Update updated_at timestamp
  NEW.updated_at := NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS trigger_calculate_performance_variances ON performance_actuals;
CREATE TRIGGER trigger_calculate_performance_variances
  BEFORE INSERT OR UPDATE ON performance_actuals
  FOR EACH ROW
  EXECUTE FUNCTION calculate_performance_variances();

-- Add comments for new columns
COMMENT ON COLUMN performance_actuals.baseline_id IS 'Reference to approved baseline for comparison';
COMMENT ON COLUMN performance_actuals.earned_value IS 'EV = % complete * planned cost';
COMMENT ON COLUMN performance_actuals.actual_cost_evm IS 'AC (actual cost) for EVM calculations';
COMMENT ON COLUMN performance_actuals.planned_value IS 'PV (planned value) for EVM calculations';
COMMENT ON COLUMN performance_actuals.schedule_performance_index IS 'SPI = EV / PV. >1 = ahead, <1 = behind';
COMMENT ON COLUMN performance_actuals.cost_performance_index IS 'CPI = EV / AC. >1 = under budget, <1 = over budget';
COMMENT ON COLUMN performance_actuals.source_document_id IS 'Document where this performance actual was extracted from';

COMMIT;

