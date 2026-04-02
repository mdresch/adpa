-- DRACO (Document Reasoning and Assessment Compliance Orchestra)
-- Quality Control Framework - Database Schema Migration
-- Run after existing quality_audits table exists

-- ────────────────────────────────────────────────────────────────────────────────
-- 1. DRACO Reviews Table (main review results)
-- ────────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS draco_reviews (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id               UUID REFERENCES documents(id) ON DELETE CASCADE,
  verdict                   VARCHAR(25) NOT NULL CHECK (verdict IN ('PASS', 'CONDITIONAL_PASS', 'REJECT')),
  mode                      VARCHAR(20) NOT NULL DEFAULT 'advisory' CHECK (mode IN ('advisory', 'blocking')),
  overall_draco_score       NUMERIC(5,2),

  -- Enhanced existing quality dimensions
  accuracy_score            NUMERIC(5,2),
  completeness_score        NUMERIC(5,2),
  professional_quality_score NUMERIC(5,2),
  standards_compliance_score NUMERIC(5,2),

  -- New DRACO-specific quality dimensions
  objectivity_score         NUMERIC(5,2),
  citation_integrity_score  NUMERIC(5,2),

  -- Board member scores
  evidence_score            NUMERIC(5,2),
  governance_score          NUMERIC(5,2),
  resilience_score          NUMERIC(5,2),
  strategic_alignment_score NUMERIC(5,2),

  -- Full deliberation data (JSONB for full result document)
  board_deliberation        JSONB,           -- contains all board member details
  remediation_steps         JSONB,           -- ordered remediation steps
  thresholds_used           JSONB,           -- snapshot of thresholds at review time
  model_rotation_used       JSONB,           -- which provider/model each board role used
  publication_advisory      JSONB,           -- advisory object

  -- Linkage
  quality_audit_id          UUID,            -- linked quality_audits record if exists
  template_id               UUID,            -- template used (for prompt improvement routing)

  -- Metadata
  created_by                VARCHAR(255),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processing_time_ms        INTEGER
);

CREATE INDEX IF NOT EXISTS idx_draco_reviews_document_id ON draco_reviews(document_id);
CREATE INDEX IF NOT EXISTS idx_draco_reviews_verdict ON draco_reviews(verdict);
CREATE INDEX IF NOT EXISTS idx_draco_reviews_created_at ON draco_reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_draco_reviews_template_id ON draco_reviews(template_id);

-- ────────────────────────────────────────────────────────────────────────────────
-- 2. DRACO Provider Performance Tracking (model rotation analytics)
-- ────────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS draco_provider_performance (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_role                VARCHAR(50) NOT NULL,   -- evidence_validator | governance_evaluator | counterfactual_challenger
  provider                  VARCHAR(100) NOT NULL,
  model                     VARCHAR(200),
  review_count              INTEGER NOT NULL DEFAULT 0,
  avg_score                 NUMERIC(5,2),
  avg_score_delta           NUMERIC(5,2),           -- divergence from peer avg (independence metric)
  avg_processing_time_ms    INTEGER,
  failure_count             INTEGER NOT NULL DEFAULT 0,
  independence_rating       NUMERIC(5,2),           -- computed: higher = more critically independent
  last_used_at              TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (board_role, provider, model)
);

CREATE INDEX IF NOT EXISTS idx_draco_perf_board_role ON draco_provider_performance(board_role);
CREATE INDEX IF NOT EXISTS idx_draco_perf_independence ON draco_provider_performance(independence_rating DESC);

-- ────────────────────────────────────────────────────────────────────────────────
-- 3. Extend templates table with DRACO configuration
-- ────────────────────────────────────────────────────────────────────────────────
ALTER TABLE templates
  ADD COLUMN IF NOT EXISTS draco_enabled           BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS draco_blocking_enabled  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS draco_thresholds        JSONB;

COMMENT ON COLUMN templates.draco_enabled IS 'Enables DRACO AI Review Board for documents generated from this template';
COMMENT ON COLUMN templates.draco_blocking_enabled IS 'When true, DRACO REJECT verdict prevents document publication. When false, advisory mode only.';
COMMENT ON COLUMN templates.draco_thresholds IS 'Optional per-template threshold overrides (JSONB). Falls back to system defaults if null.';

-- ────────────────────────────────────────────────────────────────────────────────
-- 4. Extend quality_audits table with new DRACO dimensions
-- ────────────────────────────────────────────────────────────────────────────────
ALTER TABLE quality_audits
  ADD COLUMN IF NOT EXISTS objectivity_score            NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS citation_integrity_score     NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS draco_review_id              UUID REFERENCES draco_reviews(id);

COMMENT ON COLUMN quality_audits.objectivity_score IS 'DRACO: Measures neutrality and absence of bias in document content (0-100)';
COMMENT ON COLUMN quality_audits.citation_integrity_score IS 'DRACO: Measures verifiability and accuracy of references and citations (0-100)';
COMMENT ON COLUMN quality_audits.draco_review_id IS 'Links to the DRACO review if one was triggered alongside this quality audit';

-- ────────────────────────────────────────────────────────────────────────────────
-- 5. Rotation cursor table (tracks which provider slot each board role is currently on)
-- ────────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS draco_rotation_state (
  board_role                VARCHAR(50) PRIMARY KEY,
  current_index             INTEGER NOT NULL DEFAULT 0,
  total_reviews             INTEGER NOT NULL DEFAULT 0,
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed rotation state for all three board members
INSERT INTO draco_rotation_state (board_role, current_index, total_reviews)
VALUES 
  ('evidence_validator', 0, 0),
  ('governance_evaluator', 0, 0),
  ('counterfactual_challenger', 0, 0)
ON CONFLICT (board_role) DO NOTHING;
