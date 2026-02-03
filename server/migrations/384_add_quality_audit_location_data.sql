-- Migration 384: Add Location Data to Quality Audits Table
-- Date: 2026-02-02
-- Purpose: Add source document tracking for quality audits with position data

BEGIN;

-- Add location tracking fields to quality_audits table
ALTER TABLE quality_audits 
ADD COLUMN IF NOT EXISTS source_document_id UUID REFERENCES documents(id),
ADD COLUMN IF NOT EXISTS source_text_start INTEGER,
ADD COLUMN IF NOT EXISTS source_text_end INTEGER,
ADD COLUMN IF NOT EXISTS source_line_start INTEGER,
ADD COLUMN IF NOT EXISTS source_line_end INTEGER,
ADD COLUMN IF NOT EXISTS source_context TEXT,
ADD COLUMN IF NOT EXISTS source_snippet TEXT,
ADD COLUMN IF NOT EXISTS entity_markdown_tag VARCHAR(10) DEFAULT 'h5';

-- Add comments explaining the new fields
COMMENT ON COLUMN quality_audits.source_document_id IS 'Document where this quality audit was defined/extracted from';
COMMENT ON COLUMN quality_audits.source_text_start IS 'Character position where quality audit text starts in source document';
COMMENT ON COLUMN quality_audits.source_text_end IS 'Character position where quality audit text ends in source document';
COMMENT ON COLUMN quality_audits.source_line_start IS 'Line number where quality audit starts in source document (1-based)';
COMMENT ON COLUMN quality_audits.source_line_end IS 'Line number where quality audit ends in source document (1-based)';
COMMENT ON COLUMN quality_audits.source_context IS 'Surrounding text context around the quality audit (±100 characters)';
COMMENT ON COLUMN quality_audits.source_snippet IS 'Exact text snippet that was extracted for this quality audit';
COMMENT ON COLUMN quality_audits.entity_markdown_tag IS 'HTML tag used to wrap the entity (h5 or h6)';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_quality_audits_source_document ON quality_audits(source_document_id);
CREATE INDEX IF NOT EXISTS idx_quality_audits_source_location ON quality_audits(source_document_id, source_text_start);

COMMIT;
