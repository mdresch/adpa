-- Migration 372: Add Location Data to Requirements Table
-- Date: 2026-02-02
-- Purpose: Add source document tracking for requirements with position data

BEGIN;

-- Add location tracking fields to requirements table
ALTER TABLE requirements 
ADD COLUMN IF NOT EXISTS source_document_id UUID REFERENCES documents(id),
ADD COLUMN IF NOT EXISTS source_text_start INTEGER,
ADD COLUMN IF NOT EXISTS source_text_end INTEGER,
ADD COLUMN IF NOT EXISTS source_line_start INTEGER,
ADD COLUMN IF NOT EXISTS source_line_end INTEGER,
ADD COLUMN IF NOT EXISTS source_context TEXT,
ADD COLUMN IF NOT EXISTS source_snippet TEXT,
ADD COLUMN IF NOT EXISTS entity_markdown_tag VARCHAR(10) DEFAULT 'h5';

-- Add comments explaining the new fields
COMMENT ON COLUMN requirements.source_document_id IS 'Document where this requirement was specified/extracted from';
COMMENT ON COLUMN requirements.source_text_start IS 'Character position where requirement text starts in source document';
COMMENT ON COLUMN requirements.source_text_end IS 'Character position where requirement text ends in source document';
COMMENT ON COLUMN requirements.source_line_start IS 'Line number where requirement starts in source document (1-based)';
COMMENT ON COLUMN requirements.source_line_end IS 'Line number where requirement ends in source document (1-based)';
COMMENT ON COLUMN requirements.source_context IS 'Surrounding text context around the requirement (±100 characters)';
COMMENT ON COLUMN requirements.source_snippet IS 'Exact text snippet that was extracted for this requirement';
COMMENT ON COLUMN requirements.entity_markdown_tag IS 'HTML tag used to wrap the entity (h5 or h6)';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_requirements_source_document ON requirements(source_document_id);
CREATE INDEX IF NOT EXISTS idx_requirements_source_location ON requirements(source_document_id, source_text_start);

COMMIT;
