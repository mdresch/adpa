-- Add SharePoint integration fields to documents table
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS sharepoint_file_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS sharepoint_drive_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS sharepoint_site_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS file_size BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS mime_type VARCHAR(255),
ADD COLUMN IF NOT EXISTS web_url TEXT;

-- Create indexes for SharePoint fields
CREATE INDEX IF NOT EXISTS idx_documents_sharepoint_file_id ON documents(sharepoint_file_id);
CREATE INDEX IF NOT EXISTS idx_documents_sharepoint_drive_id ON documents(sharepoint_drive_id);
CREATE INDEX IF NOT EXISTS idx_documents_sharepoint_site_id ON documents(sharepoint_site_id);

-- Add unique constraint for SharePoint file ID to prevent duplicates
ALTER TABLE documents 
ADD CONSTRAINT unique_sharepoint_file_id UNIQUE (sharepoint_file_id);

-- Update integrations table to support SharePoint configuration
ALTER TABLE integrations 
ADD COLUMN IF NOT EXISTS last_sync TIMESTAMP,
ADD COLUMN IF NOT EXISTS sync_status VARCHAR(50) DEFAULT 'not_started';

-- Create index for integration sync status
CREATE INDEX IF NOT EXISTS idx_integrations_sync_status ON integrations(sync_status);
CREATE INDEX IF NOT EXISTS idx_integrations_last_sync ON integrations(last_sync);

-- Add comments for documentation
COMMENT ON COLUMN documents.sharepoint_file_id IS 'SharePoint file ID from Microsoft Graph API';
COMMENT ON COLUMN documents.sharepoint_drive_id IS 'SharePoint drive ID from Microsoft Graph API';
COMMENT ON COLUMN documents.sharepoint_site_id IS 'SharePoint site ID from Microsoft Graph API';
COMMENT ON COLUMN documents.file_size IS 'File size in bytes';
COMMENT ON COLUMN documents.mime_type IS 'MIME type of the file';
COMMENT ON COLUMN documents.web_url IS 'SharePoint web URL for the file';
COMMENT ON COLUMN integrations.last_sync IS 'Timestamp of last successful sync';
COMMENT ON COLUMN integrations.sync_status IS 'Status of last sync operation';
