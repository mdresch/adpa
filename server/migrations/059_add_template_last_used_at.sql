-- Migration: Add last_used_at column to templates table
-- Purpose: Track when a template was last used for document generation
-- Date: 2025-10-22

-- Add last_used_at column
ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP WITHOUT TIME ZONE;

-- Add index for performance when querying recently used templates
CREATE INDEX IF NOT EXISTS idx_templates_last_used_at ON templates(last_used_at DESC NULLS LAST);

-- Add comment for documentation
COMMENT ON COLUMN templates.last_used_at IS 'Timestamp when the template was last used to generate a document. Updated automatically by job queue worker.';

-- Backfill last_used_at from existing documents (one-time)
-- This updates templates with the most recent document creation time
UPDATE templates t
SET last_used_at = (
  SELECT MAX(d.created_at)
  FROM documents d
  WHERE d.template_id = t.id
)
WHERE EXISTS (
  SELECT 1 FROM documents d WHERE d.template_id = t.id
);

