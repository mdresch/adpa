-- Migration 379: Add Location Data to Constraints Table
-- Date: 2026-02-02
-- Purpose: Add source document tracking for constraints with position data

BEGIN;

-- Add location tracking fields to constraints table
ALTER TABLE constraints 
ADD COLUMN IF NOT EXISTS source_document_id UUID REFERENCES documents(id),
ADD COLUMN IF NOT EXISTS source_text_start INTEGER,
ADD COLUMN IF NOT EXISTS source_text_end INTEGER,
ADD COLUMN IF NOT EXISTS source_line_start INTEGER,
ADD COLUMN IF NOT EXISTS source_line_end INTEGER,
ADD COLUMN IF NOT EXISTS source_context TEXT,
ADD COLUMN IF NOT EXISTS source_snippet TEXT,
ADD COLUMN IF NOT EXISTS entity_markdown_tag VARCHAR(10) DEFAULT 'h5';

-- Add comments explaining the new fields
COMMENT ON COLUMN constraints.source_document_id IS 'Document where this constraint was identified/extracted from';
COMMENT ON COLUMN constraints.source_text_start IS 'Character position where constraint text starts in source document';
COMMENT ON COLUMN constraints.source_text_end IS 'Character position where constraint text ends in source document';
COMMENT ON COLUMN constraints.source_line_start IS 'Line number where constraint starts in source document (1-based)';
COMMENT ON COLUMN constraints.source_line_end IS 'Line number where constraint ends in source document (1-based)';
COMMENT ON COLUMN constraints.source_context IS 'Surrounding text context around the constraint (±100 characters)';
COMMENT ON COLUMN constraints.source_snippet IS 'Exact text snippet that was extracted for this constraint';
COMMENT ON COLUMN constraints.entity_markdown_tag IS 'HTML tag used to wrap the entity (h5 or h6)';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_constraints_source_document ON constraints(source_document_id);
CREATE INDEX IF NOT EXISTS idx_constraints_source_location ON constraints(source_document_id, source_text_start);

COMMIT;
