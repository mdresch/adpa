-- Migration 362: Create Performance Actuals Table
-- Date: 2025-12-12
-- Purpose: Add performance actuals tracking for PMBOK 8 Measurement Performance Domain
--          Tracks actual vs. planned performance across schedule, cost, scope, and quality

BEGIN;

-- Performance Actuals Table
CREATE TABLE IF NOT EXISTS performance_actuals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Entity reference (what is being measured)
  entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('milestone', 'deliverable', 'activity', 'phase', 'resource')),
  entity_id UUID, -- Foreign key to related entity (nullable for extracted data that hasn't been linked yet)
  entity_name VARCHAR(500) NOT NULL, -- Cached name for reporting
  
  -- Baseline reference (optional, links to approved baseline)
  baseline_id UUID REFERENCES baselines(id),
  
  -- Schedule actuals
  planned_start_date TIMESTAMP,
  actual_start_date TIMESTAMP,
  planned_end_date TIMESTAMP,
  actual_end_date TIMESTAMP,
  schedule_variance_days INTEGER, -- Positive = ahead, Negative = behind
  schedule_variance_percent DECIMAL(5,2), -- Percentage variance
  
  -- Cost actuals
  planned_cost DECIMAL(15,2),
  actual_cost DECIMAL(15,2),
  cost_variance DECIMAL(15,2), -- Positive = under budget, Negative = over budget
  cost_variance_percent DECIMAL(5,2), -- Percentage variance
  
  -- Progress actuals
  planned_progress_percent DECIMAL(5,2), -- Expected % complete by measurement date
  actual_progress_percent DECIMAL(5,2), -- Actual % complete
  progress_variance DECIMAL(5,2), -- Difference (actual - planned)
  
  -- Quality actuals
  quality_score DECIMAL(3,1) CHECK (quality_score >= 1 AND quality_score <= 10), -- 1-10 rating
  defects_found INTEGER DEFAULT 0,
  rework_hours DECIMAL(8,2),
  
  -- EVM metrics (Earned Value Management)
  earned_value DECIMAL(15,2), -- EV = % complete * planned cost
  actual_cost_evm DECIMAL(15,2), -- AC (actual cost)
  planned_value DECIMAL(15,2), -- PV (planned value)
  schedule_performance_index DECIMAL(5,3), -- SPI = EV / PV
  cost_performance_index DECIMAL(5,3), -- CPI = EV / AC
  
  -- Metadata
  measurement_date TIMESTAMP NOT NULL DEFAULT NOW(), -- When this snapshot was taken
  measurement_method VARCHAR(20) NOT NULL DEFAULT 'manual' CHECK (measurement_method IN ('manual', 'automated', 'extracted', 'reported')),
  measured_by UUID REFERENCES users(id),
  notes TEXT, -- Additional context
  
  -- Source tracking
  source_document_id UUID REFERENCES documents(id), -- Document where this was extracted from
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT check_entity_type_valid CHECK (entity_type IN ('milestone', 'deliverable', 'activity', 'phase', 'resource')),
  CONSTRAINT check_measurement_method_valid CHECK (measurement_method IN ('manual', 'automated', 'extracted', 'reported'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_performance_actuals_project ON performance_actuals(project_id);
CREATE INDEX IF NOT EXISTS idx_performance_actuals_entity ON performance_actuals(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_performance_actuals_measurement_date ON performance_actuals(measurement_date DESC);
CREATE INDEX IF NOT EXISTS idx_performance_actuals_baseline ON performance_actuals(baseline_id) WHERE baseline_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_performance_actuals_entity_name ON performance_actuals(entity_name);

-- Function to calculate variances automatically
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
  
  -- Calculate EVM metrics
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

-- Trigger to calculate variances automatically
DROP TRIGGER IF EXISTS trigger_calculate_performance_variances ON performance_actuals;
CREATE TRIGGER trigger_calculate_performance_variances
  BEFORE INSERT OR UPDATE ON performance_actuals
  FOR EACH ROW
  EXECUTE FUNCTION calculate_performance_variances();

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_performance_actuals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_performance_actuals_updated_at ON performance_actuals;
CREATE TRIGGER trigger_update_performance_actuals_updated_at
  BEFORE UPDATE ON performance_actuals
  FOR EACH ROW
  EXECUTE FUNCTION update_performance_actuals_updated_at();

-- Add comment to table
COMMENT ON TABLE performance_actuals IS 'Tracks actual performance data vs. planned baselines for PMBOK 8 Measurement Performance Domain';
COMMENT ON COLUMN performance_actuals.entity_type IS 'Type of entity being measured: milestone, deliverable, activity, phase, or resource';
COMMENT ON COLUMN performance_actuals.schedule_variance_days IS 'Schedule variance in days. Positive = ahead of schedule, Negative = behind schedule';
COMMENT ON COLUMN performance_actuals.cost_variance IS 'Cost variance. Positive = under budget, Negative = over budget';
COMMENT ON COLUMN performance_actuals.schedule_performance_index IS 'SPI = EV / PV. >1 = ahead, <1 = behind';
COMMENT ON COLUMN performance_actuals.cost_performance_index IS 'CPI = EV / AC. >1 = under budget, <1 = over budget';

COMMIT;

