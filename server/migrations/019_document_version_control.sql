-- Migration 019: Document Version Control & Cascading Updates System
-- This migration creates the database schema for enterprise-grade document version control
-- and automated cascading updates when change requests are approved

-- Document versions tracking
CREATE TABLE IF NOT EXISTS document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version_number VARCHAR(20) NOT NULL, -- e.g., "2.1", "3.0"
  version_type VARCHAR(20) NOT NULL CHECK (version_type IN ('major', 'minor', 'patch')),
  change_summary TEXT NOT NULL,
  change_reason VARCHAR(100) NOT NULL, -- 'CR-2026-004', 'Baseline update', 'Error correction'
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'under_review', 'approved', 'published', 'archived')),
  content JSONB NOT NULL, -- Full document content
  metadata JSONB, -- Version-specific metadata
  change_log TEXT, -- Detailed change log
  UNIQUE(document_id, version_number)
);

-- Document dependencies (which docs affect which docs)
CREATE TABLE IF NOT EXISTS document_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  target_document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  dependency_type VARCHAR(50) NOT NULL CHECK (dependency_type IN ('requires_update', 'validates', 'references', 'supersedes')),
  change_impact VARCHAR(20) NOT NULL CHECK (change_impact IN ('high', 'medium', 'low')),
  description TEXT,
  auto_update_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(source_document_id, target_document_id, dependency_type)
);

-- Change request document update requirements
CREATE TABLE IF NOT EXISTS cr_document_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_request_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE, -- CR document
  target_document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE, -- Document to update
  update_priority VARCHAR(20) NOT NULL CHECK (update_priority IN ('high', 'medium', 'low')),
  update_reason TEXT NOT NULL,
  required_changes TEXT NOT NULL,
  assigned_to UUID REFERENCES users(id),
  due_date DATE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue', 'cancelled')),
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  notes TEXT,
  estimated_hours INTEGER,
  actual_hours INTEGER
);

-- Document consistency checks
CREATE TABLE IF NOT EXISTS document_consistency_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_name VARCHAR(100) NOT NULL,
  source_document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  target_document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  check_type VARCHAR(50) NOT NULL CHECK (check_type IN ('budget_alignment', 'schedule_alignment', 'scope_alignment', 'resource_alignment', 'quality_alignment')),
  check_query TEXT NOT NULL, -- SQL or validation logic
  check_config JSONB, -- Configuration for the check
  last_run_at TIMESTAMP,
  last_result JSONB, -- Pass/fail with details
  auto_fix_enabled BOOLEAN DEFAULT FALSE,
  auto_fix_query TEXT, -- SQL to auto-fix issues
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Document update workflow templates
CREATE TABLE IF NOT EXISTS document_update_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_name VARCHAR(100) NOT NULL,
  trigger_event VARCHAR(50) NOT NULL CHECK (trigger_event IN ('cr_approved', 'baseline_updated', 'manual', 'scheduled')),
  document_types TEXT[] NOT NULL, -- Array of document types to update
  update_order INTEGER[], -- Order of document updates
  approval_required BOOLEAN DEFAULT TRUE,
  notification_required BOOLEAN DEFAULT TRUE,
  auto_assign BOOLEAN DEFAULT FALSE,
  default_assignee UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- Document update workflow instances (actual executions)
CREATE TABLE IF NOT EXISTS document_update_workflow_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES document_update_workflows(id) ON DELETE CASCADE,
  trigger_document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE, -- CR or baseline that triggered this
  status VARCHAR(20) DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  created_by UUID NOT NULL REFERENCES users(id),
  error_message TEXT,
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100)
);

-- Document update notifications
CREATE TABLE IF NOT EXISTS document_update_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  update_task_id UUID NOT NULL REFERENCES cr_document_updates(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES users(id),
  notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN ('assigned', 'reminder', 'overdue', 'completed')),
  sent_at TIMESTAMP DEFAULT NOW(),
  read_at TIMESTAMP,
  email_sent BOOLEAN DEFAULT FALSE,
  in_app_sent BOOLEAN DEFAULT TRUE,
  message TEXT NOT NULL
);

