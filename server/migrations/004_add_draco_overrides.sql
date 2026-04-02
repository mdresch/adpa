-- 004_add_draco_overrides.sql
-- Part of DRACO Phase 8: Human Override & Governance Controls

-- 1. Create draco_overrides table
CREATE TABLE IF NOT EXISTS draco_overrides (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id         UUID NOT NULL REFERENCES draco_reviews(id),
  document_id       UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id           VARCHAR(255) NOT NULL,
  reason            TEXT NOT NULL,
  override_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata          JSONB -- optional for additional context (e.g., role)
);

CREATE INDEX IF NOT EXISTS idx_draco_overrides_document_id ON draco_overrides(document_id);
CREATE INDEX IF NOT EXISTS idx_draco_overrides_review_id ON draco_overrides(review_id);

-- 2. Add draco_override_id to documents table
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS draco_override_id UUID REFERENCES draco_overrides(id);

COMMENT ON COLUMN documents.draco_override_id IS 'Link to the formal human override record if DRACO REJECT was ignored';
