-- Migration 382: Add Location Data to Phases Table
-- Date: 2026-02-02
-- Purpose: Add source document tracking for phases with position data

BEGIN;

-- Add location tracking fields to phases table
ALTER TABLE phases 
ADD COLUMN IF NOT EXISTS source_document_id UUID REFERENCES documents(id),
ADD COLUMN IF NOT EXISTS source_text_start INTEGER,
ADD COLUMN IF NOT EXISTS source_text_end INTEGER,
ADD COLUMN IF NOT EXISTS source_line_start INTEGER,
ADD COLUMN IF NOT EXISTS source_line_end INTEGER,
ADD COLUMN IF NOT EXISTS source_context TEXT,
ADD COLUMN IF NOT EXISTS source_snippet TEXT,
ADD COLUMN IF NOT EXISTS entity_markdown_tag VARCHAR(10) DEFAULT 'h5';

-- Add comments explaining the new fields
COMMENT ON COLUMN phases.source_document_id IS 'Document where this phase was defined/extracted from';
COMMENT ON COLUMN phases.source_text_start IS 'Character position where phase text starts in source document';
COMMENT ON COLUMN phases.source_text_end IS 'Character position where phase text ends in source document';
COMMENT ON COLUMN phases.source_line_start IS 'Line number where phase starts in source document (1-based)';
COMMENT ON COLUMN phases.source_line_end IS 'Line number where phase ends in source document (1-based)';
COMMENT ON COLUMN phases.source_context IS 'Surrounding text context around the phase (±100 characters)';
COMMENT ON COLUMN phases.source_snippet IS 'Exact text snippet that was extracted for this phase';
COMMENT ON COLUMN phases.entity_markdown_tag IS 'HTML tag used to wrap the entity (h5 or h6)';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_phases_source_document ON phases(source_document_id);
CREATE INDEX IF NOT EXISTS idx_phases_source_location ON phases(source_document_id, source_text_start);

COMMIT;
