-- Migration 203: Program Financial Management
-- Purpose: Enable budget development, tracking, and forecasting for programs
-- Date: October 31, 2025
-- Related: Phase 3A - Financial Management & EVM Dashboard
-- Reference: PROGRAM_RESOURCE_COST_MANAGEMENT.md

-- ================================================================
-- PART 1: PROGRAM BUDGETS
-- ================================================================

CREATE TABLE IF NOT EXISTS program_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  
  -- Budget Periods
  fiscal_year INTEGER NOT NULL,
  fiscal_quarter INTEGER CHECK (fiscal_quarter BETWEEN 1 AND 4),
  budget_period_start DATE NOT NULL,
  budget_period_end DATE NOT NULL CHECK (budget_period_end >= budget_period_start),
  
  -- Budget Components (Aggregated from projects)
  total_approved_budget DECIMAL(15,2) NOT NULL DEFAULT 0 CHECK (total_approved_budget >= 0),
  
  -- Breakdown by Category
  labor_budget DECIMAL(15,2) DEFAULT 0 CHECK (labor_budget >= 0),
  materials_budget DECIMAL(15,2) DEFAULT 0 CHECK (materials_budget >= 0),
  equipment_budget DECIMAL(15,2) DEFAULT 0 CHECK (equipment_budget >= 0),
  overhead_budget DECIMAL(15,2) DEFAULT 0 CHECK (overhead_budget >= 0),
  contingency_budget DECIMAL(15,2) DEFAULT 0 CHECK (contingency_budget >= 0),
  management_reserve DECIMAL(15,2) DEFAULT 0 CHECK (management_reserve >= 0),
  
  -- Status
  budget_status VARCHAR(50) DEFAULT 'draft' CHECK (budget_status IN ('draft', 'submitted', 'approved', 'locked', 'revised')),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  baseline_date DATE,
  
  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Ensure unique budget per program per period
  UNIQUE(program_id, fiscal_year, fiscal_quarter)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_program_budgets_program_id ON program_budgets(program_id);
CREATE INDEX IF NOT EXISTS idx_program_budgets_fiscal_year ON program_budgets(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_program_budgets_status ON program_budgets(budget_status);

-- Comments
COMMENT ON TABLE program_budgets IS 'Program-level budget development and tracking';
COMMENT ON COLUMN program_budgets.total_approved_budget IS 'Total approved budget aggregated from all projects';
COMMENT ON COLUMN program_budgets.budget_status IS 'draft, submitted, approved, locked, revised';
COMMENT ON COLUMN program_budgets.baseline_date IS 'Date when budget was baselined for performance tracking';

-- ================================================================
-- PART 2: FUNDING SOURCES
-- ================================================================

CREATE TABLE IF NOT EXISTS program_funding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  
  -- Funding Source
  source_name VARCHAR(255) NOT NULL,
  source_type VARCHAR(100) CHECK (source_type IN ('internal-capital', 'external-investment', 'operational', 'grant', 'loan')),
  
  -- Amount
  committed_amount DECIMAL(15,2) NOT NULL CHECK (committed_amount >= 0),
  available_amount DECIMAL(15,2) NOT NULL CHECK (available_amount >= 0),
  spent_amount DECIMAL(15,2) DEFAULT 0 CHECK (spent_amount >= 0),
  
  -- Timing
  availability_date DATE,
  expiration_date DATE,
  
  -- Conditions
  conditions TEXT,
  restrictions TEXT,
  approval_status VARCHAR(50) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'expired')),
  approved_by VARCHAR(255),
  
  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_program_funding_program_id ON program_funding(program_id);
CREATE INDEX IF NOT EXISTS idx_program_funding_status ON program_funding(approval_status);

COMMENT ON TABLE program_funding IS 'Funding sources and financial planning for programs';
COMMENT ON COLUMN program_funding.committed_amount IS 'Total amount committed by funding source';
COMMENT ON COLUMN program_funding.available_amount IS 'Amount currently available for allocation';

-- ================================================================
-- PART 3: CASH FLOW TRACKING
-- ================================================================

CREATE TABLE IF NOT EXISTS program_cash_flow (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  
  -- Period
  period_month DATE NOT NULL,  -- First day of month
  
  -- Inflows
  funding_received DECIMAL(15,2) DEFAULT 0,
  benefits_realized DECIMAL(15,2) DEFAULT 0,
  
  -- Outflows
  labor_costs DECIMAL(15,2) DEFAULT 0,
  materials_costs DECIMAL(15,2) DEFAULT 0,
  equipment_costs DECIMAL(15,2) DEFAULT 0,
  overhead_costs DECIMAL(15,2) DEFAULT 0,
  other_costs DECIMAL(15,2) DEFAULT 0,
  
  -- Net
  net_cash_flow DECIMAL(15,2) DEFAULT 0,
  cumulative_cash_flow DECIMAL(15,2) DEFAULT 0,
  
  -- Forecast vs Actual
  is_forecast BOOLEAN DEFAULT TRUE,
  
  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Ensure unique cash flow per program per month
  UNIQUE(program_id, period_month, is_forecast)
);

