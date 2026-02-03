-- Migration 376: Add Location Data to Milestones Table
-- Date: 2026-02-02
-- Purpose: Add source document tracking for milestones with position data

BEGIN;

-- Add location tracking fields to milestones table
ALTER TABLE milestones 
ADD COLUMN IF NOT EXISTS source_document_id UUID REFERENCES documents(id),
ADD COLUMN IF NOT EXISTS source_text_start INTEGER,
ADD COLUMN IF NOT EXISTS source_text_end INTEGER,
ADD COLUMN IF NOT EXISTS source_line_start INTEGER,
ADD COLUMN IF NOT EXISTS source_line_end INTEGER,
ADD COLUMN IF NOT EXISTS source_context TEXT,
ADD COLUMN IF NOT EXISTS source_snippet TEXT,
ADD COLUMN IF NOT EXISTS entity_markdown_tag VARCHAR(10) DEFAULT 'h5';

-- Add comments explaining the new fields
COMMENT ON COLUMN milestones.source_document_id IS 'Document where this milestone was defined/extracted from';
COMMENT ON COLUMN milestones.source_text_start IS 'Character position where milestone text starts in source document';
COMMENT ON COLUMN milestones.source_text_end IS 'Character position where milestone text ends in source document';
COMMENT ON COLUMN milestones.source_line_start IS 'Line number where milestone starts in source document (1-based)';
COMMENT ON COLUMN milestones.source_line_end IS 'Line number where milestone ends in source document (1-based)';
COMMENT ON COLUMN milestones.source_context IS 'Surrounding text context around the milestone (±100 characters)';
COMMENT ON COLUMN milestones.source_snippet IS 'Exact text snippet that was extracted for this milestone';
COMMENT ON COLUMN milestones.entity_markdown_tag IS 'HTML tag used to wrap the entity (h5 or h6)';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_milestones_source_document ON milestones(source_document_id);
CREATE INDEX IF NOT EXISTS idx_milestones_source_location ON milestones(source_document_id, source_text_start);

COMMIT;
