-- Migration 205: Program Financial Analysis (ROI, NPV, IRR)
-- Purpose: Benefit-cost analysis and strategic financial metrics
-- Date: October 31, 2025
-- Related: Phase 3A - Financial Management & EVM Dashboard
-- Reference: PROGRAM_RESOURCE_COST_MANAGEMENT.md (Section 7: Benefit-Cost Analysis)

-- ================================================================
-- PART 1: FINANCIAL ANALYSIS
-- ================================================================

CREATE TABLE IF NOT EXISTS program_financial_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  
  -- Analysis Period
  analysis_date DATE NOT NULL,
  analysis_type VARCHAR(100) DEFAULT 'periodic' CHECK (
    analysis_type IN ('initial', 'mid-program', 'final', 'periodic')
  ),
  
  -- Costs
  total_investment DECIMAL(15,2) NOT NULL DEFAULT 0,
  sunk_costs DECIMAL(15,2) DEFAULT 0,
  remaining_costs DECIMAL(15,2) DEFAULT 0,
  
  -- Benefits
  total_expected_benefits DECIMAL(15,2) DEFAULT 0,
  realized_benefits DECIMAL(15,2) DEFAULT 0,
  projected_benefits DECIMAL(15,2) DEFAULT 0,
  
  -- Key Financial Metrics
  roi_percent DECIMAL(10,2) DEFAULT 0,              -- (Benefits - Costs) / Costs × 100
  npv DECIMAL(15,2) DEFAULT 0,                      -- Net Present Value (discounted)
  irr_percent DECIMAL(10,2) DEFAULT 0,              -- Internal Rate of Return
  payback_period_months INTEGER DEFAULT 0,          -- Time to break even
  benefit_cost_ratio DECIMAL(10,4) DEFAULT 0,       -- Benefits / Costs
  
  -- NPV Calculation Parameters
  discount_rate DECIMAL(5,2) DEFAULT 8.0,           -- Discount rate for NPV (e.g., 8%)
  time_horizon_years INTEGER DEFAULT 5,             -- Analysis time horizon
  
  -- Decision Support
  continue_recommendation BOOLEAN DEFAULT TRUE,
  recommendation_rationale TEXT,
  risk_adjusted_roi DECIMAL(10,2),                 -- ROI adjusted for risk
  
  -- Analysis Metadata
  analyzed_by UUID REFERENCES users(id),
  confidence_level INTEGER CHECK (confidence_level BETWEEN 0 AND 100),
  assumptions TEXT,
  
  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_program_financial_analysis_program ON program_financial_analysis(program_id);
CREATE INDEX IF NOT EXISTS idx_program_financial_analysis_date ON program_financial_analysis(analysis_date);
CREATE INDEX IF NOT EXISTS idx_program_financial_analysis_type ON program_financial_analysis(analysis_type);

-- Comments
COMMENT ON TABLE program_financial_analysis IS 'ROI, NPV, IRR and benefit-cost analysis for programs';
COMMENT ON COLUMN program_financial_analysis.roi_percent IS 'Return on Investment: (Benefits - Costs) / Costs × 100';
COMMENT ON COLUMN program_financial_analysis.npv IS 'Net Present Value: discounted future benefits minus costs';
COMMENT ON COLUMN program_financial_analysis.irr_percent IS 'Internal Rate of Return: rate at which NPV = 0';
COMMENT ON COLUMN program_financial_analysis.payback_period_months IS 'Months until cumulative benefits equal costs';
COMMENT ON COLUMN program_financial_analysis.benefit_cost_ratio IS 'Total Benefits / Total Costs (>1.0 = worthwhile)';

-- ================================================================
-- PART 2: BENEFITS TRACKING
-- ================================================================

CREATE TABLE IF NOT EXISTS program_benefits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  
  -- Benefit Details
  benefit_type VARCHAR(100) NOT NULL CHECK (
    benefit_type IN ('cost-savings', 'revenue-increase', 'efficiency', 'risk-reduction', 'quality-improvement', 'strategic')
  ),
  benefit_category VARCHAR(100) CHECK (
    benefit_category IN ('financial', 'operational', 'strategic', 'customer', 'employee')
  ),
  description TEXT NOT NULL,
  
  -- Value
  expected_value DECIMAL(15,2) NOT NULL DEFAULT 0,
  realized_value DECIMAL(15,2) DEFAULT 0,
  realization_date DATE,
  target_date DATE,
  
  -- Measurement
  measurement_method TEXT,
  measurement_frequency VARCHAR(50) CHECK (
    measurement_frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'annually', 'one-time')
  ),
  baseline_value DECIMAL(15,2),
  target_value DECIMAL(15,2),
  current_value DECIMAL(15,2),
  
  -- Status
  status VARCHAR(50) DEFAULT 'planned' CHECK (
    status IN ('planned', 'in-progress', 'realized', 'partially-realized', 'not-achieved', 'deferred')
  ),
  realization_percentage DECIMAL(5,2) DEFAULT 0 CHECK (realization_percentage BETWEEN 0 AND 100),
  
  -- Ownership
  owner_id UUID REFERENCES users(id),
  
  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_program_benefits_program ON program_benefits(program_id);
