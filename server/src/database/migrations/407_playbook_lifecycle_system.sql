-- ============================================================================
-- Migration: 407_playbook_lifecycle_system.sql
-- Purpose: Create comprehensive schema for playbook lifecycle management
-- Date: 2026-03-31
-- ============================================================================

-- ============================================================================
-- 1. PLAYBOOK TEMPLATES TABLE
-- ============================================================================
-- Core playbook template data with lifecycle management fields
CREATE TABLE IF NOT EXISTS playbook_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  purpose VARCHAR(255) NOT NULL,
  
  -- Core playbook content
  severity_model JSONB NOT NULL,
  escalation_rules JSONB NOT NULL,
  actions JSONB NOT NULL,
  automations JSONB,
  compliance_references JSONB,
  
  -- Lifecycle fields
  status VARCHAR(50) DEFAULT 'draft', -- draft, testing, active, deprecated
  version_major INT DEFAULT 1,
  version_minor INT DEFAULT 0,
  version_micro INT DEFAULT 0,
  
  -- QA & Quality
  qa_score DECIMAL(5,2),
  qa_last_run_at TIMESTAMP,
  qa_status VARCHAR(50), -- passed, failed, pending
  quality_gate_status VARCHAR(50), -- passed, failed, blocked
  
  -- Drift & Alignment
  drift_detection_enabled BOOLEAN DEFAULT true,
  drift_last_check_at TIMESTAMP,
  alignment_score DECIMAL(5,2),
  
  -- Review Workflow
  review_workflow_state VARCHAR(50) DEFAULT 'draft', -- draft, in_review, approved, rejected
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,
  review_notes TEXT,
  
  -- Metadata
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID REFERENCES users(id),
  deleted_at TIMESTAMP,
  deleted_by UUID REFERENCES users(id),
  
  -- Tracking
  usage_count INT DEFAULT 0,
  is_public BOOLEAN DEFAULT false
);

-- Create indexes for playbook_templates
CREATE INDEX IF NOT EXISTS idx_playbook_templates_status ON playbook_templates(status);
CREATE INDEX IF NOT EXISTS idx_playbook_templates_created_by ON playbook_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_playbook_templates_deleted_at ON playbook_templates(deleted_at);
CREATE INDEX IF NOT EXISTS idx_playbook_templates_is_public ON playbook_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_playbook_templates_qa_status ON playbook_templates(qa_status);
CREATE INDEX IF NOT EXISTS idx_playbook_templates_review_state ON playbook_templates(review_workflow_state);

-- ============================================================================
-- 2. PLAYBOOK VERSIONS TABLE
-- ============================================================================
-- Version history for playbooks with change tracking
CREATE TABLE IF NOT EXISTS playbook_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id UUID NOT NULL REFERENCES playbook_templates(id) ON DELETE CASCADE,
  version_major INT NOT NULL,
  version_minor INT NOT NULL,
  version_micro INT NOT NULL,
  
  -- Content
  content JSONB NOT NULL,
  system_prompt TEXT,
  change_summary TEXT,
  change_type VARCHAR(50) NOT NULL, -- editorial, structural, policy
  
  -- QA Results
  qa_score DECIMAL(5,2),
  qa_results JSONB,
  qa_passed_at TIMESTAMP,
  
  -- Metadata
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(playbook_id, version_major, version_minor, version_micro)
);

-- Create indexes for playbook_versions
CREATE INDEX IF NOT EXISTS idx_playbook_versions_playbook_id ON playbook_versions(playbook_id);
CREATE INDEX IF NOT EXISTS idx_playbook_versions_created_at ON playbook_versions(created_at);
CREATE INDEX IF NOT EXISTS idx_playbook_versions_change_type ON playbook_versions(change_type);

-- ============================================================================
-- 3. EXTRACTED ENTITIES TABLE
-- ============================================================================
-- Entities extracted from playbooks for drift detection and analysis
CREATE TABLE IF NOT EXISTS playbook_extracted_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id UUID NOT NULL REFERENCES playbook_templates(id) ON DELETE CASCADE,
  version_id UUID NOT NULL REFERENCES playbook_versions(id) ON DELETE CASCADE,
  
  -- Entity Information
  entity_type VARCHAR(100) NOT NULL, -- role, timeline, risk_definition, tool, incident_category
  entity_name VARCHAR(255) NOT NULL,
  entity_value JSONB NOT NULL,
  
  -- Extraction Metadata
  extracted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  extraction_confidence DECIMAL(5,2),
  source_section VARCHAR(255),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for playbook_extracted_entities
CREATE INDEX IF NOT EXISTS idx_playbook_extracted_entities_playbook_id ON playbook_extracted_entities(playbook_id);
CREATE INDEX IF NOT EXISTS idx_playbook_extracted_entities_version_id ON playbook_extracted_entities(version_id);
CREATE INDEX IF NOT EXISTS idx_playbook_extracted_entities_entity_type ON playbook_extracted_entities(entity_type);
CREATE INDEX IF NOT EXISTS idx_playbook_extracted_entities_entity_name ON playbook_extracted_entities(entity_name);

