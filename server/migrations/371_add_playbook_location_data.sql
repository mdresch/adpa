-- Migration 371: Add Location Data to Playbooks Tables
-- Date: 2026-02-02
-- Purpose: Add source document tracking for operational playbooks and playbook executions

BEGIN;

-- Add location tracking fields to operational_playbooks table
ALTER TABLE operational_playbooks 
ADD COLUMN IF NOT EXISTS source_document_id UUID REFERENCES documents(id),
ADD COLUMN IF NOT EXISTS source_text_start INTEGER,
ADD COLUMN IF NOT EXISTS source_text_end INTEGER,
ADD COLUMN IF NOT EXISTS source_line_start INTEGER,
ADD COLUMN IF NOT EXISTS source_line_end INTEGER,
ADD COLUMN IF NOT EXISTS source_context TEXT,
ADD COLUMN IF NOT EXISTS source_snippet TEXT,
ADD COLUMN IF NOT EXISTS entity_markdown_tag VARCHAR(10) DEFAULT 'h5';

-- Add comments explaining the new fields for operational_playbooks
COMMENT ON COLUMN operational_playbooks.source_document_id IS 'Document where this playbook was extracted from';
COMMENT ON COLUMN operational_playbooks.source_text_start IS 'Character position where playbook text starts in source document';
COMMENT ON COLUMN operational_playbooks.source_text_end IS 'Character position where playbook text ends in source document';
COMMENT ON COLUMN operational_playbooks.source_line_start IS 'Line number where playbook starts in source document (1-based)';
COMMENT ON COLUMN operational_playbooks.source_line_end IS 'Line number where playbook ends in source document (1-based)';
COMMENT ON COLUMN operational_playbooks.source_context IS 'Surrounding text context around the playbook (±100 characters)';
COMMENT ON COLUMN operational_playbooks.source_snippet IS 'Exact text snippet that was extracted for this playbook';
COMMENT ON COLUMN operational_playbooks.entity_markdown_tag IS 'HTML tag used to wrap the entity (h5 or h6)';

-- Add location tracking fields to playbook_executions table
ALTER TABLE playbook_executions 
ADD COLUMN IF NOT EXISTS source_document_id UUID REFERENCES documents(id),
ADD COLUMN IF NOT EXISTS source_text_start INTEGER,
ADD COLUMN IF NOT EXISTS source_text_end INTEGER,
ADD COLUMN IF NOT EXISTS source_line_start INTEGER,
ADD COLUMN IF NOT EXISTS source_line_end INTEGER,
ADD COLUMN IF NOT EXISTS source_context TEXT,
ADD COLUMN IF NOT EXISTS source_snippet TEXT,
ADD COLUMN IF NOT EXISTS entity_markdown_tag VARCHAR(10) DEFAULT 'h5';

-- Add comments explaining the new fields for playbook_executions
COMMENT ON COLUMN playbook_executions.source_document_id IS 'Document where this playbook execution was recorded/extracted from';
COMMENT ON COLUMN playbook_executions.source_text_start IS 'Character position where execution text starts in source document';
COMMENT ON COLUMN playbook_executions.source_text_end IS 'Character position where execution text ends in source document';
COMMENT ON COLUMN playbook_executions.source_line_start IS 'Line number where execution starts in source document (1-based)';
COMMENT ON COLUMN playbook_executions.source_line_end IS 'Line number where execution ends in source document (1-based)';
COMMENT ON COLUMN playbook_executions.source_context IS 'Surrounding text context around the execution (±100 characters)';
COMMENT ON COLUMN playbook_executions.source_snippet IS 'Exact text snippet that was extracted for this execution';
COMMENT ON COLUMN playbook_executions.entity_markdown_tag IS 'HTML tag used to wrap the entity (h5 or h6)';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_operational_playbooks_source_document ON operational_playbooks(source_document_id);
CREATE INDEX IF NOT EXISTS idx_operational_playbooks_source_location ON operational_playbooks(source_document_id, source_text_start);
CREATE INDEX IF NOT EXISTS idx_playbook_executions_source_document ON playbook_executions(source_document_id);
CREATE INDEX IF NOT EXISTS idx_playbook_executions_source_location ON playbook_executions(source_document_id, source_text_start);

COMMIT;
