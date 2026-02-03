-- Migration 385: Add Location Data to Best Practices Table
-- Date: 2026-02-02
-- Purpose: Add source document tracking for best practices with position data

BEGIN;

-- Add location tracking fields to best_practices table
ALTER TABLE best_practices 
ADD COLUMN IF NOT EXISTS source_document_id UUID REFERENCES documents(id),
ADD COLUMN IF NOT EXISTS source_text_start INTEGER,
ADD COLUMN IF NOT EXISTS source_text_end INTEGER,
ADD COLUMN IF NOT EXISTS source_line_start INTEGER,
ADD COLUMN IF NOT EXISTS source_line_end INTEGER,
ADD COLUMN IF NOT EXISTS source_context TEXT,
ADD COLUMN IF NOT EXISTS source_snippet TEXT,
ADD COLUMN IF NOT EXISTS entity_markdown_tag VARCHAR(10) DEFAULT 'h5';

-- Add comments explaining the new fields
COMMENT ON COLUMN best_practices.source_document_id IS 'Document where this best practice was documented/extracted from';
COMMENT ON COLUMN best_practices.source_text_start IS 'Character position where best practice text starts in source document';
COMMENT ON COLUMN best_practices.source_text_end IS 'Character position where best practice text ends in source document';
COMMENT ON COLUMN best_practices.source_line_start IS 'Line number where best practice starts in source document (1-based)';
COMMENT ON COLUMN best_practices.source_line_end IS 'Line number where best practice ends in source document (1-based)';
COMMENT ON COLUMN best_practices.source_context IS 'Surrounding text context around the best practice (±100 characters)';
COMMENT ON COLUMN best_practices.source_snippet IS 'Exact text snippet that was extracted for this best practice';
COMMENT ON COLUMN best_practices.entity_markdown_tag IS 'HTML tag used to wrap the entity (h5 or h6)';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_best_practices_source_document ON best_practices(source_document_id);
CREATE INDEX IF NOT EXISTS idx_best_practices_source_location ON best_practices(source_document_id, source_text_start);

COMMIT;