-- ============================================================================
-- 4. DRIFT DETECTION RECORDS TABLE
-- ============================================================================
-- Records of detected drift between playbook versions
CREATE TABLE IF NOT EXISTS playbook_drift_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id UUID NOT NULL REFERENCES playbook_templates(id) ON DELETE CASCADE,
  from_version_id UUID NOT NULL REFERENCES playbook_versions(id),
  to_version_id UUID NOT NULL REFERENCES playbook_versions(id),
  
  -- Drift Information
  drift_type VARCHAR(100) NOT NULL, -- role_change, timeline_change, risk_change, tool_change, category_change
  entity_type VARCHAR(100) NOT NULL,
  entity_name VARCHAR(255) NOT NULL,
  old_value JSONB,
  new_value JSONB,
  
  -- Notification
  notification_sent BOOLEAN DEFAULT false,
  notified_at TIMESTAMP,
  notified_to UUID REFERENCES users(id),
  
  -- Metadata
  detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  severity VARCHAR(50), -- low, medium, high, critical
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for playbook_drift_records
CREATE INDEX IF NOT EXISTS idx_playbook_drift_records_playbook_id ON playbook_drift_records(playbook_id);
CREATE INDEX IF NOT EXISTS idx_playbook_drift_records_notification_sent ON playbook_drift_records(notification_sent);
CREATE INDEX IF NOT EXISTS idx_playbook_drift_records_severity ON playbook_drift_records(severity);
CREATE INDEX IF NOT EXISTS idx_playbook_drift_records_detected_at ON playbook_drift_records(detected_at);

-- ============================================================================
-- 5. QA RESULTS TABLE
-- ============================================================================
-- Quality assurance results and scores for playbooks
CREATE TABLE IF NOT EXISTS playbook_qa_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id UUID NOT NULL REFERENCES playbook_templates(id) ON DELETE CASCADE,
  version_id UUID NOT NULL REFERENCES playbook_versions(id) ON DELETE CASCADE,
  
  -- QA Checks (individual scores)
  severity_coverage_score DECIMAL(5,2),
  escalation_timing_score DECIMAL(5,2),
  decision_tree_score DECIMAL(5,2),
  governance_links_score DECIMAL(5,2),
  entity_consistency_score DECIMAL(5,2),
  pmbok_alignment_score DECIMAL(5,2),
  
  -- Overall Score
  overall_score DECIMAL(5,2),
  status VARCHAR(50), -- passed, failed, pending
  
  -- Details
  failed_checks JSONB,
  recommendations JSONB,
  
  -- Metadata
  run_by UUID REFERENCES users(id),
  run_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for playbook_qa_results
CREATE INDEX IF NOT EXISTS idx_playbook_qa_results_playbook_id ON playbook_qa_results(playbook_id);
CREATE INDEX IF NOT EXISTS idx_playbook_qa_results_version_id ON playbook_qa_results(version_id);
CREATE INDEX IF NOT EXISTS idx_playbook_qa_results_status ON playbook_qa_results(status);
CREATE INDEX IF NOT EXISTS idx_playbook_qa_results_run_at ON playbook_qa_results(run_at);

-- ============================================================================
-- 6. ESCALATION RECORDS TABLE
-- ============================================================================
-- Records of escalation guidance provided to users
CREATE TABLE IF NOT EXISTS playbook_escalation_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id UUID NOT NULL REFERENCES playbook_templates(id),
  
  -- Trigger Information
  trigger_type VARCHAR(100) NOT NULL, -- ai_prediction, threshold, user_submission
  trigger_data JSONB,
  
  -- Guidance Generated
  guidance_content JSONB NOT NULL,
  decision_tree JSONB,
  communication_templates JSONB,
  risk_assessment JSONB,
  automations_triggered JSONB,
  
  -- User Interaction
  user_id UUID NOT NULL REFERENCES users(id),
  guidance_provided_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  user_action VARCHAR(100), -- accepted, modified, rejected
  user_action_at TIMESTAMP,
  
  -- Resolution
  resolution_status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, resolved, escalated
  resolved_at TIMESTAMP,
  resolution_notes TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for playbook_escalation_records
CREATE INDEX IF NOT EXISTS idx_playbook_escalation_records_playbook_id ON playbook_escalation_records(playbook_id);
CREATE INDEX IF NOT EXISTS idx_playbook_escalation_records_user_id ON playbook_escalation_records(user_id);
CREATE INDEX IF NOT EXISTS idx_playbook_escalation_records_resolution_status ON playbook_escalation_records(resolution_status);
CREATE INDEX IF NOT EXISTS idx_playbook_escalation_records_guidance_provided_at ON playbook_escalation_records(guidance_provided_at);
CREATE INDEX IF NOT EXISTS idx_playbook_escalation_records_trigger_type ON playbook_escalation_records(trigger_type);