CREATE INDEX IF NOT EXISTS idx_program_cash_flow_program_id ON program_cash_flow(program_id);
CREATE INDEX IF NOT EXISTS idx_program_cash_flow_period ON program_cash_flow(period_month);
CREATE INDEX IF NOT EXISTS idx_program_cash_flow_forecast ON program_cash_flow(is_forecast);

COMMENT ON TABLE program_cash_flow IS 'Monthly cash flow tracking and forecasting for programs';
COMMENT ON COLUMN program_cash_flow.is_forecast IS 'TRUE for forecasted values, FALSE for actual values';

-- ================================================================
-- PART 4: FINANCIAL FORECASTING
-- ================================================================

CREATE TABLE IF NOT EXISTS program_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  
  -- Forecast Details
  forecast_date DATE NOT NULL,
  forecast_type VARCHAR(50) NOT NULL CHECK (forecast_type IN ('monthly', 'quarterly', 'reforecast', 'baseline')),
  forecasted_by UUID REFERENCES users(id),
  
  -- Financial Forecasts
  forecast_total_cost DECIMAL(15,2) NOT NULL CHECK (forecast_total_cost >= 0),
  forecast_completion_date DATE,
  forecast_benefit_realization DECIMAL(15,2) DEFAULT 0,
  
  -- Assumptions
  assumptions TEXT,
  changes_from_last_forecast TEXT,
  confidence_level INTEGER CHECK (confidence_level BETWEEN 0 AND 100),
  
  -- Scenarios
  best_case_cost DECIMAL(15,2),
  most_likely_cost DECIMAL(15,2),
  worst_case_cost DECIMAL(15,2),
  
  -- Variance from Baseline
  variance_from_baseline DECIMAL(15,2),
  variance_percentage DECIMAL(5,2),
  
  -- Status
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved')),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  
  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_program_forecasts_program_id ON program_forecasts(program_id);
CREATE INDEX IF NOT EXISTS idx_program_forecasts_date ON program_forecasts(forecast_date);
CREATE INDEX IF NOT EXISTS idx_program_forecasts_type ON program_forecasts(forecast_type);

COMMENT ON TABLE program_forecasts IS 'Financial forecasting and reforecasting for programs';
COMMENT ON COLUMN program_forecasts.forecast_type IS 'monthly, quarterly, reforecast, baseline';
COMMENT ON COLUMN program_forecasts.confidence_level IS 'Confidence in forecast accuracy (0-100%)';

-- ================================================================
-- PART 5: ENHANCE PROJECTS TABLE FOR FINANCIAL TRACKING
-- ================================================================

-- Add financial columns to projects table if they don't exist
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS budget DECIMAL(15,2) DEFAULT 0 CHECK (budget >= 0);

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS actual_cost DECIMAL(15,2) DEFAULT 0 CHECK (actual_cost >= 0);

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS forecast_cost DECIMAL(15,2) DEFAULT 0 CHECK (forecast_cost >= 0);

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS expected_benefits DECIMAL(15,2) DEFAULT 0;

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS realized_benefits DECIMAL(15,2) DEFAULT 0;

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS labor_cost DECIMAL(15,2) DEFAULT 0 CHECK (labor_cost >= 0);

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS materials_cost DECIMAL(15,2) DEFAULT 0 CHECK (materials_cost >= 0);

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS equipment_cost DECIMAL(15,2) DEFAULT 0 CHECK (equipment_cost >= 0);

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS overhead_cost DECIMAL(15,2) DEFAULT 0 CHECK (overhead_cost >= 0);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_projects_budget ON projects(budget) WHERE budget > 0;
CREATE INDEX IF NOT EXISTS idx_projects_actual_cost ON projects(actual_cost) WHERE actual_cost > 0;

-- Comments
COMMENT ON COLUMN projects.budget IS 'Approved budget for the project';
COMMENT ON COLUMN projects.actual_cost IS 'Actual costs incurred to date';
COMMENT ON COLUMN projects.forecast_cost IS 'Forecasted cost at completion';
COMMENT ON COLUMN projects.expected_benefits IS 'Expected financial benefits from the project';
COMMENT ON COLUMN projects.realized_benefits IS 'Actual benefits realized to date';

-- ================================================================
-- HELPER FUNCTIONS
-- ================================================================

-- Function to calculate total program budget from projects
CREATE OR REPLACE FUNCTION calculate_program_budget(p_program_id UUID)
RETURNS TABLE (
  total_budget DECIMAL,
  total_spent DECIMAL,
  total_forecast DECIMAL,
  total_benefits DECIMAL,
  budget_utilization DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(p.budget), 0) as total_budget,
    COALESCE(SUM(p.actual_cost), 0) as total_spent,
    COALESCE(SUM(p.forecast_cost), 0) as total_forecast,
    COALESCE(SUM(p.expected_benefits), 0) as total_benefits,
    CASE 
      WHEN COALESCE(SUM(p.budget), 0) > 0 THEN 
        ROUND((COALESCE(SUM(p.actual_cost), 0) / SUM(p.budget) * 100)::numeric, 2)
      ELSE 0
    END as budget_utilization
  FROM projects p
  WHERE p.program_id = p_program_id 
    AND p.archived = false;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_program_budget IS 'Calculate aggregated budget metrics for a program from its projects';

SELECT 'Migration 203: Program Financial Management schema created successfully' AS status;

