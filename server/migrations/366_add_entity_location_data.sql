-- Migration 366: Add Entity Location Data for Source Document Highlighting
-- Date: 2026-02-02
-- Purpose: Add fields to store character positions and context for entity highlighting

BEGIN;

-- Add location tracking fields to performance_actuals table
ALTER TABLE performance_actuals 
ADD COLUMN IF NOT EXISTS source_text_start INTEGER,
ADD COLUMN IF NOT EXISTS source_text_end INTEGER,
ADD COLUMN IF NOT EXISTS source_line_start INTEGER,
ADD COLUMN IF NOT EXISTS source_line_end INTEGER,
ADD COLUMN IF NOT EXISTS source_context TEXT,
ADD COLUMN IF NOT EXISTS source_snippet TEXT;

-- Add comment explaining the new fields
COMMENT ON COLUMN performance_actuals.source_text_start IS 'Character position where entity text starts in source document';
COMMENT ON COLUMN performance_actuals.source_text_end IS 'Character position where entity text ends in source document';
COMMENT ON COLUMN performance_actuals.source_line_start IS 'Line number where entity starts in source document';
COMMENT ON COLUMN performance_actuals.source_line_end IS 'Line number where entity ends in source document';
COMMENT ON COLUMN performance_actuals.source_context IS 'Surrounding text context around the entity (±100 chars)';
COMMENT ON COLUMN performance_actuals.source_snippet IS 'Exact text snippet that was extracted for this entity';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_performance_actuals_source_location ON performance_actuals(source_document_id, source_text_start);

COMMIT;
