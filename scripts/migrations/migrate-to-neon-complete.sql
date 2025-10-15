-- Complete Migration Script for Neon Database
-- Run this script on any new machine to set up the complete database schema
-- Usage: psql "your-neon-connection-string" -f migrate-to-neon-complete.sql

-- ============================================================================
-- CORE SCHEMA MIGRATIONS
-- ============================================================================

-- 1. Context Bundles Table
CREATE TABLE IF NOT EXISTS context_bundles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    content JSONB NOT NULL DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT true
);

-- 2. Document Versions Table
CREATE TABLE IF NOT EXISTS document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    version_number VARCHAR(50) NOT NULL,
    content TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

-- 3. Template Soft Delete Fields
ALTER TABLE templates ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

-- 4. Confluence Integration Fields
ALTER TABLE projects ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS framework VARCHAR(100);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- 5. SharePoint Integration Fields
ALTER TABLE documents ADD COLUMN IF NOT EXISTS sharepoint_file_id VARCHAR(255);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS sharepoint_drive_id VARCHAR(255);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS sharepoint_site_id VARCHAR(255);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS web_url TEXT;
ALTER TABLE integrations ADD COLUMN IF NOT EXISTS last_sync TIMESTAMP;
ALTER TABLE integrations ADD COLUMN IF NOT EXISTS sync_status VARCHAR(50) DEFAULT 'pending';

-- 6. OpenAI Enhanced Fields
ALTER TABLE ai_providers ADD COLUMN IF NOT EXISTS rate_limits JSONB DEFAULT '{}';
ALTER TABLE ai_providers ADD COLUMN IF NOT EXISTS model_info JSONB DEFAULT '{}';
ALTER TABLE ai_providers ADD COLUMN IF NOT EXISTS pricing_info JSONB DEFAULT '{}';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Context Bundles Indexes
CREATE INDEX IF NOT EXISTS idx_context_bundles_created_at ON context_bundles(created_at);
CREATE INDEX IF NOT EXISTS idx_context_bundles_metadata ON context_bundles USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_context_bundles_content ON context_bundles USING GIN(content);
CREATE INDEX IF NOT EXISTS idx_context_bundles_created_by ON context_bundles(created_by);
CREATE INDEX IF NOT EXISTS idx_context_bundles_is_active ON context_bundles(is_active);

-- Document Versions Indexes
CREATE INDEX IF NOT EXISTS idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_version_number ON document_versions(version_number);
CREATE INDEX IF NOT EXISTS idx_document_versions_created_at ON document_versions(created_at);

-- Template Indexes
CREATE INDEX IF NOT EXISTS idx_templates_deleted_at ON templates(deleted_at);
CREATE INDEX IF NOT EXISTS idx_templates_is_deleted ON templates(is_deleted);

-- Project Indexes
CREATE INDEX IF NOT EXISTS idx_projects_metadata ON projects USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);

-- Document Indexes
CREATE INDEX IF NOT EXISTS idx_documents_metadata ON documents USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_documents_framework ON documents(framework);
CREATE INDEX IF NOT EXISTS idx_documents_sharepoint_file_id ON documents(sharepoint_file_id);
CREATE INDEX IF NOT EXISTS idx_documents_sharepoint_drive_id ON documents(sharepoint_drive_id);
CREATE INDEX IF NOT EXISTS idx_documents_sharepoint_site_id ON documents(sharepoint_site_id);

-- Integration Indexes
CREATE INDEX IF NOT EXISTS idx_integrations_sync_status ON integrations(sync_status);
CREATE INDEX IF NOT EXISTS idx_integrations_last_sync ON integrations(last_sync);

-- ============================================================================
-- CONSTRAINTS
-- ============================================================================

-- Unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS unique_sharepoint_file_id ON documents(sharepoint_file_id) WHERE sharepoint_file_id IS NOT NULL;

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Context bundles trigger
DROP TRIGGER IF EXISTS update_context_bundles_updated_at ON context_bundles;
CREATE TRIGGER update_context_bundles_updated_at
    BEFORE UPDATE ON context_bundles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- AI PROVIDERS
-- ============================================================================

-- OpenRouter Provider
INSERT INTO ai_providers (name, provider_type, api_key_encrypted, configuration, is_active)
VALUES (
    'OpenRouter GPT-OSS-120B',
    'openrouter',
    'REPLACE_WITH_BASE64_ENCODED_API_KEY',
    '{"model": "gpt-oss-120b", "baseURL": "https://openrouter.ai/api/v1", "timeout": 30000, "maxRetries": 3, "description": "Access to GPT-OSS-120B - the hottest 120B parameter open-source model with Mixture-of-Experts architecture"}',
    true
) ON CONFLICT DO NOTHING;

-- Claude Provider
INSERT INTO ai_providers (name, provider_type, api_key_encrypted, configuration, is_active)
VALUES (
    'Claude 3.5 Sonnet',
    'anthropic',
    'REPLACE_WITH_BASE64_ENCODED_API_KEY',
    '{"model": "claude-3-5-sonnet-20241022", "baseURL": "https://api.anthropic.com", "timeout": 30000, "maxRetries": 3, "description": "Claude 3.5 Sonnet - Advanced reasoning and analysis capabilities"}',
    true
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE context_bundles IS 'Stores context bundles for AI processing';
COMMENT ON TABLE document_versions IS 'Version control for documents';
COMMENT ON COLUMN templates.deleted_at IS 'Soft delete timestamp for templates';
COMMENT ON COLUMN templates.is_deleted IS 'Soft delete flag for templates';
COMMENT ON COLUMN projects.metadata IS 'Additional project metadata in JSON format';
COMMENT ON COLUMN documents.sharepoint_file_id IS 'SharePoint file identifier';
COMMENT ON COLUMN documents.sharepoint_drive_id IS 'SharePoint drive identifier';
COMMENT ON COLUMN documents.sharepoint_site_id IS 'SharePoint site identifier';
COMMENT ON COLUMN ai_providers.rate_limits IS 'Rate limiting configuration for AI providers';
COMMENT ON COLUMN ai_providers.model_info IS 'Model information and capabilities';
COMMENT ON COLUMN ai_providers.pricing_info IS 'Pricing information for AI providers';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

SELECT 'Migration completed successfully!' as status;