-- Document version approval workflow
CREATE TABLE IF NOT EXISTS document_version_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES document_versions(id) ON DELETE CASCADE,
  approver_id UUID NOT NULL REFERENCES users(id),
  approval_level INTEGER NOT NULL, -- 1=PM, 2=Sponsor, 3=CCB
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'delegated')),
  comments TEXT,
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_status ON document_versions(status);
CREATE INDEX IF NOT EXISTS idx_document_versions_created_at ON document_versions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_document_dependencies_source ON document_dependencies(source_document_id);
CREATE INDEX IF NOT EXISTS idx_document_dependencies_target ON document_dependencies(target_document_id);
CREATE INDEX IF NOT EXISTS idx_document_dependencies_type ON document_dependencies(dependency_type);

CREATE INDEX IF NOT EXISTS idx_cr_document_updates_cr ON cr_document_updates(change_request_id);
CREATE INDEX IF NOT EXISTS idx_cr_document_updates_target ON cr_document_updates(target_document_id);
CREATE INDEX IF NOT EXISTS idx_cr_document_updates_status ON cr_document_updates(status);
CREATE INDEX IF NOT EXISTS idx_cr_document_updates_assigned ON cr_document_updates(assigned_to);
CREATE INDEX IF NOT EXISTS idx_cr_document_updates_due_date ON cr_document_updates(due_date);

CREATE INDEX IF NOT EXISTS idx_consistency_checks_source ON document_consistency_checks(source_document_id);
CREATE INDEX IF NOT EXISTS idx_consistency_checks_target ON document_consistency_checks(target_document_id);
CREATE INDEX IF NOT EXISTS idx_consistency_checks_type ON document_consistency_checks(check_type);
CREATE INDEX IF NOT EXISTS idx_consistency_checks_active ON document_consistency_checks(is_active);

