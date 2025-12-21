-- Document Version Conflicts Table
-- Tracks conflicts detected during document creation/regeneration

CREATE TABLE IF NOT EXISTS document_version_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES templates(id),
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  conflict_details JSONB DEFAULT '{}'::jsonb,
  resolution_strategy VARCHAR(50) DEFAULT 'prompt_user',
  governance_level VARCHAR(50) DEFAULT 'standard',
  resolution_method VARCHAR(50),
  resolution_details JSONB,
  status VARCHAR(50) DEFAULT 'pending',
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_conflicts_document_id ON document_version_conflicts(document_id);
CREATE INDEX IF NOT EXISTS idx_conflicts_template_id ON document_version_conflicts(template_id);
