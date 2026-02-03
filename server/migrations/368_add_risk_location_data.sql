-- Migration 368: Add Location Data to Risks Table
-- Date: 2026-02-02
-- Purpose: Add source document tracking for risks with position data

BEGIN;

-- Add location tracking fields to risks table
ALTER TABLE risks 
ADD COLUMN IF NOT EXISTS source_document_id UUID REFERENCES documents(id),
ADD COLUMN IF NOT EXISTS source_text_start INTEGER,
ADD COLUMN IF NOT EXISTS source_text_end INTEGER,
ADD COLUMN IF NOT EXISTS source_line_start INTEGER,
ADD COLUMN IF NOT EXISTS source_line_end INTEGER,
ADD COLUMN IF NOT EXISTS source_context TEXT,
ADD COLUMN IF NOT EXISTS source_snippet TEXT,
ADD COLUMN IF NOT EXISTS entity_markdown_tag VARCHAR(10) DEFAULT 'h5';

-- Add comments explaining the new fields
COMMENT ON COLUMN risks.source_document_id IS 'Document where this risk was identified/extracted from';
COMMENT ON COLUMN risks.source_text_start IS 'Character position where risk text starts in source document';
COMMENT ON COLUMN risks.source_text_end IS 'Character position where risk text ends in source document';
COMMENT ON COLUMN risks.source_line_start IS 'Line number where risk starts in source document (1-based)';
COMMENT ON COLUMN risks.source_line_end IS 'Line number where risk ends in source document (1-based)';
COMMENT ON COLUMN risks.source_context IS 'Surrounding text context around the risk (±100 characters)';
COMMENT ON COLUMN risks.source_snippet IS 'Exact text snippet that was extracted for this risk';
COMMENT ON COLUMN risks.entity_markdown_tag IS 'HTML tag used to wrap the entity (h5 or h6)';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_risks_source_document ON risks(source_document_id);
CREATE INDEX IF NOT EXISTS idx_risks_source_location ON risks(source_document_id, source_text_start);

COMMIT;
