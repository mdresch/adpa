-- Document Migration using COPY method
-- This script migrates documents from Docker PostgreSQL to Neon database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Begin transaction
BEGIN;

-- Create a temporary table to hold the migrated documents
CREATE TEMP TABLE documents_temp (
    id UUID,
    project_id UUID,
    name VARCHAR(255),
    content JSONB,
    template_id UUID,
    version INTEGER,
    status VARCHAR(20),
    file_path VARCHAR(500),
    file_size BIGINT,
    mime_type VARCHAR(100),
    framework VARCHAR(50),
    metadata JSONB,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Note: The actual data will be inserted here using INSERT statements
-- This is a template for the migration process

-- Insert documents with UPSERT (INSERT ... ON CONFLICT)
-- This will insert new documents or update existing ones

-- Example of the pattern we'll use:
-- INSERT INTO documents_temp (id, project_id, name, content, template_id, version, status, file_path, file_size, mime_type, framework, metadata, created_by, updated_by, created_at, updated_at)
-- VALUES ('document-id', 'project-id', 'document-name', 'content-json', 'template-id', 1, 'status', 'file-path', 0, 'mime-type', 'framework', 'metadata-json', 'created-by', 'updated-by', '2025-01-01 00:00:00', '2025-01-01 00:00:00');

-- After inserting all documents into temp table, merge with main table
INSERT INTO documents (id, project_id, name, content, template_id, version, status, file_path, file_size, mime_type, framework, metadata, created_by, updated_by, created_at, updated_at)
SELECT id, project_id, name, content, template_id, version, status, file_path, file_size, mime_type, framework, metadata, created_by, updated_by, created_at, updated_at
FROM documents_temp
ON CONFLICT (id) DO UPDATE SET
    project_id = EXCLUDED.project_id,
    name = EXCLUDED.name,
    content = EXCLUDED.content,
    template_id = EXCLUDED.template_id,
    version = EXCLUDED.version,
    status = EXCLUDED.status,
    file_path = EXCLUDED.file_path,
    file_size = EXCLUDED.file_size,
    mime_type = EXCLUDED.mime_type,
    framework = EXCLUDED.framework,
    metadata = EXCLUDED.metadata,
    created_by = EXCLUDED.created_by,
    updated_by = EXCLUDED.updated_by,
    updated_at = EXCLUDED.updated_at;

-- Clean up temp table
DROP TABLE documents_temp;

-- Verify the migration
SELECT 'Documents after migration:' as info, COUNT(*) as count FROM documents;

-- Commit the transaction
COMMIT;
