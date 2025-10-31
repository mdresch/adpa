-- Migration 204: Program EVM (Earned Value Management) Performance
-- Purpose: Track cost and schedule performance using EVM metrics
-- Date: October 31, 2025
-- Related: Phase 3A - Financial Management & EVM Dashboard
-- Reference: PROGRAM_RESOURCE_COST_MANAGEMENT.md (Section 4: Cost Control)

-- ================================================================
-- PART 1: EVM PERFORMANCE METRICS
-- ================================================================

CREATE TABLE IF NOT EXISTS program_cost_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  
  -- Reporting Period
  reporting_date DATE NOT NULL,
  
  -- Earned Value Management (EVM) Base Metrics
  planned_value DECIMAL(15,2) NOT NULL DEFAULT 0,        -- PV (Budgeted Cost of Work Scheduled)
  earned_value DECIMAL(15,2) NOT NULL DEFAULT 0,         -- EV (Budgeted Cost of Work Performed)
  actual_cost DECIMAL(15,2) NOT NULL DEFAULT 0,          -- AC (Actual Cost of Work Performed)
  
  -- Variance Metrics
  schedule_variance DECIMAL(15,2) DEFAULT 0,             -- SV = EV - PV
  cost_variance DECIMAL(15,2) DEFAULT 0,                 -- CV = EV - AC
  
  -- Performance Indices (Target: >= 1.0)
  schedule_performance_index DECIMAL(10,4) DEFAULT 0,    -- SPI = EV / PV
  cost_performance_index DECIMAL(10,4) DEFAULT 0,        -- CPI = EV / AC
  
  -- Forecasting Metrics
  budget_at_completion DECIMAL(15,2) NOT NULL DEFAULT 0, -- BAC (Original approved budget)
  estimate_at_completion DECIMAL(15,2) DEFAULT 0,        -- EAC = BAC / CPI
  estimate_to_complete DECIMAL(15,2) DEFAULT 0,          -- ETC = EAC - AC
  variance_at_completion DECIMAL(15,2) DEFAULT 0,        -- VAC = BAC - EAC
  
  -- To-Complete Performance Index
  tcpi_bac DECIMAL(10,4) DEFAULT 0,                      -- TCPI = (BAC - EV) / (BAC - AC)
  tcpi_eac DECIMAL(10,4) DEFAULT 0,                      -- TCPI = (BAC - EV) / (EAC - AC)
  
  -- Performance Status
  performance_status VARCHAR(50) DEFAULT 'unknown' CHECK (
    performance_status IN ('on-track', 'at-risk', 'critical', 'unknown')
  ),
  
  -- Additional Context
  notes TEXT,
  calculated_at TIMESTAMP DEFAULT NOW(),
  calculated_by UUID REFERENCES users(id),
  
  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Ensure unique performance record per program per reporting date
  UNIQUE(program_id, reporting_date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_program_cost_performance_program_id ON program_cost_performance(program_id);
CREATE INDEX IF NOT EXISTS idx_program_cost_performance_date ON program_cost_performance(reporting_date);
CREATE INDEX IF NOT EXISTS idx_program_cost_performance_status ON program_cost_performance(performance_status);

-- Comments
COMMENT ON TABLE program_cost_performance IS 'Earned Value Management (EVM) performance tracking for programs';
COMMENT ON COLUMN program_cost_performance.planned_value IS 'PV: What we planned to accomplish (budgeted)';
COMMENT ON COLUMN program_cost_performance.earned_value IS 'EV: What we actually accomplished (budgeted value)';
COMMENT ON COLUMN program_cost_performance.actual_cost IS 'AC: What we actually spent';
COMMENT ON COLUMN program_cost_performance.schedule_variance IS 'SV = EV - PV (positive = ahead, negative = behind)';
COMMENT ON COLUMN program_cost_performance.cost_variance IS 'CV = EV - AC (positive = under budget, negative = over)';
COMMENT ON COLUMN program_cost_performance.schedule_performance_index IS 'SPI = EV / PV (>1.0 = ahead, <1.0 = behind)';
COMMENT ON COLUMN program_cost_performance.cost_performance_index IS 'CPI = EV / AC (>1.0 = under budget, <1.0 = over)';
COMMENT ON COLUMN program_cost_performance.estimate_at_completion IS 'EAC: Forecasted final cost based on current performance';
COMMENT ON COLUMN program_cost_performance.variance_at_completion IS 'VAC: Expected overrun/underrun at completion';
COMMENT ON COLUMN program_cost_performance.tcpi_bac IS 'TCPI: Performance efficiency required to meet budget';

-- ================================================================
-- PART 2: ENHANCE PROJECTS TABLE FOR EVM TRACKING
-- ================================================================

-- Add EVM columns to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS planned_value DECIMAL(15,2) DEFAULT 0;

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS earned_value DECIMAL(15,2) DEFAULT 0;

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS percent_complete DECIMAL(5,2) DEFAULT 0 CHECK (percent_complete BETWEEN 0 AND 100);

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS start_date DATE;

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS end_date DATE;

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS completion_date DATE;

-- Comments
COMMENT ON COLUMN projects.planned_value IS 'Planned value for EVM calculations';
COMMENT ON COLUMN projects.earned_value IS 'Earned value based on completion percentage';
COMMENT ON COLUMN projects.percent_complete IS 'Percentage of project completion (0-100)';

-- ================================================================
-- PART 3: EVM CALCULATION FUNCTIONS
-- ================================================================

-- Function to calculate EVM metrics for a program
CREATE OR REPLACE FUNCTION calculate_evm_metrics(
  p_program_id UUID,
  p_reporting_date DATE DEFAULT CURRENT_DATE
) RETURNS program_cost_performance AS $$
DECLARE
  v_result program_cost_performance;
  v_pv DECIMAL;
  v_ev DECIMAL;
  v_ac DECIMAL;
  v_bac DECIMAL;
BEGIN
  -- Aggregate metrics from all projects in the program
  SELECT 
    COALESCE(SUM(planned_value), 0),
    COALESCE(SUM(earned_value), 0),
    COALESCE(SUM(actual_cost), 0),
    COALESCE(SUM(budget), 0)
  INTO v_pv, v_ev, v_ac, v_bac
  FROM projects
  WHERE program_id = p_program_id 
    AND archived = false;
  
  -- Initialize result record
  v_result.program_id := p_program_id;
  v_result.reporting_date := p_reporting_date;
  v_result.planned_value := v_pv;
  v_result.earned_value := v_ev;
  v_result.actual_cost := v_ac;
  v_result.budget_at_completion := v_bac;
  
  -- Calculate variances
  v_result.schedule_variance := v_ev - v_pv;
  v_result.cost_variance := v_ev - v_ac;
  
  -- Calculate performance indices (avoid division by zero)
  v_result.schedule_performance_index := CASE 
    WHEN v_pv > 0 THEN ROUND((v_ev / v_pv)::numeric, 4)
    ELSE 0
  END;
  
  v_result.cost_performance_index := CASE 
    WHEN v_ac > 0 THEN ROUND((v_ev / v_ac)::numeric, 4)
    ELSE 0
  END;
  
  -- Calculate forecasts
  v_result.estimate_at_completion := CASE 
    WHEN v_result.cost_performance_index > 0 THEN 
      ROUND((v_bac / v_result.cost_performance_index)::numeric, 2)
    ELSE v_bac
  END;
  
  v_result.estimate_to_complete := v_result.estimate_at_completion - v_ac;
  v_result.variance_at_completion := v_bac - v_result.estimate_at_completion;
  
  -- Calculate TCPI
  v_result.tcpi_bac := CASE 
    WHEN (v_bac - v_ac) > 0 THEN 
      ROUND(((v_bac - v_ev) / (v_bac - v_ac))::numeric, 4)
    ELSE 0
  END;
  
  v_result.tcpi_eac := CASE 
    WHEN (v_result.estimate_at_completion - v_ac) > 0 THEN 
      ROUND(((v_bac - v_ev) / (v_result.estimate_at_completion - v_ac))::numeric, 4)
    ELSE 0
  END;
  
  -- Determine performance status
  v_result.performance_status := CASE 
    WHEN v_result.cost_performance_index >= 0.95 AND v_result.schedule_performance_index >= 0.95 THEN 'on-track'
    WHEN v_result.cost_performance_index >= 0.85 OR v_result.schedule_performance_index >= 0.85 THEN 'at-risk'
    ELSE 'critical'
  END;
  
  v_result.calculated_at := NOW();
  v_result.created_at := NOW();
  v_result.updated_at := NOW();
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_evm_metrics IS 'Calculate EVM metrics for a program from its project data';

-- Function to update project earned value based on completion percentage
CREATE OR REPLACE FUNCTION update_project_earned_value(
  p_project_id UUID,
  p_percent_complete DECIMAL
) RETURNS VOID AS $$
BEGIN
  UPDATE projects
  SET 
    earned_value = (budget * p_percent_complete / 100),
    percent_complete = p_percent_complete,
    updated_at = NOW()
  WHERE id = p_project_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_project_earned_value IS 'Update project earned value based on completion percentage';

-- ================================================================
-- PART 4: VIEW FOR QUICK EVM DASHBOARD ACCESS
-- ================================================================

CREATE OR REPLACE VIEW program_evm_summary AS
SELECT 
  p.id as program_id,
  p.name as program_name,
  pcp.reporting_date,
  pcp.planned_value,
  pcp.earned_value,
  pcp.actual_cost,
  pcp.schedule_variance,
  pcp.cost_variance,
  pcp.schedule_performance_index as spi,
  pcp.cost_performance_index as cpi,
  pcp.budget_at_completion as bac,
  pcp.estimate_at_completion as eac,
  pcp.variance_at_completion as vac,
  pcp.performance_status,
  -- Health indicators
  CASE 
    WHEN pcp.cost_performance_index >= 0.95 THEN 'green'
    WHEN pcp.cost_performance_index >= 0.85 THEN 'amber'
    ELSE 'red'
  END as cost_health,
  CASE 
    WHEN pcp.schedule_performance_index >= 0.95 THEN 'green'
    WHEN pcp.schedule_performance_index >= 0.85 THEN 'amber'
    ELSE 'red'
  END as schedule_health
FROM programs p
LEFT JOIN LATERAL (
  SELECT * FROM program_cost_performance
  WHERE program_id = p.id
  ORDER BY reporting_date DESC
  LIMIT 1
) pcp ON true
WHERE p.archived = false;

COMMENT ON VIEW program_evm_summary IS 'Latest EVM metrics for all active programs';

-- ================================================================
-- PART 5: TRANSACTION LOG FOR AUDIT TRAIL
-- ================================================================

CREATE TABLE IF NOT EXISTS program_financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  
  -- Transaction Details
  transaction_date DATE NOT NULL,
  transaction_type VARCHAR(100) NOT NULL CHECK (
    transaction_type IN ('budget-allocation', 'expenditure', 'transfer', 'adjustment', 'reforecast')
  ),
  amount DECIMAL(15,2) NOT NULL,
  
  -- Classification
  cost_category VARCHAR(100),
  account_code VARCHAR(50),
  
  -- Approval & Documentation
  approved_by UUID REFERENCES users(id),
  approval_date DATE,
  supporting_documents JSONB,
  
  -- Audit
  transaction_reference VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_program_financial_transactions_program ON program_financial_transactions(program_id);
CREATE INDEX IF NOT EXISTS idx_program_financial_transactions_project ON program_financial_transactions(project_id);
CREATE INDEX IF NOT EXISTS idx_program_financial_transactions_date ON program_financial_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_program_financial_transactions_type ON program_financial_transactions(transaction_type);

COMMENT ON TABLE program_financial_transactions IS 'Audit trail of all financial transactions for compliance';
COMMENT ON COLUMN program_financial_transactions.transaction_type IS 'budget-allocation, expenditure, transfer, adjustment, reforecast';

SELECT 'Migration 204: Program EVM Performance schema created successfully' AS status;