CREATE INDEX IF NOT EXISTS idx_program_benefits_project ON program_benefits(project_id);
CREATE INDEX IF NOT EXISTS idx_program_benefits_type ON program_benefits(benefit_type);
CREATE INDEX IF NOT EXISTS idx_program_benefits_status ON program_benefits(status);

-- Comments
COMMENT ON TABLE program_benefits IS 'Individual benefit tracking for programs and projects';
COMMENT ON COLUMN program_benefits.benefit_type IS 'cost-savings, revenue-increase, efficiency, risk-reduction, quality-improvement, strategic';
COMMENT ON COLUMN program_benefits.realization_percentage IS 'Percentage of expected benefit that has been realized (0-100)';

-- ================================================================
-- PART 3: BENEFITS ROLLUP VIEW
-- ================================================================

CREATE OR REPLACE VIEW program_benefits_summary AS
SELECT 
  program_id,
  COUNT(*) as total_benefits,
  SUM(expected_value) as total_expected,
  SUM(realized_value) as total_realized,
  CASE 
    WHEN SUM(expected_value) > 0 THEN 
      ROUND((SUM(realized_value) / SUM(expected_value) * 100)::numeric, 2)
    ELSE 0
  END as realization_rate,
  COUNT(*) FILTER (WHERE status = 'realized') as benefits_realized,
  COUNT(*) FILTER (WHERE status = 'in-progress') as benefits_in_progress,
  COUNT(*) FILTER (WHERE status = 'not-achieved') as benefits_not_achieved
FROM program_benefits
GROUP BY program_id;

COMMENT ON VIEW program_benefits_summary IS 'Aggregated benefit metrics per program';

-- ================================================================
-- PART 4: FINANCIAL CALCULATION FUNCTIONS
-- ================================================================

-- Function to calculate basic ROI
CREATE OR REPLACE FUNCTION calculate_roi(
  p_program_id UUID
) RETURNS DECIMAL AS $$
DECLARE
  v_total_cost DECIMAL;
  v_total_benefits DECIMAL;
  v_roi DECIMAL;
BEGIN
  -- Get total costs from projects
  SELECT COALESCE(SUM(actual_cost), 0)
  INTO v_total_cost
  FROM projects
  WHERE program_id = p_program_id AND archived = false;
  
  -- Get total benefits
  SELECT COALESCE(SUM(realized_value), 0)
  INTO v_total_benefits
  FROM program_benefits
  WHERE program_id = p_program_id;
  
  -- Calculate ROI
  IF v_total_cost > 0 THEN
    v_roi := ROUND((((v_total_benefits - v_total_cost) / v_total_cost) * 100)::numeric, 2);
  ELSE
    v_roi := 0;
  END IF;
  
  RETURN v_roi;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_roi IS 'Calculate Return on Investment for a program';

-- Function to calculate NPV (simplified)
CREATE OR REPLACE FUNCTION calculate_npv(
  p_program_id UUID,
  p_discount_rate DECIMAL DEFAULT 8.0,
  p_years INTEGER DEFAULT 5
) RETURNS DECIMAL AS $$
DECLARE
  v_initial_investment DECIMAL;
  v_annual_benefit DECIMAL;
  v_npv DECIMAL := 0;
  v_year INTEGER;
BEGIN
  -- Get initial investment (total budget)
  SELECT COALESCE(SUM(budget), 0)
  INTO v_initial_investment
  FROM projects
  WHERE program_id = p_program_id AND archived = false;
  
  -- Get expected annual benefit
  SELECT COALESCE(SUM(expected_value), 0) / NULLIF(p_years, 0)
  INTO v_annual_benefit
  FROM program_benefits
  WHERE program_id = p_program_id;
  
  -- Initial investment (negative cash flow)
  v_npv := -v_initial_investment;
  
  -- Discounted future benefits
  FOR v_year IN 1..p_years LOOP
    v_npv := v_npv + (v_annual_benefit / POWER(1 + (p_discount_rate / 100), v_year));
  END LOOP;
  
  RETURN ROUND(v_npv::numeric, 2);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_npv IS 'Calculate Net Present Value for a program';

-- Function to calculate payback period (simplified)
CREATE OR REPLACE FUNCTION calculate_payback_period(
  p_program_id UUID
) RETURNS INTEGER AS $$
DECLARE
  v_total_investment DECIMAL;
  v_annual_benefit DECIMAL;
  v_payback_months INTEGER;
BEGIN
  -- Get total investment
  SELECT COALESCE(SUM(budget), 0)
  INTO v_total_investment
  FROM projects
  WHERE program_id = p_program_id AND archived = false;
  
  -- Get annual benefit
  SELECT COALESCE(SUM(expected_value), 0) / 12  -- Monthly benefit
  INTO v_annual_benefit
  FROM program_benefits
  WHERE program_id = p_program_id;
  
  -- Calculate payback period in months
  IF v_annual_benefit > 0 THEN
    v_payback_months := CEIL(v_total_investment / v_annual_benefit);
  ELSE
    v_payback_months := 0;  -- Infinite payback
  END IF;
  
  RETURN v_payback_months;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_payback_period IS 'Calculate payback period in months for a program';

