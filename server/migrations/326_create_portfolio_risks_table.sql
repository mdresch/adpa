-- Migration: Create portfolio_risks table and add monthly review tracking fields
-- Date: 2025-11-26
-- Purpose: Track portfolio-level risks and monthly review status

BEGIN;

-- 1. Create portfolio_risks table
CREATE TABLE IF NOT EXISTS portfolio_risks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL,
    risk_title VARCHAR(255) NOT NULL,
    risk_description TEXT,
    risk_category VARCHAR(100),
    risk_owner UUID REFERENCES users(id),
    risk_status VARCHAR(50) DEFAULT 'open' CHECK (risk_status IN ('open', 'in review', 'mitigated', 'closed')),
    impact_level VARCHAR(20) CHECK (impact_level IN ('low', 'medium', 'high', 'critical')),
    likelihood_level VARCHAR(20) CHECK (likelihood_level IN ('rare', 'unlikely', 'possible', 'likely', 'almost certain')),
    mitigation_plan TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_reviewed_at DATE,
    next_review_due DATE,
    review_notes TEXT,
    CONSTRAINT unique_risk_per_portfolio UNIQUE(portfolio_id, risk_title)
);

-- 2. Add monthly review tracking fields to portfolios table
ALTER TABLE IF EXISTS portfolios ADD COLUMN IF NOT EXISTS last_risk_review_at DATE;
ALTER TABLE IF EXISTS portfolios ADD COLUMN IF NOT EXISTS next_risk_review_due DATE;
ALTER TABLE IF EXISTS portfolios ADD COLUMN IF NOT EXISTS risk_review_notes TEXT;

-- 3. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_portfolio_risks_portfolio ON portfolio_risks(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_risks_status ON portfolio_risks(risk_status);

-- Comments
COMMENT ON TABLE portfolio_risks IS 'Tracks risks at the portfolio level, including review and mitigation.';
COMMENT ON COLUMN portfolio_risks.risk_description IS 'Detailed description of the risk.';
COMMENT ON COLUMN portfolio_risks.mitigation_plan IS 'Plan to mitigate the risk.';
COMMENT ON COLUMN portfolio_risks.last_reviewed_at IS 'Date this risk was last reviewed.';
COMMENT ON COLUMN portfolio_risks.next_review_due IS 'Next scheduled review date.';
COMMENT ON COLUMN portfolio_risks.review_notes IS 'Notes from the most recent review.';
-- Add foreign key to portfolios if the table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'portfolios') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint c
            JOIN pg_class t ON c.conrelid = t.oid
            WHERE t.relname = 'portfolio_risks' AND c.contype = 'f' AND c.conname = 'portfolio_risks_portfolio_id_fkey'
        ) THEN
            BEGIN
                ALTER TABLE portfolio_risks
                    ADD CONSTRAINT portfolio_risks_portfolio_id_fkey FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE;
            EXCEPTION WHEN others THEN
                RAISE NOTICE 'Could not add FK to portfolios: %', SQLERRM;
            END;
        END IF;
    END IF;
END
$$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'portfolios') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'portfolios' AND column_name = 'last_risk_review_at') THEN
            COMMENT ON COLUMN portfolios.last_risk_review_at IS 'Date of last portfolio risk review.';
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'portfolios' AND column_name = 'next_risk_review_due') THEN
            COMMENT ON COLUMN portfolios.next_risk_review_due IS 'Next scheduled portfolio risk review.';
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'portfolios' AND column_name = 'risk_review_notes') THEN
            COMMENT ON COLUMN portfolios.risk_review_notes IS 'Notes from the last portfolio risk review.';
        END IF;
    END IF;
END
$$;

COMMIT;

-- DOWN
-- To rollback:
-- BEGIN;
-- -- Remove FK if present
-- ALTER TABLE IF EXISTS portfolio_risks DROP CONSTRAINT IF EXISTS portfolio_risks_portfolio_id_fkey;
-- DROP TABLE IF EXISTS portfolio_risks;
-- ALTER TABLE IF EXISTS portfolios DROP COLUMN IF EXISTS last_risk_review_at;
-- ALTER TABLE IF EXISTS portfolios DROP COLUMN IF EXISTS next_risk_review_due;
-- ALTER TABLE IF EXISTS portfolios DROP COLUMN IF EXISTS risk_review_notes;
-- COMMIT;
