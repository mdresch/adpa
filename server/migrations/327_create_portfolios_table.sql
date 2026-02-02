-- Migration 327: Create portfolios table
-- Date: 2025-11-26
-- Purpose: Add portfolios table for portfolio-level constructs and tracking

BEGIN;

-- Create portfolios table
CREATE TABLE IF NOT EXISTS portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID,
  portfolio_name VARCHAR(255) NOT NULL,
  description TEXT,
  owner_id UUID,
  portfolio_lead UUID,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active','archived','paused')),
  budget DECIMAL(15,2),
  budget_currency VARCHAR(3),
  start_date DATE,
  end_date DATE,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_risk_review_at DATE,
  next_risk_review_due DATE,
  risk_review_notes TEXT,
  CONSTRAINT unique_portfolio_name_per_program UNIQUE(program_id, portfolio_name)
);

-- Add monthly review tracking fields (idempotent - IF NOT EXISTS) are already included in the table above
-- Add columns to portfolios if for some reason the table already exists but columns are missing
ALTER TABLE IF EXISTS portfolios ADD COLUMN IF NOT EXISTS last_risk_review_at DATE;
ALTER TABLE IF EXISTS portfolios ADD COLUMN IF NOT EXISTS next_risk_review_due DATE;
ALTER TABLE IF EXISTS portfolios ADD COLUMN IF NOT EXISTS risk_review_notes TEXT;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_portfolios_program ON portfolios(program_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_owner ON portfolios(owner_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_status ON portfolios(status);

-- Comments
COMMENT ON TABLE portfolios IS 'High-level portfolio grouping for projects and programs.';
COMMENT ON COLUMN portfolios.portfolio_name IS 'Name of the portfolio.';
COMMENT ON COLUMN portfolios.description IS 'Description of the portfolio.';
COMMENT ON COLUMN portfolios.budget IS 'Approved budget for this portfolio.';
COMMENT ON COLUMN portfolios.last_risk_review_at IS 'Date of last portfolio risk review.';
COMMENT ON COLUMN portfolios.next_risk_review_due IS 'Next scheduled portfolio risk review.';
COMMENT ON COLUMN portfolios.risk_review_notes IS 'Notes from the last portfolio risk review.';

-- Add foreign key constraints only if referenced tables exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'programs') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
      WHERE t.relname = 'portfolios' AND c.contype = 'f' AND c.conname = 'portfolios_program_id_fkey'
    ) THEN
      ALTER TABLE portfolios ADD CONSTRAINT portfolios_program_id_fkey FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE SET NULL;
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
      WHERE t.relname = 'portfolios' AND c.contype = 'f' AND c.conname = 'portfolios_owner_id_fkey'
    ) THEN
      ALTER TABLE portfolios ADD CONSTRAINT portfolios_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
      WHERE t.relname = 'portfolios' AND c.contype = 'f' AND c.conname = 'portfolios_created_by_fkey'
    ) THEN
      ALTER TABLE portfolios ADD CONSTRAINT portfolios_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
  END IF;
END
$$;

COMMIT;

-- DOWN
-- To rollback:
-- BEGIN;
-- ALTER TABLE IF EXISTS portfolios DROP CONSTRAINT IF EXISTS portfolios_program_id_fkey;
-- ALTER TABLE IF EXISTS portfolios DROP CONSTRAINT IF EXISTS portfolios_owner_id_fkey;
-- ALTER TABLE IF EXISTS portfolios DROP CONSTRAINT IF EXISTS portfolios_created_by_fkey;
-- DROP TABLE IF EXISTS portfolios;
-- COMMIT;
