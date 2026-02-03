-- Migration 370: Add Location Data to Issues Table
-- Date: 2026-02-02
-- Purpose: Add source document tracking for issues with position data

BEGIN;

-- Add location tracking fields to issues table
ALTER TABLE issues 
ADD COLUMN IF NOT EXISTS source_document_id UUID REFERENCES documents(id),
ADD COLUMN IF NOT EXISTS source_text_start INTEGER,
ADD COLUMN IF NOT EXISTS source_text_end INTEGER,
ADD COLUMN IF NOT EXISTS source_line_start INTEGER,
ADD COLUMN IF NOT EXISTS source_line_end INTEGER,
ADD COLUMN IF NOT EXISTS source_context TEXT,
ADD COLUMN IF NOT EXISTS source_snippet TEXT,
ADD COLUMN IF NOT EXISTS entity_markdown_tag VARCHAR(10) DEFAULT 'h5';

-- Add comments explaining the new fields
COMMENT ON COLUMN issues.source_document_id IS 'Document where this issue was identified/extracted from';
COMMENT ON COLUMN issues.source_text_start IS 'Character position where issue text starts in source document';
COMMENT ON COLUMN issues.source_text_end IS 'Character position where issue text ends in source document';
COMMENT ON COLUMN issues.source_line_start IS 'Line number where issue starts in source document (1-based)';
COMMENT ON COLUMN issues.source_line_end IS 'Line number where issue ends in source document (1-based)';
COMMENT ON COLUMN issues.source_context IS 'Surrounding text context around the issue (±100 characters)';
COMMENT ON COLUMN issues.source_snippet IS 'Exact text snippet that was extracted for this issue';
COMMENT ON COLUMN issues.entity_markdown_tag IS 'HTML tag used to wrap the entity (h5 or h6)';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_issues_source_document ON issues(source_document_id);
CREATE INDEX IF NOT EXISTS idx_issues_source_location ON issues(source_document_id, source_text_start);

COMMIT;
