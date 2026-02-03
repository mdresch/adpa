-- Migration 383: Add Location Data to Opportunities Table
-- Date: 2026-02-02
-- Purpose: Add source document tracking for opportunities with position data

BEGIN;

-- Add location tracking fields to opportunities table
ALTER TABLE opportunities 
ADD COLUMN IF NOT EXISTS source_document_id UUID REFERENCES documents(id),
ADD COLUMN IF NOT EXISTS source_text_start INTEGER,
ADD COLUMN IF NOT EXISTS source_text_end INTEGER,
ADD COLUMN IF NOT EXISTS source_line_start INTEGER,
ADD COLUMN IF NOT EXISTS source_line_end INTEGER,
ADD COLUMN IF NOT EXISTS source_context TEXT,
ADD COLUMN IF NOT EXISTS source_snippet TEXT,
ADD COLUMN IF NOT EXISTS entity_markdown_tag VARCHAR(10) DEFAULT 'h5';

-- Add comments explaining the new fields
COMMENT ON COLUMN opportunities.source_document_id IS 'Document where this opportunity was identified/extracted from';
COMMENT ON COLUMN opportunities.source_text_start IS 'Character position where opportunity text starts in source document';
COMMENT ON COLUMN opportunities.source_text_end IS 'Character position where opportunity text ends in source document';
COMMENT ON COLUMN opportunities.source_line_start IS 'Line number where opportunity starts in source document (1-based)';
COMMENT ON COLUMN opportunities.source_line_end IS 'Line number where opportunity ends in source document (1-based)';
COMMENT ON COLUMN opportunities.source_context IS 'Surrounding text context around the opportunity (±100 characters)';
COMMENT ON COLUMN opportunities.source_snippet IS 'Exact text snippet that was extracted for this opportunity';
COMMENT ON COLUMN opportunities.entity_markdown_tag IS 'HTML tag used to wrap the entity (h5 or h6)';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_opportunities_source_document ON opportunities(source_document_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_source_location ON opportunities(source_document_id, source_text_start);

COMMIT;
