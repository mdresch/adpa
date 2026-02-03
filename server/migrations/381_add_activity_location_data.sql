-- Migration 381: Add Location Data to Activities Table
-- Date: 2026-02-02
-- Purpose: Add source document tracking for activities with position data

BEGIN;

-- Add location tracking fields to activities table
ALTER TABLE activities 
ADD COLUMN IF NOT EXISTS source_document_id UUID REFERENCES documents(id),
ADD COLUMN IF NOT EXISTS source_text_start INTEGER,
ADD COLUMN IF NOT EXISTS source_text_end INTEGER,
ADD COLUMN IF NOT EXISTS source_line_start INTEGER,
ADD COLUMN IF NOT EXISTS source_line_end INTEGER,
ADD COLUMN IF NOT EXISTS source_context TEXT,
ADD COLUMN IF NOT EXISTS source_snippet TEXT,
ADD COLUMN IF NOT EXISTS entity_markdown_tag VARCHAR(10) DEFAULT 'h5';

-- Add comments explaining the new fields
COMMENT ON COLUMN activities.source_document_id IS 'Document where this activity was defined/extracted from';
COMMENT ON COLUMN activities.source_text_start IS 'Character position where activity text starts in source document';
COMMENT ON COLUMN activities.source_text_end IS 'Character position where activity text ends in source document';
COMMENT ON COLUMN activities.source_line_start IS 'Line number where activity starts in source document (1-based)';
COMMENT ON COLUMN activities.source_line_end IS 'Line number where activity ends in source document (1-based)';
COMMENT ON COLUMN activities.source_context IS 'Surrounding text context around the activity (±100 characters)';
COMMENT ON COLUMN activities.source_snippet IS 'Exact text snippet that was extracted for this activity';
COMMENT ON COLUMN activities.entity_markdown_tag IS 'HTML tag used to wrap the entity (h5 or h6)';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_activities_source_document ON activities(source_document_id);
CREATE INDEX IF NOT EXISTS idx_activities_source_location ON activities(source_document_id, source_text_start);

COMMIT;