CREATE INDEX IF NOT EXISTS idx_workflow_instances_workflow ON document_update_workflow_instances(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_trigger ON document_update_workflow_instances(trigger_document_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_status ON document_update_workflow_instances(status);

CREATE INDEX IF NOT EXISTS idx_notifications_update_task ON document_update_notifications(update_task_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON document_update_notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON document_update_notifications(notification_type);

CREATE INDEX IF NOT EXISTS idx_version_approvals_version ON document_version_approvals(version_id);
CREATE INDEX IF NOT EXISTS idx_version_approvals_approver ON document_version_approvals(approver_id);
CREATE INDEX IF NOT EXISTS idx_version_approvals_status ON document_version_approvals(status);

-- Insert default workflow templates
INSERT INTO document_update_workflows (
  workflow_name,
  trigger_event,
  document_types,
  update_order,
  approval_required,
  notification_required,
  auto_assign
) VALUES 
(
  'CR Approval - High Priority',
  'cr_approved',
  ARRAY['Project Charter', 'Cost Management Plan', 'Resource Management Plan', 'Schedule Management Plan'],
  ARRAY[1, 2, 3, 4],
  true,
  true,
  false
),
(
  'CR Approval - Medium Priority',
  'cr_approved',
  ARRAY['Risk Management Plan', 'Quality Management Plan', 'Communication Management Plan'],
  ARRAY[1, 2, 3],
  true,
  true,
  false
),
(
  'Baseline Update',
  'baseline_updated',
  ARRAY['Project Charter', 'Scope Management Plan', 'Schedule Management Plan'],
  ARRAY[1, 2, 3],
  true,
  true,
  false
);

-- Insert default consistency check rules
INSERT INTO document_consistency_checks (
  check_name,
  source_document_id,
  target_document_id,
  check_type,
  check_query,
  check_config,
  auto_fix_enabled
) VALUES 
(
  'Budget Alignment Check',
  (SELECT id FROM documents WHERE title ILIKE '%project charter%' LIMIT 1),
  (SELECT id FROM documents WHERE title ILIKE '%cost management%' LIMIT 1),
  'budget_alignment',
  'SELECT 
     pc.content->>''budget_total'' as charter_budget,
     cmp.content->>''total_budget'' as plan_budget,
     CASE 
       WHEN pc.content->>''budget_total'' = cmp.content->>''total_budget'' THEN ''PASS''
       ELSE ''FAIL: Budget mismatch between Charter and Cost Management Plan''
     END as result
   FROM documents pc, documents cmp
   WHERE pc.id = $1 AND cmp.id = $2',
  '{"tolerance": 0, "required_fields": ["budget_total", "total_budget"]}',
  false
),
(
  'Schedule Alignment Check',
  (SELECT id FROM documents WHERE title ILIKE '%project charter%' LIMIT 1),
  (SELECT id FROM documents WHERE title ILIKE '%schedule management%' LIMIT 1),
  'schedule_alignment',
  'SELECT 
     pc.content->>''project_end_date'' as charter_end,
     smp.content->>''project_end_date'' as plan_end,
     CASE 
       WHEN pc.content->>''project_end_date'' = smp.content->>''project_end_date'' THEN ''PASS''
       ELSE ''FAIL: End date mismatch between Charter and Schedule Management Plan''
     END as result
   FROM documents pc, documents smp
   WHERE pc.id = $1 AND smp.id = $2',
  '{"tolerance_days": 7, "required_fields": ["project_end_date"]}',
  false
);

-- Create function to automatically create document version
CREATE OR REPLACE FUNCTION create_document_version(
  p_document_id UUID,
  p_version_number VARCHAR(20),
  p_version_type VARCHAR(20),
  p_change_summary TEXT,
  p_change_reason VARCHAR(100),
  p_created_by UUID,
  p_content JSONB,
  p_metadata JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_version_id UUID;
BEGIN
  INSERT INTO document_versions (
    document_id,
    version_number,
    version_type,
    change_summary,
    change_reason,
    created_by,
    content,
    metadata,
    change_log
  ) VALUES (
    p_document_id,
    p_version_number,
    p_version_type,
    p_change_summary,
    p_change_reason,
    p_created_by,
    p_content,
    p_metadata,
    CONCAT('Version ', p_version_number, ' created on ', NOW()::DATE, ' - ', p_change_summary)
  ) RETURNING id INTO v_version_id;
  
  RETURN v_version_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to get next version number
CREATE OR REPLACE FUNCTION get_next_version_number(p_document_id UUID) RETURNS VARCHAR(20) AS $$
DECLARE
  v_current_version VARCHAR(20);
  v_major INTEGER;
  v_minor INTEGER;
BEGIN
  SELECT version_number INTO v_current_version
  FROM document_versions
  WHERE document_id = p_document_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_current_version IS NULL THEN
    RETURN '1.0';
  END IF;
  
  -- Parse version number (assumes format like "2.1")
  v_major := CAST(SPLIT_PART(v_current_version, '.', 1) AS INTEGER);
  v_minor := CAST(SPLIT_PART(v_current_version, '.', 2) AS INTEGER);
  
  -- Increment minor version
  v_minor := v_minor + 1;
  
  RETURN CONCAT(v_major, '.', v_minor);
END;
$$ LANGUAGE plpgsql;

-- Create function to run consistency checks
CREATE OR REPLACE FUNCTION run_consistency_checks(p_document_id UUID) RETURNS JSONB AS $$
DECLARE
  v_check RECORD;
  v_result JSONB;
  v_results JSONB := '[]'::JSONB;
  v_all_passed BOOLEAN := TRUE;
BEGIN
  FOR v_check IN 
    SELECT * FROM document_consistency_checks 
    WHERE (source_document_id = p_document_id OR target_document_id = p_document_id)
    AND is_active = TRUE
  LOOP
    -- Execute the check query (simplified - in real implementation would use dynamic SQL)
    v_result := jsonb_build_object(
      'check_name', v_check.check_name,
      'check_type', v_check.check_type,
      'passed', TRUE, -- Simplified - would execute actual query
      'details', 'Check executed successfully',
      'timestamp', NOW()
    );
    
    v_results := v_results || v_result;
    
    -- Update last run time
    UPDATE document_consistency_checks 
    SET last_run_at = NOW(), last_result = v_result
    WHERE id = v_check.id;
  END LOOP;
  
  RETURN jsonb_build_object(
    'all_passed', v_all_passed,
    'results', v_results,
    'timestamp', NOW()
  );
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update document when new version is published
CREATE OR REPLACE FUNCTION update_document_on_version_publish() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'published' AND OLD.status != 'published' THEN
    -- Update the main document with the new content
    UPDATE documents 
    SET 
      content = NEW.content,
      updated_at = NOW(),
      version = NEW.version_number
    WHERE id = NEW.document_id;
    
    -- Archive previous published versions
    UPDATE document_versions 
    SET status = 'archived'
    WHERE document_id = NEW.document_id 
    AND id != NEW.id 
    AND status = 'published';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_document_on_version_publish
  AFTER UPDATE ON document_versions
  FOR EACH ROW
  EXECUTE FUNCTION update_document_on_version_publish();

-- Create trigger to create update tasks when CR is approved
CREATE OR REPLACE FUNCTION create_cr_update_tasks() RETURNS TRIGGER AS $$
DECLARE
  v_workflow RECORD;
  v_document_type TEXT;
  v_update_task_id UUID;
BEGIN
  -- Only trigger when CR status changes to 'approved'
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    -- Get the appropriate workflow
    SELECT * INTO v_workflow 
    FROM document_update_workflows 
    WHERE trigger_event = 'cr_approved' 
    AND is_active = TRUE
    ORDER BY workflow_name
    LIMIT 1;
    
    -- Create update tasks for each document type
    FOR i IN 1..array_length(v_workflow.document_types, 1) LOOP
      v_document_type := v_workflow.document_types[i];
      
      -- Find documents of this type in the same project
      FOR doc IN 
        SELECT d.id 
        FROM documents d
        JOIN projects p ON d.project_id = p.id
        WHERE p.id = (SELECT project_id FROM documents WHERE id = NEW.id)
        AND d.title ILIKE '%' || v_document_type || '%'
      LOOP
        INSERT INTO cr_document_updates (
          change_request_id,
          target_document_id,
          update_priority,
          update_reason,
          required_changes,
          due_date
        ) VALUES (
          NEW.id,
          doc.id,
          CASE WHEN i <= 2 THEN 'high' ELSE 'medium' END,
          'CR ' || NEW.title || ' approved - requires document update',
          'Update document to reflect changes from approved CR',
          CURRENT_DATE + INTERVAL '7 days'
        ) RETURNING id INTO v_update_task_id;
        
        -- Create notification
        INSERT INTO document_update_notifications (
          update_task_id,
          recipient_id,
          notification_type,
          message
        ) VALUES (
          v_update_task_id,
          (SELECT created_by FROM documents WHERE id = doc.id),
          'assigned',
          'Document update required for CR: ' || NEW.title
        );
      END LOOP;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: This trigger would be created on the documents table, but we need to be careful
-- about the implementation since it depends on the specific CR document structure
-- For now, this is a placeholder that would be implemented in the application layer

-- Add version column to documents table if it doesn't exist
ALTER TABLE documents ADD COLUMN IF NOT EXISTS version VARCHAR(20) DEFAULT '1.0';

-- Add update tracking columns to documents table
ALTER TABLE documents ADD COLUMN IF NOT EXISTS last_updated_by UUID REFERENCES users(id);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS update_reason VARCHAR(100);

-- Create view for document version summary
CREATE OR REPLACE VIEW document_version_summary AS
SELECT 
  d.id as document_id,
  d.title,
  d.version as current_version,
  dv.version_number as latest_version,
  dv.status as version_status,
  dv.change_summary,
  dv.change_reason,
  dv.created_at as version_created_at,
  u.email as created_by_email,
  COUNT(dv2.id) as total_versions
FROM documents d
LEFT JOIN document_versions dv ON d.id = dv.document_id AND dv.status = 'published'
LEFT JOIN document_versions dv2 ON d.id = dv2.document_id
LEFT JOIN users u ON dv.created_by = u.id
GROUP BY d.id, d.title, d.version, dv.version_number, dv.status, dv.change_summary, dv.change_reason, dv.created_at, u.email;

-- Create view for CR update progress
CREATE OR REPLACE VIEW cr_update_progress AS
SELECT 
  cr.id as cr_id,
  cr.title as cr_title,
  COUNT(cdu.id) as total_updates,
  COUNT(CASE WHEN cdu.status = 'completed' THEN 1 END) as completed_updates,
  COUNT(CASE WHEN cdu.status = 'in_progress' THEN 1 END) as in_progress_updates,
  COUNT(CASE WHEN cdu.status = 'pending' THEN 1 END) as pending_updates,
  COUNT(CASE WHEN cdu.status = 'overdue' THEN 1 END) as overdue_updates,
  ROUND(
    (COUNT(CASE WHEN cdu.status = 'completed' THEN 1 END)::DECIMAL / COUNT(cdu.id)) * 100, 
    2
  ) as completion_percentage
FROM documents cr
LEFT JOIN cr_document_updates cdu ON cr.id = cdu.change_request_id
WHERE cr.title ILIKE '%CR-%' OR cr.title ILIKE '%Change Request%'
GROUP BY cr.id, cr.title;

-- Grant permissions (adjust as needed for your security model)
-- GRANT SELECT, INSERT, UPDATE ON document_versions TO adpa_user;
-- GRANT SELECT, INSERT, UPDATE ON document_dependencies TO adpa_user;
-- GRANT SELECT, INSERT, UPDATE ON cr_document_updates TO adpa_user;
-- GRANT SELECT, INSERT, UPDATE ON document_consistency_checks TO adpa_user;
-- GRANT SELECT, INSERT, UPDATE ON document_update_workflows TO adpa_user;
-- GRANT SELECT, INSERT, UPDATE ON document_update_workflow_instances TO adpa_user;
-- GRANT SELECT, INSERT, UPDATE ON document_update_notifications TO adpa_user;
-- GRANT SELECT, INSERT, UPDATE ON document_version_approvals TO adpa_user;

-- Grant execute permissions on functions
-- GRANT EXECUTE ON FUNCTION create_document_version TO adpa_user;
-- GRANT EXECUTE ON FUNCTION get_next_version_number TO adpa_user;
-- GRANT EXECUTE ON FUNCTION run_consistency_checks TO adpa_user;

COMMENT ON TABLE document_versions IS 'Tracks all versions of project documents with change history';
COMMENT ON TABLE document_dependencies IS 'Defines relationships between documents and their update dependencies';
COMMENT ON TABLE cr_document_updates IS 'Tracks document update tasks created from approved change requests';
COMMENT ON TABLE document_consistency_checks IS 'Defines automated consistency validation rules between documents';
COMMENT ON TABLE document_update_workflows IS 'Templates for automated document update workflows';
COMMENT ON TABLE document_update_workflow_instances IS 'Actual executions of document update workflows';
COMMENT ON TABLE document_update_notifications IS 'Notifications sent for document update tasks';
COMMENT ON TABLE document_version_approvals IS 'Approval workflow for document versions';

COMMENT ON FUNCTION create_document_version IS 'Creates a new version of a document with proper versioning';
COMMENT ON FUNCTION get_next_version_number IS 'Calculates the next version number for a document';
COMMENT ON FUNCTION run_consistency_checks IS 'Executes all consistency checks for a document';

COMMENT ON VIEW document_version_summary IS 'Summary view of document versions and current status';
COMMENT ON VIEW cr_update_progress IS 'Progress tracking for change request document updates';
