-- Migration: Create document_summaries table for caching AI-compressed documents
-- Purpose: Store AI-generated summaries/compressions for reuse in future process-flow jobs
-- Benefits: Reduces API costs, speeds up processing, preserves valuable summaries

CREATE TABLE IF NOT EXISTS document_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  
  -- Summary metadata
  compression_method VARCHAR(50) NOT NULL, -- 'summarize', 'truncate', 'smart', 'keyword'
  compression_level DECIMAL(3,2) NOT NULL, -- 0.20 = 20% of original size
  target_tokens INTEGER NOT NULL,
  
  -- Original and compressed content
  original_content TEXT NOT NULL,
  original_tokens INTEGER NOT NULL,
  compressed_content TEXT NOT NULL,
  compressed_tokens INTEGER NOT NULL,
  compression_ratio DECIMAL(5,4) NOT NULL, -- e.g., 0.2154
  
  -- AI provider information (if AI-generated)
  ai_provider VARCHAR(100), -- 'google', 'openai', 'mistral', etc.
  ai_model VARCHAR(100), -- 'gemini-2.5-flash', 'gpt-4', etc.
  
  -- Template context used for compression (JSONB for flexibility)
  template_context JSONB, -- { templateName, templateDescription, systemPrompt, etc. }
  
  -- Versioning and cache invalidation
  document_version INTEGER NOT NULL DEFAULT 1,
  is_valid BOOLEAN NOT NULL DEFAULT true, -- Set to false when source document changes
  
  -- Usage tracking
  times_reused INTEGER NOT NULL DEFAULT 0,
  last_reused_at TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes for fast lookups
  CONSTRAINT document_summaries_unique_cache UNIQUE (document_id, compression_method, compression_level, template_context)
);

-- Index for fast cache lookups
CREATE INDEX idx_document_summaries_document_id ON document_summaries(document_id);
CREATE INDEX idx_document_summaries_valid ON document_summaries(is_valid) WHERE is_valid = true;
CREATE INDEX idx_document_summaries_method ON document_summaries(compression_method);
CREATE INDEX idx_document_summaries_reuse ON document_summaries(times_reused DESC);

-- Trigger to invalidate summaries when source document changes
CREATE OR REPLACE FUNCTION invalidate_document_summaries()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark all summaries for this document as invalid when content changes
  IF OLD.content IS DISTINCT FROM NEW.content THEN
    UPDATE document_summaries 
    SET is_valid = false, 
        updated_at = CURRENT_TIMESTAMP 
    WHERE document_id = NEW.id 
      AND is_valid = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_invalidate_summaries
  AFTER UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION invalidate_document_summaries();

-- Comments for documentation
COMMENT ON TABLE document_summaries IS 'Cache for AI-generated document summaries/compressions used in process-flow jobs';
COMMENT ON COLUMN document_summaries.compression_method IS 'Method used: summarize (AI), truncate, smart, keyword';
COMMENT ON COLUMN document_summaries.compression_level IS 'Target compression: 0.20 = compress to 20% of original';
COMMENT ON COLUMN document_summaries.is_valid IS 'False if source document has changed since summary was created';
COMMENT ON COLUMN document_summaries.times_reused IS 'Number of times this cached summary has been reused';
COMMENT ON COLUMN document_summaries.template_context IS 'Template context used when generating summary for context-aware caching';

