-- Add template_context_hash column to document_summaries table
-- This fixes the issue where template_context is too large for unique constraint
-- Migration: 081_add_template_context_hash.sql

-- Add the hash column
ALTER TABLE document_summaries 
ADD COLUMN IF NOT EXISTS template_context_hash VARCHAR(32);

-- Drop the old unique constraint (if it exists)
ALTER TABLE document_summaries 
DROP CONSTRAINT IF EXISTS document_summaries_unique_cache;

-- Create new unique constraint using hash instead of full context
CREATE UNIQUE INDEX IF NOT EXISTS document_summaries_unique_cache_v2 
ON document_summaries (
  document_id, 
  compression_level, 
  compression_method, 
  template_context_hash
);

-- Add index for faster lookups by hash
CREATE INDEX IF NOT EXISTS idx_document_summaries_hash 
ON document_summaries(template_context_hash) 
WHERE template_context_hash IS NOT NULL;

COMMENT ON COLUMN document_summaries.template_context_hash IS 'MD5 hash of template_context for unique constraint (avoids index size limits)';

