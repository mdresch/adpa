-- Migration 375: Add Location Data to Resources Table
-- Date: 2026-02-02
-- Purpose: Add source document tracking for resources with position data

BEGIN;

-- Add location tracking fields to resources table
ALTER TABLE resources 
ADD COLUMN IF NOT EXISTS source_document_id UUID REFERENCES documents(id),
ADD COLUMN IF NOT EXISTS source_text_start INTEGER,
ADD COLUMN IF NOT EXISTS source_text_end INTEGER,
ADD COLUMN IF NOT EXISTS source_line_start INTEGER,
ADD COLUMN IF NOT EXISTS source_line_end INTEGER,
ADD COLUMN IF NOT EXISTS source_context TEXT,
ADD COLUMN IF NOT EXISTS source_snippet TEXT,
ADD COLUMN IF NOT EXISTS entity_markdown_tag VARCHAR(10) DEFAULT 'h5';

-- Add comments explaining the new fields
COMMENT ON COLUMN resources.source_document_id IS 'Document where this resource was identified/extracted from';
COMMENT ON COLUMN resources.source_text_start IS 'Character position where resource text starts in source document';
COMMENT ON COLUMN resources.source_text_end IS 'Character position where resource text ends in source document';
COMMENT ON COLUMN resources.source_line_start IS 'Line number where resource starts in source document (1-based)';
COMMENT ON COLUMN resources.source_line_end IS 'Line number where resource ends in source document (1-based)';
COMMENT ON COLUMN resources.source_context IS 'Surrounding text context around the resource (±100 characters)';
COMMENT ON COLUMN resources.source_snippet IS 'Exact text snippet that was extracted for this resource';
COMMENT ON COLUMN resources.entity_markdown_tag IS 'HTML tag used to wrap the entity (h5 or h6)';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_resources_source_document ON resources(source_document_id);
CREATE INDEX IF NOT EXISTS idx_resources_source_location ON resources(source_document_id, source_text_start);

COMMIT;
