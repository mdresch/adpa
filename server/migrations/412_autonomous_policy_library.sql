-- Autonomous Policy Discovery Engine Foundation
-- SC-29: Database schema for continuous learning and autonomous governance policies
-- 
-- This migration creates tables for:
-- - The Autonomous Policy Library
-- - Storing semantic embeddings for policy deduplication

-- Ensure the vector extension is available
CREATE EXTENSION IF NOT EXISTS vector;

-- Status enum for autonomous policies
DO $$ BEGIN
  CREATE TYPE autonomous_policy_status AS ENUM ('CANDIDATE', 'ACTIVE', 'DEPRECATED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- The Core Autonomous Policy Library Table
CREATE TABLE IF NOT EXISTS policy_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_code VARCHAR(100) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  
  -- Vector column for similarity searching and duplicate detection
  semantic_embedding vector(1536),
  
  -- Lifecycle Management
  status autonomous_policy_status NOT NULL DEFAULT 'CANDIDATE',
  version INTEGER NOT NULL DEFAULT 1,
  is_automated_discovery BOOLEAN NOT NULL DEFAULT true,
  
  -- The structured logic used by the underlying execution inner-loop
  execution_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Telemetry logs for continuous adjustment
  telemetry_metrics JSONB NOT NULL DEFAULT '{"falsePositiveCount": 0, "userOverrideCount": 0, "totalRuns": 0}'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_policy_library_status ON policy_library(status);
CREATE INDEX IF NOT EXISTS idx_policy_library_code ON policy_library(rule_code);
-- Approximate index for pgvector (HNSW) to speed up cosine similarity (<=>) searches
CREATE INDEX IF NOT EXISTS idx_policy_library_embedding ON policy_library USING hnsw (semantic_embedding vector_cosine_ops);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_policy_library_updated_at ON policy_library;
CREATE TRIGGER update_policy_library_updated_at
  BEFORE UPDATE ON policy_library
  FOR EACH ROW EXECUTE FUNCTION update_compliance_updated_at();

-- Enable RLS
ALTER TABLE policy_library ENABLE ROW LEVEL SECURITY;

-- Comments for documentation
COMMENT ON TABLE policy_library IS 'SC-29: Autonomous policy library storing active and candidate governance rules discovered by the engine';
