-- Add soft delete fields to templates table
-- Migration: add_template_soft_delete_fields.sql

ALTER TABLE templates
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id) NULL;

-- Add index for better performance on soft delete queries
CREATE INDEX IF NOT EXISTS idx_templates_deleted_at ON templates(deleted_at);
CREATE INDEX IF NOT EXISTS idx_templates_deleted_by ON templates(deleted_by);

-- Add comment for documentation
COMMENT ON COLUMN templates.deleted_at IS 'Timestamp when template was soft deleted';
COMMENT ON COLUMN templates.deleted_by IS 'User ID who soft deleted the template';