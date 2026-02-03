-- Migration 369: Add Location Data to Mitigation Plans Table
-- Date: 2026-02-02
-- Purpose: Add source document tracking for mitigation plans with position data

BEGIN;

-- Add location tracking fields to mitigation_plans table
ALTER TABLE mitigation_plans 
ADD COLUMN IF NOT EXISTS source_document_id UUID REFERENCES documents(id),
ADD COLUMN IF NOT EXISTS source_text_start INTEGER,
ADD COLUMN IF NOT EXISTS source_text_end INTEGER,
ADD COLUMN IF NOT EXISTS source_line_start INTEGER,
ADD COLUMN IF NOT EXISTS source_line_end INTEGER,
ADD COLUMN IF NOT EXISTS source_context TEXT,
ADD COLUMN IF NOT EXISTS source_snippet TEXT,
ADD COLUMN IF NOT EXISTS entity_markdown_tag VARCHAR(10) DEFAULT 'h5';

-- Add comments explaining the new fields
COMMENT ON COLUMN mitigation_plans.source_document_id IS 'Document where this mitigation plan was extracted from';
COMMENT ON COLUMN mitigation_plans.source_text_start IS 'Character position where mitigation text starts in source document';
COMMENT ON COLUMN mitigation_plans.source_text_end IS 'Character position where mitigation text ends in source document';
COMMENT ON COLUMN mitigation_plans.source_line_start IS 'Line number where mitigation starts in source document (1-based)';
COMMENT ON COLUMN mitigation_plans.source_line_end IS 'Line number where mitigation ends in source document (1-based)';
COMMENT ON COLUMN mitigation_plans.source_context IS 'Surrounding text context around the mitigation (±100 characters)';
COMMENT ON COLUMN mitigation_plans.source_snippet IS 'Exact text snippet that was extracted for this mitigation plan';
COMMENT ON COLUMN mitigation_plans.entity_markdown_tag IS 'HTML tag used to wrap the entity (h5 or h6)';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_mitigation_plans_source_document ON mitigation_plans(source_document_id);
CREATE INDEX IF NOT EXISTS idx_mitigation_plans_source_location ON mitigation_plans(source_document_id, source_text_start);

COMMIT;
