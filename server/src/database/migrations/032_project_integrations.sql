-- Migration: Create project_integrations table
-- Up
CREATE TABLE IF NOT EXISTS project_integrations (
  project_id UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  jira_project_key TEXT NULL,
  jira_issue_type_default TEXT NULL,
  confluence_space_key TEXT NULL,
  confluence_parent_page_id TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Helpful index for lookups by project
CREATE INDEX IF NOT EXISTS project_integrations_project_id_idx ON project_integrations(project_id);

-- Down
-- To rollback, drop the table
-- DROP TABLE IF EXISTS project_integrations;