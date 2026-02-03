-- Migration 374: Add Location Data to Stakeholders Table
-- Date: 2026-02-02
-- Purpose: Add source document tracking for stakeholders with position data

BEGIN;

-- Add location tracking fields to stakeholders table
ALTER TABLE stakeholders 
ADD COLUMN IF NOT EXISTS source_document_id UUID REFERENCES documents(id),
ADD COLUMN IF NOT EXISTS source_text_start INTEGER,
ADD COLUMN IF NOT EXISTS source_text_end INTEGER,
ADD COLUMN IF NOT EXISTS source_line_start INTEGER,
ADD COLUMN IF NOT EXISTS source_line_end INTEGER,
ADD COLUMN IF NOT EXISTS source_context TEXT,
ADD COLUMN IF NOT EXISTS source_snippet TEXT,
ADD COLUMN IF NOT EXISTS entity_markdown_tag VARCHAR(10) DEFAULT 'h5';

-- Add comments explaining the new fields
COMMENT ON COLUMN stakeholders.source_document_id IS 'Document where this stakeholder was identified/extracted from';
COMMENT ON COLUMN stakeholders.source_text_start IS 'Character position where stakeholder text starts in source document';
COMMENT ON COLUMN stakeholders.source_text_end IS 'Character position where stakeholder text ends in source document';
COMMENT ON COLUMN stakeholders.source_line_start IS 'Line number where stakeholder starts in source document (1-based)';
COMMENT ON COLUMN stakeholders.source_line_end IS 'Line number where stakeholder ends in source document (1-based)';
COMMENT ON COLUMN stakeholders.source_context IS 'Surrounding text context around the stakeholder (±100 characters)';
COMMENT ON COLUMN stakeholders.source_snippet IS 'Exact text snippet that was extracted for this stakeholder';
COMMENT ON COLUMN stakeholders.entity_markdown_tag IS 'HTML tag used to wrap the entity (h5 or h6)';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_stakeholders_source_document ON stakeholders(source_document_id);
CREATE INDEX IF NOT EXISTS idx_stakeholders_source_location ON stakeholders(source_document_id, source_text_start);

COMMIT;
