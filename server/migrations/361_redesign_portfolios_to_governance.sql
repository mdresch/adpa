-- Migration 328: Redesign Portfolios Table to Portfolio Governance
-- Date: 2025-12-09
-- Purpose: Transform portfolios table into portfolio_governance to support hybrid PMO model
--          with strategic alignment, company linking, and governance configuration

BEGIN;

-- Rename portfolios table to portfolio_governance
ALTER TABLE IF EXISTS portfolios RENAME TO portfolio_governance;

-- Add company_id column (link to companies table)
ALTER TABLE portfolio_governance ADD COLUMN IF NOT EXISTS company_id UUID;

-- Add company foreign key constraint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
      WHERE t.relname = 'portfolio_governance' AND c.contype = 'f' AND c.conname = 'portfolio_governance_company_id_fkey'
    ) THEN
      ALTER TABLE portfolio_governance ADD CONSTRAINT portfolio_governance_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
    END IF;
  END IF;
END
$$;

-- Add index for company lookups
CREATE INDEX IF NOT EXISTS idx_portfolio_governance_company ON portfolio_governance(company_id);

-- Add strategic alignment fields
ALTER TABLE portfolio_governance ADD COLUMN IF NOT EXISTS core_values JSONB;
ALTER TABLE portfolio_governance ADD COLUMN IF NOT EXISTS strategic_objectives JSONB;
ALTER TABLE portfolio_governance ADD COLUMN IF NOT EXISTS strategy_document_id UUID;

-- Add governance configuration fields
ALTER TABLE portfolio_governance ADD COLUMN IF NOT EXISTS pmo_type_blend JSONB;
ALTER TABLE portfolio_governance ADD COLUMN IF NOT EXISTS approval_authority_matrix JSONB;
ALTER TABLE portfolio_governance ADD COLUMN IF NOT EXISTS escalation_triggers JSONB;
ALTER TABLE portfolio_governance ADD COLUMN IF NOT EXISTS compliance_requirements JSONB;

-- Add risk management enhancements
ALTER TABLE portfolio_governance ADD COLUMN IF NOT EXISTS portfolio_health_status VARCHAR(20) CHECK (portfolio_health_status IN ('green', 'amber', 'red'));
ALTER TABLE portfolio_governance ADD COLUMN IF NOT EXISTS risk_escalation_threshold VARCHAR(20);
ALTER TABLE portfolio_governance ADD COLUMN IF NOT EXISTS portfolio_risk_summary JSONB;

-- Add resource management fields
ALTER TABLE portfolio_governance ADD COLUMN IF NOT EXISTS resource_allocation_strategy JSONB;
ALTER TABLE portfolio_governance ADD COLUMN IF NOT EXISTS capacity_constraints JSONB;

-- Add performance measurement fields
ALTER TABLE portfolio_governance ADD COLUMN IF NOT EXISTS kpi_targets JSONB;
ALTER TABLE portfolio_governance ADD COLUMN IF NOT EXISTS measurement_cadence VARCHAR(50);
ALTER TABLE portfolio_governance ADD COLUMN IF NOT EXISTS dashboard_config JSONB;

-- Add support & standards fields
ALTER TABLE portfolio_governance ADD COLUMN IF NOT EXISTS methodology_standard VARCHAR(100);
ALTER TABLE portfolio_governance ADD COLUMN IF NOT EXISTS template_governance JSONB;
ALTER TABLE portfolio_governance ADD COLUMN IF NOT EXISTS training_requirements JSONB;

-- Add unique constraint: one governance per company
CREATE UNIQUE INDEX IF NOT EXISTS idx_portfolio_governance_company_unique ON portfolio_governance(company_id) WHERE company_id IS NOT NULL;

-- Update comments on existing columns
COMMENT ON TABLE portfolio_governance IS 'Portfolio governance configuration for hybrid PMO model. Stores strategic alignment, governance rules, and control mechanisms for a company portfolio.';
COMMENT ON COLUMN portfolio_governance.company_id IS 'Reference to the company this portfolio governance applies to (1:1 relationship).';
COMMENT ON COLUMN portfolio_governance.portfolio_name IS 'Name of the portfolio (typically company portfolio name).';
COMMENT ON COLUMN portfolio_governance.status IS 'Portfolio status: active, archived, paused.';
COMMENT ON COLUMN portfolio_governance.last_risk_review_at IS 'Date of last portfolio risk review checkpoint.';
COMMENT ON COLUMN portfolio_governance.next_risk_review_due IS 'Scheduled date for next portfolio risk review.';
COMMENT ON COLUMN portfolio_governance.risk_review_notes IS 'Executive summary and notes from last portfolio risk review.';

-- Add index for status and dates (common queries)
CREATE INDEX IF NOT EXISTS idx_portfolio_governance_status ON portfolio_governance(status);
CREATE INDEX IF NOT EXISTS idx_portfolio_governance_risk_review ON portfolio_governance(next_risk_review_due);

-- Grant appropriate permissions
COMMIT;

-- DOWN
-- To rollback:
-- BEGIN;
-- ALTER TABLE IF EXISTS portfolio_governance DROP CONSTRAINT IF EXISTS portfolio_governance_company_id_fkey;
-- DROP INDEX IF EXISTS idx_portfolio_governance_company_unique;
-- DROP INDEX IF EXISTS idx_portfolio_governance_company;
-- DROP INDEX IF EXISTS idx_portfolio_governance_status;
-- DROP INDEX IF EXISTS idx_portfolio_governance_risk_review;
-- ALTER TABLE IF EXISTS portfolio_governance RENAME TO portfolios;
-- ALTER TABLE portfolios DROP COLUMN IF EXISTS company_id;
-- ALTER TABLE portfolios DROP COLUMN IF EXISTS core_values;
-- ALTER TABLE portfolios DROP COLUMN IF EXISTS strategic_objectives;
-- ALTER TABLE portfolios DROP COLUMN IF EXISTS strategy_document_id;
-- ALTER TABLE portfolios DROP COLUMN IF EXISTS pmo_type_blend;
-- ALTER TABLE portfolios DROP COLUMN IF EXISTS approval_authority_matrix;
-- ALTER TABLE portfolios DROP COLUMN IF EXISTS escalation_triggers;
-- ALTER TABLE portfolios DROP COLUMN IF EXISTS compliance_requirements;
-- ALTER TABLE portfolios DROP COLUMN IF EXISTS portfolio_health_status;
-- ALTER TABLE portfolios DROP COLUMN IF EXISTS risk_escalation_threshold;
-- ALTER TABLE portfolios DROP COLUMN IF EXISTS portfolio_risk_summary;
-- ALTER TABLE portfolios DROP COLUMN IF EXISTS resource_allocation_strategy;
-- ALTER TABLE portfolios DROP COLUMN IF EXISTS capacity_constraints;
-- ALTER TABLE portfolios DROP COLUMN IF EXISTS kpi_targets;
-- ALTER TABLE portfolios DROP COLUMN IF EXISTS measurement_cadence;
-- ALTER TABLE portfolios DROP COLUMN IF EXISTS dashboard_config;
-- ALTER TABLE portfolios DROP COLUMN IF EXISTS methodology_standard;
-- ALTER TABLE portfolios DROP COLUMN IF EXISTS template_governance;
-- ALTER TABLE portfolios DROP COLUMN IF EXISTS training_requirements;
-- COMMIT;
