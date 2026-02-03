-- Migration 367: Add Markdown Highlighting Support (Simplified Approach)
-- Date: 2026-02-02
-- Purpose: Use h5/h6 tags in markdown content for entity highlighting instead of complex position tracking

BEGIN;

-- Add simple highlighting fields (much simpler than position tracking)
ALTER TABLE performance_actuals 
ADD COLUMN IF NOT EXISTS markdown_highlighted_content TEXT,
ADD COLUMN IF NOT EXISTS entity_markdown_tag VARCHAR(10) DEFAULT 'h5';

-- Add comment explaining the new approach
COMMENT ON COLUMN performance_actuals.markdown_highlighted_content IS 'Document content with entity wrapped in h5/h6 tags for highlighting';
COMMENT ON COLUMN performance_actuals.entity_markdown_tag IS 'HTML tag used to wrap the entity (h5 or h6)';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_performance_actuals_markdown_highlight ON performance_actuals(source_document_id, entity_markdown_tag);

COMMIT;