-- ============================================================================
-- 7. RESOLUTION ANALYTICS TABLE
-- ============================================================================
-- Post-resolution analytics and improvement recommendations
CREATE TABLE IF NOT EXISTS playbook_resolution_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escalation_record_id UUID NOT NULL REFERENCES playbook_escalation_records(id) ON DELETE CASCADE,
  playbook_id UUID NOT NULL REFERENCES playbook_templates(id),
  
  -- Outcome Tracking
  expected_outcome JSONB,
  actual_outcome JSONB,
  outcome_variance DECIMAL(5,2),
  
  -- Entity Extraction from Resolution
  extracted_entities JSONB,
  entity_changes JSONB,
  
  -- ML Model Updates
  model_update_recommended BOOLEAN DEFAULT false,
  model_update_reason TEXT,
  model_update_data JSONB,
  
  -- Version Improvement
  version_update_recommended BOOLEAN DEFAULT false,
  version_update_reason TEXT,
  version_update_suggestions JSONB,
  
  -- Metadata
  analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  analyzed_by UUID REFERENCES users(id),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for playbook_resolution_analytics
CREATE INDEX IF NOT EXISTS idx_playbook_resolution_analytics_playbook_id ON playbook_resolution_analytics(playbook_id);
CREATE INDEX IF NOT EXISTS idx_playbook_resolution_analytics_escalation_record_id ON playbook_resolution_analytics(escalation_record_id);
CREATE INDEX IF NOT EXISTS idx_playbook_resolution_analytics_model_update_recommended ON playbook_resolution_analytics(model_update_recommended);
CREATE INDEX IF NOT EXISTS idx_playbook_resolution_analytics_version_update_recommended ON playbook_resolution_analytics(version_update_recommended);
CREATE INDEX IF NOT EXISTS idx_playbook_resolution_analytics_analyzed_at ON playbook_resolution_analytics(analyzed_at);

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE playbook_templates IS 'Core playbook templates with lifecycle management fields';
COMMENT ON COLUMN playbook_templates.status IS 'Playbook status: draft, testing, active, deprecated';
COMMENT ON COLUMN playbook_templates.severity_model IS 'JSON structure defining severity levels and classification rules';
COMMENT ON COLUMN playbook_templates.escalation_rules IS 'JSON array of escalation rules with conditions and paths';
COMMENT ON COLUMN playbook_templates.qa_score IS 'Overall QA score (0-100)';
COMMENT ON COLUMN playbook_templates.quality_gate_status IS 'Quality gate enforcement status: passed, failed, blocked';
COMMENT ON COLUMN playbook_templates.drift_detection_enabled IS 'Whether drift detection is enabled for this playbook';
COMMENT ON COLUMN playbook_templates.alignment_score IS 'Alignment score with PMBOK/standards (0-100)';
COMMENT ON COLUMN playbook_templates.review_workflow_state IS 'Review workflow state: draft, in_review, approved, rejected';

COMMENT ON TABLE playbook_versions IS 'Version history for playbooks with change tracking';
COMMENT ON COLUMN playbook_versions.change_type IS 'Type of change: editorial (micro), structural (minor), policy (major)';
COMMENT ON COLUMN playbook_versions.content IS 'Full playbook content snapshot at this version';

COMMENT ON TABLE playbook_extracted_entities IS 'Entities extracted from playbooks for drift detection';
COMMENT ON COLUMN playbook_extracted_entities.entity_type IS 'Type of entity: role, timeline, risk_definition, tool, incident_category';
COMMENT ON COLUMN playbook_extracted_entities.extraction_confidence IS 'Confidence score of extraction (0-1)';

COMMENT ON TABLE playbook_drift_records IS 'Records of detected drift between playbook versions';
COMMENT ON COLUMN playbook_drift_records.severity IS 'Drift severity: low, medium, high, critical';
COMMENT ON COLUMN playbook_drift_records.notification_sent IS 'Whether notification has been sent to template owner';

COMMENT ON TABLE playbook_qa_results IS 'Quality assurance results and scores';
COMMENT ON COLUMN playbook_qa_results.overall_score IS 'Overall QA score (0-100), must be >= 80 to pass';
COMMENT ON COLUMN playbook_qa_results.status IS 'QA status: passed (score >= 80), failed (score < 80), pending';

COMMENT ON TABLE playbook_escalation_records IS 'Records of escalation guidance provided to users';
COMMENT ON COLUMN playbook_escalation_records.trigger_type IS 'How escalation was triggered: ai_prediction, threshold, user_submission';
COMMENT ON COLUMN playbook_escalation_records.resolution_status IS 'Current resolution status: pending, in_progress, resolved, escalated';
COMMENT ON COLUMN playbook_escalation_records.user_action IS 'User action on guidance: accepted, modified, rejected';

COMMENT ON TABLE playbook_resolution_analytics IS 'Post-resolution analytics and improvement recommendations';
COMMENT ON COLUMN playbook_resolution_analytics.outcome_variance IS 'Variance between expected and actual outcomes (0-1)';
COMMENT ON COLUMN playbook_resolution_analytics.model_update_recommended IS 'Whether ML model update is recommended';
COMMENT ON COLUMN playbook_resolution_analytics.version_update_recommended IS 'Whether playbook version update is recommended';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
