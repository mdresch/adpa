-- Migration: Add integration settings to project_integrations table
-- This allows per-project configuration for Confluence and Jira publishing

-- Add new columns for integration settings
ALTER TABLE project_integrations
ADD COLUMN IF NOT EXISTS confluence_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS confluence_space_key_override TEXT NULL,
ADD COLUMN IF NOT EXISTS confluence_parent_page_id_override TEXT NULL,
ADD COLUMN IF NOT EXISTS confluence_auto_publish BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS jira_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS jira_project_key_override TEXT NULL,
ADD COLUMN IF NOT EXISTS jira_issue_type_override TEXT NULL,
ADD COLUMN IF NOT EXISTS jira_priority_override TEXT NULL,
ADD COLUMN IF NOT EXISTS jira_auto_create BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS integration_settings JSONB DEFAULT '{}'::jsonb;

-- Add comments for documentation
COMMENT ON COLUMN project_integrations.confluence_enabled IS 'Enable Confluence publishing for this project';
COMMENT ON COLUMN project_integrations.confluence_space_key_override IS 'Override default Confluence space key for this project';
COMMENT ON COLUMN project_integrations.confluence_parent_page_id_override IS 'Override default parent page ID for this project';
COMMENT ON COLUMN project_integrations.confluence_auto_publish IS 'Automatically publish documents to Confluence when created';
COMMENT ON COLUMN project_integrations.jira_enabled IS 'Enable Jira issue creation for this project';
COMMENT ON COLUMN project_integrations.jira_project_key_override IS 'Override default Jira project key for this project';
COMMENT ON COLUMN project_integrations.jira_issue_type_override IS 'Override default Jira issue type for this project';
COMMENT ON COLUMN project_integrations.jira_priority_override IS 'Override default Jira priority for this project';
COMMENT ON COLUMN project_integrations.jira_auto_create IS 'Automatically create Jira issues when documents are created';
COMMENT ON COLUMN project_integrations.integration_settings IS 'Additional integration settings as JSONB';

