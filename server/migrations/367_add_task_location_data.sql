-- Migration 367: Add Location Data to Tasks Table
-- Date: 2026-02-02
-- Purpose: Add source document tracking for tasks with position data

BEGIN;

-- Add location tracking fields to tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS source_document_id UUID REFERENCES documents(id),
ADD COLUMN IF NOT EXISTS source_text_start INTEGER,
ADD COLUMN IF NOT EXISTS source_text_end INTEGER,
ADD COLUMN IF NOT EXISTS source_line_start INTEGER,
ADD COLUMN IF NOT EXISTS source_line_end INTEGER,
ADD COLUMN IF NOT EXISTS source_context TEXT,
ADD COLUMN IF NOT EXISTS source_snippet TEXT,
ADD COLUMN IF NOT EXISTS entity_markdown_tag VARCHAR(10) DEFAULT 'h5';

-- Add comments explaining the new fields
COMMENT ON COLUMN tasks.source_document_id IS 'Document where this task was extracted from';
COMMENT ON COLUMN tasks.source_text_start IS 'Character position where task text starts in source document';
COMMENT ON COLUMN tasks.source_text_end IS 'Character position where task text ends in source document';
COMMENT ON COLUMN tasks.source_line_start IS 'Line number where task starts in source document (1-based)';
COMMENT ON COLUMN tasks.source_line_end IS 'Line number where task ends in source document (1-based)';
COMMENT ON COLUMN tasks.source_context IS 'Surrounding text context around the task (±100 characters)';
COMMENT ON COLUMN tasks.source_snippet IS 'Exact text snippet that was extracted for this task';
COMMENT ON COLUMN tasks.entity_markdown_tag IS 'HTML tag used to wrap the entity (h5 or h6)';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_source_document ON tasks(source_document_id);
CREATE INDEX IF NOT EXISTS idx_tasks_source_location ON tasks(source_document_id, source_text_start);

COMMIT;
