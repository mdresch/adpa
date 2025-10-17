-- Migration: Add soft delete functionality to documents table (core only)
-- Description: Adds deleted_at and deleted_by columns for soft delete functionality
-- Version: 1.0.0
-- Created: 2025-01-17

-- Add soft delete columns to documents table
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id);

-- Create index for efficient queries of non-deleted documents
CREATE INDEX IF NOT EXISTS idx_documents_not_deleted 
ON documents (created_at DESC) 
WHERE deleted_at IS NULL;

-- Create index for efficient queries of deleted documents
CREATE INDEX IF NOT EXISTS idx_documents_deleted 
ON documents (deleted_at DESC) 
WHERE deleted_at IS NOT NULL;

-- Create a simple view for active (non-deleted) documents
CREATE OR REPLACE VIEW documents_active AS
SELECT 
    d.*,
    u.name as author_name,
    u.email as author_email,
    t.name as template_name,
    t.framework as template_framework_name,
    p.name as project_name
FROM documents d
LEFT JOIN users u ON d.created_by = u.id
LEFT JOIN templates t ON d.template_id = t.id
LEFT JOIN projects p ON d.project_id = p.id
WHERE d.deleted_at IS NULL;

-- Create a simple view for deleted documents
CREATE OR REPLACE VIEW documents_deleted AS
SELECT 
    d.*,
    u.name as author_name,
    u.email as author_email,
    du.name as deleted_by_name,
    du.email as deleted_by_email,
    t.name as template_name,
    t.framework as template_framework_name,
    p.name as project_name,
    EXTRACT(EPOCH FROM (NOW() - d.deleted_at)) / 3600 as deleted_age_hours
FROM documents d
LEFT JOIN users u ON d.created_by = u.id
LEFT JOIN users du ON d.deleted_by = du.id
LEFT JOIN templates t ON d.template_id = t.id
LEFT JOIN projects p ON d.project_id = p.id
WHERE d.deleted_at IS NOT NULL;

-- Create function to soft delete a document
CREATE OR REPLACE FUNCTION soft_delete_document(
    document_id UUID,
    deleted_by_user_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE documents 
    SET 
        deleted_at = NOW(),
        deleted_by = deleted_by_user_id,
        updated_at = NOW()
    WHERE id = document_id 
    AND deleted_at IS NULL; -- Only update if not already deleted
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Create function to restore a soft-deleted document
CREATE OR REPLACE FUNCTION restore_document(
    document_id UUID,
    restored_by_user_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE documents 
    SET 
        deleted_at = NULL,
        deleted_by = NULL,
        updated_at = NOW()
    WHERE id = document_id 
    AND deleted_at IS NOT NULL; -- Only update if currently deleted
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON COLUMN documents.deleted_at IS 'Timestamp when the document was soft deleted (NULL means not deleted)';
COMMENT ON COLUMN documents.deleted_by IS 'User ID who deleted the document (NULL means not deleted)';
COMMENT ON VIEW documents_active IS 'View showing only non-deleted documents with metadata';
COMMENT ON VIEW documents_deleted IS 'View showing only soft-deleted documents with metadata';
COMMENT ON FUNCTION soft_delete_document IS 'Soft deletes a document by setting deleted_at timestamp and deleted_by user';
COMMENT ON FUNCTION restore_document IS 'Restores a soft-deleted document by clearing deleted_at and deleted_by fields';
