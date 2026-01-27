-- Migration: Create document_integrations table for tracking external integrations
-- This table tracks sync status between ADPA documents and external platforms like D365 Guides
-- Date: 2026-01-27

-- Up Migration
CREATE TABLE IF NOT EXISTS document_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  integration_type VARCHAR(50) NOT NULL,  -- e.g., 'dynamics365_guides', 'confluence', 'sharepoint'
  external_id VARCHAR(255),               -- ID in the external system
  external_url TEXT,                      -- URL to view in external system
  synced_at TIMESTAMP WITH TIME ZONE,
  synced_by UUID REFERENCES users(id) ON DELETE SET NULL,
  sync_status VARCHAR(20) DEFAULT 'synced',  -- 'synced', 'stale', 'conflict', 'failed'
  sync_version VARCHAR(50),              -- Version that was synced
  metadata JSONB DEFAULT '{}',           -- Additional integration-specific metadata
  error_message TEXT,                    -- Last error message if sync failed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint: one integration per document per type
  CONSTRAINT uq_document_integration UNIQUE (document_id, integration_type)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_document_integrations_document_id 
  ON document_integrations(document_id);

CREATE INDEX IF NOT EXISTS idx_document_integrations_integration_type 
  ON document_integrations(integration_type);

CREATE INDEX IF NOT EXISTS idx_document_integrations_external_id 
  ON document_integrations(external_id);

CREATE INDEX IF NOT EXISTS idx_document_integrations_sync_status 
  ON document_integrations(sync_status);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_document_integrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_document_integrations_updated_at ON document_integrations;

CREATE TRIGGER trigger_document_integrations_updated_at
  BEFORE UPDATE ON document_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_document_integrations_updated_at();

-- Add integration_type 'dynamics365_guides' to integrations table types
-- This assumes the integrations table has a 'type' column for different integration providers

-- Create a view for easy querying of D365 Guides sync status
CREATE OR REPLACE VIEW v_dynamics365_guides_sync AS
SELECT 
  d.id AS document_id,
  d.title AS document_title,
  d.project_id,
  p.name AS project_name,
  di.external_id AS guide_id,
  di.external_url AS guide_url,
  di.synced_at,
  di.sync_status,
  di.sync_version,
  di.metadata,
  u.email AS synced_by_email
FROM documents d
LEFT JOIN document_integrations di ON d.id = di.document_id 
  AND di.integration_type = 'dynamics365_guides'
LEFT JOIN projects p ON d.project_id = p.id
LEFT JOIN users u ON di.synced_by = u.id;

-- Grant permissions (adjust as needed for your role structure)
-- GRANT SELECT ON v_dynamics365_guides_sync TO adpa_readonly;
-- GRANT ALL ON document_integrations TO adpa_app;

COMMENT ON TABLE document_integrations IS 'Tracks synchronization status between ADPA documents and external platforms (D365 Guides, Confluence, SharePoint, etc.)';
COMMENT ON COLUMN document_integrations.integration_type IS 'Type of integration: dynamics365_guides, confluence, sharepoint, github, etc.';
COMMENT ON COLUMN document_integrations.external_id IS 'Unique identifier in the external system (e.g., D365 Guide ID, Confluence page ID)';
COMMENT ON COLUMN document_integrations.sync_status IS 'Current sync status: synced, stale (source changed), conflict (both changed), failed';
COMMENT ON COLUMN document_integrations.metadata IS 'Integration-specific metadata as JSONB (e.g., step count, anchor mappings)';

-- Down Migration (for rollback)
-- DROP VIEW IF EXISTS v_dynamics365_guides_sync;
-- DROP TRIGGER IF EXISTS trigger_document_integrations_updated_at ON document_integrations;
-- DROP FUNCTION IF EXISTS update_document_integrations_updated_at();
-- DROP TABLE IF EXISTS document_integrations;
