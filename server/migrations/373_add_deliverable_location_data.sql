-- Migration 373: Add Location Data to Deliverables Table
-- Date: 2026-02-02
-- Purpose: Add source document tracking for deliverables with position data

BEGIN;

-- Add location tracking fields to deliverables table
ALTER TABLE deliverables 
ADD COLUMN IF NOT EXISTS source_document_id UUID REFERENCES documents(id),
ADD COLUMN IF NOT EXISTS source_text_start INTEGER,
ADD COLUMN IF NOT EXISTS source_text_end INTEGER,
ADD COLUMN IF NOT EXISTS source_line_start INTEGER,
ADD COLUMN IF NOT EXISTS source_line_end INTEGER,
ADD COLUMN IF NOT EXISTS source_context TEXT,
ADD COLUMN IF NOT EXISTS source_snippet TEXT,
ADD COLUMN IF NOT EXISTS entity_markdown_tag VARCHAR(10) DEFAULT 'h5';

-- Add comments explaining the new fields
COMMENT ON COLUMN deliverables.source_document_id IS 'Document where this deliverable was defined/extracted from';
COMMENT ON COLUMN deliverables.source_text_start IS 'Character position where deliverable text starts in source document';
COMMENT ON COLUMN deliverables.source_text_end IS 'Character position where deliverable text ends in source document';
COMMENT ON COLUMN deliverables.source_line_start IS 'Line number where deliverable starts in source document (1-based)';
COMMENT ON COLUMN deliverables.source_line_end IS 'Line number where deliverable ends in source document (1-based)';
COMMENT ON COLUMN deliverables.source_context IS 'Surrounding text context around the deliverable (±100 characters)';
COMMENT ON COLUMN deliverables.source_snippet IS 'Exact text snippet that was extracted for this deliverable';
COMMENT ON COLUMN deliverables.entity_markdown_tag IS 'HTML tag used to wrap the entity (h5 or h6)';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_deliverables_source_document ON deliverables(source_document_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_source_location ON deliverables(source_document_id, source_text_start);

COMMIT;
