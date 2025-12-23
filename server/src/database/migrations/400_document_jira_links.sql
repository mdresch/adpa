-- Create table for storing document-Jira issue linkages
CREATE TABLE IF NOT EXISTS document_jira_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    jira_issue_key VARCHAR(255) NOT NULL,
    jira_issue_url TEXT NOT NULL,
    integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
    project_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one Jira link per document per integration
    UNIQUE(document_id, integration_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_document_jira_links_document_id ON document_jira_links(document_id);
CREATE INDEX IF NOT EXISTS idx_document_jira_links_integration_id ON document_jira_links(integration_id);
CREATE INDEX IF NOT EXISTS idx_document_jira_links_project_id ON document_jira_links(project_id);
CREATE INDEX IF NOT EXISTS idx_document_jira_links_jira_issue_key ON document_jira_links(jira_issue_key);

-- Create trigger to automatically update updated_at timestamp
CREATE TRIGGER update_document_jira_links_updated_at
    BEFORE UPDATE ON document_jira_links
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE document_jira_links IS 'Links between generated documents and Jira issues';
COMMENT ON COLUMN document_jira_links.document_id IS 'ID of the linked document';
COMMENT ON COLUMN document_jira_links.jira_issue_key IS 'Jira issue key (e.g., PROJ-123)';
COMMENT ON COLUMN document_jira_links.jira_issue_url IS 'Full URL to the Jira issue';
COMMENT ON COLUMN document_jira_links.integration_id IS 'ID of the Jira integration used';
COMMENT ON COLUMN document_jira_links.project_id IS 'ID of the ADPA project';