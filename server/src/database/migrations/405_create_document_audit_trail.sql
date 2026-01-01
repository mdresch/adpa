-- Create document_audit_trail table
-- Tracks all actions performed on documents for versioning and compliance

CREATE TABLE IF NOT EXISTS document_audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version_id UUID REFERENCES document_versions(id) ON DELETE SET NULL,
  action_type VARCHAR(50) NOT NULL,
  performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_audit_trail_document_id ON document_audit_trail(document_id);
CREATE INDEX IF NOT EXISTS idx_document_audit_trail_performed_by ON document_audit_trail(performed_by);
CREATE INDEX IF NOT EXISTS idx_document_audit_trail_action_type ON document_audit_trail(action_type);
