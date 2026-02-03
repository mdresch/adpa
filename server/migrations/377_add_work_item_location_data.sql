-- Migration 377: Add Location Data to Work Items Table
-- Date: 2026-02-02
-- Purpose: Add source document tracking for work items with position data

BEGIN;

-- Add location tracking fields to work_items table
ALTER TABLE work_items 
ADD COLUMN IF NOT EXISTS source_document_id UUID REFERENCES documents(id),
ADD COLUMN IF NOT EXISTS source_text_start INTEGER,
ADD COLUMN IF NOT EXISTS source_text_end INTEGER,
ADD COLUMN IF NOT EXISTS source_line_start INTEGER,
ADD COLUMN IF NOT EXISTS source_line_end INTEGER,
ADD COLUMN IF NOT EXISTS source_context TEXT,
ADD COLUMN IF NOT EXISTS source_snippet TEXT,
ADD COLUMN IF NOT EXISTS entity_markdown_tag VARCHAR(10) DEFAULT 'h5';

-- Add comments explaining the new fields
COMMENT ON COLUMN work_items.source_document_id IS 'Document where this work item was defined/extracted from';
COMMENT ON COLUMN work_items.source_text_start IS 'Character position where work item text starts in source document';
COMMENT ON COLUMN work_items.source_text_end IS 'Character position where work item text ends in source document';
COMMENT ON COLUMN work_items.source_line_start IS 'Line number where work item starts in source document (1-based)';
COMMENT ON COLUMN work_items.source_line_end IS 'Line number where work item ends in source document (1-based)';
COMMENT ON COLUMN work_items.source_context IS 'Surrounding text context around the work item (±100 characters)';
COMMENT ON COLUMN work_items.source_snippet IS 'Exact text snippet that was extracted for this work item';
COMMENT ON COLUMN work_items.entity_markdown_tag IS 'HTML tag used to wrap the entity (h5 or h6)';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_work_items_source_document ON work_items(source_document_id);
CREATE INDEX IF NOT EXISTS idx_work_items_source_location ON work_items(source_document_id, source_text_start);

COMMIT;
