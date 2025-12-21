-- Migration 209: Project EVM Auto-Calculation Triggers
-- Purpose: Automatically calculate earned_value when percent_complete or budget changes
-- Date: December 18, 2025
-- Related: Phase 1 - Financial/Resource Enhancement Plan
-- Reference: plans/FINANCIAL_RESOURCE_ENHANCEMENT_PLAN.md

-- ================================================================
-- PART 1: AUTO-CALCULATE EARNED VALUE TRIGGER
-- ================================================================

-- Function to automatically calculate earned_value when percent_complete or budget changes
CREATE OR REPLACE FUNCTION auto_calculate_project_evm()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-calculate earned_value = budget * percent_complete / 100
  IF NEW.budget IS NOT NULL AND NEW.percent_complete IS NOT NULL THEN
    NEW.earned_value := ROUND((NEW.budget * NEW.percent_complete / 100)::numeric, 2);
  END IF;
  
  -- If planned_value is not set but budget is, initialize planned_value = budget
  -- This sets the baseline for EVM calculations
  IF (NEW.planned_value IS NULL OR NEW.planned_value = 0) AND NEW.budget IS NOT NULL AND NEW.budget > 0 THEN
    NEW.planned_value := NEW.budget;
  END IF;
  
  -- Auto-calculate forecast_cost if not set
  -- Simple EAC formula: If CPI is known, EAC = Budget / CPI
  -- For simplicity: forecast_cost = actual_cost + remaining work
  IF NEW.actual_cost IS NOT NULL AND NEW.budget IS NOT NULL AND NEW.percent_complete IS NOT NULL THEN
    IF NEW.percent_complete > 0 THEN
      -- EAC = AC + (BAC - EV) / CPI
      -- Simplified: EAC = AC + remaining budget adjusted by current performance
      DECLARE
        v_remaining_work DECIMAL;
        v_cpi DECIMAL;
      BEGIN
        v_remaining_work := NEW.budget - COALESCE(NEW.earned_value, 0);
        
        -- Calculate CPI (Cost Performance Index)
        IF NEW.actual_cost > 0 THEN
          v_cpi := COALESCE(NEW.earned_value, 0) / NEW.actual_cost;
        ELSE
          v_cpi := 1.0;
        END IF;
        
        -- Estimate forecast_cost using CPI
        IF v_cpi > 0 THEN
          NEW.forecast_cost := ROUND((NEW.actual_cost + (v_remaining_work / v_cpi))::numeric, 2);
        ELSE
          NEW.forecast_cost := NEW.budget;
        END IF;
      END;
    ELSE
      -- Project not started yet, forecast = budget
      NEW.forecast_cost := NEW.budget;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION auto_calculate_project_evm IS 'Automatically calculates earned_value, planned_value, and forecast_cost for projects';

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_auto_calculate_project_evm ON projects;

-- Create trigger to fire on INSERT or UPDATE when relevant fields change
CREATE TRIGGER trigger_auto_calculate_project_evm
  BEFORE INSERT OR UPDATE OF budget, percent_complete, actual_cost
  ON projects
  FOR EACH ROW
  EXECUTE FUNCTION auto_calculate_project_evm();

COMMENT ON TRIGGER trigger_auto_calculate_project_evm ON projects IS 
  'Automatically recalculates EVM metrics when budget, percent_complete, or actual_cost changes';

-- ================================================================
-- PART 2: INITIALIZE EXISTING PROJECTS WITH EVM DATA
-- ================================================================

-- Update existing projects to have earned_value calculated from percent_complete
UPDATE projects 
SET 
  earned_value = ROUND((COALESCE(budget, 0) * COALESCE(percent_complete, 0) / 100)::numeric, 2),
  planned_value = COALESCE(planned_value, budget),
  updated_at = NOW()
WHERE budget > 0 
  AND (earned_value IS NULL OR earned_value = 0)
  AND percent_complete > 0;

-- Set planned_value = budget for projects that haven't set it
UPDATE projects 
SET 
  planned_value = budget,
  updated_at = NOW()
WHERE budget > 0 
  AND (planned_value IS NULL OR planned_value = 0);

-- ================================================================
-- PART 3: PROGRAM-LEVEL EVM RECALCULATION TRIGGER
-- ================================================================

-- Function to trigger program EVM recalculation when project EVM changes
CREATE OR REPLACE FUNCTION notify_program_evm_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify that a project's EVM data has changed (for real-time dashboards)
  IF NEW.program_id IS NOT NULL THEN
    PERFORM pg_notify('program_evm_change', json_build_object(
      'program_id', NEW.program_id,
      'project_id', NEW.id,
      'earned_value', NEW.earned_value,
      'actual_cost', NEW.actual_cost,
      'percent_complete', NEW.percent_complete
    )::text);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION notify_program_evm_change IS 'Sends notification when project EVM data changes for real-time dashboard updates';

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_notify_program_evm_change ON projects;

-- Create trigger for program notifications
CREATE TRIGGER trigger_notify_program_evm_change
  AFTER UPDATE OF earned_value, actual_cost, planned_value, percent_complete
  ON projects
  FOR EACH ROW
  WHEN (NEW.program_id IS NOT NULL)
  EXECUTE FUNCTION notify_program_evm_change();

-- ================================================================
-- PART 4: CREATE program_reports TABLE IF NOT EXISTS
-- ================================================================

CREATE TABLE IF NOT EXISTS program_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  
  -- Report Details
  title VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (
    type IN ('executive', 'financial', 'risk', 'status', 'resource', 'benefits', 'evm')
  ),
  status VARCHAR(50) DEFAULT 'generated' CHECK (
    status IN ('generating', 'generated', 'failed', 'archived')
  ),
  
  -- Generation Info
  generated_at TIMESTAMP DEFAULT NOW(),
  generated_by UUID REFERENCES users(id),
  
  -- File Storage
  file_url TEXT,
  file_size INTEGER,
  file_format VARCHAR(20) DEFAULT 'pdf' CHECK (
    file_format IN ('pdf', 'docx', 'xlsx', 'pptx', 'html')
  ),
  
  -- Report Parameters (what was included)
  parameters JSONB DEFAULT '{}',
  
  -- Content (for inline reports)
  content TEXT,
  summary TEXT,
  
  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_program_reports_program ON program_reports(program_id);
CREATE INDEX IF NOT EXISTS idx_program_reports_type ON program_reports(type);
CREATE INDEX IF NOT EXISTS idx_program_reports_status ON program_reports(status);
CREATE INDEX IF NOT EXISTS idx_program_reports_generated ON program_reports(generated_at DESC);

COMMENT ON TABLE program_reports IS 'Generated reports for programs (executive summaries, financial reports, etc.)';
COMMENT ON COLUMN program_reports.type IS 'Report type: executive, financial, risk, status, resource, benefits, evm';
COMMENT ON COLUMN program_reports.parameters IS 'JSON parameters used to generate the report (date range, filters, etc.)';

-- ================================================================
-- VERIFICATION QUERIES
-- ================================================================

-- Show projects that now have EVM data calculated
SELECT 
  'Projects with EVM data' as metric,
  COUNT(*) as count
FROM projects 
WHERE earned_value > 0 OR planned_value > 0;

SELECT 'Migration 209: Project EVM Auto-Calculation Triggers created successfully' AS status;