-- Function to update all financial metrics
CREATE OR REPLACE FUNCTION update_program_financial_metrics(
  p_program_id UUID,
  p_analysis_date DATE DEFAULT CURRENT_DATE
) RETURNS program_financial_analysis AS $$
DECLARE
  v_analysis program_financial_analysis;
  v_total_cost DECIMAL;
  v_total_benefits DECIMAL;
  v_realized_benefits DECIMAL;
BEGIN
  -- Get cost data
  SELECT 
    COALESCE(SUM(actual_cost), 0),
    COALESCE(SUM(budget) - SUM(actual_cost), 0)
  INTO v_total_cost, v_analysis.remaining_costs
  FROM projects
  WHERE program_id = p_program_id AND archived = false;
  
  -- Get benefit data
  SELECT 
    COALESCE(SUM(expected_value), 0),
    COALESCE(SUM(realized_value), 0)
  INTO v_total_benefits, v_realized_benefits
  FROM program_benefits
  WHERE program_id = p_program_id;
  
  -- Initialize record
  v_analysis.program_id := p_program_id;
  v_analysis.analysis_date := p_analysis_date;
  v_analysis.analysis_type := 'periodic';
  v_analysis.total_investment := v_total_cost;
  v_analysis.total_expected_benefits := v_total_benefits;
  v_analysis.realized_benefits := v_realized_benefits;
  
  -- Calculate metrics
  v_analysis.roi_percent := calculate_roi(p_program_id);
  v_analysis.npv := calculate_npv(p_program_id, 8.0, 5);
  v_analysis.payback_period_months := calculate_payback_period(p_program_id);
  
  -- Benefit-cost ratio
  IF v_total_cost > 0 THEN
    v_analysis.benefit_cost_ratio := ROUND((v_total_benefits / v_total_cost)::numeric, 4);
  ELSE
    v_analysis.benefit_cost_ratio := 0;
  END IF;
  
  -- Recommendation
  v_analysis.continue_recommendation := (
    v_analysis.roi_percent > 0 AND 
    v_analysis.npv > 0 AND 
    v_analysis.benefit_cost_ratio > 1.0
  );
  
  v_analysis.created_at := NOW();
  v_analysis.updated_at := NOW();
  
  RETURN v_analysis;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_program_financial_metrics IS 'Calculate and update all financial analysis metrics for a program';

-- ================================================================
-- PART 5: COMPREHENSIVE FINANCIAL DASHBOARD VIEW
-- ================================================================

CREATE OR REPLACE VIEW program_financial_dashboard AS
SELECT 
  p.id as program_id,
  p.name as program_name,
  p.status as program_status,
  
  -- Budget Summary
  pb.total_approved_budget,
  pb.budget_status,
  
  -- Current Spending
  (SELECT COALESCE(SUM(actual_cost), 0) FROM projects WHERE program_id = p.id AND archived = false) as total_spent,
  (SELECT COALESCE(SUM(forecast_cost), 0) FROM projects WHERE program_id = p.id AND archived = false) as total_forecast,
  
  -- Budget Utilization
  CASE 
    WHEN pb.total_approved_budget > 0 THEN
      ROUND(((SELECT COALESCE(SUM(actual_cost), 0) FROM projects WHERE program_id = p.id AND archived = false) / pb.total_approved_budget * 100)::numeric, 2)
    ELSE 0
  END as budget_utilization_percent,
  
  -- EVM Metrics
  pcp.cost_performance_index as cpi,
  pcp.schedule_performance_index as spi,
  pcp.estimate_at_completion as eac,
  pcp.variance_at_completion as vac,
  pcp.performance_status,
  
  -- Financial Analysis
  pfa.roi_percent,
  pfa.npv,
  pfa.payback_period_months,
  pfa.benefit_cost_ratio,
  
  -- Benefits
  pbs.total_expected as total_expected_benefits,
  pbs.total_realized as total_realized_benefits,
  pbs.realization_rate as benefit_realization_rate
  
FROM programs p
LEFT JOIN LATERAL (
  SELECT * FROM program_budgets 
  WHERE program_id = p.id 
  ORDER BY created_at DESC 
  LIMIT 1
) pb ON true
LEFT JOIN LATERAL (
  SELECT * FROM program_cost_performance 
  WHERE program_id = p.id 
  ORDER BY reporting_date DESC 
  LIMIT 1
) pcp ON true
LEFT JOIN LATERAL (
  SELECT * FROM program_financial_analysis 
  WHERE program_id = p.id 
  ORDER BY analysis_date DESC 
  LIMIT 1
) pfa ON true
LEFT JOIN program_benefits_summary pbs ON pbs.program_id = p.id
WHERE p.archived = false;

COMMENT ON VIEW program_financial_dashboard IS 'Comprehensive financial dashboard view combining budget, EVM, and ROI metrics';

SELECT 'Migration 205: Program Financial Analysis schema created successfully' AS status;

