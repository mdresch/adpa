-- Migration 380: Add Location Data to Scope Items Table
-- Date: 2026-02-02
-- Purpose: Add source document tracking for scope items with position data

BEGIN;

-- Add location tracking fields to scope_items table
ALTER TABLE scope_items 
ADD COLUMN IF NOT EXISTS source_document_id UUID REFERENCES documents(id),
ADD COLUMN IF NOT EXISTS source_text_start INTEGER,
ADD COLUMN IF NOT EXISTS source_text_end INTEGER,
ADD COLUMN IF NOT EXISTS source_line_start INTEGER,
ADD COLUMN IF NOT EXISTS source_line_end INTEGER,
ADD COLUMN IF NOT EXISTS source_context TEXT,
ADD COLUMN IF NOT EXISTS source_snippet TEXT,
ADD COLUMN IF NOT EXISTS entity_markdown_tag VARCHAR(10) DEFAULT 'h5';

-- Add comments explaining the new fields
COMMENT ON COLUMN scope_items.source_document_id IS 'Document where this scope item was defined/extracted from';
COMMENT ON COLUMN scope_items.source_text_start IS 'Character position where scope item text starts in source document';
COMMENT ON COLUMN scope_items.source_text_end IS 'Character position where scope item text ends in source document';
COMMENT ON COLUMN scope_items.source_line_start IS 'Line number where scope item starts in source document (1-based)';
COMMENT ON COLUMN scope_items.source_line_end IS 'Line number where scope item ends in source document (1-based)';
COMMENT ON COLUMN scope_items.source_context IS 'Surrounding text context around the scope item (±100 characters)';
COMMENT ON COLUMN scope_items.source_snippet IS 'Exact text snippet that was extracted for this scope item';
COMMENT ON COLUMN scope_items.entity_markdown_tag IS 'HTML tag used to wrap the entity (h5 or h6)';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_scope_items_source_document ON scope_items(source_document_id);
CREATE INDEX IF NOT EXISTS idx_scope_items_source_location ON scope_items(source_document_id, source_text_start);

COMMIT;
