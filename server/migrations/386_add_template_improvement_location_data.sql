-- Migration 386: Add Location Data to Template Improvement Suggestions Table
-- Date: 2026-02-02
-- Purpose: Add source document tracking for template improvement suggestions with position data

BEGIN;

-- Add location tracking fields to template_improvement_suggestions table
ALTER TABLE template_improvement_suggestions 
ADD COLUMN IF NOT EXISTS source_document_id UUID REFERENCES documents(id),
ADD COLUMN IF NOT EXISTS source_text_start INTEGER,
ADD COLUMN IF NOT EXISTS source_text_end INTEGER,
ADD COLUMN IF NOT EXISTS source_line_start INTEGER,
ADD COLUMN IF NOT EXISTS source_line_end INTEGER,
ADD COLUMN IF NOT EXISTS source_context TEXT,
ADD COLUMN IF NOT EXISTS source_snippet TEXT,
ADD COLUMN IF NOT EXISTS entity_markdown_tag VARCHAR(10) DEFAULT 'h5';

-- Add comments explaining the new fields
COMMENT ON COLUMN template_improvement_suggestions.source_document_id IS 'Document where this template improvement suggestion was identified/extracted from';
COMMENT ON COLUMN template_improvement_suggestions.source_text_start IS 'Character position where template improvement text starts in source document';
COMMENT ON COLUMN template_improvement_suggestions.source_text_end IS 'Character position where template improvement text ends in source document';
COMMENT ON COLUMN template_improvement_suggestions.source_line_start IS 'Line number where template improvement starts in source document (1-based)';
COMMENT ON COLUMN template_improvement_suggestions.source_line_end IS 'Line number where template improvement ends in source document (1-based)';
COMMENT ON COLUMN template_improvement_suggestions.source_context IS 'Surrounding text context around the template improvement (±100 characters)';
COMMENT ON COLUMN template_improvement_suggestions.source_snippet IS 'Exact text snippet that was extracted for this template improvement';
COMMENT ON COLUMN template_improvement_suggestions.entity_markdown_tag IS 'HTML tag used to wrap the entity (h5 or h6)';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_template_improvement_suggestions_source_document ON template_improvement_suggestions(source_document_id);
CREATE INDEX IF NOT EXISTS idx_template_improvement_suggestions_source_location ON template_improvement_suggestions(source_document_id, source_text_start);

COMMIT;
